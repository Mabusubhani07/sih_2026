import { prisma } from '../prisma';
import { storageService } from './storageService';
import { HashService } from './hashService';
import { FileValidationService } from './fileValidationService';
import { TextExtractionService } from './textExtractionService';
import { ClassificationService } from './classificationService';
import { MetadataExtractionService } from './metadataExtractionService';
import { AuditService } from './auditService';
import { AUDIT_ACTIONS, DOCUMENT_STATUS } from '../config/constants';

export interface IngestionOptions {
  caseId: string;
  userId: string;
  userRole: string;
  departmentId: string;
  file?: {
    originalname: string;
    mimetype: string;
    size: number;
    buffer: Buffer;
  };
  uploadId?: string;
  storagePath?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  sha256Hash?: string;
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
   * Expedited End-to-End Automated Ingestion Pipeline
   * Returns document immediately (< 300ms) with status 'PROCESSING',
   * while OCR, speech transcription, classification, and metadata extraction
   * execute asynchronously in the background.
   */
  static async ingest(options: IngestionOptions) {
    const {
      caseId,
      userId,
      userRole,
      departmentId,
      file,
      uploadId,
      storagePath: providedStoragePath,
      fileName: providedFileName,
      fileSize: providedFileSize,
      mimeType: providedMimeType,
      sha256Hash: providedSha256,
      title,
      documentType,
      subCategory,
      isConfidential = false,
      changeSummary,
      ipAddress,
      userAgent,
    } = options;

    let storagePath = providedStoragePath || '';
    let originalName = providedFileName || title || 'unnamed_evidence';
    let mimeType = providedMimeType || 'application/octet-stream';
    let fileSize = providedFileSize || 0;
    let sha256Hash = providedSha256 || '';
    let payloadBytes: Buffer | undefined = undefined;

    if (file) {
      // Step 1: Validate File Payload
      const validation = FileValidationService.validate(file);
      if (!validation.isValid) {
        throw new Error(validation.error || 'File validation failed.');
      }

      // Step 2: Calculate Cryptographic SHA-256 Bitstream Hash from File Bytes
      sha256Hash = HashService.computeSha256(file.buffer);
      originalName = file.originalname;
      mimeType = validation.normalizedMimeType;
      payloadBytes = file.buffer;

      // Step 3: Store File in Storage Service
      const stored = await storageService.saveFile(
        file.buffer,
        file.originalname,
        validation.normalizedMimeType
      );
      storagePath = stored.storagePath;
      fileSize = stored.fileSize;
    } else if (!storagePath) {
      throw new Error('No evidentiary file payload or chunk storage path provided.');
    }

    // Step 4: If SHA-256 was not passed for chunked upload, compute it
    if (!sha256Hash) {
      try {
        if (!payloadBytes) {
          payloadBytes = await storageService.getFileBuffer(storagePath);
        }
        sha256Hash = HashService.computeSha256(payloadBytes);
      } catch (hashErr) {
        console.warn(`[Ingestion] Hash fallback computation warning for ${storagePath}:`, hashErr);
      }
    }

    // Step 5: Generate Statutory Document ID
    const year = new Date().getFullYear();
    const docCount = await prisma.document.count();
    const documentNumber = `DOC-${year}-${String(docCount + 101).padStart(5, '0')}`;

    // Step 6: Initial Document and Version Creation (State: PROCESSING)
    const doc = await prisma.document.create({
      data: {
        documentNumber,
        caseId,
        title: (title || originalName).trim(),
        documentType: documentType || 'OTHER',
        subCategory: subCategory || undefined,
        departmentId,
        status: DOCUMENT_STATUS.ACTIVE,
        processingStatus: 'PROCESSING',
        isConfidential,
        currentVersionNumber: 1,
        createdById: userId,
        versions: {
          create: {
            versionNumber: 1,
            fileName: originalName,
            originalFileName: originalName,
            mimeType,
            fileSize,
            storagePath,
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
        createdBy: { select: { id: true, name: true, badgeNumber: true, role: true } },
        department: true,
      },
    });

    // Step 7: Log Initial Ingestion Audit Entry (non-blocking)
    AuditService.log({
      userId,
      userRole,
      action: AUDIT_ACTIONS.DOCUMENT_UPLOADED,
      caseId,
      documentId: doc.id,
      status: 'SUCCESS',
      ipAddress,
      userAgent,
      details: {
        documentNumber: doc.documentNumber,
        fileName: originalName,
        sha256: sha256Hash,
        documentType: doc.documentType,
        subCategory: doc.subCategory,
        processingStatus: 'PROCESSING',
      },
    }).catch((err) => console.warn('[Audit Log Warning]', err));

    // Step 8: Trigger Asynchronous Background Extraction (OCR, Speech-to-Text, NLP)
    const initialBytes = payloadBytes;
    setImmediate(async () => {
      try {
        await DocumentIngestionService.processExtractionAsync({
          docId: doc.id,
          storagePath,
          originalName,
          mimeType,
          caseId,
          requestedDocumentType: documentType,
          requestedSubCategory: subCategory,
          initialBytes,
          userId,
          userRole,
        });
      } catch (err: any) {
        console.error(`[Ingestion] Async pipeline failed for doc ${doc.documentNumber}:`, err);
      }
    });

    // Return created document immediately to caller (< 300ms)
    return doc;
  }

  /**
   * Asynchronously extracts text (OCR, PDF, Speech-to-Text for Audio/Video),
   * applies classification & metadata extraction, and marks document READY.
   */
  static async processExtractionAsync(params: {
    docId: string;
    storagePath: string;
    originalName: string;
    mimeType: string;
    caseId: string;
    requestedDocumentType?: string;
    requestedSubCategory?: string;
    initialBytes?: Buffer;
    userId?: string;
    userRole?: string;
  }) {
    const {
      docId,
      storagePath,
      originalName,
      mimeType,
      caseId,
      requestedDocumentType,
      requestedSubCategory,
      initialBytes,
      userId,
      userRole,
    } = params;

    try {
      console.log(`[OCR/Extraction] Starting extraction for document ${docId} (${originalName})...`);

      // 1. Retrieve file bytes
      let payloadBytes = initialBytes;
      if (!payloadBytes) {
        payloadBytes = await storageService.getFileBuffer(storagePath);
      }

      if (!payloadBytes || payloadBytes.length === 0) {
        throw new Error('Unable to read binary buffer for text extraction.');
      }

      // 2. Text Extraction / OCR / Speech-to-Text
      const extraction = await TextExtractionService.extractText(
        payloadBytes,
        originalName,
        mimeType
      );

      console.log(`[OCR/Extraction] Finished for doc ${docId}: method=${extraction.method}, length=${extraction.text.length} chars`);

      // 3. Classification
      const classification = ClassificationService.classify(originalName, extraction.text);
      const finalType = requestedDocumentType && requestedDocumentType !== 'AUTO' && requestedDocumentType !== 'OTHER'
        ? requestedDocumentType
        : classification.documentType;
      const finalSub = requestedSubCategory || classification.subCategory;

      // 4. Metadata Extraction
      const caseRecord = await prisma.case.findUnique({
        where: { id: caseId },
        select: { caseNumber: true, firNumber: true },
      });

      const metadata = MetadataExtractionService.extract(
        extraction.text,
        originalName,
        caseRecord?.caseNumber,
        caseRecord?.firNumber
      );

      // 5. Atomic DB Persistence -> State: READY
      await prisma.documentVersion.updateMany({
        where: {
          documentId: docId,
          versionNumber: 1,
        },
        data: {
          extractedText: extraction.text,
        },
      });

      const [finalizedDoc] = await prisma.$transaction([
        prisma.document.update({
          where: { id: docId },
          data: {
            ocrText: extraction.text,
            isOcrProcessed: extraction.isOcr,
            documentType: finalType,
            subCategory: finalSub,
            classificationReason: classification.rationale,
            processingStatus: 'READY',
            processingError: null,
          },
          include: {
            versions: { orderBy: { versionNumber: 'desc' } },
            metadata: true,
            createdBy: { select: { id: true, name: true, badgeNumber: true, role: true } },
            department: true,
          },
        }),
        prisma.documentMetadata.upsert({
          where: { documentId: docId },
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
            documentId: docId,
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
        }),
      ]);

      console.log(`[OCR/Extraction] Document ${finalizedDoc.documentNumber} is now READY.`);

      if (userId && userRole) {
        AuditService.log({
          userId,
          userRole,
          action: 'DOCUMENT_PROCESSED',
          caseId,
          documentId: finalizedDoc.id,
          status: 'SUCCESS',
          details: {
            documentNumber: finalizedDoc.documentNumber,
            extractionMethod: extraction.method,
            isOcr: extraction.isOcr,
            textLength: extraction.text.length,
          },
        }).catch(() => {});
      }

      return finalizedDoc;
    } catch (procErr: any) {
      console.error(`[OCR/Extraction] Pipeline error for doc ${docId}:`, procErr);

      await prisma.document.update({
        where: { id: docId },
        data: {
          processingStatus: 'PROCESSING_FAILED',
          processingError: procErr.message || 'Background extraction pipeline failed.',
        },
      }).catch((e) => console.warn('[DB Error on failed doc update]', e));
    }
  }

  /**
   * Retries document processing for documents in PROCESSING_FAILED or pending state
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

      await prisma.documentVersion.update({
        where: { id: activeVersion.id },
        data: { extractedText: extraction.text },
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
          versions: { orderBy: { versionNumber: 'desc' } },
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
