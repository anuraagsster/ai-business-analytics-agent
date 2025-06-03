import FormData from 'form-data';
import Mailgun from 'mailgun.js';
import type { Attachment } from '../types.js';
import fs from 'fs';

export class MailgunProvider {
  private client: any; // Mailgun client
  private domain: string;
  
  constructor(config: {
    apiKey: string;
    domain: string;
  }) {
    const mailgun = new Mailgun(FormData);
    this.client = mailgun.client({ username: 'api', key: config.apiKey });
    this.domain = config.domain;
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

    const formattedFrom = fromName ? `${fromName} <${from}>` : from;
    const toAddresses = Array.isArray(to) ? to.join(',') : to;

    const messageData: any = {
      from: formattedFrom,
      to: toAddresses,
      subject,
      [isHtml ? 'html' : 'text']: body
    };

    if (cc && cc.length > 0) {
      messageData.cc = cc.join(',');
    }

    if (bcc && bcc.length > 0) {
      messageData.bcc = bcc.join(',');
    }

    // Handle attachments
    if (attachments.length > 0) {
      const attachmentArray = await Promise.all(
        attachments.map(async (attachment) => {
          // Check if content is a file path
          if (fs.existsSync(attachment.content)) {
            return {
              filename: attachment.filename,
              data: await fs.promises.readFile(attachment.content)
            };
          }
          // Assume it's a base64 string
          return {
            filename: attachment.filename,
            data: Buffer.from(attachment.content, 'base64')
          };
        })
      );

      messageData.attachment = attachmentArray;
    }

    try {
      const response = await this.client.messages.create(this.domain, messageData);
      return { messageId: response.id || '' };
    } catch (error) {
      const e = error as Error;
      throw new Error(`Mailgun send error: ${e.message}`);
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

    const formattedFrom = fromName ? `${fromName} <${from}>` : from;
    const messageIds: string[] = [];

    // Mailgun has two approaches:
    // 1. Using stored templates (isTemplateId = true)
    // 2. Using recipient variables for simple templates (isTemplateId = false)
    
    if (isTemplateId) {
      // Send individual emails using the template
      for (const recipient of recipients) {
        try {
          const messageData: any = {
            from: formattedFrom,
            to: recipient.email,
            subject,
            template: template,
          };

          // Add template variables if provided
          if (recipient.data) {
            Object.entries(recipient.data).forEach(([key, value]) => {
              messageData[`v:${key}`] = value;
            });
          }

          // Add attachments if any
          if (attachments.length > 0) {
            const attachmentArray = attachments.map((attachment) => ({
              filename: attachment.filename,
              data: Buffer.from(attachment.content, 'base64')
            }));
            messageData.attachment = attachmentArray;
          }

          const response = await this.client.messages.create(this.domain, messageData);
          messageIds.push(response.id || '');
        } catch (error) {
          console.error(`Failed to send to ${recipient.email}:`, error);
        }
      }
    } else {
      // Use recipient variables for bulk sending with the same template
      const recipientVariables: Record<string, any> = {};
      const recipientEmails: string[] = [];

      recipients.forEach((recipient) => {
        recipientEmails.push(recipient.email);
        if (recipient.data) {
          recipientVariables[recipient.email] = recipient.data;
        }
      });

      // Create message data
      const messageData: any = {
        from: formattedFrom,
        to: recipientEmails.join(','),
        subject,
        html: template,
        'recipient-variables': JSON.stringify(recipientVariables)
      };

      // Add attachments if any
      if (attachments.length > 0) {
        const attachmentArray = attachments.map((attachment) => ({
          filename: attachment.filename,
          data: Buffer.from(attachment.content, 'base64')
        }));
        messageData.attachment = attachmentArray;
      }

      try {
        const response = await this.client.messages.create(this.domain, messageData);
        // Mailgun doesn't return individual message IDs for batch sending
        messageIds.push(response.id || '');
      } catch (error) {
        const e = error as Error;
        throw new Error(`Mailgun bulk send error: ${e.message}`);
      }
    }

    return { messageIds };
  }

  async trackEmail(messageId: string): Promise<{ status: string; details?: any }> {
    try {
      const events = await this.client.events.get(this.domain, {
        'message-id': messageId
      });

      // Process events to determine status
      const latestEvent = events.items[0];
      if (!latestEvent) {
        return { status: 'unknown' };
      }

      return {
        status: latestEvent.event,
        details: latestEvent
      };
    } catch (error) {
      return {
        status: 'error',
        details: { error: (error as Error).message }
      };
    }
  }
}