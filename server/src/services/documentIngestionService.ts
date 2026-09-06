import { prisma } from '../prisma';
import { storageService } from './storageService';
import { HashService } from './hashService';
import { FileValidationService } from './fileValidationService';
import { TextExtractionService } from './textExtractionService';
import { ClassificationService } from './classificationService';
import { MetadataExtractionService } from './metadataExtractionService';
import { AuditService } from './auditService';
import { AUDIT_ACTIONS, DOCUMENT_STATUS } from '../config/constants';
import fs from 'fs';
import path from 'path';

export interface IngestionOptions {
  caseId: string;
  userId: string;
  userRole: string;
  departmentId: string;
  file: {
    originalname: string;
    mimetype: string;
    size: number;
    buffer: Buffer;
  };
  title?: string;
  documentType?: string;
  subCategory?: string;
  isConfidential?: boolean;
  changeSummary?: string;
  ipAddress?: string;
  userAgent?: string;
}

export class DocumentIngestionService {
  /**
   * Complete End-to-End Automated Ingestion Pipeline
   */
  static async ingest(options: IngestionOptions) {
    const {
      caseId,
      userId,
      userRole,
      departmentId,
      file,
      title,
      documentType,
      subCategory,
      isConfidential = false,
      changeSummary,
      ipAddress,
      userAgent,
    } = options;

    // Step 1: Validate File Payload
    const validation = FileValidationService.validate(file);
    if (!validation.isValid) {
      throw new Error(validation.error || 'File validation failed.');
    }

    // Step 2: Calculate Cryptographic SHA-256 Bitstream Hash from File Bytes
    const sha256Hash = HashService.computeSha256(file.buffer);

    // Step 3: Store Original File Payload Unchanged
    const stored = await storageService.saveFile(
      file.buffer,
      file.originalname,
      validation.normalizedMimeType
    );

    // Step 4: Generate Statutory Document ID
    const year = new Date().getFullYear();
    const docCount = await prisma.document.count();
    const documentNumber = `DOC-${year}-${String(docCount + 101).padStart(5, '0')}`;

    // Step 5: Fetch Case info for fallback context
    const caseRecord = await prisma.case.findUnique({
      where: { id: caseId },
      select: { caseNumber: true, firNumber: true },
    });

    // Step 6: Initial Document and Version Creation (State: UPLOADED)
    const doc = await prisma.document.create({
      data: {
        documentNumber,
        caseId,
        title: (title || file.originalname).trim(),
        documentType: documentType || 'OTHER',
        subCategory: subCategory || undefined,
        departmentId,
        status: DOCUMENT_STATUS.ACTIVE,
        processingStatus: 'UPLOADED',
        isConfidential,
        currentVersionNumber: 1,
        createdById: userId,
        versions: {
          create: {
            versionNumber: 1,
            fileName: stored.fileName,
            originalFileName: file.originalname,
            mimeType: validation.normalizedMimeType,
            fileSize: stored.fileSize,
            storagePath: stored.storagePath,
            sha256Hash,
            hashAlgorithm: 'SHA-256',
            changeSummary: changeSummary || 'Initial document registration into case repository.',
            subCategory: subCategory || undefined,
            uploadedById: userId,
          },
        },
      },
      include: {
        versions: true,
      },
    });

    // Step 7: Execute Sequential Processing Stages
    try {
      console.log(`[OCR] Document ID: ${doc.id}`);
      console.log(`[OCR] Version ID: 1`);
      console.log(`[OCR] MIME type: ${validation.normalizedMimeType}`);
      console.log(`[OCR] File size: ${stored.fileSize} bytes`);

      // Retrieve actual file bytes from storage abstraction
      const storedBytes = await storageService.getFileBuffer(stored.storagePath);
      console.log(`[OCR] Storage retrieval successful: ${stored.storagePath} (${storedBytes.length} bytes)`);

      // 7a. Text Extraction / Real OCR
      await prisma.document.update({
        where: { id: doc.id },
        data: { processingStatus: 'PROCESSING' },
      });

      console.log(`[OCR] OCR / Extraction started for ${doc.documentNumber}`);
      const extraction = await TextExtractionService.extractText(
        storedBytes,
        file.originalname,
        validation.normalizedMimeType
      );

      console.log(`[OCR] Extraction method: ${extraction.method}`);
      console.log(`[OCR] Page count: ${extraction.pageCount}`);
      console.log(`[OCR] OCR completed`);
      console.log(`[OCR] Extracted character count: ${extraction.text.length}`);

      await prisma.document.update({
        where: { id: doc.id },
        data: {
          ocrText: extraction.text,
          isOcrProcessed: extraction.isOcr,
          processingStatus: 'OCR_COMPLETE',
        },
      });

      await prisma.documentVersion.update({
        where: {
          documentId_versionNumber: {
            documentId: doc.id,
            versionNumber: 1,
          },
        },
        data: {
          extractedText: extraction.text,
        },
      });
      console.log(`[OCR] Database save successful`);

      // 7b. Classification
      const classification = ClassificationService.classify(file.originalname, extraction.text);
      const finalType = documentType && documentType !== 'AUTO' ? documentType : classification.documentType;
      const finalSub = subCategory || classification.subCategory;

      await prisma.document.update({
        where: { id: doc.id },
        data: {
          documentType: finalType,
          subCategory: finalSub,
          classificationReason: classification.rationale,
          processingStatus: 'CLASSIFIED',
        },
      });

      // 7c. Metadata Extraction & Persistence
      const metadata = MetadataExtractionService.extract(
        extraction.text,
        file.originalname,
        caseRecord?.caseNumber,
        caseRecord?.firNumber
      );

      await prisma.documentMetadata.upsert({
        where: { documentId: doc.id },
        update: {
          caseNumber: metadata.caseNumber,
          firNumber: metadata.firNumber,
          referenceNumber: metadata.referenceNumber,
          documentDate: metadata.documentDate,
          issuingAuthority: metadata.issuingAuthority,
          departmentName: metadata.departmentName,
          location: metadata.location,
          language: metadata.language,
          entities: JSON.stringify(metadata.entities),
          keywords: JSON.stringify(metadata.keywords),
          categoryConfidence: metadata.categoryConfidence,
        },
        create: {
          documentId: doc.id,
          caseNumber: metadata.caseNumber,
          firNumber: metadata.firNumber,
          referenceNumber: metadata.referenceNumber,
          documentDate: metadata.documentDate,
          issuingAuthority: metadata.issuingAuthority,
          departmentName: metadata.departmentName,
          location: metadata.location,
          language: metadata.language,
          entities: JSON.stringify(metadata.entities),
          keywords: JSON.stringify(metadata.keywords),
          categoryConfidence: metadata.categoryConfidence,
        },
      });

      // 7d. Indexing & Completion -> State: READY
      const finalizedDoc = await prisma.document.update({
        where: { id: doc.id },
        data: {
          processingStatus: 'READY',
          processingError: null,
        },
        include: {
          versions: true,
          metadata: true,
          createdBy: { select: { id: true, name: true, badgeNumber: true, role: true } },
          department: true,
        },
      });
      console.log(`[OCR] Search indexing successful: Document ${doc.documentNumber} is READY`);

      // Step 8: Append-Only Immutable Audit Log
      await AuditService.log({
        userId,
        userRole,
        action: AUDIT_ACTIONS.DOCUMENT_UPLOADED,
        caseId,
        documentId: finalizedDoc.id,
        status: 'SUCCESS',
        ipAddress,
        userAgent,
        details: {
          documentNumber: finalizedDoc.documentNumber,
          fileName: file.originalname,
          sha256: sha256Hash,
          documentType: finalizedDoc.documentType,
          subCategory: finalizedDoc.subCategory,
          processingStatus: 'READY',
          isOcr: extraction.isOcr,
          extractionMethod: extraction.method,
        },
      });

      return finalizedDoc;
    } catch (procErr: any) {
      console.error('[OCR] Document pipeline processing failed:', procErr);

      // Preserve original file, record failure state
      const failedDoc = await prisma.document.update({
        where: { id: doc.id },
        data: {
          processingStatus: 'PROCESSING_FAILED',
          processingError: procErr.message || 'Pipeline processing failed.',
        },
        include: {
          versions: true,
          metadata: true,
          createdBy: { select: { id: true, name: true, badgeNumber: true, role: true } },
          department: true,
        },
      });

      await AuditService.log({
        userId,
        userRole,
        action: AUDIT_ACTIONS.DOCUMENT_UPLOADED,
        caseId,
        documentId: doc.id,
        status: 'FAILURE',
        ipAddress,
        userAgent,
        details: {
          documentNumber: doc.documentNumber,
          fileName: file.originalname,
          error: procErr.message,
          processingStatus: 'PROCESSING_FAILED',
        },
      });

      return failedDoc;
    }
  }

  /**
   * Retries document processing for documents in PROCESSING_FAILED state
   */
  static async retry(documentId: string, userId: string, userRole: string) {
    const doc = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 1,
        },
        case: { select: { caseNumber: true, firNumber: true } },
      },
    });

    if (!doc) throw new Error('Document not found.');
    if (!doc.versions || doc.versions.length === 0) throw new Error('No file version recorded.');

    const activeVersion = doc.versions[0];
    const buffer = await storageService.getFileBuffer(activeVersion.storagePath);
    console.log(`[OCR] Retry: Storage retrieval successful for ${activeVersion.storagePath} (${buffer.length} bytes)`);

    // Update status to PROCESSING
    await prisma.document.update({
      where: { id: doc.id },
      data: { processingStatus: 'PROCESSING', processingError: null },
    });

    try {
      // 1. Text Extraction
      const extraction = await TextExtractionService.extractText(
        buffer,
        activeVersion.originalFileName,
        activeVersion.mimeType
      );

      // 2. Classification
      const classification = ClassificationService.classify(
        activeVersion.originalFileName,
        extraction.text
      );

      // 3. Metadata
      const metadata = MetadataExtractionService.extract(
        extraction.text,
        activeVersion.originalFileName,
        doc.case?.caseNumber,
        doc.case?.firNumber
      );

      // Save to DB
      await prisma.documentMetadata.upsert({
        where: { documentId: doc.id },
        update: {
          caseNumber: metadata.caseNumber,
          firNumber: metadata.firNumber,
          referenceNumber: metadata.referenceNumber,
          documentDate: metadata.documentDate,
          issuingAuthority: metadata.issuingAuthority,
          departmentName: metadata.departmentName,
          location: metadata.location,
          language: metadata.language,
          entities: JSON.stringify(metadata.entities),
          keywords: JSON.stringify(metadata.keywords),
        },
        create: {
          documentId: doc.id,
          caseNumber: metadata.caseNumber,
          firNumber: metadata.firNumber,
          referenceNumber: metadata.referenceNumber,
          documentDate: metadata.documentDate,
          issuingAuthority: metadata.issuingAuthority,
          departmentName: metadata.departmentName,
          location: metadata.location,
          language: metadata.language,
          entities: JSON.stringify(metadata.entities),
          keywords: JSON.stringify(metadata.keywords),
        },
      });

      const updated = await prisma.document.update({
        where: { id: doc.id },
        data: {
          ocrText: extraction.text,
          isOcrProcessed: extraction.isOcr,
          documentType: doc.documentType === 'OTHER' ? classification.documentType : doc.documentType,
          subCategory: doc.subCategory || classification.subCategory,
          classificationReason: classification.rationale,
          processingStatus: 'READY',
          processingError: null,
        },
        include: {
          versions: true,
          metadata: true,
        },
      });

      await AuditService.log({
        userId,
        userRole,
        action: 'DOCUMENT_PROCESSING_RETRIED',
        caseId: doc.caseId,
        documentId: doc.id,
        status: 'SUCCESS',
        details: {
          documentNumber: doc.documentNumber,
          processingStatus: 'READY',
        },
      });

      return updated;
    } catch (err: any) {
      await prisma.document.update({
        where: { id: doc.id },
        data: {
          processingStatus: 'PROCESSING_FAILED',
          processingError: err.message,
        },
      });
      throw err;
    }
  }
}
