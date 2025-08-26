/**
 * Email database service - handles email logs and suppression lists
 */

import db from '../../db/db';
import {
  EmailLog,
  EmailSuppression,
  CreateEmailLogData,
  UpdateEmailLogData,
  CreateSuppressionData,
  EmailStatus,
  SuppressionReason
} from './types';

export class EmailDatabaseService {
  
  /**
   * Log a new email
   */
  async logEmail(data: CreateEmailLogData): Promise<EmailLog> {
    return await db.emailLog.create({
      data: {
        ...data,
        ccEmails: data.ccEmails || [],
        bccEmails: data.bccEmails || [],
        retryCount: 0,
        status: data.status || 'PENDING',
      },
    });
  }

  /**
   * Update email log status
   */
  async updateEmailLog(id: string, data: UpdateEmailLogData): Promise<EmailLog> {
    return await db.emailLog.update({
      where: { id },
      data,
    });
  }

  /**
   * Get email log by ID
   */
  async getEmailLog(id: string): Promise<EmailLog | null> {
    return await db.emailLog.findUnique({
      where: { id },
    });
  }

  /**
   * Get email logs with filters
   */
  async getEmailLogs(options: {
    organizationId?: number;
    electionId?: number;
    status?: EmailStatus;
    provider?: string;
    toEmail?: string;
    templateId?: string;
    limit?: number;
    offset?: number;
    startDate?: Date;
    endDate?: Date;
  }) {
    const where: any = {};
    
    if (options.organizationId) where.organizationId = options.organizationId;
    if (options.electionId) where.electionId = options.electionId;
    if (options.status) where.status = options.status;
    if (options.provider) where.provider = options.provider;
    if (options.toEmail) where.toEmail = options.toEmail;
    if (options.templateId) where.templateId = options.templateId;
    
    if (options.startDate || options.endDate) {
      where.createdAt = {};
      if (options.startDate) where.createdAt.gte = options.startDate;
      if (options.endDate) where.createdAt.lte = options.endDate;
    }

    return await db.emailLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options.limit,
      skip: options.offset,
      include: {
        organization: {
          select: { id: true, name: true }
        },
        election: {
          select: { id: true, name: true }
        }
      }
    });
  }

  /**
   * Get email statistics
   */
  async getEmailStats(options: {
    organizationId?: number;
    electionId?: number;
    startDate?: Date;
    endDate?: Date;
  }) {
    const where: any = {};
    
    if (options.organizationId) where.organizationId = options.organizationId;
    if (options.electionId) where.electionId = options.electionId;
    
    if (options.startDate || options.endDate) {
      where.createdAt = {};
      if (options.startDate) where.createdAt.gte = options.startDate;
      if (options.endDate) where.createdAt.lte = options.endDate;
    }

    const stats = await db.emailLog.groupBy({
      by: ['status'],
      where,
      _count: {
        status: true,
      },
    });

    const result = {
      total: 0,
      pending: 0,
      sending: 0,
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      bounced: 0,
      complained: 0,
      failed: 0,
      suppressed: 0,
    };

    stats.forEach((stat: any) => {
      result.total += stat._count.status;
      result[stat.status.toLowerCase() as keyof typeof result] = stat._count.status;
    });

    return result;
  }

  /**
   * Check if email is suppressed
   */
  async isEmailSuppressed(email: string, organizationId?: number): Promise<EmailSuppression | null> {
    const where: any = {
      email: email.toLowerCase(),
      OR: [
        { expiresAt: null }, // Permanent suppression
        { expiresAt: { gt: new Date() } } // Not yet expired
      ]
    };

    if (organizationId) {
      where.organizationId = organizationId;
    }

    return await db.emailSuppression.findFirst({
      where,
      orderBy: { suppressedAt: 'desc' }
    });
  }

  /**
   * Add email to suppression list
   */
  async suppressEmail(data: CreateSuppressionData): Promise<EmailSuppression> {
    return await db.emailSuppression.upsert({
      where: { email: data.email.toLowerCase() },
      update: {
        reason: data.reason,
        source: data.source,
        expiresAt: data.expiresAt,
        bounceType: data.bounceType,
        complaintType: data.complaintType,
        metadata: data.metadata,
        suppressedAt: new Date(),
      },
      create: {
        ...data,
        email: data.email.toLowerCase(),
      },
    });
  }

  /**
   * Remove email from suppression list
   */
  async unsuppressEmail(email: string): Promise<void> {
    await db.emailSuppression.delete({
      where: { email: email.toLowerCase() },
    });
  }

  /**
   * Get suppressed emails
   */
  async getSuppressedEmails(options: {
    organizationId?: number;
    reason?: SuppressionReason;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};
    
    if (options.organizationId) where.organizationId = options.organizationId;
    if (options.reason) where.reason = options.reason;

    return await db.emailSuppression.findMany({
      where,
      orderBy: { suppressedAt: 'desc' },
      take: options.limit,
      skip: options.offset,
    });
  }

  /**
   * Clean up expired suppressions
   */
  async cleanupExpiredSuppressions(): Promise<number> {
    const result = await db.emailSuppression.deleteMany({
      where: {
        expiresAt: {
          lte: new Date(),
        },
      },
    });

    return result.count;
  }

  /**
   * Get failed emails for retry
   */
  async getFailedEmailsForRetry(maxRetries: number = 3): Promise<EmailLog[]> {
    return await db.emailLog.findMany({
      where: {
        status: 'FAILED',
        retryCount: {
          lt: maxRetries,
        },
        OR: [
          { lastRetryAt: null },
          { lastRetryAt: { lt: new Date(Date.now() - 30 * 60 * 1000) } } // 30 minutes ago
        ]
      },
      orderBy: { queuedAt: 'asc' },
      take: 100,
    });
  }

  /**
   * Mark email for retry
   */
  async markEmailForRetry(id: string): Promise<EmailLog> {
    return await db.emailLog.update({
      where: { id },
      data: {
        status: 'PENDING',
        retryCount: {
          increment: 1,
        },
        lastRetryAt: new Date(),
      },
    });
  }
}

/**
 * Singleton instance
 */
export const emailDatabase = new EmailDatabaseService();
