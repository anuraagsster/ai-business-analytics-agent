import AWS from 'aws-sdk';
import type { Attachment } from '../types.js';
import fs from 'fs';

export class SesProvider {
  private ses: AWS.SES;
  
  constructor(config: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
  }) {
    AWS.config.update({
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      region: config.region
    });
    this.ses = new AWS.SES();
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
      cc,
      bcc
    } = params;

    // Format the email addresses
    const destination: AWS.SES.Destination = {
      ToAddresses: Array.isArray(to) ? to : [to]
    };

    if (cc && cc.length > 0) {
      destination.CcAddresses = cc;
    }

    if (bcc && bcc.length > 0) {
      destination.BccAddresses = bcc;
    }

    // Create the email content
    const emailParams: AWS.SES.SendEmailRequest = {
      Destination: destination,
      Message: {
        Body: {
          [isHtml ? 'Html' : 'Text']: {
            Data: body,
            Charset: 'UTF-8'
          }
        },
        Subject: {
          Data: subject,
          Charset: 'UTF-8'
        }
      },
      Source: fromName ? `"${fromName}" <${from}>` : from
    };

    try {
      const response = await this.ses.sendEmail(emailParams).promise();
      return { messageId: response.MessageId || '' };
    } catch (error) {
      const e = error as Error;
      throw new Error(`SES send error: ${e.message}`);
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
      fromName = 'AI Analytics Agent'
    } = params;

    // AWS SES doesn't directly support bulk sending in the same way as SendGrid
    // We'll send individual emails for each recipient
    const messageIds: string[] = [];

    for (const recipient of recipients) {
      try {
        let emailBody = template;
        
        // If template is not a template ID, process template variables
        if (!isTemplateId && recipient.data) {
          emailBody = Object.entries(recipient.data).reduce(
            (result, [key, value]) => result.replace(new RegExp(`{{${key}}}`, 'g'), String(value)),
            template
          );
        }

        // For template IDs, we should use the SES template sending capability
        if (isTemplateId) {
          const templateParams: AWS.SES.SendTemplatedEmailRequest = {
            Destination: {
              ToAddresses: [recipient.email]
            },
            Template: template,
            TemplateData: recipient.data ? JSON.stringify(recipient.data) : '{}',
            Source: fromName ? `"${fromName}" <${from}>` : from
          };

          const response = await this.ses.sendTemplatedEmail(templateParams).promise();
          messageIds.push(response.MessageId || '');
        } else {
          // Regular email with processed template
          const response = await this.send({
            to: recipient.email,
            subject,
            body: emailBody,
            isHtml: true,
            from,
            fromName
          });
          messageIds.push(response.messageId);
        }
      } catch (error) {
        const e = error as Error;
        console.error(`Failed to send to ${recipient.email}: ${e.message}`);
        // Continue with other recipients
      }
    }

    return { messageIds };
  }

  async trackEmail(messageId: string): Promise<{ status: string; details?: any }> {
    // AWS SES doesn't provide a simple API for tracking individual emails
    // You'd typically use CloudWatch or configure feedback notification
    return {
      status: 'unknown',
      details: {
        message: 'AWS SES email tracking requires SNS setup for delivery notifications'
      }
    };
  }
}