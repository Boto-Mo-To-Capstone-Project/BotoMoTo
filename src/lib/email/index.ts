/**
 * Email system entry point - factory for creating EmailService with configured providers
 */

import { EmailService } from "./service";
import { EmailProvider } from "./provider";
import { validateEmailConfig, parseEmailAddress, getEnabledProviders, EmailConfig } from "./config";
import { EmailAddress } from "./types";

// Provider imports
import { ResendEmailProvider, SesEmailProvider, GmailSmtpProvider } from "./providers";

// Template imports
import { templateEngine } from "./templates";
import { templateRegistry } from "./templates/registry";

let emailServiceInstance: EmailService | null = null;
let configCache: EmailConfig | null = null;

/**
 * Get or create EmailService singleton
 */
export function createEmailService(): EmailService {
  if (emailServiceInstance) {
    return emailServiceInstance;
  }

  const config = getEmailConfig();
  const providers = createProviders(config);
  const defaultFrom = parseEmailAddress(config.EMAIL_FROM);
  const defaultReplyTo = parseEmailAddress(config.EMAIL_REPLY_TO);

  emailServiceInstance = new EmailService({
    providers,
    defaultFrom,
    defaultReplyTo,
    retryConfig: {
      maxAttempts: 3,
      backoffMs: 1000,
    },
  });

  return emailServiceInstance;
}

/**
 * Get validated email configuration
 */
export function getEmailConfig(): EmailConfig {
  if (configCache) {
    return configCache;
  }

  configCache = validateEmailConfig();
  return configCache;
}

/**
 * Create provider instances based on configuration
 */
function createProviders(config: EmailConfig): EmailProvider[] {
  const enabledProviders = getEnabledProviders(config);
  const providers: EmailProvider[] = [];

  for (const providerName of enabledProviders) {
    switch (providerName) {
      case 'resend':
        if (!config.RESEND_API_KEY) {
          console.warn(`[EmailService] Resend API key not configured, skipping`);
          break;
        }
        providers.push(new ResendEmailProvider(config.RESEND_API_KEY));
        console.log(`[EmailService] Resend provider configured`);
        break;
        
      case 'ses':
        if (!config.AWS_REGION) {
          console.warn(`[EmailService] AWS region not configured, skipping SES`);
          break;
        }
        providers.push(new SesEmailProvider({
          region: config.AWS_REGION,
          credentials: config.AWS_ACCESS_KEY_ID && config.AWS_SECRET_ACCESS_KEY ? {
            accessKeyId: config.AWS_ACCESS_KEY_ID,
            secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
          } : undefined,
        }));
        console.log(`[EmailService] SES provider configured for region ${config.AWS_REGION}`);
        break;
        
      case 'gmail-smtp':
        if (!config.GMAIL_USER || !config.GMAIL_PASS) {
          console.warn(`[EmailService] Gmail credentials not configured, skipping`);
          break;
        }
        providers.push(new GmailSmtpProvider({
          user: config.GMAIL_USER,
          pass: config.GMAIL_PASS,
        }));
        console.log(`[EmailService] Gmail SMTP provider configured for ${config.GMAIL_USER}`);
        break;
        
      default:
        console.warn(`[EmailService] Unknown provider: ${providerName}`);
    }
  }

  if (providers.length === 0) {
    throw new Error(`No valid email providers configured. Enabled: ${enabledProviders.join(', ')}`);
  }

  return providers;
}

/**
 * Reset singleton (useful for testing)
 */
export function resetEmailService(): void {
  emailServiceInstance = null;
  configCache = null;
}

/**
 * Initialize template engine with default templates
 */
export function initializeTemplates(): void {
  templateEngine.registerAll(templateRegistry);
}

// Re-export commonly used types and functions
export type { EmailMessage, EmailAddress, EmailAttachment, SendResult } from "./types";
export type { EmailProvider } from "./provider";
export { EmailService } from "./service";
export { templateEngine } from "./templates";
export { templateRegistry } from "./templates/registry";
export { emailDatabase } from "./database";
