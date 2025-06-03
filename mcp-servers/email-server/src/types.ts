import { z } from 'zod';

// Email server configuration schema
export const EmailConfigSchema = z.object({
  EMAIL_PROVIDER: z.enum(['sendgrid', 'ses', 'mailgun']).default('sendgrid'),
  SENDGRID_API_KEY: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().optional(),
  MAILGUN_API_KEY: z.string().optional(),
  MAILGUN_DOMAIN: z.string().optional(),
  DEFAULT_FROM_EMAIL: z.string().default('noreply@example.com'),
  DEFAULT_FROM_NAME: z.string().default('AI Analytics Agent'),
  TEMPLATE_DIR: z.string().default('./templates')
});

export type EmailConfig = z.infer<typeof EmailConfigSchema>;

// Attachment schema
export const AttachmentSchema = z.object({
  filename: z.string().describe('Name of the attachment file'),
  content: z.string().describe('Base64 encoded content or file path'),
  contentType: z.string().optional().describe('MIME type of the attachment')
});

export type Attachment = z.infer<typeof AttachmentSchema>;

// Tool input schemas
export const SendEmailSchema = z.object({
  to: z.array(z.string()).or(z.string()).describe('Recipient email address(es)'),
  subject: z.string().describe('Email subject line'),
  body: z.string().describe('Email body content (HTML or text)'),
  isHtml: z.boolean().default(true).describe('Whether body is HTML formatted'),
  from: z.string().optional().describe('Sender email address (optional)'),
  fromName: z.string().optional().describe('Sender name (optional)'),
  attachments: z.array(AttachmentSchema).optional().describe('Email attachments'),
  cc: z.array(z.string()).optional().describe('CC recipients'),
  bcc: z.array(z.string()).optional().describe('BCC recipients')
});

export const SendBulkEmailSchema = z.object({
  recipients: z.array(
    z.object({
      email: z.string(),
      data: z.record(z.string(), z.any()).optional()
    })
  ).describe('List of recipients with optional template data'),
  subject: z.string().describe('Email subject line'),
  template: z.string().describe('Template ID or template content'),
  isTemplateId: z.boolean().default(false).describe('Whether template is an ID or content'),
  from: z.string().optional().describe('Sender email address (optional)'),
  fromName: z.string().optional().describe('Sender name (optional)'),
  attachments: z.array(AttachmentSchema).optional().describe('Email attachments')
});

export const CreateTemplateSchema = z.object({
  name: z.string().describe('Template name'),
  subject: z.string().describe('Default subject line'),
  content: z.string().describe('Template content with placeholders'),
  description: z.string().optional().describe('Template description'),
  category: z.string().optional().describe('Template category')
});

export const GetTemplateSchema = z.object({
  id: z.string().describe('Template ID or name')
});

export const TrackEmailSchema = z.object({
  messageId: z.string().describe('Message ID to track')
});

export const ValidateEmailSchema = z.object({
  email: z.string().describe('Email address to validate'),
  checkMx: z.boolean().default(true).describe('Whether to check MX records')
});

export const ScheduleEmailSchema = z.object({
  scheduledTime: z.string().or(z.date()).describe('When to send the email (ISO string or Date)'),
  to: z.array(z.string()).or(z.string()).describe('Recipient email address(es)'),
  subject: z.string().describe('Email subject line'),
  body: z.string().describe('Email body content (HTML or text)'),
  isHtml: z.boolean().default(true).describe('Whether body is HTML formatted'),
  from: z.string().optional().describe('Sender email address (optional)'),
  fromName: z.string().optional().describe('Sender name (optional)'),
  attachments: z.array(AttachmentSchema).optional().describe('Email attachments'),
  cc: z.array(z.string()).optional().describe('CC recipients'),
  bcc: z.array(z.string()).optional().describe('BCC recipients')
});

// Data types
export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  description?: string;
  category?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailDeliveryStatus {
  messageId: string;
  status: 'delivered' | 'failed' | 'bounced' | 'opened' | 'clicked' | 'pending';
  timestamp: Date;
  details?: Record<string, any>;
}

export interface ScheduledEmail {
  id: string;
  scheduledTime: Date;
  emailData: z.infer<typeof SendEmailSchema>;
  status: 'pending' | 'sent' | 'failed';
  error?: string;
}