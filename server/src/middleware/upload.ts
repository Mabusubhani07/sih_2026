import multer from 'multer';
import path from 'path';

// Allowed MIME types and extensions
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'text/plain',
  'text/markdown',
  'application/json',
];

const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.txt', '.md', '.json'];

// Store in memory buffer so we can compute SHA-256 directly on bytes
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB maximum
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext) && !ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(
        new Error(
          `Security Policy Violation: File format '${ext}' is not permitted. Authorized formats: PDF, DOC, DOCX, JPG, PNG, TXT.`
        )
      );
    }
    cb(null, true);
  },
});
