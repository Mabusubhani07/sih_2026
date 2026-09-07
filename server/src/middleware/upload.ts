import multer from 'multer';
import path from 'path';

// Statutory Allowed MIME types and extensions for Documents, Video, and Audio exhibits
const ALLOWED_MIME_TYPES = [
  // Documents
  'application/pdf',
  'application/x-pdf',
  'application/msword',
  'application/vnd.ms-word',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/json',
  // Images
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/tiff',
  // Video Evidence
  'video/mp4',
  'video/x-matroska',
  'video/avi',
  'video/x-msvideo',
  'video/quicktime',
  'video/webm',
  'video/x-ms-wmv',
  // Audio Evidence
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'audio/mp4',
  'audio/x-m4a',
  'audio/ogg',
  'audio/aac',
  'audio/flac',
  'audio/x-flac',
  'audio/x-ms-wma',
];

const ALLOWED_EXTENSIONS = [
  // Documents & Images
  '.pdf',
  '.doc',
  '.docx',
  '.txt',
  '.md',
  '.json',
  '.csv',
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.tiff',
  // Video
  '.mp4',
  '.mkv',
  '.avi',
  '.mov',
  '.webm',
  '.wmv',
  // Audio
  '.mp3',
  '.wav',
  '.m4a',
  '.ogg',
  '.aac',
  '.flac',
  '.wma',
];

// Store in memory buffer so we can compute SHA-256 directly on bytes
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB maximum for multimedia evidentiary records
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const mime = (file.mimetype || '').toLowerCase();

    const isAllowedExt = ALLOWED_EXTENSIONS.includes(ext);
    const isAllowedMime = ALLOWED_MIME_TYPES.includes(mime) || mime === 'application/octet-stream';

    if (!isAllowedExt && !isAllowedMime) {
      return cb(
        new Error(
          `Security Policy Violation: File format '${ext}' is not permitted. Permitted formats: Documents (PDF, DOC, DOCX, TXT, CSV), Video (MP4, MKV, AVI, MOV, WEBM), Audio (MP3, WAV, M4A, OGG, FLAC), and Images (JPG, PNG).`
        )
      );
    }
    cb(null, true);
  },
});

