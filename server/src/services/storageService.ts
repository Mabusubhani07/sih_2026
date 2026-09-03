import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

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
    this.baseDir = path.resolve(process.cwd(), process.env.LOCAL_STORAGE_DIR || './uploads');
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  async saveFile(buffer: Buffer, originalFilename: string, _mimeType: string): Promise<StorageResult> {
    const ext = path.extname(originalFilename);
    const safeBase = path.basename(originalFilename, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueName = `${Date.now()}-${uuidv4().substring(0, 8)}-${safeBase}${ext}`;
    const filePath = path.join(this.baseDir, uniqueName);

    await fs.promises.writeFile(filePath, buffer);
    return {
      storagePath: uniqueName,
      fileName: uniqueName,
      fileSize: buffer.length,
    };
  }

  async getFileBuffer(storagePath: string): Promise<Buffer> {
    const filePath = this.getAbsolutePath(storagePath);
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found at storage path: ${storagePath}`);
    }
    return fs.promises.readFile(filePath);
  }

  async deleteFile(storagePath: string): Promise<void> {
    const filePath = this.getAbsolutePath(storagePath);
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
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
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
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
