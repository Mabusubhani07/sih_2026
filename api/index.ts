import app from '../server/src/index';

export default async (req: any, res: any) => {
  try {
    return await app(req, res);
  } catch (err: any) {
    console.error('[Vercel Serverless Invocation Error]', err);
    if (!res.headersSent) {
      return res.status(500).json({
        error: err.message || 'Serverless Execution Error',
        details: err.stack,
      });
    }
  }
};
