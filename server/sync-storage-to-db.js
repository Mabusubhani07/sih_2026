const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const mimeMap = {
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.mp4': 'video/mp4',
  '.mkv': 'video/x-matroska',
  '.avi': 'video/x-msvideo',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.ogg': 'audio/ogg',
  '.flac': 'audio/flac',
  '.txt': 'text/plain',
  '.csv': 'text/csv',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.doc': 'application/msword',
};

async function syncAllUploads() {
  console.log('--- Syncing Local Uploads to PostgreSQL StoredFile Table ---');

  const possibleUploadDirs = [
    path.resolve('./uploads'),
    path.resolve('./server/uploads'),
    path.resolve('../uploads'),
  ];

  let synced = 0;
  let skipped = 0;
  const seenPaths = new Set();

  for (const dir of possibleUploadDirs) {
    if (!fs.existsSync(dir)) continue;

    const files = fs.readdirSync(dir);
    for (const file of files) {
      if (file.startsWith('.') || seenPaths.has(file)) continue;

      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (!stat.isFile()) continue;

      seenPaths.add(file);
      const buffer = fs.readFileSync(fullPath);
      const ext = path.extname(file).toLowerCase();
      const mimeType = mimeMap[ext] || 'application/octet-stream';

      try {
        await prisma.storedFile.upsert({
          where: { storagePath: file },
          create: {
            storagePath: file,
            fileName: file,
            mimeType,
            fileSize: buffer.length,
            data: buffer,
          },
          update: {
            fileName: file,
            mimeType,
            fileSize: buffer.length,
            data: buffer,
          },
        });
        console.log(`[SYNCED] ${file} (${buffer.length} bytes)`);
        synced++;
      } catch (err) {
        console.error(`[ERROR] Failed to sync ${file}:`, err.message);
        skipped++;
      }
    }
  }

  console.log(`\nSync Completed: ${synced} files uploaded to database, ${skipped} errors.`);
  await prisma.$disconnect();
}

syncAllUploads().catch((err) => {
  console.error('Fatal sync error:', err);
  process.exit(1);
});
