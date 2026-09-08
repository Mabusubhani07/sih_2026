import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { prisma } from '../prisma';
import { storageService } from '../services/storageService';
import { HashService } from '../services/hashService';

export class UploadChunkController {
  /**
   * Accepts a single chunk slice of a large file payload (< 3.0 MB).
   * Stores the chunk to local scratch and DB StoredFile.
   * If all chunks are received, stitches them into the complete binary file,
   * registers it with storageService, and returns ready = true.
   */
  static async uploadChunk(req: Request, res: Response) {
    try {
      const { uploadId, chunkIndex: rawChunkIndex, totalChunks: rawTotalChunks, fileName, mimeType } = req.body;
      const file = req.file || (req.files as Express.Multer.File[])?.[0];

      if (!uploadId || rawChunkIndex === undefined || !rawTotalChunks || !file) {
        return res.status(400).json({
          error: 'Missing mandatory chunk payload parameters (uploadId, chunkIndex, totalChunks, chunk file).',
        });
      }

      const chunkIndex = parseInt(String(rawChunkIndex), 10);
      const totalChunks = parseInt(String(rawTotalChunks), 10);

      if (isNaN(chunkIndex) || isNaN(totalChunks) || chunkIndex < 0 || chunkIndex >= totalChunks) {
        return res.status(400).json({ error: `Invalid chunkIndex: ${rawChunkIndex} for totalChunks: ${rawTotalChunks}` });
      }

      const safeFileName = (fileName || 'uploaded_exhibit').replace(/[^a-zA-Z0-9._-]/g, '_');
      const chunkBuffer = file.buffer;

      // 1. Persist chunk to temporary container filesystem for rapid in-memory/disk assembly
      const chunksBaseDir = path.resolve(process.env.VERCEL === '1' ? '/tmp/chunks' : './uploads/chunks');
      const uploadDir = path.join(chunksBaseDir, uploadId);
      try {
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        await fs.promises.writeFile(path.join(uploadDir, `chunk_${chunkIndex}`), chunkBuffer);
      } catch (fsErr) {
        console.warn(`[ChunkUpload] Scratch filesystem warning for upload ${uploadId}:`, fsErr);
      }

      // 2. Persist chunk into PostgreSQL StoredFile table to guarantee cross-serverless container durability
      const chunkStoragePath = `__chunk_${uploadId}_${chunkIndex}`;
      await prisma.storedFile.upsert({
        where: { storagePath: chunkStoragePath },
        create: {
          storagePath: chunkStoragePath,
          fileName: `chunk_${chunkIndex}_${safeFileName}`,
          mimeType: mimeType || 'application/octet-stream',
          fileSize: chunkBuffer.length,
          data: chunkBuffer,
        },
        update: {
          fileSize: chunkBuffer.length,
          data: chunkBuffer,
        },
      });

      // 3. Check if all chunks have been received across all nodes
      const receivedCount = await prisma.storedFile.count({
        where: {
          storagePath: { startsWith: `__chunk_${uploadId}_` },
        },
      });

      console.log(`[ChunkUpload] Upload ${uploadId}: chunk ${chunkIndex + 1}/${totalChunks} received (Total registered: ${receivedCount}/${totalChunks})`);

      if (receivedCount < totalChunks) {
        return res.json({
          ready: false,
          uploadId,
          chunkIndex,
          totalChunks,
          receivedCount,
        });
      }

      // 4. All chunks arrived! Assemble into full contiguous file buffer
      console.log(`[ChunkUpload] All ${totalChunks} chunks received for ${uploadId}. Commencing byte assembly...`);
      const chunkBuffers: Buffer[] = [];

      for (let i = 0; i < totalChunks; i++) {
        const diskChunkPath = path.join(uploadDir, `chunk_${i}`);
        if (fs.existsSync(diskChunkPath)) {
          const buf = await fs.promises.readFile(diskChunkPath);
          chunkBuffers.push(buf);
        } else {
          // Fetch from PostgreSQL StoredFile fallback
          const record = await prisma.storedFile.findUnique({
            where: { storagePath: `__chunk_${uploadId}_${i}` },
          });
          if (!record || !record.data) {
            throw new Error(`Failed to retrieve chunk ${i} during assembly.`);
          }
          chunkBuffers.push(Buffer.from(record.data));
        }
      }

      const fullBuffer = Buffer.concat(chunkBuffers);
      const sha256Hash = HashService.computeSha256(fullBuffer);
      console.log(`[ChunkUpload] File assembled successfully. Total size: ${fullBuffer.length} bytes, SHA-256: ${sha256Hash}`);

      // 5. Store completed file in official storage service
      const stored = await storageService.saveFile(
        fullBuffer,
        safeFileName,
        mimeType || 'application/octet-stream'
      );

      // 6. Clean up temporary chunk records asynchronously
      prisma.storedFile.deleteMany({
        where: {
          storagePath: { startsWith: `__chunk_${uploadId}_` },
        },
      }).catch((err) => console.warn('[ChunkUpload] DB chunk cleanup warning:', err));

      try {
        if (fs.existsSync(uploadDir)) {
          fs.rmSync(uploadDir, { recursive: true, force: true });
        }
      } catch (fsCleanErr) {
        // ignore
      }

      return res.json({
        ready: true,
        uploadId,
        storagePath: stored.storagePath,
        fileName: stored.fileName,
        fileSize: stored.fileSize,
        mimeType: mimeType || 'application/octet-stream',
        sha256: sha256Hash,
      });
    } catch (err: any) {
      console.error('[ChunkUpload] Error processing chunk:', err);
      return res.status(500).json({ error: err.message || 'Chunk upload failed.' });
    }
  }
}
