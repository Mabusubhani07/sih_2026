import { createWorker } from 'tesseract.js';
import {
  TextractClient,
  DetectDocumentTextCommand,
} from '@aws-sdk/client-textract';

export interface OCRResult {
  text: string;
  confidence: number;
  language: string;
  provider: 'LOCAL_TESSERACT' | 'AMAZON_TEXTRACT';
  pageCount: number;
}

export interface IOCRProvider {
  recognize(imageBuffer: Buffer, language?: string): Promise<{ text: string; confidence: number; language: string }>;
}

/**
 * Local OCR Provider using Tesseract.js (Pure JS/WASM engine - runs locally on Node without system binaries)
 */
export class LocalOCRProvider implements IOCRProvider {
  async recognize(
    imageBuffer: Buffer,
    language: string = 'eng'
  ): Promise<{ text: string; confidence: number; language: string }> {
    const lang = language.trim() || 'eng';
    console.log(`[OCR] Local OCR starting with engine: Tesseract.js (language: ${lang}, bufferSize: ${imageBuffer.length} bytes)`);

    const cachePath = process.env.VERCEL === '1' ? '/tmp' : undefined;
    const worker = await createWorker(lang, 1, { cachePath });
    try {
      const result = await worker.recognize(imageBuffer);
      const rawText = result.data.text || '';
      const confidence = typeof result.data.confidence === 'number' ? result.data.confidence : 0;

      console.log(
        `[OCR] Local OCR completed (confidence: ${confidence.toFixed(1)}%, characters: ${rawText.trim().length})`
      );

      return {
        text: rawText.trim(),
        confidence,
        language: lang,
      };
    } finally {
      await worker.terminate();
    }
  }
}

/**
 * Amazon Textract Provider for AWS Cloud Deployments
 */
export class AmazonTextractProvider implements IOCRProvider {
  private client: TextractClient;

  constructor() {
    this.client = new TextractClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials:
        process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
          ? {
              accessKeyId: process.env.AWS_ACCESS_KEY_ID,
              secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            }
          : undefined,
    });
  }

  async recognize(
    imageBuffer: Buffer,
    language: string = 'eng'
  ): Promise<{ text: string; confidence: number; language: string }> {
    console.log(`[OCR] Amazon Textract OCR starting (bufferSize: ${imageBuffer.length} bytes)`);

    const command = new DetectDocumentTextCommand({
      Document: {
        Bytes: imageBuffer,
      },
    });

    const response = await this.client.send(command);
    const blocks = response.Blocks || [];

    // Filter to line blocks and accumulate text in document order
    const lineBlocks = blocks.filter((b) => b.BlockType === 'LINE');
    const lines = lineBlocks.map((b) => b.Text || '').filter((t) => t.length > 0);

    const totalConfidence = lineBlocks.reduce((acc, b) => acc + (b.Confidence || 0), 0);
    const avgConfidence = lineBlocks.length > 0 ? totalConfidence / lineBlocks.length : 0;
    const text = lines.join('\n');

    console.log(
      `[OCR] Amazon Textract OCR completed (confidence: ${avgConfidence.toFixed(1)}%, characters: ${text.length})`
    );

    return {
      text: text.trim(),
      confidence: avgConfidence,
      language,
    };
  }
}

/**
 * OCR Service Facade: Orchestrates providers, multi-page document OCR, and honest error handling
 */
export class OCRService {
  private static localProvider = new LocalOCRProvider();
  private static textractProvider?: AmazonTextractProvider;

  private static getProvider(): { provider: IOCRProvider; name: 'LOCAL_TESSERACT' | 'AMAZON_TEXTRACT' } {
    const hasAwsCreds = Boolean(
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY &&
      process.env.OCR_PROVIDER === 'TEXTRACT'
    );

    if (hasAwsCreds) {
      if (!this.textractProvider) {
        this.textractProvider = new AmazonTextractProvider();
      }
      return { provider: this.textractProvider, name: 'AMAZON_TEXTRACT' };
    }

    return { provider: this.localProvider, name: 'LOCAL_TESSERACT' };
  }

  /**
   * Run OCR on a single image buffer
   */
  static async recognizeImage(imageBuffer: Buffer, language: string = 'eng'): Promise<OCRResult> {
    if (!imageBuffer || imageBuffer.length === 0) {
      throw new Error('OCR failed: Empty or missing image buffer provided for optical recognition.');
    }

    const { provider, name } = this.getProvider();
    const result = await provider.recognize(imageBuffer, language);

    return {
      text: result.text,
      confidence: result.confidence,
      language: result.language,
      provider: name,
      pageCount: 1,
    };
  }

  /**
   * Run OCR on multiple document page images in sequential order
   */
  static async recognizePages(
    pageImages: Buffer[],
    language: string = 'eng'
  ): Promise<OCRResult> {
    if (!pageImages || pageImages.length === 0) {
      throw new Error('OCR failed: No page images available for optical recognition.');
    }

    console.log(`[OCR] Beginning multi-page optical recognition across ${pageImages.length} page(s)`);
    const { provider, name } = this.getProvider();

    const pageResults: { pageNum: number; text: string; confidence: number }[] = [];

    for (let i = 0; i < pageImages.length; i++) {
      const pageBuffer = pageImages[i];
      const pageNum = i + 1;
      console.log(`[OCR] Processing Page ${pageNum} of ${pageImages.length}...`);

      try {
        const res = await provider.recognize(pageBuffer, language);
        pageResults.push({
          pageNum,
          text: res.text,
          confidence: res.confidence,
        });
      } catch (pageErr: any) {
        console.error(`[OCR] Failed processing page ${pageNum}:`, pageErr);
        throw new Error(`OCR engine could not process page ${pageNum}: ${pageErr.message || 'Recognition error'}`);
      }
    }

    // Combine in strict page order
    const formattedPages = pageResults
      .map((p) => {
        if (pageImages.length === 1) return p.text;
        return `--- Page ${p.pageNum} ---\n${p.text}`;
      })
      .join('\n\n')
      .trim();

    const avgConfidence =
      pageResults.length > 0
        ? pageResults.reduce((acc, p) => acc + p.confidence, 0) / pageResults.length
        : 0;

    return {
      text: formattedPages,
      confidence: avgConfidence,
      language,
      provider: name,
      pageCount: pageImages.length,
    };
  }
}
