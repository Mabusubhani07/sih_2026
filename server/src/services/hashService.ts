import crypto from 'crypto';
import { storageService } from './storageService';

export interface IntegrityVerificationResult {
  verified: boolean;
  algorithm: string;
  recordedHash: string;
  calculatedHash: string;
  checkedAt: string;
  fileSizeBytes: number;
}

export class HashService {
  /**
   * Calculates genuine SHA-256 cryptographic hash of buffer
   */
  static computeSha256(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Verifies stored file integrity against expected recorded hash
   */
  static async verifyFileIntegrity(
    storagePath: string,
    recordedHash: string
  ): Promise<IntegrityVerificationResult> {
    const fileBuffer = await storageService.getFileBuffer(storagePath);
    const calculatedHash = this.computeSha256(fileBuffer);
    const verified = calculatedHash.toLowerCase() === recordedHash.toLowerCase();

    return {
      verified,
      algorithm: 'SHA-256',
      recordedHash,
      calculatedHash,
      checkedAt: new Date().toISOString(),
      fileSizeBytes: fileBuffer.length,
    };
  }
}
