import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { AiService } from '../services/aiService';
import { AuditService } from '../services/auditService';
import { storageService } from '../services/storageService';
import { AUDIT_ACTIONS } from '../config/constants';

export class AiController {
  static async summarizeDocument(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = req.user!;

      const doc = await prisma.document.findUnique({
        where: { id },
        include: {
          versions: {
            orderBy: { versionNumber: 'desc' },
            take: 1,
          },
        },
      });

      if (!doc) {
        return res.status(404).json({ error: 'Target document not found.' });
      }

      let contentToSummarize = doc.title;

      if (doc.versions.length > 0) {
        const latestVersion = doc.versions[0];
        if (latestVersion.extractedText) {
          contentToSummarize = latestVersion.extractedText;
        } else {
          try {
            const buffer = await storageService.getFileBuffer(latestVersion.storagePath);
            if (latestVersion.mimeType.includes('text') || latestVersion.mimeType.includes('json')) {
              contentToSummarize = buffer.toString('utf-8');
            } else {
              contentToSummarize = `${doc.title}\nClassification: ${doc.documentType}\nRevision: v${latestVersion.versionNumber}\nChange Notes: ${latestVersion.changeSummary || 'N/A'}`;
            }
          } catch (e) {
            // fallback
          }
        }
      }

      const summary = await AiService.summarizeDocument(doc.title, contentToSummarize, doc.documentType);

      await AuditService.log({
        userId: user.id,
        userRole: user.role,
        action: AUDIT_ACTIONS.AI_SUMMARY_GENERATED,
        caseId: doc.caseId,
        documentId: doc.id,
        status: 'SUCCESS',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: {
          documentNumber: doc.documentNumber,
          engine: summary.source,
        },
      });

      return res.json(summary);
    } catch (err) {
      console.error('summarizeDocument error:', err);
      return res.status(500).json({ error: 'Failed to generate document summary.' });
    }
  }

  static async classifyPreview(req: Request, res: Response) {
    try {
      const { fileName, text } = req.body;
      if (!fileName) {
        return res.status(400).json({ error: 'File name is required.' });
      }

      const classification = AiService.classifyDocument(fileName, text || '');
      return res.json(classification);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to preview classification.' });
    }
  }
}
