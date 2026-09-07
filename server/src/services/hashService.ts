import crypto from 'crypto';
import { storageService } from './storageService';

export interface IntegrityVerificationResult {
  verified: boolean;
  status: 'INTEGRITY_VERIFIED' | 'INTEGRITY_FAILED';
  algorithm: string;
  recordedHash: string;
  calculatedHash: string;
  checkedAt: string;
  fileSizeBytes: number;
}

export class HashService {
  /**
   * Calculates genuine SHA-256 cryptographic hash of buffer from actual file bytes.
   * Returns a normalized 64-character lowercase hex digest.
   */
  static calculateSHA256(fileBytes: Buffer): string {
    if (!fileBytes || !Buffer.isBuffer(fileBytes)) {
      throw new Error('HashService: Valid Buffer payload required for SHA-256 calculation.');
    }
    return crypto.createHash('sha256').update(fileBytes).digest('hex').toLowerCase();
  }

  /**
   * Backwards-compatible alias for calculateSHA256
   */
  static computeSha256(buffer: Buffer): string {
    return this.calculateSHA256(buffer);
  }

  /**
   * Constant-time verification of raw file bytes against an expected SHA-256 hash.
   */
  static verifySHA256(fileBytes: Buffer, expectedHash: string): boolean {
    const calculatedHash = this.calculateSHA256(fileBytes);
    return this.verifyHashConstantTime(calculatedHash, expectedHash);
  }

  /**
   * Constant-time comparison of two cryptographic hashes using crypto.timingSafeEqual.
   * Prevents side-channel timing attacks and validates 64-hex SHA-256 structure.
   */
  static verifyHashConstantTime(hashA: string, hashB: string): boolean {
    const normA = (hashA || '').trim().toLowerCase();
    const normB = (hashB || '').trim().toLowerCase();

    // Enforce valid 64-character hexadecimal SHA-256 digest
    const sha256Regex = /^[0-9a-f]{64}$/;
    if (!sha256Regex.test(normA) || !sha256Regex.test(normB)) {
      return false;
    }

    const bufA = Buffer.from(normA, 'hex');
    const bufB = Buffer.from(normB, 'hex');

    if (bufA.length !== bufB.length) {
      return false;
    }

    return crypto.timingSafeEqual(bufA, bufB);
  }

  /**
   * Authoritative backend verification of stored file integrity against recorded master hash.
   * Reads actual disk bytes, recalculates SHA-256, and executes constant-time comparison.
   */
  static async verifyFileIntegrity(
    storagePath: string,
    recordedHash: string
  ): Promise<IntegrityVerificationResult> {
    const fileBuffer = await storageService.getFileBuffer(storagePath);
    const calculatedHash = this.calculateSHA256(fileBuffer);
    const verified = this.verifyHashConstantTime(calculatedHash, recordedHash);

    return {
      verified,
      status: verified ? 'INTEGRITY_VERIFIED' : 'INTEGRITY_FAILED',
      algorithm: 'SHA-256',
      recordedHash: (recordedHash || '').trim().toLowerCase(),
      calculatedHash,
      checkedAt: new Date().toISOString(),
      fileSizeBytes: fileBuffer.length,
    };
  }
}
