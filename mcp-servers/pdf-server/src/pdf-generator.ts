import puppeteer, { Browser, Page, PDFOptions as PuppeteerPDFOptions } from 'puppeteer';
import { PDFOptions, PDFGenerationResult } from './types.js';
import * as fs from 'fs/promises';
import * as path from 'path';

export class PDFGenerator {
  private browser: Browser | null = null;
  private outputDir: string;
  private puppeteerPath?: string;

  constructor(outputDir: string, puppeteerPath?: string) {
    this.outputDir = outputDir;
    this.puppeteerPath = puppeteerPath;
  }

  async initialize(): Promise<void> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        executablePath: this.puppeteerPath
      });
    }

    // Ensure output directory exists
    await fs.mkdir(this.outputDir, { recursive: true });
  }

  async generateFromHtml(html: string, options?: PDFOptions): Promise<PDFGenerationResult> {
    try {
      await this.initialize();
      
      const page = await this.browser!.newPage();
      
      // Set content
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      // Prepare PDF options
      const pdfOptions: PuppeteerPDFOptions = {
        format: options?.format || 'A4',
        landscape: options?.orientation === 'landscape',
        printBackground: options?.printBackground ?? true,
        displayHeaderFooter: options?.displayHeaderFooter ?? false,
        headerTemplate: options?.headerTemplate,
        footerTemplate: options?.footerTemplate,
        margin: options?.margin || {
          top: '20mm',
          right: '20mm',
          bottom: '20mm',
          left: '20mm'
        },
        scale: options?.scale || 1
      };

      // Generate unique filename
      const timestamp = Date.now();
      const filename = `report_${timestamp}.pdf`;
      const outputPath = path.join(this.outputDir, filename);

      // Generate PDF
      await page.pdf({
        ...pdfOptions,
        path: outputPath
      });

      await page.close();

      // Get file stats
      const stats = await fs.stat(outputPath);

      return {
        success: true,
        outputPath,
        fileSize: stats.size,
        pageCount: 1 // Note: Getting actual page count requires additional processing
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async generateFromUrl(url: string, options?: PDFOptions): Promise<PDFGenerationResult> {
    try {
      await this.initialize();
      
      const page = await this.browser!.newPage();
      
      // Navigate to URL
      await page.goto(url, { waitUntil: 'networkidle0' });
      
      // Wait for any dynamic content
      await page.waitForTimeout(2000);
      
      // Prepare PDF options
      const pdfOptions: PuppeteerPDFOptions = {
        format: options?.format || 'A4',
        landscape: options?.orientation === 'landscape',
        printBackground: options?.printBackground ?? true,
        displayHeaderFooter: options?.displayHeaderFooter ?? false,
        headerTemplate: options?.headerTemplate,
        footerTemplate: options?.footerTemplate,
        margin: options?.margin || {
          top: '20mm',
          right: '20mm',
          bottom: '20mm',
          left: '20mm'
        },
        scale: options?.scale || 1
      };

      // Generate unique filename
      const timestamp = Date.now();
      const filename = `webpage_${timestamp}.pdf`;
      const outputPath = path.join(this.outputDir, filename);

      // Generate PDF
      await page.pdf({
        ...pdfOptions,
        path: outputPath
      });

      await page.close();

      // Get file stats
      const stats = await fs.stat(outputPath);

      return {
        success: true,
        outputPath,
        fileSize: stats.size,
        pageCount: 1
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async addHeaderFooter(html: string, headerHtml: string, footerHtml: string, options?: PDFOptions): Promise<PDFGenerationResult> {
    const enhancedOptions: PDFOptions = {
      ...options,
      displayHeaderFooter: true,
      headerTemplate: headerHtml || `
        <div style="font-size: 10px; text-align: center; width: 100%;">
          <span class="title"></span>
        </div>
      `,
      footerTemplate: footerHtml || `
        <div style="font-size: 10px; text-align: center; width: 100%;">
          <span class="pageNumber"></span> / <span class="totalPages"></span>
        </div>
      `
    };

    return this.generateFromHtml(html, enhancedOptions);
  }

  async generateWithTemplate(templateHtml: string, data: Record<string, any>, options?: PDFOptions): Promise<PDFGenerationResult> {
    try {
      // Simple template replacement
      let processedHtml = templateHtml;
      
      // Replace template variables {{variable}}
      Object.entries(data).forEach(([key, value]) => {
        const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
        processedHtml = processedHtml.replace(regex, String(value));
      });

      return this.generateFromHtml(processedHtml, options);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}