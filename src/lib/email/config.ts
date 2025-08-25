import { z } from "zod";

// Email configuration schema
const emailConfigSchema = z.object({
  EMAIL_PROVIDERS: z.string().min(1, "EMAIL_PROVIDERS is required"),
  EMAIL_FROM: z.string().email("EMAIL_FROM must be a valid email").optional(),
  EMAIL_REPLY_TO: z.string().email("EMAIL_REPLY_TO must be a valid email").optional(),
  
  // Resend
  RESEND_API_KEY: z.string().optional(),
  
  // AWS SES
  AWS_REGION: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  
  // Gmail SMTP
  GMAIL_USER: z.string().email().optional(),
  GMAIL_PASS: z.string().optional(),
  
  // Queue configuration
  QUEUE_BACKEND: z.enum(["graphile", "sqs", "inmemory"]).default("inmemory"),
  
  // Database
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid URL"),
  QUEUE_DATABASE_URL: z.string().url().optional(),
  
  // SQS (for production)
  SQS_QUEUE_URL: z.string().url().optional(),
});

export type EmailConfig = z.infer<typeof emailConfigSchema>;

/**
 * Validate email configuration on application startup
 */
export function validateEmailConfig(): EmailConfig {
  try {
    const config = emailConfigSchema.parse(process.env);
    
    // Additional validation based on enabled providers
    const enabledProviders = config.EMAIL_PROVIDERS.toLowerCase().split(',').map(p => p.trim());
    
    if (enabledProviders.includes('resend') && !config.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is required when 'resend' is in EMAIL_PROVIDERS");
    }
    
    if (enabledProviders.includes('ses')) {
      if (!config.AWS_REGION) {
        throw new Error("AWS_REGION is required when 'ses' is in EMAIL_PROVIDERS");
      }
      // AWS credentials are optional if using IAM roles/instance profiles
    }
    
    if (enabledProviders.includes('gmail-smtp')) {
      if (!config.GMAIL_USER || !config.GMAIL_PASS) {
        throw new Error("GMAIL_USER and GMAIL_PASS are required when 'gmail-smtp' is in EMAIL_PROVIDERS");
      }
    }
    
    // Queue-specific validation
    if (config.QUEUE_BACKEND === 'graphile' && !config.QUEUE_DATABASE_URL && !config.DATABASE_URL) {
      throw new Error("QUEUE_DATABASE_URL or DATABASE_URL is required for graphile queue backend");
    }
    
    if (config.QUEUE_BACKEND === 'sqs' && !config.SQS_QUEUE_URL) {
      throw new Error("SQS_QUEUE_URL is required for sqs queue backend");
    }
    
    return config;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      throw new Error(`Email configuration validation failed:\n${errorMessages.join('\n')}`);
    }
    throw error;
  }
}

/**
 * Parse EMAIL_FROM environment variable
 * Supports formats: "email@domain.com" or "Name <email@domain.com>"
 */
export function parseEmailAddress(emailString?: string): { email: string; name?: string } | undefined {
  if (!emailString) return undefined;
  
  const match = emailString.match(/^(.*)<(.+)>$/);
  if (match) {
    const [, name, email] = match;
    return { 
      email: email.trim(), 
      name: name.trim() || undefined 
    };
  }
  
  return { email: emailString.trim() };
}

/**
 * Get enabled email providers from configuration
 */
export function getEnabledProviders(config: EmailConfig): string[] {
  return config.EMAIL_PROVIDERS.toLowerCase().split(',').map(p => p.trim());
}
