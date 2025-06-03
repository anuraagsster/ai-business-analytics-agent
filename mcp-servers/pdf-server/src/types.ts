import { z } from 'zod';

// PDF configuration schema
export const PDFConfigSchema = z.object({
  PDF_OUTPUT_DIR: z.string().default('./pdfs'),
  PDF_TEMP_DIR: z.string().default('./temp'),
  PUPPETEER_EXECUTABLE_PATH: z.string().optional(),
  PDF_QUALITY: z.enum(['low', 'medium', 'high']).default('high'),
  DEFAULT_PAGE_FORMAT: z.enum(['A4', 'A3', 'Letter', 'Legal']).default('A4')
});

export type PDFConfig = z.infer<typeof PDFConfigSchema>;

// Tool input schemas
export const HtmlToPdfSchema = z.object({
  html: z.string().describe('HTML content to convert'),
  options: z.object({
    format: z.enum(['A4', 'A3', 'Letter', 'Legal']).optional(),
    orientation: z.enum(['portrait', 'landscape']).optional(),
    margin: z.object({
      top: z.string().optional(),
      right: z.string().optional(),
      bottom: z.string().optional(),
      left: z.string().optional()
    }).optional(),
    headerTemplate: z.string().optional(),
    footerTemplate: z.string().optional(),
    displayHeaderFooter: z.boolean().optional(),
    printBackground: z.boolean().optional(),
    scale: z.number().min(0.1).max(2).optional()
  }).optional()
});

export const MergePdfsSchema = z.object({
  pdfPaths: z.array(z.string()).describe('Array of PDF file paths to merge'),
  outputPath: z.string().describe('Output path for merged PDF')
});

export const AddWatermarkSchema = z.object({
  pdfPath: z.string().describe('Path to PDF file'),
  watermarkText: z.string().describe('Watermark text'),
  options: z.object({
    opacity: z.number().min(0).max(1).optional(),
    fontSize: z.number().optional(),
    color: z.string().optional(),
    position: z.enum(['center', 'top-left', 'top-right', 'bottom-left', 'bottom-right']).optional()
  }).optional()
});

export const CompressPdfSchema = z.object({
  pdfPath: z.string().describe('Path to PDF file to compress'),
  quality: z.enum(['low', 'medium', 'high']).optional().describe('Compression quality')
});

export const ExtractTextSchema = z.object({
  pdfPath: z.string().describe('Path to PDF file'),
  pages: z.array(z.number()).optional().describe('Specific pages to extract (optional)')
});

export const AddPageNumbersSchema = z.object({
  pdfPath: z.string().describe('Path to PDF file'),
  options: z.object({
    position: z.enum(['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right']).optional(),
    startPage: z.number().optional(),
    fontSize: z.number().optional(),
    format: z.string().optional().describe('Page number format (e.g., "Page {page} of {total}")')
  }).optional()
});

export const ProtectPdfSchema = z.object({
  pdfPath: z.string().describe('Path to PDF file'),
  password: z.string().describe('Password for protection'),
  permissions: z.object({
    printing: z.boolean().optional(),
    modifying: z.boolean().optional(),
    copying: z.boolean().optional(),
    annotating: z.boolean().optional()
  }).optional()
});

// Data types
export interface PDFGenerationResult {
  success: boolean;
  outputPath?: string;
  error?: string;
  fileSize?: number;
  pageCount?: number;
}

export interface PDFMergeResult {
  success: boolean;
  outputPath?: string;
  error?: string;
  totalPages?: number;
  fileSize?: number;
}

export interface PDFTextExtraction {
  success: boolean;
  text?: string;
  pageTexts?: string[];
  error?: string;
}

export interface PDFCompressionResult {
  success: boolean;
  originalSize?: number;
  compressedSize?: number;
  compressionRatio?: number;
  outputPath?: string;
  error?: string;
}

// PDF options interfaces
export interface PDFMargin {
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
}

export interface PDFOptions {
  format?: 'A4' | 'A3' | 'Letter' | 'Legal';
  orientation?: 'portrait' | 'landscape';
  margin?: PDFMargin;
  headerTemplate?: string;
  footerTemplate?: string;
  displayHeaderFooter?: boolean;
  printBackground?: boolean;
  scale?: number;
  width?: string;
  height?: string;
}

export interface WatermarkOptions {
  opacity?: number;
  fontSize?: number;
  color?: string;
  position?: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

export interface PageNumberOptions {
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  startPage?: number;
  fontSize?: number;
  format?: string;
}

export interface PDFPermissions {
  printing?: boolean;
  modifying?: boolean;
  copying?: boolean;
  annotating?: boolean;
}