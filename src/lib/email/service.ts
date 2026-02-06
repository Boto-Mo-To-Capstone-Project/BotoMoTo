import { EmailProvider } from "./provider";
import { EmailMessage, EmailAddress, SendResult, SendBulkResult, SendOptions } from "./types";
import { templateEngine, TemplateVariables } from "./templates";

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
        const errorMsg = (error as Error).message;
        
        if (this.isQuotaError(error as Error)) {
          console.warn(`[EmailService] ${provider.name} quota exceeded, trying next provider:`, errorMsg);
        } else if (this.isRateLimitError(error as Error)) {
          console.warn(`[EmailService] ${provider.name} rate limited, trying next provider:`, errorMsg);
        } else {
          console.warn(`[EmailService] Provider ${provider.name} failed:`, errorMsg);
        }
        
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
          // Fall back to rate-limited single sends
          console.log(`[EmailService] Provider ${provider.name} doesn't support native bulk, using rate-limited sequential sends`);
          const results = await this.sendConcurrent(provider, enrichedMessages, options);
          console.log(`[EmailService] Successfully sent ${results.length} messages via ${provider.name} (sequential)`);
          return { ids: results.map(r => r.id), provider: provider.name };
        }
      } catch (error) {
        lastError = error as Error;
        const errorMsg = (error as Error).message;
        
        if (this.isQuotaError(error as Error)) {
          console.warn(`[EmailService] ${provider.name} quota exceeded, trying next provider:`, errorMsg);
        } else if (this.isRateLimitError(error as Error)) {
          console.warn(`[EmailService] ${provider.name} rate limited, trying next provider:`, errorMsg);
        } else {
          console.warn(`[EmailService] Bulk send via ${provider.name} failed:`, errorMsg);
        }
        
        if (this.isPermanentError(error as Error)) {
          console.log(`[EmailService] Permanent error detected, not trying other providers`);
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

  private enrichMessage(message: EmailMessage, options?: SendOptions): EmailMessage & { from: EmailAddress } {
    const from = options?.from || this.defaultFrom;
    if (!from) {
      throw new Error("No 'from' address specified and no default from address configured");
    }

    return {
      ...message,
      from,
      replyTo: message.replyTo || this.defaultReplyTo,
      headers: {
        'X-Mailer': 'Next-RBAC Email Service',
        ...message.headers,
      }
    };
  }

  private async sendWithRetry(
    provider: EmailProvider, 
    message: EmailMessage & { from: EmailAddress }, 
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
        
        // Special handling for rate limit errors - longer delays
        let delay = this.retryConfig.backoffMs * Math.pow(2, attempt - 1);
        if (this.isRateLimitError(error as Error)) {
          delay = Math.max(delay, 2000 * attempt); // Minimum 2 seconds for rate limit errors
          console.log(`[EmailService] Rate limit detected, using longer delay for ${provider.name}: ${delay}ms (attempt ${attempt})`);
        } else {
          console.log(`[EmailService] Retrying ${provider.name} after ${delay}ms (attempt ${attempt})`);
        }
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  }

  private async sendConcurrent(
    provider: EmailProvider,
    messages: (EmailMessage & { from: EmailAddress })[],
    options?: SendOptions,
    concurrency: number = 10
  ): Promise<SendResult[]> {
    const results: SendResult[] = [];
    
    // Get provider rate limits
    const rateLimit = provider.getRateLimit?.() || {};
    const requestsPerSecond = rateLimit.requestsPerSecond || 1;
    
    // Calculate safe delay between requests
    const delayMs = Math.ceil(1000 / requestsPerSecond);
    
    console.log(`[EmailService] Using rate-limited concurrent send for ${provider.name}: ${requestsPerSecond} req/sec (${delayMs}ms delay)`);
    
    // Send emails with rate limiting instead of true concurrency
    for (let i = 0; i < messages.length; i++) {
      try {
        const result = await this.sendWithRetry(provider, messages[i], options);
        results.push(result);
        
        // Add delay between requests (except for the last one)
        if (i < messages.length - 1) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      } catch (error) {
        console.error(`[EmailService] Failed to send message ${i + 1}/${messages.length}:`, error);
        throw error; // Re-throw to trigger provider failover
      }
    }
    
    return results;
  }

  private isPermanentError(error: Error): boolean {
    const message = error.message.toLowerCase();
    
    // Common permanent error patterns (NOTE: quota and rate limiting are NOT permanent)
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
      '404'
      // Removed 'quota exceeded' and 'rate limit exceeded' - these should try other providers
    ];
    
    return permanentPatterns.some(pattern => message.includes(pattern));
  }

  /**
   * Check if error is rate limiting related
   */
  private isRateLimitError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return message.includes('rate limit') || 
           message.includes('too many requests') ||
           message.includes('429');
  }

  /**
   * Check if error is quota related (should try other providers)
   */
  private isQuotaError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return message.includes('quota exceeded') ||
           message.includes('daily quota') ||
           message.includes('sending quota') ||
           message.includes('daily_quota_exceeded');
  }

  /**
   * Send email using a template
   */
  async sendTemplate(
    templateId: string, 
    variables: TemplateVariables, 
    to: EmailAddress | EmailAddress[],
    options?: SendOptions & { organizationId?: number }
  ): Promise<SendResult> {
    try {
      // Render template with organization context
      const templateResult = await templateEngine.render(templateId, variables, options?.organizationId);
      
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
    options?: SendOptions & { organizationId?: number }
  ): Promise<SendBulkResult> {
    try {
      // Render template for each recipient
      const messages: EmailMessage[] = await Promise.all(
        recipients.map(async (recipient) => {
          const templateResult = await templateEngine.render(templateId, recipient.variables, options?.organizationId);
          
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
}
