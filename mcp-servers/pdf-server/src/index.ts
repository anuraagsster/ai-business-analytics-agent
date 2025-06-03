#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { PDFGenerator } from './pdf-generator.js';
import { PDFMerger } from './pdf-merger.js';
import { PDFOptimizer } from './pdf-optimizer.js';
import { PDFTextExtractor } from './pdf-text-extractor.js';
import {
  PDFConfigSchema,
  HtmlToPdfSchema,
  MergePdfsSchema,
  AddWatermarkSchema,
  CompressPdfSchema,
  ExtractTextSchema,
  AddPageNumbersSchema,
  ProtectPdfSchema
} from './types.js';

class PDFServer {
  private server: Server;
  private pdfGenerator: PDFGenerator;
  private pdfMerger: PDFMerger;
  private pdfOptimizer: PDFOptimizer;
  private pdfTextExtractor: PDFTextExtractor;

  constructor() {
    this.server = new Server(
      {
        name: 'pdf-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    // Initialize PDF tools
    const config = PDFConfigSchema.parse({
      PDF_OUTPUT_DIR: process.env.PDF_OUTPUT_DIR || './pdfs',
      PDF_TEMP_DIR: process.env.PDF_TEMP_DIR || './temp',
      PUPPETEER_EXECUTABLE_PATH: process.env.PUPPETEER_EXECUTABLE_PATH,
      PDF_QUALITY: process.env.PDF_QUALITY || 'high',
      DEFAULT_PAGE_FORMAT: process.env.DEFAULT_PAGE_FORMAT || 'A4'
    });

    this.pdfGenerator = new PDFGenerator(config.PDF_OUTPUT_DIR, config.PUPPETEER_EXECUTABLE_PATH);
    this.pdfMerger = new PDFMerger(config.PDF_OUTPUT_DIR, config.PDF_TEMP_DIR);
    this.pdfOptimizer = new PDFOptimizer(config.PDF_OUTPUT_DIR, config.PDF_TEMP_DIR);
    this.pdfTextExtractor = new PDFTextExtractor(config.PDF_OUTPUT_DIR);

    this.setupHandlers();
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'html_to_pdf',
            description: 'Convert HTML content to PDF',
            inputSchema: HtmlToPdfSchema.inputSchema
          },
          {
            name: 'merge_pdfs',
            description: 'Combine multiple PDF files',
            inputSchema: MergePdfsSchema.inputSchema
          },
          {
            name: 'add_watermark',
            description: 'Add watermarks to PDFs',
            inputSchema: AddWatermarkSchema.inputSchema
          },
          {
            name: 'compress_pdf',
            description: 'Optimize PDF file size',
            inputSchema: CompressPdfSchema.inputSchema
          },
          {
            name: 'extract_text',
            description: 'Extract text from PDF files',
            inputSchema: ExtractTextSchema.inputSchema
          },
          {
            name: 'add_page_numbers',
            description: 'Add page numbers to PDFs',
            inputSchema: AddPageNumbersSchema.inputSchema
          },
          {
            name: 'protect_pdf',
            description: 'Add password protection to PDFs',
            inputSchema: ProtectPdfSchema.inputSchema
          }
        ]
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'html_to_pdf': {
            const { html, options } = HtmlToPdfSchema.parse(args);
            const result = await this.pdfGenerator.generateFromHtml(html, options);
            return {
              content: [
                {
                  type: 'text',
                  text: result.success ? `PDF generated successfully: ${result.outputPath}` : `PDF generation failed: ${result.error}`
                }
              ],
              isError: !result.success
            };
          }

          case 'merge_pdfs': {
            const { pdfPaths, outputPath } = MergePdfsSchema.parse(args);
            const result = await this.pdfMerger.mergePdfs(pdfPaths, outputPath);
            return {
              content: [
                {
                  type: 'text',
                  text: result.success ? `PDFs merged successfully: ${result.outputPath}` : `PDF merge failed: ${result.error}`
                }
              ],
              isError: !result.success
            };
          }

          case 'add_watermark': {
            const { pdfPath, watermarkText, options } = AddWatermarkSchema.parse(args);
            const result = await this.pdfMerger.addWatermark(pdfPath, watermarkText, options);
            return {
              content: [
                {
                  type: 'text',
                  text: result.success ? `Watermark added successfully: ${result.outputPath}` : `Watermark addition failed: ${result.error}`
                }
              ],
              isError: !result.success
            };
          }

          case 'compress_pdf': {
            const { pdfPath, quality } = CompressPdfSchema.parse(args);
            const result = await this.pdfOptimizer.compressPdf(pdfPath, quality);
            return {
              content: [
                {
                  type: 'text',
                  text: result.success ? `PDF compressed successfully: ${result.outputPath}` : `PDF compression failed: ${result.error}`
                }
              ],
              isError: !result.success
            };
          }

          case 'extract_text': {
            const { pdfPath, pages } = ExtractTextSchema.parse(args);
            const result = await this.pdfTextExtractor.extractText(pdfPath, pages);
            return {
              content: [
                {
                  type: 'text',
                  text: result.success
                    ? `Text extracted successfully:\n${result.text}`
                    : `Text extraction failed: ${result.error}`
                }
              ],
              isError: !result.success
            };
          }

          case 'add_page_numbers': {
            const { pdfPath, options } = AddPageNumbersSchema.parse(args);
            const result = await this.pdfMerger.addPageNumbers(pdfPath, options);
            return {
              content: [
                {
                  type: 'text',
                  text: result.success ? `Page numbers added successfully: ${result.outputPath}` : `Page number addition failed: ${result.error}`
                }
              ],
              isError: !result.success
            };
          }

          case 'protect_pdf': {
            const { pdfPath, password, permissions } = ProtectPdfSchema.parse(args);
            const result = await this.pdfMerger.protectPdf(pdfPath, password, permissions);
            return {
              content: [
                {
                  type: 'text',
                  text: result.success ? `PDF protected successfully: ${result.outputPath}` : `PDF protection failed: ${result.error}`
                }
              ],
              isError: !result.success
            };
          }

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
          ],
          isError: true
        };
      }
    });
  }

  async start() {
    // Initialize PDF generator
    await this.pdfGenerator.initialize();

    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('PDF MCP server running on stdio');
  }

  async stop() {
    await this.pdfGenerator.close();
  }
}

// Start the server
const server = new PDFServer();
server.start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
  await server.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await server.stop();
  process.exit(0);
});