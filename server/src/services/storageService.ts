import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

import { prisma } from '../prisma';

export interface StorageResult {
  storagePath: string;
  fileName: string;
  fileSize: number;
}

export interface IStorageService {
  saveFile(buffer: Buffer, originalFilename: string, mimeType: string): Promise<StorageResult>;
  getFileBuffer(storagePath: string): Promise<Buffer>;
  deleteFile(storagePath: string): Promise<void>;
  getAbsolutePath(storagePath: string): string;
}

class LocalStorageService implements IStorageService {
  private baseDir: string;

  constructor() {
    const defaultDir = process.env.VERCEL === '1' ? '/tmp/uploads' : './uploads';
    this.baseDir = path.resolve(process.env.LOCAL_STORAGE_DIR || defaultDir);
    try {
      if (!fs.existsSync(this.baseDir)) {
        fs.mkdirSync(this.baseDir, { recursive: true });
      }
    } catch (err) {
      console.warn('[Storage] Could not create local storage directory (read-only filesystem):', err);
    }
  }

  async saveFile(buffer: Buffer, originalFilename: string, mimeType: string): Promise<StorageResult> {
    const ext = path.extname(originalFilename);
    const safeBase = path.basename(originalFilename, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueName = `${Date.now()}-${uuidv4().substring(0, 8)}-${safeBase}${ext}`;
    const filePath = path.join(this.baseDir, uniqueName);

    // 1. Write to local filesystem if accessible
    try {
      if (!fs.existsSync(this.baseDir)) {
        fs.mkdirSync(this.baseDir, { recursive: true });
      }
      await fs.promises.writeFile(filePath, buffer);
    } catch (err) {
      console.warn('[Storage] Local filesystem write skipped or restricted:', err);
    }

    // 2. Persist binary buffer into PostgreSQL StoredFile table
    // This ensures files are permanently retained across Vercel serverless container lifecycles
    try {
      await prisma.storedFile.upsert({
        where: { storagePath: uniqueName },
        create: {
          storagePath: uniqueName,
          fileName: originalFilename,
          mimeType: mimeType || 'application/octet-stream',
          fileSize: buffer.length,
          data: buffer,
        },
        update: {
          fileName: originalFilename,
          mimeType: mimeType || 'application/octet-stream',
          fileSize: buffer.length,
          data: buffer,
        },
      });
    } catch (dbErr) {
      console.warn('[Storage] Could not upsert into StoredFile table:', dbErr);
    }

    return {
      storagePath: uniqueName,
      fileName: uniqueName,
      fileSize: buffer.length,
    };
  }

  async getFileBuffer(storagePath: string): Promise<Buffer> {
    // 1. Check local base directory
    const filePath = this.getAbsolutePath(storagePath);
    if (fs.existsSync(filePath)) {
      return fs.promises.readFile(filePath);
    }

    // 2. Check alternative relative paths (e.g. ./uploads, server/uploads, /tmp/uploads)
    const altPaths = [
      path.resolve('./uploads', storagePath),
      path.resolve('../uploads', storagePath),
      path.resolve(process.cwd(), 'uploads', storagePath),
      path.resolve(process.cwd(), 'server', 'uploads', storagePath),
      path.resolve('/tmp/uploads', storagePath),
    ];
    for (const alt of altPaths) {
      if (fs.existsSync(alt)) {
        return fs.promises.readFile(alt);
      }
    }

    // 3. Fallback to PostgreSQL StoredFile table (essential for Vercel Serverless / multi-instance deploys)
    try {
      const stored = await prisma.storedFile.findUnique({
        where: { storagePath },
      });
      if (stored && stored.data) {
        const buffer = Buffer.from(stored.data);
        // Cache to local directory for subsequent reads in this invocation
        try {
          if (!fs.existsSync(this.baseDir)) {
            fs.mkdirSync(this.baseDir, { recursive: true });
          }
          await fs.promises.writeFile(filePath, buffer);
        } catch (cacheErr) {
          // ignore cache write error
        }
        return buffer;
      }
    } catch (dbErr) {
      console.warn(`[Storage] Database file retrieval error for "${storagePath}":`, dbErr);
    }

    throw new Error(`File not found at storage path: ${storagePath}`);
  }

  async deleteFile(storagePath: string): Promise<void> {
    const filePath = this.getAbsolutePath(storagePath);
    if (fs.existsSync(filePath)) {
      try {
        await fs.promises.unlink(filePath);
      } catch (err) {
        // ignore
      }
    }
    try {
      await prisma.storedFile.deleteMany({
        where: { storagePath },
      });
    } catch (err) {
      // ignore
    }
  }

  getAbsolutePath(storagePath: string): string {
    return path.join(this.baseDir, storagePath);
  }
}

class S3StorageService implements IStorageService {
  private s3Client: S3Client;
  private bucket: string;
  private localFallback: LocalStorageService;

  constructor() {
    this.localFallback = new LocalStorageService();
    this.bucket = process.env.AWS_S3_BUCKET || 'diemp-investigation-documents';
    const endpoint = process.env.AWS_ENDPOINT_URL || process.env.S3_ENDPOINT;
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      endpoint: endpoint || undefined,
      forcePathStyle: Boolean(endpoint),
      credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      } : undefined,
    });
  }

  async saveFile(buffer: Buffer, originalFilename: string, mimeType: string): Promise<StorageResult> {
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      console.warn('[Storage] AWS credentials not configured. Falling back to local storage.');
      return this.localFallback.saveFile(buffer, originalFilename, mimeType);
    }

    const ext = path.extname(originalFilename);
    const safeBase = path.basename(originalFilename, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const key = `documents/${Date.now()}-${uuidv4().substring(0, 8)}-${safeBase}${ext}`;

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      })
    );

    return {
      storagePath: key,
      fileName: path.basename(key),
      fileSize: buffer.length,
    };
  }

  async getFileBuffer(storagePath: string): Promise<Buffer> {
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !storagePath.startsWith('documents/')) {
      return this.localFallback.getFileBuffer(storagePath);
    }

    const response = await this.s3Client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: storagePath,
      })
    );

    const stream = response.Body as Readable;
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    return Buffer.concat(chunks);
  }

  async deleteFile(storagePath: string): Promise<void> {
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !storagePath.startsWith('documents/')) {
      return this.localFallback.deleteFile(storagePath);
    }

    await this.s3Client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: storagePath,
      })
    );
  }

  getAbsolutePath(storagePath: string): string {
    return this.localFallback.getAbsolutePath(storagePath);
  }
}

export const storageService: IStorageService =
  process.env.STORAGE_PROVIDER === 'S3' ? new S3StorageService() : new LocalStorageService();
