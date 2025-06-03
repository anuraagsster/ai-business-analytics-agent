import sgMail from '@sendgrid/mail';
import { SendEmailSchema, AttachmentSchema } from '../types.js';
import type { Attachment } from '../types.js';
import fs from 'fs';
import path from 'path';

export class SendgridProvider {
  constructor(apiKey: string) {
    sgMail.setApiKey(apiKey);
  }

  async send(params: {
    to: string | string[];
    subject: string;
    body: string;
    isHtml?: boolean;
    from?: string;
    fromName?: string;
    attachments?: Attachment[];
    cc?: string[];
    bcc?: string[];
  }): Promise<{ messageId: string }> {
    const {
      to,
      subject,
      body,
      isHtml = true,
      from = 'noreply@example.com',
      fromName = 'AI Analytics Agent',
      attachments = [],
      cc,
      bcc
    } = params;

    const msg: sgMail.MailDataRequired = {
      to,
      from: {
        email: from,
        name: fromName
      },
      subject,
      [isHtml ? 'html' : 'text']: body,
      cc,
      bcc
    };

    if (attachments && attachments.length > 0) {
      msg.attachments = await Promise.all(
        attachments.map(async (attachment) => {
          // Check if content is a file path
          if (fs.existsSync(attachment.content)) {
            const content = await fs.promises.readFile(attachment.content, { encoding: 'base64' });
            return {
              filename: attachment.filename,
              content,
              type: attachment.contentType,
              disposition: 'attachment'
            };
          }
          // Otherwise assume it's already base64 encoded
          return {
            filename: attachment.filename,
            content: attachment.content,
            type: attachment.contentType,
            disposition: 'attachment'
          };
        })
      );
    }

    try {
      const response = await sgMail.send(msg);
      const headers = response[0].headers;
      const messageId = headers['x-message-id'] || '';
      return { messageId };
    } catch (error) {
      const e = error as Error;
      throw new Error(`SendGrid send error: ${e.message}`);
    }
  }

  async sendBulk(params: {
    recipients: { email: string; data?: Record<string, any> }[];
    subject: string;
    template: string;
    isTemplateId: boolean;
    from?: string;
    fromName?: string;
    attachments?: Attachment[];
  }): Promise<{ messageIds: string[] }> {
    const {
      recipients,
      subject,
      template,
      isTemplateId,
      from = 'noreply@example.com',
      fromName = 'AI Analytics Agent',
      attachments = []
    } = params;

    // For SendGrid, we need to send personalized messages for each recipient
    const messages = recipients.map((recipient) => {
      const msg: sgMail.MailDataRequired = {
        to: recipient.email,
        from: {
          email: from,
          name: fromName
        },
        subject
      };

      if (isTemplateId) {
        msg.templateId = template;
        if (recipient.data) {
          msg.dynamicTemplateData = recipient.data;
        }
      } else {
        // Use the template as HTML content
        msg.html = template;
        // Simple replacement of {{variable}} in the template
        if (recipient.data) {
          let content = template;
          Object.entries(recipient.data).forEach(([key, value]) => {
            content = content.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
          });
          msg.html = content;
        }
      }

      // Add attachments if any
      if (attachments && attachments.length > 0) {
        msg.attachments = attachments.map((attachment) => ({
          filename: attachment.filename,
          content: attachment.content,
          type: attachment.contentType,
          disposition: 'attachment'
        }));
      }

      return msg;
    });

    try {
      const response = await sgMail.send(messages);
      // Return a placeholder for message IDs
      const messageIds = messages.map((_, index) => `batch-${index}`);
      return { messageIds };
    } catch (error) {
      const e = error as Error;
      throw new Error(`SendGrid bulk send error: ${e.message}`);
    }
  }

  async trackEmail(messageId: string): Promise<{ status: string; details?: any }> {
    // SendGrid doesn't provide a direct API for tracking individual emails
    // Typically you would use webhooks for this
    return {
      status: 'unknown',
      details: {
        message: 'SendGrid email tracking requires webhook setup'
      }
    };
  }
}