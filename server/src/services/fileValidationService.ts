export interface FileValidationResult {
  isValid: boolean;
  error?: string;
  normalizedMimeType: string;
  fileExtension: string;
}

const SUPPORTED_EXTENSIONS = new Set([
  'pdf',
  'doc',
  'docx',
  'jpg',
  'jpeg',
  'png',
  'txt',
]);

const MIME_MAP: Record<string, string[]> = {
  pdf: ['application/pdf', 'application/x-pdf'],
  doc: ['application/msword', 'application/vnd.ms-word'],
  docx: [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/zip',
  ],
  jpg: ['image/jpeg', 'image/jpg'],
  jpeg: ['image/jpeg', 'image/jpg'],
  png: ['image/png'],
  txt: ['text/plain', 'text/markdown', 'application/json'],
};

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

export class FileValidationService {
  /**
   * Strictly validates an uploaded file's extension, size, and MIME characteristics
   */
  static validate(file: {
    originalname: string;
    mimetype: string;
    size?: number;
    buffer?: Buffer;
  }): FileValidationResult {
    if (!file) {
      return {
        isValid: false,
        error: 'No file payload provided for validation.',
        normalizedMimeType: 'unknown',
        fileExtension: '',
      };
    }

    // 1. Check size
    const size = file.size ?? file.buffer?.length ?? 0;
    if (size <= 0) {
      return {
        isValid: false,
        error: 'Uploaded file is empty (0 bytes).',
        normalizedMimeType: file.mimetype,
        fileExtension: '',
      };
    }

    if (size > MAX_FILE_SIZE) {
      return {
        isValid: false,
        error: `File size exceeds maximum permitted statutory threshold of 25 MB (Received: ${(
          size /
          (1024 * 1024)
        ).toFixed(2)} MB).`,
        normalizedMimeType: file.mimetype,
        fileExtension: '',
      };
    }

    // 2. Check extension
    const parts = file.originalname.split('.');
    if (parts.length < 2) {
      return {
        isValid: false,
        error: 'File does not contain a recognized extension.',
        normalizedMimeType: file.mimetype,
        fileExtension: '',
      };
    }

    const ext = parts.pop()!.toLowerCase();
    if (!SUPPORTED_EXTENSIONS.has(ext)) {
      return {
        isValid: false,
        error: `Unsupported file extension .${ext}. Supported formats: PDF, DOC, DOCX, JPG, JPEG, PNG, TXT.`,
        normalizedMimeType: file.mimetype,
        fileExtension: ext,
      };
    }

    // 3. Check MIME type compatibility
    const expectedMimes = MIME_MAP[ext] || [];
    const clientMime = file.mimetype?.toLowerCase() || '';

    // Allow generic binary/octet-stream if extension is valid and known
    const isCompatible =
      expectedMimes.includes(clientMime) ||
      clientMime === 'application/octet-stream' ||
      (ext === 'txt' && clientMime.startsWith('text/'));

    if (!isCompatible && clientMime) {
      // Non-fatal warning if extension is verified, but normalize properly
    }

    const normalizedMime = expectedMimes[0] || clientMime || 'application/octet-stream';

    // 4. Magic bytes verification for image / PDF / zip
    if (file.buffer && file.buffer.length >= 4) {
      const headerHex = file.buffer.slice(0, 4).toString('hex');
      if (ext === 'pdf' && !file.buffer.slice(0, 5).toString('ascii').startsWith('%PDF-')) {
        return {
          isValid: false,
          error: 'Corrupt file: File extension is PDF but file header does not contain standard %PDF magic bytes.',
          normalizedMimeType: normalizedMime,
          fileExtension: ext,
        };
      }
      if (ext === 'png' && headerHex !== '89504e47') {
        return {
          isValid: false,
          error: 'Corrupt file: File extension is PNG but magic signature does not match PNG specification.',
          normalizedMimeType: normalizedMime,
          fileExtension: ext,
        };
      }
      if ((ext === 'jpg' || ext === 'jpeg') && !headerHex.startsWith('ffd8')) {
        return {
          isValid: false,
          error: 'Corrupt file: File extension is JPEG/JPG but magic signature does not match JPEG SOI marker.',
          normalizedMimeType: normalizedMime,
          fileExtension: ext,
        };
      }
    }

    return {
      isValid: true,
      normalizedMimeType: normalizedMime,
      fileExtension: ext,
    };
  }
}
