/**
 * Email database service - handles email templates
 */

import db from '../../db/db';

export class EmailDatabaseService {
  /**
   * Get email template by templateId
   */
  async getTemplate(templateId: string, organizationId?: number): Promise<any | null> {
    return await db.emailTemplate.findFirst({
      where: {
        templateId,
        ...(organizationId && { organizationId }),
      },
    });
  }

  /**
   * Check if template exists in database
   */
  async templateExists(templateId: string, organizationId?: number): Promise<boolean> {
    const template = await this.getTemplate(templateId, organizationId);
    return template !== null;
  }

  /**
   * List all templates for an organization
   */
  async listTemplates(organizationId?: number): Promise<string[]> {
    const templates = await db.emailTemplate.findMany({
      where: organizationId ? { organizationId } : {},
      select: { templateId: true },
    });
    return templates.map(t => t.templateId);
  }
}

/**
 * Singleton instance
 */
export const emailDatabase = new EmailDatabaseService();
