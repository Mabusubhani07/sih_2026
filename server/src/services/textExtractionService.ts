import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';
import { OCRService } from './ocrService';

export interface ExtractionResult {
  text: string;
  isOcr: boolean;
  pageCount: number;
  confidence: number;
  method: 'NATIVE_TEXT' | 'OCR_TESSERACT' | 'OCR_TEXTRACT' | 'DOCX_PARSER';
  language?: string;
}

export interface ExtractionOptions {
  language?: string;
  documentId?: string;
  versionNumber?: number;
}

export class TextExtractionService {
  /**
   * Extracts actual text from raw document bytes according to file type and content.
   * NEVER returns simulated, fake, or placeholder text.
   * If extraction or OCR fails, throws an honest, descriptive Error.
   */
  static async extractText(
    buffer: Buffer,
    fileName: string,
    mimeType: string,
    options?: ExtractionOptions
  ): Promise<ExtractionResult> {
    if (!buffer || buffer.length === 0) {
      throw new Error('Unable to extract text from this document: File payload is empty (0 bytes).');
    }

    const ext = (fileName.split('.').pop() || '').toLowerCase();
    const mime = (mimeType || '').toLowerCase();

    console.log(
      `[OCR] Document extraction initiated: "${fileName}" (extension: .${ext}, mime: ${mime}, size: ${buffer.length} bytes)`
    );

    // 1. Plain Text / Markdown / CSV / JSON
    if (
      ext === 'txt' ||
      ext === 'csv' ||
      ext === 'json' ||
      ext === 'md' ||
      ext === 'log' ||
      mime.startsWith('text/') ||
      mime === 'application/json' ||
      mime === 'text/csv'
    ) {
      return this.extractFromPlainText(buffer, fileName);
    }

    // 2. PDF Documents: Native Text first -> Scanned Multi-Page OCR fallback
    if (ext === 'pdf' || mime.includes('pdf')) {
      return this.extractFromPdf(buffer, fileName, options);
    }

    // 3. Word Documents (.docx)
    if (ext === 'docx' || mime.includes('wordprocessingml.document')) {
      return this.extractFromDocx(buffer, fileName);
    }

    // 4. Scanned Images (.jpg, .jpeg, .png, .webp, .tiff, .bmp) -> Real OCR
    if (
      ext === 'jpg' ||
      ext === 'jpeg' ||
      ext === 'png' ||
      ext === 'webp' ||
      ext === 'tiff' ||
      ext === 'bmp' ||
      mime.startsWith('image/')
    ) {
      return this.extractFromImage(buffer, fileName, options);
    }

    // Unsupported format
    throw new Error(
      `Unable to extract text from this document: Unsupported document format "${mimeType || fileName}".`
    );
  }

  /**
   * Plain text extraction (TXT, CSV, JSON, LOG, MD)
   */
  private static extractFromPlainText(buffer: Buffer, fileName: string): ExtractionResult {
    let text = '';
    try {
      text = buffer.toString('utf-8');
    } catch {
      text = buffer.toString('latin1');
    }

    // Sanitize null bytes or non-printable controls (preserve \n, \r, \t)
    const cleanedText = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '').trim();

    if (cleanedText.length === 0) {
      throw new Error(`Unable to extract text from "${fileName}": File is empty or contains no readable characters.`);
    }

    console.log(
      `[OCR] Native plain text extraction completed (${cleanedText.length} characters, method: NATIVE_TEXT)`
    );

    return {
      text: cleanedText,
      isOcr: false,
      pageCount: 1,
      confidence: 1.0,
      method: 'NATIVE_TEXT',
    };
  }

  /**
   * PDF Extraction:
   * First attempts native PDF text stream extraction.
   * If PDF contains no machine-readable text (scanned/image PDF), runs real multi-page OCR.
   */
  private static async extractFromPdf(
    buffer: Buffer,
    fileName: string,
    options?: ExtractionOptions
  ): Promise<ExtractionResult> {
    const parser = new PDFParse({ data: buffer });
    try {
      // Step 1: Attempt native text extraction
      const textResult = await parser.getText();
      const rawText = textResult.text || '';
      const cleanText = rawText
        .replace(/--\s*\d+\s+of\s+\d+\s*--/gi, '') // Remove synthetic page footer tokens from parser
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
        .trim();

      const pageCount = textResult.total || (textResult.pages ? textResult.pages.length : 1);

      // If meaningful native text is found (> 20 characters), return native text extraction
      if (cleanText.length > 20) {
        console.log(
          `[OCR] Native PDF text extraction successful (${cleanText.length} characters across ${pageCount} page(s), method: NATIVE_TEXT). Skipping OCR.`
        );
        return {
          text: cleanText,
          isOcr: false,
          pageCount,
          confidence: 0.98,
          method: 'NATIVE_TEXT',
        };
      }

      // Step 2: Scanned / image-only PDF detected -> Multi-Page OCR
      console.log(
        `[OCR] PDF "${fileName}" contains negligible native text (${cleanText.length} chars). Detected scanned/image-only PDF; initiating multi-page optical recognition...`
      );

      const pageImages: Buffer[] = [];

      // Extract page renders or embedded images
      try {
        const screenshots = await parser.getScreenshot({ imageBuffer: true });
        if (screenshots && screenshots.pages && screenshots.pages.length > 0) {
          for (const page of screenshots.pages) {
            if (page.data && page.data.length > 0) {
              pageImages.push(Buffer.from(page.data));
            }
          }
        }
      } catch (renderErr: any) {
        console.warn('[OCR] PDF page rendering warning:', renderErr.message);
      }

      // If page screenshots could not be rendered, try extracting embedded images
      if (pageImages.length === 0) {
        try {
          const embedded = await parser.getImage({ imageBuffer: true });
          if (embedded && embedded.pages && embedded.pages.length > 0) {
            for (const p of embedded.pages) {
              if (p.images && p.images.length > 0) {
                for (const img of p.images) {
                  if (img.data && img.data.length > 0) {
                    pageImages.push(Buffer.from(img.data));
                  }
                }
              }
            }
          }
        } catch (imgErr: any) {
          console.warn('[OCR] PDF embedded image extraction warning:', imgErr.message);
        }
      }

      if (pageImages.length === 0) {
        throw new Error(
          `Unable to extract text from scanned PDF "${fileName}": No extractable page images or native text stream found.`
        );
      }

      // Run real OCR across every page in sequential order
      const ocrResult = await OCRService.recognizePages(pageImages, options?.language);

      if (!ocrResult.text || ocrResult.text.trim().length === 0) {
        throw new Error(
          `Unable to extract text from scanned PDF "${fileName}": Optical character recognition found no readable text across ${pageImages.length} page(s).`
        );
      }

      return {
        text: ocrResult.text,
        isOcr: true,
        pageCount: ocrResult.pageCount,
        confidence: ocrResult.confidence,
        method: ocrResult.provider === 'AMAZON_TEXTRACT' ? 'OCR_TEXTRACT' : 'OCR_TESSERACT',
        language: ocrResult.language,
      };
    } catch (err: any) {
      console.error(`[OCR] PDF extraction error for "${fileName}":`, err.message);
      throw new Error(`Unable to extract text from PDF "${fileName}": ${err.message}`);
    } finally {
      try {
        await parser.destroy();
      } catch {
        // Ignore destroy error
      }
    }
  }

  /**
   * Microsoft Word (.docx) Extraction using Mammoth
   */
  private static async extractFromDocx(buffer: Buffer, fileName: string): Promise<ExtractionResult> {
    try {
      const result = await mammoth.extractRawText({ buffer });
      const text = (result.value || '').trim();

      if (text.length === 0) {
        throw new Error(`Unable to extract text from DOCX "${fileName}": Document contains no extractable body text.`);
      }

      console.log(
        `[OCR] DOCX text extraction completed (${text.length} characters, method: DOCX_PARSER)`
      );

      return {
        text,
        isOcr: false,
        pageCount: 1,
        confidence: 0.95,
        method: 'DOCX_PARSER',
      };
    } catch (err: any) {
      console.error(`[OCR] DOCX extraction error for "${fileName}":`, err.message);
      throw new Error(`Unable to extract text from DOCX "${fileName}": ${err.message}`);
    }
  }

  /**
   * Image OCR Extraction (PNG, JPEG, JPG, WEBP, TIFF, BMP)
   */
  private static async extractFromImage(
    buffer: Buffer,
    fileName: string,
    options?: ExtractionOptions
  ): Promise<ExtractionResult> {
    try {
      const ocrResult = await OCRService.recognizeImage(buffer, options?.language);

      if (!ocrResult.text || ocrResult.text.trim().length === 0) {
        throw new Error(
          `Unable to extract text from image "${fileName}": Optical character recognition found no readable text.`
        );
      }

      console.log(
        `[OCR] Image OCR completed (${ocrResult.text.length} characters, confidence: ${ocrResult.confidence.toFixed(1)}%, method: ${ocrResult.provider})`
      );

      return {
        text: ocrResult.text,
        isOcr: true,
        pageCount: 1,
        confidence: ocrResult.confidence,
        method: ocrResult.provider === 'AMAZON_TEXTRACT' ? 'OCR_TEXTRACT' : 'OCR_TESSERACT',
        language: ocrResult.language,
      };
    } catch (err: any) {
      console.error(`[OCR] Image OCR error for "${fileName}":`, err.message);
      throw new Error(`Unable to extract text from image "${fileName}": ${err.message}`);
    }
  }
}
