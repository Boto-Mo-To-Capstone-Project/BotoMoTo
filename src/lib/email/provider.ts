import { EmailMessage, SendResult, SendBulkResult, EmailAddress, ProviderCapabilities, SendOptions } from "./types";

/**
 * EmailProvider interface - implemented by all email providers (Resend, SES, Gmail SMTP)
 */
export interface EmailProvider {
  /**
   * Provider name for logging and debugging
   */
  readonly name: string;

  /**
   * Provider capabilities
   */
  readonly capabilities: ProviderCapabilities;

  /**
   * Send a single email
   * Note: message will be enriched by EmailService with 'from' address before calling this method
   */
  send(message: EmailMessage & { from: EmailAddress }, options?: SendOptions): Promise<SendResult>;

  /**
   * Send bulk emails (optional - providers may not support native bulk)
   * If not implemented, EmailService will fall back to concurrent single sends
   * Note: messages will be enriched by EmailService with 'from' address before calling this method
   */
  sendBulk?(messages: (EmailMessage & { from: EmailAddress })[], options?: SendOptions): Promise<SendBulkResult>;

  /**
   * Verify provider connection (optional - for health checks)
   */
  verifyConnection?(): Promise<void>;

  /**
   * Get provider-specific send rate limits (optional)
   */
  getRateLimit?(): {
    requestsPerSecond?: number;
    requestsPerMinute?: number;
    requestsPerDay?: number;
  };
}
