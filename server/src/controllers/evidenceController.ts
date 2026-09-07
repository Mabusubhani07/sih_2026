import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { AuditService } from '../services/auditService';
import { HashService } from '../services/hashService';
import { DocumentIngestionService } from '../services/documentIngestionService';
import { AUDIT_ACTIONS, EVIDENCE_STATUS, ROLES } from '../config/constants';

export class EvidenceController {
  static async getEvidence(req: Request, res: Response) {
    try {
      const user = req.user!;
      const { caseId, category, status } = req.query;

      const where: any = {};
      if (caseId) where.caseId = String(caseId);
      if (category) where.category = String(category);
      if (status) where.currentStatus = String(status);

      // Filter by case authorization for non-admins
      if (user.role !== ROLES.ADMIN && !caseId) {
        where.case = {
          OR: [
            { createdById: user.id },
            { leadInvestigatorId: user.id },
            { memberships: { some: { userId: user.id } } },
            { assignedDepartmentId: user.departmentId },
          ],
        };
      }

      const items = await prisma.evidence.findMany({
        where,
        include: {
          case: { select: { id: true, caseNumber: true, title: true } },
          document: {
            select: {
              id: true,
              documentNumber: true,
              title: true,
              documentType: true,
              versions: { take: 1, orderBy: { versionNumber: 'desc' } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return res.json(items);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to retrieve evidence items.' });
    }
  }

  static async createEvidence(req: Request, res: Response) {
    try {
      const user = req.user!;
      const {
        caseId,
        documentId: providedDocId,
        title,
        description,
        category,
        collectedDate,
        collectedBy,
        custodyLocation,
        notes,
      } = req.body;
      const file = req.file;

      if (!caseId || !title || !description || !category || !custodyLocation) {
        return res.status(400).json({
          error: 'Required evidence ledger fields missing (Case ID, Title, Description, Category, Custody Location).',
        });
      }

      let attachedDocId = providedDocId || null;

      // If a real evidentiary file was uploaded, ingest it into the central repository
      if (file) {
        let subCategory = 'Digital Forensic Exhibit';
        if (category === 'DIGITAL') subCategory = 'Digital Forensic Exhibit';
        else if (category === 'DOCUMENTARY') subCategory = 'Documentary Evidence Exhibit';
        else if (category === 'BIOLOGICAL') subCategory = 'Biological Analysis Exhibit';

        const ingestedDoc = await DocumentIngestionService.ingest({
          caseId,
          userId: user.id,
          userRole: user.role,
          departmentId: user.departmentId,
          file: {
            originalname: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            buffer: file.buffer,
          },
          title: title.trim(),
          documentType: 'EVIDENCE',
          subCategory,
          changeSummary: `Seized exhibit payload: ${file.originalname}`,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        });

        attachedDocId = ingestedDoc.id;
      }

      const year = new Date().getFullYear();
      const count = await prisma.evidence.count();
      const evidenceNumber = `EVD-${year}-${String(count + 101).padStart(5, '0')}`;

      const evidence = await prisma.evidence.create({
        data: {
          evidenceNumber,
          caseId,
          documentId: attachedDocId,
          title: title.trim(),
          description: description.trim(),
          category,
          collectedDate: collectedDate ? new Date(collectedDate) : new Date(),
          collectedBy: collectedBy || user.name,
          custodyLocation: custodyLocation.trim(),
          integrityStatus: attachedDocId ? 'VERIFIED' : 'PENDING_ANALYSIS',
          currentStatus: EVIDENCE_STATUS.IN_CUSTODY,
          notes: notes || null,
        },
        include: {
          case: true,
          document: {
            include: {
              versions: { take: 1, orderBy: { versionNumber: 'desc' } },
            },
          },
        },
      });

      await AuditService.log({
        userId: user.id,
        userRole: user.role,
        action: 'CASE_UPDATED',
        caseId,
        status: 'SUCCESS',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: {
          evidenceNumber: evidence.evidenceNumber,
          title: evidence.title,
          category: evidence.category,
          custodyLocation: evidence.custodyLocation,
          documentId: attachedDocId,
        },
      });

      return res.status(201).json(evidence);
    } catch (err: any) {
      console.error('createEvidence error:', err);
      return res.status(500).json({ error: err.message || 'Failed to record evidence item.' });
    }
  }

  static async verifyEvidence(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = req.user!;

      const evidence = await prisma.evidence.findUnique({
        where: { id },
        include: {
          document: {
            include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } },
          },
        },
      });

      if (!evidence) {
        return res.status(404).json({ error: 'Evidence record not found.' });
      }

      let verificationDetails: any = null;
      let newIntegrityStatus = 'PENDING_ANALYSIS';

      if (evidence.document && evidence.document.versions.length > 0) {
        const latestVersion = evidence.document.versions[0];
        verificationDetails = await HashService.verifyFileIntegrity(
          latestVersion.storagePath,
          latestVersion.sha256Hash
        );

        newIntegrityStatus = verificationDetails.verified ? 'VERIFIED' : 'COMPROMISED';

        await prisma.evidence.update({
          where: { id },
          data: {
            integrityStatus: newIntegrityStatus,
          },
        });
      } else {
        verificationDetails = {
          verified: false,
          status: 'NO_FILE_ATTACHED',
          message: 'No digital bitstream artifact is attached to this evidence exhibit for cryptographic verification.',
        };
      }

      await AuditService.log({
        userId: user.id,
        userRole: user.role,
        action: AUDIT_ACTIONS.INTEGRITY_CHECK,
        caseId: evidence.caseId,
        documentId: evidence.documentId,
        status: verificationDetails.verified ? 'SUCCESS' : 'FAILURE',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: {
          evidenceNumber: evidence.evidenceNumber,
          integrityStatus: newIntegrityStatus,
          verificationResult: verificationDetails.status || (verificationDetails.verified ? 'INTEGRITY_VERIFIED' : 'INTEGRITY_FAILED'),
          verificationDetails,
        },
      });

      return res.json({
        evidenceId: evidence.id,
        evidenceNumber: evidence.evidenceNumber,
        integrityStatus: newIntegrityStatus,
        verificationDetails,
      });
    } catch (err: any) {
      console.error('verifyEvidence error:', err);
      return res.status(500).json({ error: err.message || 'Failed to verify evidence integrity.' });
    }
  }
}

