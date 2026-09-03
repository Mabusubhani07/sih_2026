import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

import authRoutes from './routes/authRoutes';
import caseRoutes from './routes/caseRoutes';
import documentRoutes from './routes/documentRoutes';
import evidenceRoutes from './routes/evidenceRoutes';
import searchRoutes from './routes/searchRoutes';
import aiRoutes from './routes/aiRoutes';
import auditRoutes from './routes/auditRoutes';
import userRoutes from './routes/userRoutes';
import notificationRoutes from './routes/notificationRoutes';
import hierarchyRoutes from './routes/hierarchyRoutes';

const app = express();
const PORT = process.env.PORT || 5000;

// Security & Parsing middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static file hosting for local document preview (PDF/images)
const uploadsDir = path.resolve(process.cwd(), process.env.LOCAL_STORAGE_DIR || './uploads');
app.use('/uploads', express.static(uploadsDir));

// System Healthcheck
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'OPERATIONAL',
    system: 'DIEMP - Digital Investigation & Evidence Management Platform',
    timestamp: new Date().toISOString(),
    version: '1.0.0-PROD',
  });
});

// Mount official API routes
app.use('/api/auth', authRoutes);
app.use('/api/cases', caseRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/evidence', evidenceRoutes);
app.use('/api/hierarchy', hierarchyRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);

// Locate combined frontend client distribution
const possibleDistPaths = [
  path.resolve(__dirname, '../../client/dist'),
  path.resolve(process.cwd(), '../client/dist'),
  path.resolve(process.cwd(), './client/dist'),
  path.resolve(__dirname, '../client/dist'),
];

let clientDistPath = possibleDistPaths.find((p) => fs.existsSync(p) && fs.existsSync(path.join(p, 'index.html')));

if (clientDistPath) {
  console.log(`[Combined Service] Serving unified frontend from: ${clientDistPath}`);
  app.use(express.static(clientDistPath));

  // Client SPA routing fallback
  app.get('*', (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    return res.sendFile(path.join(clientDistPath!, 'index.html'));
  });
}

// Centralized error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[DIEMP System Error]', err);
  const statusCode = err.status || (err.message && err.message.includes('Security Policy') ? 400 : 500);
  res.status(statusCode).json({
    error: err.message || 'An internal system error occurred while processing the official request.',
    code: err.code || 'SYS_ERROR',
  });
});

app.listen(PORT, () => {
  console.log(`================================================================`);
  console.log(` DIEMP Official Investigation Platform Backend`);
  console.log(` Service Port: ${PORT}`);
  console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(` Database: SQLite (dev.db) via Prisma ORM`);
  console.log(` Storage: ${process.env.STORAGE_PROVIDER || 'LOCAL'} (${uploadsDir})`);
  console.log(`================================================================`);
});
