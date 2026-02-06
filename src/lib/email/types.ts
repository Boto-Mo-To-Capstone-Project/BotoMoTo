/**
 * Email system core types
 * Provider-agnostic email message structure
 */

export type EmailAddress = {
  email: string;
  name?: string;
};

export type EmailAttachment = {
  filename: string;
  content?: Buffer | string; // base64 string or Buffer
  path?: string;             // file path (provider support may vary)
  contentType?: string;
};

export type EmailMessage = {
  to: EmailAddress | EmailAddress[];
  subject: string;
  html?: string;
  text?: string;
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  replyTo?: EmailAddress;
  attachments?: EmailAttachment[];
  headers?: Record<string, string>;
};

export type SendResult = {
  id: string; // Provider message ID
};

export type SendBulkResult = {
  ids: string[]; // Array of provider message IDs
};

export type ProviderCapabilities = {
  supportsAttachments: boolean;
  supportsBulk: boolean;
  maxMessageSize?: number; // in bytes
  maxRecipientsPerBatch?: number;
};

export type SendOptions = {
  from?: EmailAddress;
  priority?: 'low' | 'normal' | 'high';
  tags?: Record<string, string>;
};
