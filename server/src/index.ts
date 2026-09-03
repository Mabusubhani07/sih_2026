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
const defaultUploads = process.env.VERCEL === '1' ? '/tmp/uploads' : './uploads';
const uploadsDir = path.resolve(process.env.LOCAL_STORAGE_DIR || defaultUploads);
if (fs.existsSync(uploadsDir)) {
  app.use('/uploads', express.static(uploadsDir));
}

// System Healthcheck
app.get(['/api/health', '/health'], async (_req: Request, res: Response) => {
  let dbStatus = 'UNKNOWN';
  try {
    const { prisma } = await import('./prisma');
    const userCount = await prisma.user.count();
    dbStatus = `CONNECTED (users: ${userCount})`;
  } catch (err: any) {
    dbStatus = `FAILED: ${err.message}`;
  }

  res.json({
    status: 'OPERATIONAL',
    database: dbStatus,
    system: 'DIEMP - Digital Investigation & Evidence Management Platform',
    timestamp: new Date().toISOString(),
    version: '1.0.0-PROD',
  });
});

// Mount official API routes (both /api and root to guarantee serverless rewrite compatibility)
const mountOfficialRoutes = (prefix: string) => {
  app.use(`${prefix}/auth`, authRoutes);
  app.use(`${prefix}/cases`, caseRoutes);
  app.use(`${prefix}/documents`, documentRoutes);
  app.use(`${prefix}/evidence`, evidenceRoutes);
  app.use(`${prefix}/hierarchy`, hierarchyRoutes);
  app.use(`${prefix}/search`, searchRoutes);
  app.use(`${prefix}/ai`, aiRoutes);
  app.use(`${prefix}/audit-logs`, auditRoutes);
  app.use(`${prefix}/users`, userRoutes);
  app.use(`${prefix}/notifications`, notificationRoutes);
};

mountOfficialRoutes('/api');
mountOfficialRoutes('');

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

if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`================================================================`);
    console.log(` DIEMP Official Investigation Platform Backend`);
    console.log(` Service Port: ${PORT}`);
    console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(` Database: PostgreSQL via Prisma ORM`);
    console.log(` Storage: ${process.env.STORAGE_PROVIDER || 'LOCAL'} (${uploadsDir})`);
    console.log(`================================================================`);
  });
}

export default app;
export { app };
