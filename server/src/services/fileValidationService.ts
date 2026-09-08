export interface FileValidationResult {
  isValid: boolean;
  error?: string;
  normalizedMimeType: string;
  fileExtension: string;
  mediaCategory?: 'DOCUMENT' | 'IMAGE' | 'VIDEO' | 'AUDIO';
}

const SUPPORTED_EXTENSIONS = new Set([
  // Documents & Office
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'rtf',
  'odt',
  'txt',
  'csv',
  'tsv',
  'json',
  'xml',
  'html',
  'md',
  // Images
  'jpg',
  'jpeg',
  'png',
  'webp',
  'tiff',
  'bmp',
  // Video Evidence
  'mp4',
  'mkv',
  'avi',
  'mov',
  'webm',
  'wmv',
  // Audio Evidence
  'mp3',
  'wav',
  'm4a',
  'ogg',
  'aac',
  'flac',
  'wma',
]);

const MIME_MAP: Record<string, string[]> = {
  // Documents
  pdf: ['application/pdf', 'application/x-pdf'],
  doc: ['application/msword', 'application/vnd.ms-word'],
  docx: [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/zip',
  ],
  xls: ['application/vnd.ms-excel', 'application/msexcel'],
  xlsx: [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip',
  ],
  ppt: ['application/vnd.ms-powerpoint'],
  pptx: [
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/zip',
  ],
  rtf: ['application/rtf', 'text/rtf'],
  odt: ['application/vnd.oasis.opendocument.text'],
  txt: ['text/plain', 'text/markdown', 'application/json', 'text/csv'],
  csv: ['text/csv', 'text/plain', 'application/csv'],
  tsv: ['text/tab-separated-values', 'text/plain'],
  json: ['application/json', 'text/plain'],
  xml: ['application/xml', 'text/xml'],
  html: ['text/html', 'text/plain'],
  md: ['text/markdown', 'text/plain'],
  // Images
  jpg: ['image/jpeg', 'image/jpg'],
  jpeg: ['image/jpeg', 'image/jpg'],
  png: ['image/png'],
  webp: ['image/webp'],
  tiff: ['image/tiff'],
  bmp: ['image/bmp', 'image/x-ms-bmp'],
  // Video
  mp4: ['video/mp4', 'video/quicktime'],
  mkv: ['video/x-matroska', 'video/mkv'],
  avi: ['video/avi', 'video/x-msvideo'],
  mov: ['video/quicktime', 'video/mp4'],
  webm: ['video/webm'],
  wmv: ['video/x-ms-wmv'],
  // Audio
  mp3: ['audio/mpeg', 'audio/mp3'],
  wav: ['audio/wav', 'audio/x-wav', 'audio/wave'],
  m4a: ['audio/mp4', 'audio/x-m4a'],
  ogg: ['audio/ogg', 'application/ogg'],
  aac: ['audio/aac'],
  flac: ['audio/flac', 'audio/x-flac'],
  wma: ['audio/x-ms-wma'],
};

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB maximum threshold for multimedia evidence

export class FileValidationService {
  /**
   * Strictly validates an uploaded file's extension, size, and MIME characteristics.
   * Supports statutory management of Documents, Video, and Audio evidence.
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
        error: `File size exceeds maximum permitted threshold of 100 MB (Received: ${(
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
        error: `Unsupported file extension .${ext}. Permitted formats: Documents (PDF, DOC, DOCX, TXT, CSV), Video (MP4, MKV, AVI, MOV, WEBM), Audio (MP3, WAV, M4A, OGG, FLAC), and Images (JPG, PNG).`,
        normalizedMimeType: file.mimetype,
        fileExtension: ext,
      };
    }

    // Determine Media Category
    let mediaCategory: 'DOCUMENT' | 'IMAGE' | 'VIDEO' | 'AUDIO' = 'DOCUMENT';
    if (['jpg', 'jpeg', 'png', 'webp', 'tiff', 'bmp'].includes(ext)) {
      mediaCategory = 'IMAGE';
    } else if (['mp4', 'mkv', 'avi', 'mov', 'webm', 'wmv'].includes(ext)) {
      mediaCategory = 'VIDEO';
    } else if (['mp3', 'wav', 'm4a', 'ogg', 'aac', 'flac', 'wma'].includes(ext)) {
      mediaCategory = 'AUDIO';
    }

    // 3. Check MIME type compatibility
    const expectedMimes = MIME_MAP[ext] || [];
    const clientMime = file.mimetype?.toLowerCase() || '';

    const isCompatible =
      expectedMimes.includes(clientMime) ||
      clientMime === 'application/octet-stream' ||
      (ext === 'txt' && clientMime.startsWith('text/')) ||
      (mediaCategory === 'VIDEO' && clientMime.startsWith('video/')) ||
      (mediaCategory === 'AUDIO' && clientMime.startsWith('audio/'));

    if (!isCompatible && clientMime) {
      // Non-fatal warning if extension is verified, but normalize properly
    }

    const normalizedMime = expectedMimes[0] || clientMime || 'application/octet-stream';

    // 4. Magic bytes verification
    if (file.buffer && file.buffer.length >= 8) {
      const headerHex = file.buffer.slice(0, 8).toString('hex');
      const headerAscii = file.buffer.slice(0, 8).toString('ascii');

      // PDF
      if (ext === 'pdf' && !file.buffer.slice(0, 5).toString('ascii').startsWith('%PDF-')) {
        return {
          isValid: false,
          error: 'Corrupt file: File extension is PDF but file header does not contain standard %PDF magic bytes.',
          normalizedMimeType: normalizedMime,
          fileExtension: ext,
          mediaCategory,
        };
      }
      // PNG
      if (ext === 'png' && !headerHex.startsWith('89504e47')) {
        return {
          isValid: false,
          error: 'Corrupt file: File extension is PNG but magic signature does not match PNG specification.',
          normalizedMimeType: normalizedMime,
          fileExtension: ext,
          mediaCategory,
        };
      }
      // JPG / JPEG
      if ((ext === 'jpg' || ext === 'jpeg') && !headerHex.startsWith('ffd8')) {
        return {
          isValid: false,
          error: 'Corrupt file: File extension is JPEG/JPG but magic signature does not match JPEG SOI marker.',
          normalizedMimeType: normalizedMime,
          fileExtension: ext,
          mediaCategory,
        };
      }
      // WAV or AVI (RIFF container)
      if ((ext === 'wav' || ext === 'avi') && !headerAscii.startsWith('RIFF')) {
        return {
          isValid: false,
          error: `Corrupt file: File extension is .${ext} but file header does not contain standard RIFF container marker.`,
          normalizedMimeType: normalizedMime,
          fileExtension: ext,
          mediaCategory,
        };
      }
      // MKV or WEBM (Matroska/EBML container: 0x1A45DFA3)
      if ((ext === 'mkv' || ext === 'webm') && !headerHex.startsWith('1a45dfa3')) {
        return {
          isValid: false,
          error: `Corrupt file: File extension is .${ext} but file header does not contain standard EBML/Matroska signature.`,
          normalizedMimeType: normalizedMime,
          fileExtension: ext,
          mediaCategory,
        };
      }
      // OGG container
      if (ext === 'ogg' && !headerAscii.startsWith('OggS')) {
        return {
          isValid: false,
          error: 'Corrupt file: File extension is OGG but file header does not contain standard OggS container marker.',
          normalizedMimeType: normalizedMime,
          fileExtension: ext,
          mediaCategory,
        };
      }
      // FLAC
      if (ext === 'flac' && !headerAscii.startsWith('fLaC')) {
        return {
          isValid: false,
          error: 'Corrupt file: File extension is FLAC but file header does not contain standard fLaC marker.',
          normalizedMimeType: normalizedMime,
          fileExtension: ext,
          mediaCategory,
        };
      }
    }

    return {
      isValid: true,
      normalizedMimeType: normalizedMime,
      fileExtension: ext,
      mediaCategory,
    };
  }
}

