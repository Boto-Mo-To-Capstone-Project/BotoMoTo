/**
 * Email system database types
 * Generated from Prisma schema
 */

export type EmailStatus = 
  | 'PENDING'
  | 'SENDING' 
  | 'SENT'
  | 'DELIVERED'
  | 'OPENED'
  | 'CLICKED'
  | 'BOUNCED'
  | 'COMPLAINED'
  | 'FAILED'
  | 'SUPPRESSED';

export type SuppressionReason = 
  | 'BOUNCE'
  | 'COMPLAINT'
  | 'UNSUBSCRIBE'
  | 'MANUAL'
  | 'INVALID'
  | 'BLOCKED';

export interface EmailLog {
  id: string;
  
  // Message details
  messageId: string | null;
  templateId: string | null;
  
  // Recipients
  toEmail: string;
  toName: string | null;
  ccEmails: string[];
  bccEmails: string[];
  
  // Content
  subject: string;
  htmlSize: number | null;
  textSize: number | null;
  attachments: number | null;
  
  // Sending details
  provider: string;
  status: EmailStatus;
  
  // Timing
  queuedAt: Date;
  sentAt: Date | null;
  deliveredAt: Date | null;
  openedAt: Date | null;
  clickedAt: Date | null;
  
  // Error tracking
  error: string | null;
  retryCount: number;
  lastRetryAt: Date | null;
  
  // Metadata
  tags: any;
  campaign: string | null;
  
  // Relations
  organizationId: number | null;
  electionId: number | null;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailSuppression {
  id: string;
  email: string;
  reason: SuppressionReason;
  source: string | null;
  
  // Timing
  suppressedAt: Date;
  expiresAt: Date | null;
  
  // Metadata
  bounceType: string | null;
  complaintType: string | null;
  metadata: any;
  
  // Relations
  organizationId: number | null;
  
  createdAt: Date;
  updatedAt: Date;
}

// Create types for database operations
export interface CreateEmailLogData {
  messageId?: string;
  templateId?: string;
  toEmail: string;
  toName?: string;
  ccEmails?: string[];
  bccEmails?: string[];
  subject: string;
  htmlSize?: number;
  textSize?: number;
  attachments?: number;
  provider: string;
  status?: EmailStatus;
  tags?: any;
  campaign?: string;
  organizationId?: number;
  electionId?: number;
}

export interface UpdateEmailLogData {
  messageId?: string;
  status?: EmailStatus;
  sentAt?: Date;
  deliveredAt?: Date;
  openedAt?: Date;
  clickedAt?: Date;
  error?: string;
  retryCount?: number;
  lastRetryAt?: Date;
}

export interface CreateSuppressionData {
  email: string;
  reason: SuppressionReason;
  source?: string;
  expiresAt?: Date;
  bounceType?: string;
  complaintType?: string;
  metadata?: any;
  organizationId?: number;
}
