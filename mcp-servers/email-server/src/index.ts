#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { SendgridProvider } from './providers/sendgrid.js';
import { SesProvider } from './providers/ses.js';
import { MailgunProvider } from './providers/mailgun.js';
import { TemplateManager } from './template-manager.js';
import {
  EmailConfigSchema,
  SendEmailSchema,
  SendBulkEmailSchema,
  CreateTemplateSchema,
  GetTemplateSchema,
  TrackEmailSchema,
  ValidateEmailSchema,
  ScheduleEmailSchema
} from './types.js';
import fs from 'fs';
import path from 'path';
import cron from 'node-cron';
import dns from 'dns';

class EmailServer {
  private server: Server;
  private templateManager: TemplateManager;
  private provider: SendgridProvider | SesProvider | MailgunProvider;
  private scheduledEmails: Map<string, any> = new Map();
  private scheduledTasks: Map<string, cron.ScheduledTask> = new Map();

  constructor() {
    this.server = new Server(
      {
        name: 'email-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    // Initialize server configuration
    const config = EmailConfigSchema.parse({
      EMAIL_PROVIDER: process.env.EMAIL_PROVIDER || 'sendgrid',
      SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,
      AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
      AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
      AWS_REGION: process.env.AWS_REGION || 'us-east-1',
      MAILGUN_API_KEY: process.env.MAILGUN_API_KEY,
      MAILGUN_DOMAIN: process.env.MAILGUN_DOMAIN,
      DEFAULT_FROM_EMAIL: process.env.DEFAULT_FROM_EMAIL || 'noreply@example.com',
      DEFAULT_FROM_NAME: process.env.DEFAULT_FROM_NAME || 'AI Analytics Agent',
      TEMPLATE_DIR: process.env.TEMPLATE_DIR || './templates'
    });

    // Initialize template manager
    this.templateManager = new TemplateManager(config.TEMPLATE_DIR);

    // Initialize email provider based on configuration
    switch (config.EMAIL_PROVIDER) {
      case 'sendgrid':
        if (!config.SENDGRID_API_KEY) {
          throw new Error('SendGrid API key is required when using SendGrid provider');
        }
        this.provider = new SendgridProvider(config.SENDGRID_API_KEY);
        break;
      case 'ses':
        if (!config.AWS_ACCESS_KEY_ID || !config.AWS_SECRET_ACCESS_KEY) {
          throw new Error('AWS credentials are required when using SES provider');
        }
        this.provider = new SesProvider({
          accessKeyId: config.AWS_ACCESS_KEY_ID,
          secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
          region: config.AWS_REGION
        });
        break;
      case 'mailgun':
        if (!config.MAILGUN_API_KEY || !config.MAILGUN_DOMAIN) {
          throw new Error('Mailgun API key and domain are required when using Mailgun provider');
        }
        this.provider = new MailgunProvider({
          apiKey: config.MAILGUN_API_KEY,
          domain: config.MAILGUN_DOMAIN
        });
        break;
      default:
        throw new Error(`Unsupported email provider: ${config.EMAIL_PROVIDER}`);
    }

    this.setupHandlers();
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'send_email',
            description: 'Send email with optional attachments',
            inputSchema: {
              type: 'object',
              properties: {
                to: { 
                  type: 'array', 
                  items: { type: 'string' },
                  description: 'Recipients email addresses'
                },
                subject: { type: 'string', description: 'Email subject line' },
                body: { type: 'string', description: 'Email body content (HTML or text)' },
                isHtml: { type: 'boolean', default: true, description: 'Whether body is HTML formatted' },
                from: { type: 'string', description: 'Sender email address (optional)' },
                fromName: { type: 'string', description: 'Sender name (optional)' },
                attachments: { 
                  type: 'array', 
                  items: { 
                    type: 'object',
                    properties: {
                      filename: { type: 'string' },
                      content: { type: 'string' },
                      contentType: { type: 'string' }
                    }
                  },
                  description: 'Email attachments'
                },
                cc: { type: 'array', items: { type: 'string' }, description: 'CC recipients' },
                bcc: { type: 'array', items: { type: 'string' }, description: 'BCC recipients' }
              },
              required: ['to', 'subject', 'body']
            }
          },
          {
            name: 'send_bulk_email',
            description: 'Send emails to multiple recipients with personalization',
            inputSchema: {
              type: 'object',
              properties: {
                recipients: { 
                  type: 'array', 
                  items: { 
                    type: 'object',
                    properties: {
                      email: { type: 'string' },
                      data: { type: 'object' }
                    }
                  },
                  description: 'List of recipients with optional template data'
                },
                subject: { type: 'string', description: 'Email subject line' },
                template: { type: 'string', description: 'Template ID or template content' },
                isTemplateId: { 
                  type: 'boolean', 
                  default: false, 
                  description: 'Whether template is an ID or content' 
                },
                from: { type: 'string', description: 'Sender email address (optional)' },
                fromName: { type: 'string', description: 'Sender name (optional)' },
                attachments: { 
                  type: 'array', 
                  items: { 
                    type: 'object',
                    properties: {
                      filename: { type: 'string' },
                      content: { type: 'string' },
                      contentType: { type: 'string' }
                    }
                  },
                  description: 'Email attachments'
                }
              },
              required: ['recipients', 'subject', 'template']
            }
          },
          {
            name: 'create_template',
            description: 'Create and save email templates',
            inputSchema: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Template name' },
                subject: { type: 'string', description: 'Default subject line' },
                content: { type: 'string', description: 'Template content with placeholders' },
                description: { type: 'string', description: 'Template description' },
                category: { type: 'string', description: 'Template category' }
              },
              required: ['name', 'subject', 'content']
            }
          },
          {
            name: 'get_template',
            description: 'Retrieve email template',
            inputSchema: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'Template ID or name' }
              },
              required: ['id']
            }
          },
          {
            name: 'track_email',
            description: 'Get email delivery and open status',
            inputSchema: {
              type: 'object',
              properties: {
                messageId: { type: 'string', description: 'Message ID to track' }
              },
              required: ['messageId']
            }
          },
          {
            name: 'validate_email',
            description: 'Validate email addresses',
            inputSchema: {
              type: 'object',
              properties: {
                email: { type: 'string', description: 'Email address to validate' },
                checkMx: { 
                  type: 'boolean', 
                  default: true, 
                  description: 'Whether to check MX records' 
                }
              },
              required: ['email']
            }
          },
          {
            name: 'schedule_email',
            description: 'Schedule emails for future delivery',
            inputSchema: {
              type: 'object',
              properties: {
                scheduledTime: { 
                  type: 'string', 
                  description: 'When to send the email (ISO string)' 
                },
                to: { 
                  type: 'array', 
                  items: { type: 'string' },
                  description: 'Recipients email addresses'
                },
                subject: { type: 'string', description: 'Email subject line' },
                body: { type: 'string', description: 'Email body content (HTML or text)' },
                isHtml: { type: 'boolean', default: true, description: 'Whether body is HTML formatted' },
                from: { type: 'string', description: 'Sender email address (optional)' },
                fromName: { type: 'string', description: 'Sender name (optional)' },
                attachments: { 
                  type: 'array', 
                  items: { 
                    type: 'object',
                    properties: {
                      filename: { type: 'string' },
                      content: { type: 'string' },
                      contentType: { type: 'string' }
                    }
                  },
                  description: 'Email attachments'
                }
              },
              required: ['scheduledTime', 'to', 'subject', 'body']
            }
          }
        ]
      };
    });

    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: [
          {
            uri: 'email://templates',
            mimeType: 'application/json',
            name: 'Available email templates'
          },
          {
            uri: 'email://template/{id}',
            mimeType: 'application/json',
            name: 'Specific email template content'
          }
        ]
      };
    });

    // Handle resource requests
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      if (uri === 'email://templates') {
        const templates = await this.templateManager.listTemplates();
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(templates)
            }
          ]
        };
      }

      if (uri.startsWith('email://template/')) {
        const templateId = uri.replace('email://template/', '');
        const template = await this.templateManager.getTemplate(templateId);
        
        if (!template) {
          throw new Error(`Template not found: ${templateId}`);
        }
        
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(template)
            }
          ]
        };
      }

      throw new Error(`Unknown resource: ${uri}`);
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'send_email': {
            const params = SendEmailSchema.parse(args);
            const { messageId } = await this.provider.send(params);
            
            return {
              content: [
                {
                  type: 'text',
                  text: `Email sent successfully. Message ID: ${messageId}`
                }
              ]
            };
          }

          case 'send_bulk_email': {
            const params = SendBulkEmailSchema.parse(args);
            const { messageIds } = await this.provider.sendBulk(params);
            
            return {
              content: [
                {
                  type: 'text',
                  text: `Bulk email sent successfully to ${params.recipients.length} recipients. Message IDs: ${messageIds.join(', ')}`
                }
              ]
            };
          }

          case 'create_template': {
            const params = CreateTemplateSchema.parse(args);
            const template = await this.templateManager.createTemplate(params);
            
            return {
              content: [
                {
                  type: 'text',
                  text: `Template created successfully. ID: ${template.id}`
                }
              ]
            };
          }

          case 'get_template': {
            const { id } = GetTemplateSchema.parse(args);
            const template = await this.templateManager.getTemplate(id);
            
            if (!template) {
              return {
                content: [
                  {
                    type: 'text',
                    text: `Template not found: ${id}`
                  }
                ],
                isError: true
              };
            }
            
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(template, null, 2)
                }
              ]
            };
          }

          case 'track_email': {
            const { messageId } = TrackEmailSchema.parse(args);
            const trackingInfo = await this.provider.trackEmail(messageId);
            
            return {
              content: [
                {
                  type: 'text',
                  text: `Email status: ${trackingInfo.status}\n${trackingInfo.details ? JSON.stringify(trackingInfo.details, null, 2) : ''}`
                }
              ]
            };
          }

          case 'validate_email': {
            const { email, checkMx = true } = ValidateEmailSchema.parse(args);
            
            // Basic format validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
              return {
                content: [
                  {
                    type: 'text',
                    text: `Invalid email format: ${email}`
                  }
                ],
                isError: true
              };
            }
            
            // MX record validation if requested
            if (checkMx) {
              try {
                const domain = email.split('@')[1];
                const hasMx = await new Promise<boolean>((resolve) => {
                  dns.resolveMx(domain, (err, addresses) => {
                    if (err || !addresses || addresses.length === 0) {
                      resolve(false);
                    } else {
                      resolve(true);
                    }
                  });
                });
                
                if (!hasMx) {
                  return {
                    content: [
                      {
                        type: 'text',
                        text: `Email domain has no MX records: ${domain}`
                      }
                    ],
                    isError: true
                  };
                }
              } catch (error) {
                // Fail silently on MX check errors
              }
            }
            
            return {
              content: [
                {
                  type: 'text',
                  text: `Email address is valid: ${email}`
                }
              ]
            };
          }

          case 'schedule_email': {
            const params = ScheduleEmailSchema.parse(args);
            const id = crypto.randomUUID();
            const scheduledTime = new Date(params.scheduledTime);
            
            // Validate scheduled time is in the future
            if (scheduledTime <= new Date()) {
              return {
                content: [
                  {
                    type: 'text',
                    text: `Scheduled time must be in the future`
                  }
                ],
                isError: true
              };
            }
            
            // Store the scheduled email
            this.scheduledEmails.set(id, {
              id,
              scheduledTime,
              emailData: params,
              status: 'pending'
            });
            
            // Schedule the task
            const cronTime = this.getCronTimeFromDate(scheduledTime);
            const task = cron.schedule(cronTime, async () => {
              try {
                const scheduledEmail = this.scheduledEmails.get(id);
                if (scheduledEmail && scheduledEmail.status === 'pending') {
                  // Send the email
                  await this.provider.send(params);
                  
                  // Update status
                  this.scheduledEmails.set(id, {
                    ...scheduledEmail,
                    status: 'sent'
                  });
                }
                
                // Stop the task after execution
                this.scheduledTasks.get(id)?.stop();
                this.scheduledTasks.delete(id);
              } catch (error) {
                const scheduledEmail = this.scheduledEmails.get(id);
                if (scheduledEmail) {
                  this.scheduledEmails.set(id, {
                    ...scheduledEmail,
                    status: 'failed',
                    error: (error as Error).message
                  });
                }
              }
            });
            
            // Start the task
            task.start();
            this.scheduledTasks.set(id, task);
            
            return {
              content: [
                {
                  type: 'text',
                  text: `Email scheduled successfully for ${scheduledTime.toISOString()}. ID: ${id}`
                }
              ]
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

  private getCronTimeFromDate(date: Date): string {
    const minutes = date.getMinutes();
    const hours = date.getHours();
    const dayOfMonth = date.getDate();
    const month = date.getMonth() + 1; // Months are 0-indexed in JS
    const dayOfWeek = date.getDay();
    
    return `${minutes} ${hours} ${dayOfMonth} ${month} ${dayOfWeek}`;
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Email MCP server running on stdio');
  }
}

// Start the server
const server = new EmailServer();
server.start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.error('Shutting down email server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('Shutting down email server...');
  process.exit(0);
});