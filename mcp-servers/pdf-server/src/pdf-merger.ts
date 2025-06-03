import { PDFDocument } from 'pdf-lib';
import * as fs from 'fs/promises';
import * as path from 'path';
import { PDFMergeResult, WatermarkOptions, PageNumberOptions, PDFPermissions } from './types.js';

export class PDFMerger {
  private outputDir: string;
  private tempDir: string;

  constructor(outputDir: string, tempDir: string) {
    this.outputDir = outputDir;
    this.tempDir = tempDir;
  }

  async initialize(): Promise<void> {
    // Ensure output and temp directories exist
    await fs.mkdir(this.outputDir, { recursive: true });
    await fs.mkdir(this.tempDir, { recursive: true });
  }

  async mergePdfs(pdfPaths: string[], outputPath?: string): Promise<PDFMergeResult> {
    try {
      await this.initialize();

      // Create a new PDF document
      const mergedPdf = await PDFDocument.create();
      let totalPages = 0;

      // Process each PDF file
      for (const pdfPath of pdfPaths) {
        // Read the PDF file
        const pdfBytes = await fs.readFile(pdfPath);
        
        // Load the PDF document
        const pdfDoc = await PDFDocument.load(pdfBytes);
        
        // Copy all pages from the source document
        const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
        
        // Add the copied pages to the merged document
        copiedPages.forEach(page => {
          mergedPdf.addPage(page);
          totalPages++;
        });
      }

      // Generate output path if not provided
      if (!outputPath) {
        const timestamp = Date.now();
        const filename = `merged_${timestamp}.pdf`;
        outputPath = path.join(this.outputDir, filename);
      }

      // Save the merged PDF
      const mergedPdfBytes = await mergedPdf.save();
      await fs.writeFile(outputPath, mergedPdfBytes);

      // Get file stats
      const stats = await fs.stat(outputPath);

      return {
        success: true,
        outputPath,
        totalPages,
        fileSize: stats.size
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async addWatermark(pdfPath: string, watermarkText: string, options?: WatermarkOptions): Promise<PDFMergeResult> {
    try {
      await this.initialize();

      // Read the PDF file
      const pdfBytes = await fs.readFile(pdfPath);
      
      // Load the PDF document
      const pdfDoc = await PDFDocument.load(pdfBytes);
      
      // Set default options
      const opacity = options?.opacity ?? 0.3;
      const fontSize = options?.fontSize ?? 50;
      const color = options?.color ?? '#888888';
      const position = options?.position ?? 'center';
      
      // Get RGB values from hex color
      const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
          r: parseInt(result[1], 16) / 255,
          g: parseInt(result[2], 16) / 255,
          b: parseInt(result[3], 16) / 255
        } : { r: 0.5, g: 0.5, b: 0.5 };
      };
      
      const rgb = hexToRgb(color);
      
      // Process each page
      const pages = pdfDoc.getPages();
      for (const page of pages) {
        const { width, height } = page.getSize();
        
        // Calculate position
        let x = width / 2;
        let y = height / 2;
        
        switch (position) {
          case 'top-left':
            x = width * 0.1;
            y = height * 0.9;
            break;
          case 'top-right':
            x = width * 0.9;
            y = height * 0.9;
            break;
          case 'bottom-left':
            x = width * 0.1;
            y = height * 0.1;
            break;
          case 'bottom-right':
            x = width * 0.9;
            y = height * 0.1;
            break;
          // center is default
        }
        
        // Draw watermark
        page.drawText(watermarkText, {
          x,
          y,
          size: fontSize,
          opacity,
          color: { red: rgb.r, green: rgb.g, blue: rgb.b },
          rotate: Math.PI / 4, // 45 degrees rotation
          xSkew: Math.PI / 8,
          ySkew: Math.PI / 8
        });
      }
      
      // Generate output path
      const parsedPath = path.parse(pdfPath);
      const outputPath = path.join(
        this.outputDir,
        `${parsedPath.name}_watermarked${parsedPath.ext}`
      );
      
      // Save the watermarked PDF
      const watermarkedPdfBytes = await pdfDoc.save();
      await fs.writeFile(outputPath, watermarkedPdfBytes);
      
      // Get file stats
      const stats = await fs.stat(outputPath);
      
      return {
        success: true,
        outputPath,
        totalPages: pages.length,
        fileSize: stats.size
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async addPageNumbers(pdfPath: string, options?: PageNumberOptions): Promise<PDFMergeResult> {
    try {
      await this.initialize();

      // Read the PDF file
      const pdfBytes = await fs.readFile(pdfPath);
      
      // Load the PDF document
      const pdfDoc = await PDFDocument.load(pdfBytes);
      
      // Set default options
      const position = options?.position ?? 'bottom-center';
      const startPage = options?.startPage ?? 1;
      const fontSize = options?.fontSize ?? 10;
      const format = options?.format ?? 'Page {page} of {total}';
      
      // Process each page
      const pages = pdfDoc.getPages();
      const totalPages = pages.length;
      
      for (let i = 0; i < totalPages; i++) {
        // Skip pages before start page
        if (i < startPage - 1) continue;
        
        const page = pages[i];
        const { width, height } = page.getSize();
        const pageNumber = i + 1;
        
        // Format page number text
        const pageText = format
          .replace('{page}', pageNumber.toString())
          .replace('{total}', totalPages.toString());
        
        // Calculate position
        let x = width / 2;
        let y = 30; // Default bottom margin
        
        switch (position) {
          case 'top-left':
            x = 30;
            y = height - 30;
            break;
          case 'top-center':
            x = width / 2;
            y = height - 30;
            break;
          case 'top-right':
            x = width - 30;
            y = height - 30;
            break;
          case 'bottom-left':
            x = 30;
            y = 30;
            break;
          case 'bottom-right':
            x = width - 30;
            y = 30;
            break;
          // bottom-center is default
        }
        
        // Draw page number
        page.drawText(pageText, {
          x,
          y,
          size: fontSize,
          color: { red: 0, green: 0, blue: 0 }
        });
      }
      
      // Generate output path
      const parsedPath = path.parse(pdfPath);
      const outputPath = path.join(
        this.outputDir,
        `${parsedPath.name}_numbered${parsedPath.ext}`
      );
      
      // Save the numbered PDF
      const numberedPdfBytes = await pdfDoc.save();
      await fs.writeFile(outputPath, numberedPdfBytes);
      
      // Get file stats
      const stats = await fs.stat(outputPath);
      
      return {
        success: true,
        outputPath,
        totalPages,
        fileSize: stats.size
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async protectPdf(pdfPath: string, password: string, permissions?: PDFPermissions): Promise<PDFMergeResult> {
    try {
      await this.initialize();

      // Read the PDF file
      const pdfBytes = await fs.readFile(pdfPath);
      
      // Load the PDF document
      const pdfDoc = await PDFDocument.load(pdfBytes);
      
      // Set up permissions
      const userPassword = password;
      const ownerPassword = password + '_owner'; // Create a different owner password
      
      // Generate output path
      const parsedPath = path.parse(pdfPath);
      const outputPath = path.join(
        this.outputDir,
        `${parsedPath.name}_protected${parsedPath.ext}`
      );
      
      // Save the protected PDF
      const protectedPdfBytes = await pdfDoc.save({
        userPassword,
        ownerPassword
      });
      
      await fs.writeFile(outputPath, protectedPdfBytes);
      
      // Get file stats
      const stats = await fs.stat(outputPath);
      
      return {
        success: true,
        outputPath,
        totalPages: pdfDoc.getPageCount(),
        fileSize: stats.size
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}