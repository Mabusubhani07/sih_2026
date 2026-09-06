import { Request, Response } from 'express';
import { prisma } from '../prisma';
import { storageService } from '../services/storageService';
import { HashService } from '../services/hashService';
import { AuditService } from '../services/auditService';
import { AiService } from '../services/aiService';
import { NotificationService } from '../services/notificationService';
import { DocumentIngestionService } from '../services/documentIngestionService';
import { FileValidationService } from '../services/fileValidationService';
import { TextExtractionService } from '../services/textExtractionService';
import { MetadataExtractionService } from '../services/metadataExtractionService';
import { AUDIT_ACTIONS, DOCUMENT_STATUS, DOCUMENT_TYPES, ROLES } from '../config/constants';

export class DocumentController {
  /**
   * Centralized document ingestion pipeline:
   * UPLOAD -> VALIDATE -> STORE -> HASH -> EXTRACT TEXT -> CLASSIFY -> METADATA -> VERSION -> AUDIT -> READY
   */
  static async uploadDocument(req: Request, res: Response) {
    try {
      const user = req.user!;
      const { caseId } = req.params;
      const { title, documentType, subCategory, isConfidential, changeSummary } = req.body;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: 'No official file attached for upload.' });
      }

      const caseRecord = await prisma.case.findUnique({
        where: { id: caseId },
      });
      if (!caseRecord) {
        return res.status(404).json({ error: 'Target case record does not exist.' });
      }

      // Check judicial write restriction
      if (user.role === ROLES.COURT_USER) {
        return res.status(403).json({
          error: 'ACCESS RESTRICTED: Judicial personnel maintain read-only access.',
          code: 'AUTH_403_COURT_READONLY',
        });
      }

      // Execute centralized document ingestion pipeline
      const doc = await DocumentIngestionService.ingest({
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
        title,
        documentType,
        subCategory,
        isConfidential: isConfidential === 'true' || isConfidential === true,
        changeSummary,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      // Notify case members
      await NotificationService.notifyCaseMembers(
        caseId,
        `Document Ingested: ${doc.documentNumber}`,
        `${doc.title} (${doc.documentType}) was processed and added to the case repository.`,
        'VERSION',
        user.id,
        `/cases/${caseId}?doc=${doc.id}`
      );

      return res.status(201).json(doc);
    } catch (err: any) {
      console.error('uploadDocument error:', err);
      return res.status(400).json({ error: err.message || 'Failed to complete document ingestion and hashing.' });
    }
  }

  /**
   * Uploads a new version for an existing document (Preserves all past versions)
   */
  static async uploadNewVersion(req: Request, res: Response) {
    try {
      const user = req.user!;
      const { id } = req.params;
      const { changeSummary } = req.body;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: 'File attachment required for new version.' });
      }

      const doc = await prisma.document.findUnique({
        where: { id },
        include: { versions: { orderBy: { versionNumber: 'desc' } } },
      });

      if (!doc) {
        return res.status(404).json({ error: 'Document record not found.' });
      }

      if (doc.status !== DOCUMENT_STATUS.ACTIVE) {
        return res.status(400).json({
          error: `Cannot append versions to a document with status: ${doc.status}.`,
        });
      }

      // Check role permissions: Court users cannot edit or upload versions
      if (user.role === ROLES.COURT_USER) {
        return res.status(403).json({
          error: 'ACCESS RESTRICTED: Judicial users maintain read-only access.',
          code: 'AUTH_403_COURT_READONLY',
        });
      }

      // 1. Strict File Validation
      const validation = FileValidationService.validate(file);
      if (!validation.isValid) {
        return res.status(400).json({ error: validation.error || 'File validation failed.' });
      }

      const nextVersionNumber = doc.currentVersionNumber + 1;

      // 2. Calculate REAL SHA-256 for the new version
      const sha256Hash = HashService.computeSha256(file.buffer);

      // 3. Save file to storage
      const stored = await storageService.saveFile(
        file.buffer,
        file.originalname,
        validation.normalizedMimeType
      );

      // Retrieve actual file bytes from storage abstraction
      const storedBytes = await storageService.getFileBuffer(stored.storagePath);
      console.log(`[OCR] Version upload: Storage retrieval successful for ${stored.storagePath} (${storedBytes.length} bytes)`);

      // 4. Text Extraction & Real OCR
      const extraction = await TextExtractionService.extractText(
        storedBytes,
        file.originalname,
        validation.normalizedMimeType
      );

      // 5. Create new DocumentVersion record and update Document.currentVersionNumber
      const [newVersion, updatedDoc] = await prisma.$transaction([
        prisma.documentVersion.create({
          data: {
            documentId: id,
            versionNumber: nextVersionNumber,
            fileName: stored.fileName,
            originalFileName: file.originalname,
            mimeType: validation.normalizedMimeType,
            fileSize: stored.fileSize,
            storagePath: stored.storagePath,
            sha256Hash,
            hashAlgorithm: 'SHA-256',
            changeSummary: changeSummary || `Updated to revision v${nextVersionNumber}.`,
            extractedText: extraction.text,
            uploadedById: user.id,
          },
        }),
        prisma.document.update({
          where: { id },
          data: {
            currentVersionNumber: nextVersionNumber,
            ocrText: extraction.text,
            isOcrProcessed: extraction.isOcr,
            processingStatus: 'READY',
          },
          include: {
            versions: { orderBy: { versionNumber: 'desc' } },
            metadata: true,
            createdBy: { select: { name: true, badgeNumber: true } },
          },
        }),
      ]);

      // 6. Update metadata with latest version findings
      const metadata = MetadataExtractionService.extract(
        extraction.text,
        file.originalname
      );
      await prisma.documentMetadata.upsert({
        where: { documentId: id },
        update: {
          referenceNumber: metadata.referenceNumber,
          documentDate: metadata.documentDate,
          entities: JSON.stringify(metadata.entities),
          keywords: JSON.stringify(metadata.keywords),
        },
        create: {
          documentId: id,
          referenceNumber: metadata.referenceNumber,
          documentDate: metadata.documentDate,
          entities: JSON.stringify(metadata.entities),
          keywords: JSON.stringify(metadata.keywords),
        },
      });

      // 7. Audit Log
      await AuditService.log({
        userId: user.id,
        userRole: user.role,
        action: AUDIT_ACTIONS.VERSION_CREATED,
        caseId: doc.caseId,
        documentId: doc.id,
        status: 'SUCCESS',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: {
          versionNumber: nextVersionNumber,
          previousVersion: doc.currentVersionNumber,
          sha256: sha256Hash,
          fileName: file.originalname,
          changeSummary,
          isOcr: extraction.isOcr,
        },
      });

      // 8. Notify case members
      await NotificationService.notifyCaseMembers(
        doc.caseId,
        `New Version v${nextVersionNumber}: ${doc.documentNumber}`,
        `Document revision v${nextVersionNumber} uploaded by ${user.name}.`,
        'VERSION',
        user.id,
        `/cases/${doc.caseId}?doc=${doc.id}`
      );

      return res.status(201).json({
        document: updatedDoc,
        version: newVersion,
      });
    } catch (err: any) {
      console.error('uploadNewVersion error:', err);
      return res.status(500).json({ error: err.message || 'Failed to record document revision.' });
    }
  }

  /**
   * Retrieves full document details with all versions and audit history
   */
  static async getDocumentById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = req.user!;

      const doc = await prisma.document.findUnique({
        where: { id },
        include: {
          case: {
            select: {
              id: true,
              caseNumber: true,
              title: true,
              status: true,
              assignedDepartmentId: true,
              leadInvestigatorId: true,
            },
          },
          department: true,
          metadata: true,
          createdBy: {
            select: { id: true, name: true, badgeNumber: true, role: true, department: true },
          },
          versions: {
            include: {
              uploadedBy: { select: { id: true, name: true, badgeNumber: true, role: true } },
            },
            orderBy: { versionNumber: 'desc' },
          },
          shares: {
            include: {
              sharedWithUser: { select: { id: true, name: true, badgeNumber: true, role: true } },
              sharedByUser: { select: { id: true, name: true, badgeNumber: true } },
            },
          },
          evidence: true,
        },
      });

      if (!doc) {
        return res.status(404).json({ error: 'Document not found.' });
      }

      // Log VIEW audit event
      await AuditService.log({
        userId: user.id,
        userRole: user.role,
        action: AUDIT_ACTIONS.DOCUMENT_VIEWED,
        caseId: doc.caseId,
        documentId: doc.id,
        status: 'SUCCESS',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: { documentNumber: doc.documentNumber, title: doc.title },
      });

      return res.json(doc);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to retrieve document details.' });
    }
  }

  /**
   * Downloads official file stream for specified version or latest
   */
  static async downloadDocument(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { version } = req.query;
      const user = req.user!;

      const doc = await prisma.document.findUnique({
        where: { id },
        include: {
          versions: {
            orderBy: { versionNumber: 'desc' },
          },
          shares: {
            where: { sharedWithUserId: user.id, revokedAt: null },
          },
        },
      });

      if (!doc) {
        return res.status(404).json({ error: 'Document not found.' });
      }

      // If user only has VIEW share permission and not DOWNLOAD
      const activeShare = doc.shares.find((s) => !s.expiresAt || new Date(s.expiresAt) > new Date());
      if (activeShare && activeShare.permission === 'VIEW' && user.role !== ROLES.ADMIN && doc.createdById !== user.id) {
        return res.status(403).json({
          error: 'ACCESS RESTRICTED: Your access clearance permits online view only, file download is not authorized.',
          code: 'AUTH_403_VIEW_ONLY',
        });
      }

      const targetVersionNumber = version ? parseInt(String(version), 10) : doc.currentVersionNumber;
      const versionRecord = doc.versions.find((v) => v.versionNumber === targetVersionNumber);

      if (!versionRecord) {
        return res.status(404).json({ error: `Version v${targetVersionNumber} not found.` });
      }

      const fileBuffer = await storageService.getFileBuffer(versionRecord.storagePath);

      // Audit Log
      await AuditService.log({
        userId: user.id,
        userRole: user.role,
        action: AUDIT_ACTIONS.DOCUMENT_DOWNLOADED,
        caseId: doc.caseId,
        documentId: doc.id,
        status: 'SUCCESS',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: {
          documentNumber: doc.documentNumber,
          version: targetVersionNumber,
          fileName: versionRecord.originalFileName,
          sha256: versionRecord.sha256Hash,
        },
      });

      res.setHeader('Content-Type', versionRecord.mimeType || 'application/octet-stream');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(versionRecord.originalFileName)}"`
      );
      res.setHeader('Content-Length', fileBuffer.length);
      return res.send(fileBuffer);
    } catch (err) {
      console.error('downloadDocument error:', err);
      return res.status(500).json({ error: 'Failed to stream document file.' });
    }
  }

  /**
   * Cryptographic integrity check: Computes live hash of file and compares with recorded hash
   */
  static async verifyIntegrity(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { version } = req.query;
      const user = req.user!;

      const doc = await prisma.document.findUnique({
        where: { id },
        include: { versions: true },
      });

      if (!doc) {
        return res.status(404).json({ error: 'Document not found.' });
      }

      const targetVersionNumber = version ? parseInt(String(version), 10) : doc.currentVersionNumber;
      const versionRecord = doc.versions.find((v) => v.versionNumber === targetVersionNumber);

      if (!versionRecord) {
        return res.status(404).json({ error: `Version v${targetVersionNumber} not found.` });
      }

      // Live verification by calculating SHA-256 of stored bytes
      const verificationResult = await HashService.verifyFileIntegrity(
        versionRecord.storagePath,
        versionRecord.sha256Hash
      );

      // Audit Log
      await AuditService.log({
        userId: user.id,
        userRole: user.role,
        action: AUDIT_ACTIONS.INTEGRITY_CHECK,
        caseId: doc.caseId,
        documentId: doc.id,
        status: verificationResult.verified ? 'SUCCESS' : 'FAILURE',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: {
          version: targetVersionNumber,
          verified: verificationResult.verified,
          algorithm: verificationResult.algorithm,
          recordedHash: verificationResult.recordedHash,
          calculatedHash: verificationResult.calculatedHash,
        },
      });

      return res.json({
        ...verificationResult,
        documentId: doc.id,
        documentNumber: doc.documentNumber,
        versionNumber: targetVersionNumber,
        originalFileName: versionRecord.originalFileName,
      });
    } catch (err) {
      console.error('verifyIntegrity error:', err);
      return res.status(500).json({ error: 'Failed to complete cryptographic verification check.' });
    }
  }

  /**
   * Non-destructive archiving or invalidation
   */
  static async archiveDocument(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status, reason } = req.body;
      const user = req.user!;

      if (!status || ![DOCUMENT_STATUS.ARCHIVED, DOCUMENT_STATUS.INVALID].includes(status)) {
        return res.status(400).json({
          error: "Invalid status parameter. Permitted: 'ARCHIVED' or 'INVALID'.",
        });
      }

      if (!reason || reason.trim().length < 5) {
        return res.status(400).json({
          error: 'An official documented reason (minimum 5 characters) is mandatory for document status modification.',
        });
      }

      const doc = await prisma.document.findUnique({ where: { id } });
      if (!doc) {
        return res.status(404).json({ error: 'Document record not found.' });
      }

      const updated = await prisma.document.update({
        where: { id },
        data: {
          status,
          ...(status === DOCUMENT_STATUS.ARCHIVED && { archivedReason: reason.trim() }),
          ...(status === DOCUMENT_STATUS.INVALID && { invalidReason: reason.trim() }),
        },
      });

      await AuditService.log({
        userId: user.id,
        userRole: user.role,
        action: status === DOCUMENT_STATUS.ARCHIVED ? AUDIT_ACTIONS.DOCUMENT_ARCHIVED : AUDIT_ACTIONS.DOCUMENT_INVALIDATED,
        caseId: doc.caseId,
        documentId: doc.id,
        status: 'SUCCESS',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: { newStatus: status, reason: reason.trim() },
      });

      return res.json(updated);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to update document archival record.' });
    }
  }

  /**
   * Controlled document sharing
   */
  static async shareDocument(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { sharedWithUserId, permission = 'VIEW', notes, expiresAt } = req.body;
      const user = req.user!;

      if (!sharedWithUserId) {
        return res.status(400).json({ error: 'Recipient official user ID is required.' });
      }

      const doc = await prisma.document.findUnique({ where: { id } });
      if (!doc) {
        return res.status(404).json({ error: 'Document not found.' });
      }

      const recipient = await prisma.user.findUnique({ where: { id: sharedWithUserId } });
      if (!recipient) {
        return res.status(404).json({ error: 'Recipient official user not found.' });
      }

      const share = await prisma.documentShare.create({
        data: {
          documentId: id,
          sharedWithUserId,
          sharedByUserId: user.id,
          permission,
          notes: notes || null,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
        },
        include: {
          sharedWithUser: { select: { id: true, name: true, email: true, badgeNumber: true, role: true } },
        },
      });

      await AuditService.log({
        userId: user.id,
        userRole: user.role,
        action: AUDIT_ACTIONS.DOCUMENT_SHARED,
        caseId: doc.caseId,
        documentId: doc.id,
        status: 'SUCCESS',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: {
          sharedWithUser: recipient.name,
          recipientBadge: recipient.badgeNumber,
          permission,
          expiresAt,
        },
      });

      await NotificationService.sendNotification({
        userId: sharedWithUserId,
        title: 'Document Access Granted',
        message: `${user.name} granted you ${permission} access to document: ${doc.title}.`,
        type: 'SHARE',
        link: `/cases/${doc.caseId}?doc=${doc.id}`,
      });

      return res.status(201).json(share);
    } catch (err) {
      console.error('shareDocument error:', err);
      return res.status(500).json({ error: 'Failed to establish controlled document share.' });
    }
  }

  /**
   * Revoke controlled document share
   */
  static async revokeShare(req: Request, res: Response) {
    try {
      const { id, shareId } = req.params;
      const user = req.user!;

      const share = await prisma.documentShare.findUnique({
        where: { id: shareId },
        include: { sharedWithUser: true, document: true },
      });

      if (!share || share.documentId !== id) {
        return res.status(404).json({ error: 'Active share record not found.' });
      }

      const updated = await prisma.documentShare.update({
        where: { id: shareId },
        data: {
          revokedAt: new Date(),
          revokedByUserId: user.id,
        },
      });

      await AuditService.log({
        userId: user.id,
        userRole: user.role,
        action: AUDIT_ACTIONS.SHARE_REVOKED,
        caseId: share.document.caseId,
        documentId: share.documentId,
        status: 'SUCCESS',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: {
          revokedUser: share.sharedWithUser.name,
          badgeNumber: share.sharedWithUser.badgeNumber,
        },
      });

      await NotificationService.sendNotification({
        userId: share.sharedWithUserId,
        title: 'Document Access Revoked',
        message: `Your clearance for document: ${share.document.title} has been revoked by supervisory authority.`,
        type: 'SHARE',
      });

      return res.json({ message: 'Document access clearance revoked successfully.', share: updated });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to revoke document access.' });
    }
  }

  /**
   * Correct or adjust document classification and subcategory
   */
  static async updateClassification(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = req.user!;
      const { documentType, subCategory, rationale } = req.body;

      if (!documentType) {
        return res.status(400).json({ error: 'Document classification type is required.' });
      }

      const doc = await prisma.document.findUnique({ where: { id } });
      if (!doc) {
        return res.status(404).json({ error: 'Document not found.' });
      }

      const updated = await prisma.document.update({
        where: { id },
        data: {
          documentType,
          subCategory: subCategory !== undefined ? subCategory : doc.subCategory,
          classificationReason: rationale || `Officially reclassified by ${user.name} (${user.role}).`,
        },
        include: { metadata: true, versions: true },
      });

      await AuditService.log({
        userId: user.id,
        userRole: user.role,
        action: 'DOCUMENT_CLASSIFICATION_UPDATED',
        caseId: doc.caseId,
        documentId: doc.id,
        status: 'SUCCESS',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: {
          previousType: doc.documentType,
          newType: documentType,
          previousSubCategory: doc.subCategory,
          newSubCategory: subCategory,
          rationale,
        },
      });

      return res.json(updated);
    } catch (err: any) {
      console.error('updateClassification error:', err);
      return res.status(500).json({ error: 'Failed to update document classification.' });
    }
  }

  /**
   * Update or correct extracted document metadata with transactional persistence and audit logging
   */
  static async updateMetadata(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = req.user!;

      // Retrieve current document state with metadata and case relationships
      const existingDoc = await prisma.document.findUnique({
        where: { id },
        include: {
          metadata: true,
          department: true,
          case: {
            select: {
              id: true,
              caseNumber: true,
              firNumber: true,
            },
          },
        },
      });

      if (!existingDoc) {
        return res.status(404).json({ error: 'Document not found.', code: 'DOC_NOT_FOUND' });
      }

      // Check judicial mutation restriction defensively
      if (user.role === ROLES.COURT_USER) {
        return res.status(403).json({
          error: 'ACCESS RESTRICTED: Judicial personnel maintain read-only discovery clearance.',
          code: 'AUTH_403_COURT_READONLY',
        });
      }

      // 1. Backend Validation
      const {
        title,
        documentType,
        subCategory,
        category,
        departmentId,
        departmentName,
        department,
        referenceNumber,
        caseNumber,
        firNumber,
        documentDate,
        date,
        issuingAuthority,
        authority,
        location,
        language,
        entities,
        keywords,
      } = req.body;

      if (title !== undefined) {
        if (typeof title !== 'string' || title.trim().length === 0) {
          return res.status(400).json({ error: 'Document title cannot be empty.' });
        }
        if (title.trim().length > 255) {
          return res.status(400).json({ error: 'Document title cannot exceed 255 characters.' });
        }
      }

      if (documentType !== undefined) {
        const allowedTypes = Object.values(DOCUMENT_TYPES);
        if (!allowedTypes.includes(documentType)) {
          return res.status(400).json({
            error: `Invalid document classification type. Allowed values: ${allowedTypes.join(', ')}`,
          });
        }
      }

      const rawDate = documentDate !== undefined ? documentDate : date;
      if (rawDate !== undefined && rawDate !== null && String(rawDate).trim() !== '') {
        const parsedDate = new Date(rawDate);
        if (isNaN(parsedDate.getTime())) {
          return res.status(400).json({ error: 'Invalid document date value.' });
        }
      }

      if (language !== undefined && language !== null && String(language).trim().length > 50) {
        return res.status(400).json({ error: 'Language string exceeds permitted length.' });
      }

      // 2. Prepare Document Model Updates
      const docUpdate: any = {};
      if (title !== undefined) {
        docUpdate.title = title.trim();
      }
      if (documentType !== undefined) {
        docUpdate.documentType = documentType;
      }

      const effectiveCategory = subCategory !== undefined ? subCategory : category;
      if (effectiveCategory !== undefined) {
        docUpdate.subCategory = effectiveCategory && String(effectiveCategory).trim()
          ? String(effectiveCategory).trim()
          : null;
      }

      const effectiveDeptName = departmentName !== undefined ? departmentName : department;
      if (departmentId !== undefined) {
        if (departmentId) {
          const dept = await prisma.department.findUnique({ where: { id: departmentId } });
          if (dept) docUpdate.departmentId = dept.id;
        }
      } else if (effectiveDeptName !== undefined && effectiveDeptName && String(effectiveDeptName).trim()) {
        const trimmedDept = String(effectiveDeptName).trim();
        const matchedDept = await prisma.department.findFirst({
          where: {
            OR: [
              { name: { equals: trimmedDept, mode: 'insensitive' } },
              { code: { equals: trimmedDept, mode: 'insensitive' } },
            ],
          },
        });
        if (matchedDept) {
          docUpdate.departmentId = matchedDept.id;
        }
      }

      // 3. Prepare DocumentMetadata Model Updates (handling null/cleared values)
      const metadataUpdate: any = {
        isVerified: true,
        verifiedById: user.id,
        verifiedAt: new Date(),
      };

      if (referenceNumber !== undefined) {
        metadataUpdate.referenceNumber = referenceNumber && String(referenceNumber).trim()
          ? String(referenceNumber).trim()
          : null;
      }
      if (caseNumber !== undefined) {
        metadataUpdate.caseNumber = caseNumber && String(caseNumber).trim()
          ? String(caseNumber).trim()
          : null;
      }
      if (firNumber !== undefined) {
        metadataUpdate.firNumber = firNumber && String(firNumber).trim()
          ? String(firNumber).trim()
          : null;
      }
      if (rawDate !== undefined) {
        metadataUpdate.documentDate = rawDate && String(rawDate).trim() ? new Date(rawDate) : null;
      }

      const effectiveAuthority = issuingAuthority !== undefined ? issuingAuthority : authority;
      if (effectiveAuthority !== undefined) {
        metadataUpdate.issuingAuthority = effectiveAuthority && String(effectiveAuthority).trim()
          ? String(effectiveAuthority).trim()
          : null;
      }

      if (effectiveDeptName !== undefined) {
        metadataUpdate.departmentName = effectiveDeptName && String(effectiveDeptName).trim()
          ? String(effectiveDeptName).trim()
          : null;
      }

      if (location !== undefined) {
        metadataUpdate.location = location && String(location).trim()
          ? String(location).trim()
          : null;
      }

      if (language !== undefined) {
        metadataUpdate.language = language && String(language).trim()
          ? String(language).trim()
          : 'en';
      }

      if (entities !== undefined) {
        metadataUpdate.entities = Array.isArray(entities)
          ? JSON.stringify(entities)
          : (entities && String(entities).trim() ? String(entities).trim() : null);
      }

      if (keywords !== undefined) {
        metadataUpdate.keywords = Array.isArray(keywords)
          ? JSON.stringify(keywords)
          : (keywords && String(keywords).trim() ? String(keywords).trim() : null);
      }

      // 4. Compute Changed Fields for Audit Log
      const changedFields: string[] = [];
      if (docUpdate.title !== undefined && docUpdate.title !== existingDoc.title) {
        changedFields.push('title');
      }
      if (docUpdate.documentType !== undefined && docUpdate.documentType !== existingDoc.documentType) {
        changedFields.push('documentType');
      }
      if (docUpdate.subCategory !== undefined && docUpdate.subCategory !== (existingDoc.subCategory ?? null)) {
        changedFields.push('category');
      }
      if (docUpdate.departmentId !== undefined && docUpdate.departmentId !== existingDoc.departmentId) {
        changedFields.push('department');
      }

      const prevMeta = existingDoc.metadata;
      if (metadataUpdate.referenceNumber !== undefined && metadataUpdate.referenceNumber !== (prevMeta?.referenceNumber ?? null)) {
        changedFields.push('referenceNumber');
      }
      if (metadataUpdate.documentDate !== undefined) {
        const prevD = prevMeta?.documentDate ? new Date(prevMeta.documentDate).toISOString().slice(0, 10) : null;
        const newD = metadataUpdate.documentDate ? new Date(metadataUpdate.documentDate).toISOString().slice(0, 10) : null;
        if (prevD !== newD) changedFields.push('documentDate');
      }
      if (metadataUpdate.issuingAuthority !== undefined && metadataUpdate.issuingAuthority !== (prevMeta?.issuingAuthority ?? null)) {
        changedFields.push('issuingAuthority');
      }
      if (metadataUpdate.departmentName !== undefined && metadataUpdate.departmentName !== (prevMeta?.departmentName ?? null)) {
        changedFields.push('departmentName');
      }
      if (metadataUpdate.location !== undefined && metadataUpdate.location !== (prevMeta?.location ?? null)) {
        changedFields.push('location');
      }
      if (metadataUpdate.language !== undefined && metadataUpdate.language !== (prevMeta?.language ?? 'en')) {
        changedFields.push('language');
      }
      if (metadataUpdate.entities !== undefined && metadataUpdate.entities !== (prevMeta?.entities ?? null)) {
        changedFields.push('entities');
      }
      if (metadataUpdate.keywords !== undefined && metadataUpdate.keywords !== (prevMeta?.keywords ?? null)) {
        changedFields.push('keywords');
      }

      // 5. Execute Transactional Database Update
      await prisma.$transaction(async (tx) => {
        if (Object.keys(docUpdate).length > 0) {
          await tx.document.update({
            where: { id },
            data: docUpdate,
          });
        }

        await tx.documentMetadata.upsert({
          where: { documentId: id },
          update: metadataUpdate,
          create: {
            documentId: id,
            caseNumber: metadataUpdate.caseNumber ?? existingDoc.case?.caseNumber ?? null,
            firNumber: metadataUpdate.firNumber ?? existingDoc.case?.firNumber ?? null,
            referenceNumber: metadataUpdate.referenceNumber ?? existingDoc.documentNumber,
            documentDate: metadataUpdate.documentDate ?? existingDoc.createdAt,
            issuingAuthority: metadataUpdate.issuingAuthority ?? null,
            departmentName: metadataUpdate.departmentName ?? null,
            location: metadataUpdate.location ?? null,
            language: metadataUpdate.language ?? 'en',
            entities: metadataUpdate.entities ?? null,
            keywords: metadataUpdate.keywords ?? null,
            isVerified: true,
            verifiedById: user.id,
            verifiedAt: new Date(),
          },
        });
      });

      // 6. Record Real Append-Only Audit Event
      await AuditService.log({
        userId: user.id,
        userRole: user.role,
        action: AUDIT_ACTIONS.METADATA_UPDATED,
        caseId: existingDoc.caseId,
        documentId: existingDoc.id,
        status: 'SUCCESS',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: {
          documentNumber: existingDoc.documentNumber,
          changedFields: changedFields.length > 0 ? changedFields : ['metadata'],
          verifiedBy: user.name,
        },
      });

      // 7. Retrieve Fresh Persisted Document from Database
      const freshDoc = await prisma.document.findUnique({
        where: { id },
        include: {
          case: {
            select: {
              id: true,
              caseNumber: true,
              firNumber: true,
              title: true,
              status: true,
              assignedDepartmentId: true,
              leadInvestigatorId: true,
            },
          },
          department: true,
          metadata: true,
          createdBy: {
            select: { id: true, name: true, badgeNumber: true, role: true, department: true },
          },
          versions: {
            include: {
              uploadedBy: { select: { id: true, name: true, badgeNumber: true, role: true } },
            },
            orderBy: { versionNumber: 'desc' },
          },
          shares: {
            include: {
              sharedWithUser: { select: { id: true, name: true, badgeNumber: true, role: true } },
              sharedByUser: { select: { id: true, name: true, badgeNumber: true } },
            },
          },
          evidence: true,
        },
      });

      if (!freshDoc) {
        return res.status(404).json({ error: 'Failed to retrieve updated document record.' });
      }

      // Return both document structure and metadata keys for seamless frontend consumption
      return res.json({
        ...freshDoc,
        ...freshDoc.metadata,
        document: freshDoc,
        metadata: freshDoc.metadata,
      });
    } catch (err: any) {
      console.error('updateMetadata error:', err);
      return res.status(500).json({ error: 'Failed to update document metadata.' });
    }
  }

  /**
   * Retries document processing pipeline after failure
   */
  static async retryProcessing(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = req.user!;

      const doc = await DocumentIngestionService.retry(id, user.id, user.role);
      return res.json({ message: 'Document pipeline reprocessed successfully.', document: doc });
    } catch (err: any) {
      console.error('retryProcessing error:', err);
      return res.status(500).json({ error: err.message || 'Failed to retry processing.' });
    }
  }

  /**
   * Retrieves extracted/OCR text for authorized discovery
   */
  static async getOcrText(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { version } = req.query;

      const doc = await prisma.document.findUnique({
        where: { id },
        select: {
          id: true,
          documentNumber: true,
          title: true,
          ocrText: true,
          isOcrProcessed: true,
          processingStatus: true,
          processingError: true,
          currentVersionNumber: true,
          versions: {
            select: {
              versionNumber: true,
              extractedText: true,
              originalFileName: true,
            },
            orderBy: { versionNumber: 'desc' },
          },
        },
      });

      if (!doc) {
        return res.status(404).json({ error: 'Document not found.' });
      }

      const targetVer = version ? parseInt(String(version), 10) : doc.currentVersionNumber;
      const verRecord = doc.versions.find((v) => v.versionNumber === targetVer);

      return res.json({
        id: doc.id,
        documentNumber: doc.documentNumber,
        title: doc.title,
        versionNumber: targetVer,
        ocrText: verRecord?.extractedText || doc.ocrText,
        isOcrProcessed: doc.isOcrProcessed,
        processingStatus: doc.processingStatus,
        processingError: doc.processingError,
      });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to retrieve OCR text.' });
    }
  }
}

