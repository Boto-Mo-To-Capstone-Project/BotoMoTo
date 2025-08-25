import nodemailer from "nodemailer";
import { EmailProvider } from "../provider";
import { EmailMessage, EmailAddress, SendResult, SendBulkResult, ProviderCapabilities, SendOptions } from "../types";

const toStringAddr = (addr: EmailAddress): string => 
  addr.name ? `${addr.name} <${addr.email}>` : addr.email;

type GmailConfig = {
  user: string; // Gmail email address
  pass: string; // Gmail App Password
};

export class GmailSmtpProvider implements EmailProvider {
  readonly name = "gmail-smtp";
  readonly capabilities: ProviderCapabilities = {
    supportsAttachments: true,
    supportsBulk: false, // Gmail SMTP doesn't have native bulk
    maxMessageSize: 25 * 1024 * 1024, // 25MB limit for Gmail
  };

  private transporter: nodemailer.Transporter;
  private config: GmailConfig;

  constructor(config: GmailConfig) {
    this.config = config;
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: config.user,
        pass: config.pass,
      },
      pool: true, // Use connection pooling
      maxConnections: 3, // Limit concurrent connections
      maxMessages: 100, // Max messages per connection
      rateDelta: 1000, // Rate limiting: 1 second between sends
      rateLimit: 2, // Max 2 emails per second
    });
  }

  async send(message: EmailMessage, options?: SendOptions): Promise<SendResult> {
    try {
      const from = this.getFromAddress(options);
      
      const to = Array.isArray(message.to) 
        ? message.to.map(toStringAddr) 
        : [toStringAddr(message.to)];

      const mailOptions: nodemailer.SendMailOptions = {
        from: toStringAddr(from),
        to: to.join(', '),
        subject: message.subject,
        html: message.html,
        text: message.text,
        headers: message.headers,
      };

      // Optional fields
      if (message.cc?.length) {
        mailOptions.cc = message.cc.map(toStringAddr).join(', ');
      }
      
      if (message.bcc?.length) {
        mailOptions.bcc = message.bcc.map(toStringAddr).join(', ');
      }
      
      if (message.replyTo) {
        mailOptions.replyTo = toStringAddr(message.replyTo);
      }

      // Attachments
      if (message.attachments?.length) {
        mailOptions.attachments = message.attachments.map(att => ({
          filename: att.filename,
          content: att.content,
          path: att.path,
          contentType: att.contentType,
        }));
      }

      const info = await this.transporter.sendMail(mailOptions);
      return { id: info.messageId || `gmail-${Date.now()}` };
    } catch (error) {
      // Handle Gmail-specific errors
      const errorMessage = (error as Error).message;
      
      if (errorMessage.includes('Daily sending quota exceeded')) {
        throw new Error('Gmail daily sending quota exceeded (500 emails/day)');
      }
      
      if (errorMessage.includes('Authentication failed') || errorMessage.includes('Invalid credentials')) {
        throw new Error('Gmail authentication failed. Check your email and app password.');
      }
      
      if (errorMessage.includes('Rate limit exceeded')) {
        throw new Error('Gmail rate limit exceeded. Please slow down sending.');
      }
      
      throw new Error(`Gmail SMTP send failed: ${errorMessage}`);
    }
  }

  async verifyConnection(): Promise<void> {
    try {
      await this.transporter.verify();
    } catch (error) {
      throw new Error(`Gmail SMTP connection failed: ${(error as Error).message}`);
    }
  }

  getRateLimit() {
    return {
      requestsPerSecond: 2, // Conservative limit for Gmail
      requestsPerDay: 500, // Gmail's daily limit for free accounts
    };
  }

  /**
   * Close the transporter connection pool
   */
  async close(): Promise<void> {
    this.transporter.close();
  }

  private getFromAddress(options?: SendOptions): EmailAddress {
    if (options?.from) {
      return options.from;
    }
    
    // Default to Gmail user if no from address specified
    return { email: this.config.user };
  }
}
