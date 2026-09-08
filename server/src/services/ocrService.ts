import '../polyfills';
import path from 'path';
import fs from 'fs';

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
 * Local OCR Provider using Tesseract.js (Pure JS/WASM engine - runs offline without system binaries)
 */
export class LocalOCRProvider implements IOCRProvider {
  private static cachedWorker: any = null;
  private static cachedLang: string = '';
  private static initPromise: Promise<any> | null = null;
  private static recognitionQueue: Promise<any> = Promise.resolve();

  private static async getWorker(lang: string) {
    if (this.cachedWorker && this.cachedLang === lang) {
      return this.cachedWorker;
    }

    if (this.initPromise) {
      return await this.initPromise;
    }

    this.initPromise = (async () => {
      try {
        if (this.cachedWorker) {
          try {
            await this.cachedWorker.terminate();
          } catch {
            // ignore cleanup error
          }
          this.cachedWorker = null;
        }

        const { createWorker } = await import('tesseract.js');

        // Locate local trained language model
        const possibleLangDirs = [
          path.resolve(__dirname, '../../'),
          path.resolve(__dirname, '../../../'),
          path.resolve(__dirname, '../'),
          path.resolve(__dirname, '../../dist'),
          path.resolve(process.cwd(), 'server'),
          path.resolve(process.cwd()),
          path.resolve(process.cwd(), 'server/dist'),
          '/var/task',
          '/var/task/server',
          '/tmp',
        ];

        let langPath: string | undefined;
        for (const dir of possibleLangDirs) {
          const candidate = path.join(dir, `${lang}.traineddata`);
          if (fs.existsSync(candidate)) {
            langPath = dir;
            // On Vercel / Linux, ensure file is accessible in /tmp if running in read-only environment
            if (process.env.VERCEL === '1' && dir !== '/tmp') {
              try {
                const tmpDest = path.join('/tmp', `${lang}.traineddata`);
                if (!fs.existsSync(tmpDest)) {
                  fs.copyFileSync(candidate, tmpDest);
                }
                langPath = '/tmp';
              } catch {
                // proceed with original dir
              }
            }
            break;
          }
        }

        const cachePath = process.env.VERCEL === '1' ? '/tmp' : undefined;
        console.log(`[OCR] Initializing Tesseract worker (lang: ${lang}, langPath: ${langPath || 'CDN/Cache'})`);

        const worker = await createWorker(lang, 1, {
          langPath: langPath || undefined,
          cachePath,
          gzip: false,
        });

        this.cachedWorker = worker;
        this.cachedLang = lang;
        return worker;
      } finally {
        this.initPromise = null;
      }
    })();

    return await this.initPromise;
  }

  /**
   * Terminate active worker and reset state (used during timeout recovery)
   */
  public static async resetWorker() {
    if (this.cachedWorker) {
      try {
        await this.cachedWorker.terminate();
      } catch {
        // ignore
      }
      this.cachedWorker = null;
      this.cachedLang = '';
    }
  }

  async recognize(
    imageBuffer: Buffer,
    language: string = 'eng'
  ): Promise<{ text: string; confidence: number; language: string }> {
    const lang = language.trim() || 'eng';
    const isServerless = process.env.VERCEL === '1' || Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);
    const timeoutMs = isServerless ? 6000 : 45000;

    console.log(
      `[OCR] Local OCR running with Tesseract.js (language: ${lang}, bufferSize: ${imageBuffer.length} bytes, timeout: ${timeoutMs / 1000}s)`
    );

    // Queue worker execution sequentially to protect single WASM instance from concurrency collisions
    const execute = async () => {
      let worker: any = null;
      let timeoutHandle: NodeJS.Timeout | null = null;

      try {
        worker = await LocalOCRProvider.getWorker(lang);

        const recognitionPromise = (async () => {
          let result = await worker.recognize(imageBuffer);
          let rawText = result.data.text || '';
          let confidence = typeof result.data.confidence === 'number' ? result.data.confidence : 0;

          // Retry with PSM 6 (single uniform text block) if initial pass returned sparse text on screenshot/form
          if (rawText.trim().length < 5 && imageBuffer.length > 5000) {
            try {
              await worker.setParameters({ tessedit_pageseg_mode: '6' as any });
              const retryResult = await worker.recognize(imageBuffer);
              if ((retryResult.data.text || '').trim().length > rawText.trim().length) {
                result = retryResult;
                rawText = result.data.text || '';
                confidence = typeof result.data.confidence === 'number' ? result.data.confidence : confidence;
              }
              // Reset to automatic page segmentation
              await worker.setParameters({ tessedit_pageseg_mode: '3' as any });
            } catch {
              // ignore retry error
            }
          }

          return { rawText, confidence };
        })();

        const timeoutPromise = new Promise<{ rawText: string; confidence: number }>((_, reject) => {
          timeoutHandle = setTimeout(() => {
            reject(new Error(`Tesseract OCR operation timed out after ${timeoutMs / 1000}s`));
          }, timeoutMs);
        });

        const { rawText, confidence } = await Promise.race([recognitionPromise, timeoutPromise]);
        if (timeoutHandle) clearTimeout(timeoutHandle);

        console.log(
          `[OCR] Local OCR completed (confidence: ${confidence.toFixed(1)}%, characters: ${rawText.trim().length})`
        );

        return {
          text: rawText.trim(),
          confidence: Math.max(0, Math.min(100, confidence)),
          language: lang,
        };
      } catch (err: any) {
        if (timeoutHandle) clearTimeout(timeoutHandle);
        console.warn('[OCR] Worker recognize failed or timed out, resetting worker instance:', err.message);
        await LocalOCRProvider.resetWorker();
        throw err;
      }
    };

    // Chain to sequential recognition queue
    const queuedPromise = LocalOCRProvider.recognitionQueue.then(execute, execute);
    LocalOCRProvider.recognitionQueue = queuedPromise.catch(() => {});
    return queuedPromise;
  }
}

/**
 * Amazon Textract Provider for AWS Cloud Deployments
 */
export class AmazonTextractProvider implements IOCRProvider {
  private client?: any;

  private async getClient() {
    if (!this.client) {
      const { TextractClient } = await import('@aws-sdk/client-textract');
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
    return this.client;
  }

  async recognize(
    imageBuffer: Buffer,
    language: string = 'eng'
  ): Promise<{ text: string; confidence: number; language: string }> {
    console.log(`[OCR] Amazon Textract OCR starting (bufferSize: ${imageBuffer.length} bytes)`);

    const { DetectDocumentTextCommand } = await import('@aws-sdk/client-textract');
    const client = await this.getClient();
    const command = new DetectDocumentTextCommand({
      Document: {
        Bytes: imageBuffer,
      },
    });

    const response = await client.send(command);
    const blocks = response.Blocks || [];

    // Filter to line blocks and accumulate text in document order
    const lineBlocks = blocks.filter((b: any) => b.BlockType === 'LINE');
    const lines = lineBlocks.map((b: any) => b.Text || '').filter((t: any) => t.length > 0);

    const totalConfidence = lineBlocks.reduce((acc: number, b: any) => acc + (b.Confidence || 0), 0);
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
        console.error(`[OCR] Warning on page ${pageNum}:`, pageErr.message);
        pageResults.push({
          pageNum,
          text: `[Page ${pageNum}: Optical recognition notice - image could not be processed]`,
          confidence: 0,
        });
      }
    }

    const hasAnyRealText = pageResults.some((p) => p.confidence > 0 && p.text.trim().length > 0);
    if (!hasAnyRealText && pageResults.length > 0) {
      throw new Error(`OCR engine could not recognize text on any of the ${pageImages.length} page(s).`);
    }

    // Combine in strict page order
    const formattedPages = pageResults
      .map((p) => {
        if (pageImages.length === 1) return p.text;
        return `--- Page ${p.pageNum} ---\n${p.text}`;
      })
      .join('\n\n')
      .trim();

    const validResults = pageResults.filter((p) => p.confidence > 0);
    const avgConfidence =
      validResults.length > 0
        ? validResults.reduce((acc, p) => acc + p.confidence, 0) / validResults.length
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
