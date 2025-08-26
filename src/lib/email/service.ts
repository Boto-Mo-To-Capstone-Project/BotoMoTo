import { EmailProvider } from "./provider";
import { EmailMessage, EmailAddress, SendResult, SendBulkResult, SendOptions } from "./types";
import { templateEngine, TemplateVariables } from "./templates";
import { emailDatabase, CreateEmailLogData } from "./database";

type EmailServiceOptions = {
  defaultFrom?: EmailAddress;
  defaultReplyTo?: EmailAddress;
  providers: EmailProvider[];
  retryConfig?: {
    maxAttempts: number;
    backoffMs: number;
  };
};

/**
 * EmailService - facade that manages multiple providers with failover
 */
export class EmailService {
  private providers: EmailProvider[];
  private defaultFrom?: EmailAddress;
  private defaultReplyTo?: EmailAddress;
  private retryConfig: { maxAttempts: number; backoffMs: number };

  constructor(options: EmailServiceOptions) {
    if (!options.providers || options.providers.length === 0) {
      throw new Error("At least one email provider is required");
    }
    
    this.providers = options.providers;
    this.defaultFrom = options.defaultFrom;
    this.defaultReplyTo = options.defaultReplyTo;
    this.retryConfig = options.retryConfig || { maxAttempts: 3, backoffMs: 1000 };
  }

  /**
   * Send a single email with provider failover
   */
  async send(message: EmailMessage, options?: SendOptions): Promise<SendResult & { provider: string }> {
    const enrichedMessage = this.enrichMessage(message, options);
    
    let lastError: Error | null = null;
    
    for (const provider of this.providers) {
      try {
        console.log(`[EmailService] Attempting send via ${provider.name}`);
        const result = await this.sendWithRetry(provider, enrichedMessage, options);
        console.log(`[EmailService] Successfully sent via ${provider.name}, messageId: ${result.id}`);
        return { ...result, provider: provider.name };
      } catch (error) {
        lastError = error as Error;
        console.warn(`[EmailService] Provider ${provider.name} failed:`, error);
        
        // Don't retry on permanent errors (4xx status codes, invalid addresses, etc.)
        if (this.isPermanentError(error as Error)) {
          console.log(`[EmailService] Permanent error detected, not trying other providers`);
          break;
        }
        
        // Continue to next provider for transient errors
        continue;
      }
    }
    
    throw new Error(`All email providers failed. Last error: ${lastError?.message}`);
  }

  /**
   * Send bulk emails - tries native bulk first, falls back to concurrent sends
   */
  async sendBulk(messages: EmailMessage[], options?: SendOptions): Promise<SendBulkResult & { provider: string }> {
    if (messages.length === 0) {
      return { ids: [], provider: 'none' };
    }

    const enrichedMessages = messages.map(msg => this.enrichMessage(msg, options));
    let lastError: Error | null = null;

    for (const provider of this.providers) {
      try {
        console.log(`[EmailService] Attempting bulk send via ${provider.name} for ${messages.length} messages`);
        
        if (provider.sendBulk && provider.capabilities.supportsBulk) {
          // Use native bulk if available
          const result = await provider.sendBulk(enrichedMessages, options);
          console.log(`[EmailService] Successfully sent bulk via ${provider.name}, messageIds: ${result.ids.length}`);
          return { ...result, provider: provider.name };
        } else {
          // Fall back to concurrent single sends
          const concurrency = Math.min(10, enrichedMessages.length); // Limit concurrency
          const results = await this.sendConcurrent(provider, enrichedMessages, options, concurrency);
          console.log(`[EmailService] Successfully sent ${results.length} messages via ${provider.name} (concurrent)`);
          return { ids: results.map(r => r.id), provider: provider.name };
        }
      } catch (error) {
        lastError = error as Error;
        console.warn(`[EmailService] Bulk send via ${provider.name} failed:`, error);
        
        if (this.isPermanentError(error as Error)) {
          break;
        }
        continue;
      }
    }

    throw new Error(`All email providers failed for bulk send. Last error: ${lastError?.message}`);
  }

  /**
   * Check provider health
   */
  async verifyProviders(): Promise<{ provider: string; status: 'ok' | 'error'; error?: string }[]> {
    const results = await Promise.allSettled(
      this.providers.map(async (provider) => {
        try {
          if (provider.verifyConnection) {
            await provider.verifyConnection();
          }
          return { provider: provider.name, status: 'ok' as const };
        } catch (error) {
          return { 
            provider: provider.name, 
            status: 'error' as const, 
            error: (error as Error).message 
          };
        }
      })
    );

    return results.map(result => 
      result.status === 'fulfilled' ? result.value : {
        provider: 'unknown',
        status: 'error' as const,
        error: 'Promise rejected'
      }
    );
  }

  private enrichMessage(message: EmailMessage, options?: SendOptions): EmailMessage {
    const from = options?.from || this.defaultFrom;
    if (!from) {
      throw new Error("No 'from' address specified and no default from address configured");
    }

    return {
      ...message,
      replyTo: message.replyTo || this.defaultReplyTo,
      headers: {
        'X-Mailer': 'Next-RBAC Email Service',
        ...message.headers,
      }
    };
  }

  private async sendWithRetry(
    provider: EmailProvider, 
    message: EmailMessage, 
    options?: SendOptions
  ): Promise<SendResult> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.retryConfig.maxAttempts; attempt++) {
      try {
        return await provider.send(message, options);
      } catch (error) {
        lastError = error as Error;
        
        if (this.isPermanentError(error as Error) || attempt === this.retryConfig.maxAttempts) {
          throw error;
        }
        
        // Exponential backoff
        const delay = this.retryConfig.backoffMs * Math.pow(2, attempt - 1);
        console.log(`[EmailService] Retrying ${provider.name} after ${delay}ms (attempt ${attempt})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  }

  private async sendConcurrent(
    provider: EmailProvider,
    messages: EmailMessage[],
    options?: SendOptions,
    concurrency: number = 10
  ): Promise<SendResult[]> {
    const results: SendResult[] = [];
    
    for (let i = 0; i < messages.length; i += concurrency) {
      const batch = messages.slice(i, i + concurrency);
      const batchResults = await Promise.all(
        batch.map(message => this.sendWithRetry(provider, message, options))
      );
      results.push(...batchResults);
    }
    
    return results;
  }

  private isPermanentError(error: Error): boolean {
    const message = error.message.toLowerCase();
    
    // Common permanent error patterns
    const permanentPatterns = [
      'invalid email',
      'invalid address',
      'address not found',
      'domain not found',
      'authentication failed',
      'unauthorized',
      'forbidden',
      'bad request',
      '400',
      '401',
      '403',
      '404',
      'quota exceeded',
      'rate limit exceeded'
    ];
    
    return permanentPatterns.some(pattern => message.includes(pattern));
  }

  /**
   * Send email using a template
   */
  async sendTemplate(
    templateId: string, 
    variables: TemplateVariables, 
    to: EmailAddress | EmailAddress[],
    options?: SendOptions
  ): Promise<SendResult> {
    try {
      // Render template
      const templateResult = await templateEngine.render(templateId, variables);
      
      // Create email message
      const message: EmailMessage = {
        to,
        subject: templateResult.subject || 'No Subject',
        html: templateResult.html,
        text: templateResult.text,
        replyTo: this.defaultReplyTo,
      };
      
      return await this.send(message, options);
    } catch (error) {
      throw new Error(`Failed to send template email: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Send bulk emails using a template
   */
  async sendBulkTemplate(
    templateId: string,
    recipients: Array<{ to: EmailAddress; variables: TemplateVariables }>,
    options?: SendOptions
  ): Promise<SendBulkResult> {
    try {
      // Render template for each recipient
      const messages: EmailMessage[] = await Promise.all(
        recipients.map(async (recipient) => {
          const templateResult = await templateEngine.render(templateId, recipient.variables);
          
          return {
            to: recipient.to,
            subject: templateResult.subject || 'No Subject',
            html: templateResult.html,
            text: templateResult.text,
            replyTo: this.defaultReplyTo,
          };
        })
      );
      
      return await this.sendBulk(messages, options);
    } catch (error) {
      throw new Error(`Failed to send bulk template emails: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Log email to database
   */
  private async logEmailToDatabase(
    message: EmailMessage,
    provider: string,
    options?: {
      templateId?: string;
      organizationId?: number;
      electionId?: number;
      messageId?: string;
      status?: 'PENDING' | 'SENT' | 'FAILED';
      error?: string;
    }
  ): Promise<string | null> {
    try {
      const toAddress = Array.isArray(message.to) ? message.to[0] : message.to;
      const ccEmails = message.cc?.map(addr => addr.email) || [];
      const bccEmails = message.bcc?.map(addr => addr.email) || [];
      
      const logData: CreateEmailLogData = {
        templateId: options?.templateId,
        toEmail: toAddress.email,
        toName: toAddress.name,
        ccEmails,
        bccEmails,
        subject: message.subject,
        htmlSize: message.html?.length,
        textSize: message.text?.length,
        attachments: message.attachments?.length || 0,
        provider,
        status: options?.status || 'PENDING',
        organizationId: options?.organizationId,
        electionId: options?.electionId,
        messageId: options?.messageId,
      };

      const emailLog = await emailDatabase.logEmail(logData);
      
      // Update with error if provided
      if (options?.error) {
        await emailDatabase.updateEmailLog(emailLog.id, {
          error: options.error,
          status: 'FAILED',
        });
      }
      return emailLog.id;
    } catch (error) {
      console.error('[EmailService] Failed to log email to database:', error);
      return null;
    }
  }

  /**
   * Update email log status
   */
  private async updateEmailLogStatus(
    logId: string,
    status: 'SENT' | 'FAILED' | 'DELIVERED',
    options?: {
      messageId?: string;
      error?: string;
    }
  ): Promise<void> {
    try {
      await emailDatabase.updateEmailLog(logId, {
        status,
        messageId: options?.messageId,
        error: options?.error,
        sentAt: status === 'SENT' ? new Date() : undefined,
        deliveredAt: status === 'DELIVERED' ? new Date() : undefined,
      });
    } catch (error) {
      console.error('[EmailService] Failed to update email log:', error);
    }
  }
}
