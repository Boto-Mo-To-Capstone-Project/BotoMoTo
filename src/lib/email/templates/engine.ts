// Template engine dependencies
import { render } from '@react-email/render';
import Handlebars from 'handlebars';
import juice from 'juice';
import { convert } from 'html-to-text';
import React from 'react';

import {
  TemplateEngine,
  TemplateVariables,
  TemplateResult,
  TemplateRegistry,
  ReactEmailTemplate,
  RawHtmlTemplate,
} from './types';
import { templateRegistry } from './registry';
import { inlineCss, htmlToText } from './utils';
import { emailDatabase } from '../database';

export class EmailTemplateEngine implements TemplateEngine {
  private templates: TemplateRegistry = {};

  constructor(templates: TemplateRegistry = {}) {
    this.templates = templates;
  }

  /**
   * Register a new template
   */
  register(templateId: string, template: ReactEmailTemplate | RawHtmlTemplate): void {
    this.templates[templateId] = template;
  }

  /**
   * Register multiple templates
   */
  registerAll(templates: TemplateRegistry): void {
    this.templates = { ...this.templates, ...templates };
  }

  async render(templateId: string, variables: TemplateVariables, organizationId?: number): Promise<TemplateResult> {
    // First check registry templates (built-in)
    const registryTemplate = this.templates[templateId];
    if (registryTemplate) {
      if (this.isReactTemplate(registryTemplate)) {
        return this.renderReactTemplate(registryTemplate, variables);
      } else {
        return this.renderRawHtmlTemplate(registryTemplate, variables);
      }
    }

    // Then check database templates (custom uploads)
    const dbTemplate = await emailDatabase.getTemplate(templateId, organizationId);
    if (dbTemplate) {
      return this.renderDatabaseTemplate(dbTemplate, variables);
    }

    throw new Error(`Template "${templateId}" not found in registry or database`);
  }

  async exists(templateId: string, organizationId?: number): Promise<boolean> {
    // Check registry first
    if (templateId in this.templates) {
      return true;
    }
    
    // Then check database
    return await emailDatabase.templateExists(templateId, organizationId);
  }

  async list(organizationId?: number): Promise<string[]> {
    const registryTemplates = Object.keys(this.templates);
    const dbTemplates = await emailDatabase.listTemplates(organizationId);
    
    // Combine and deduplicate
    return [...new Set([...registryTemplates, ...dbTemplates])];
  }

  private isReactTemplate(template: ReactEmailTemplate | RawHtmlTemplate): template is ReactEmailTemplate {
    return 'component' in template;
  }

  private async renderReactTemplate(
    template: ReactEmailTemplate,
    variables: TemplateVariables
  ): Promise<TemplateResult> {
    try {
      // Render React component to HTML
      const Component = template.component;
      const element = React.createElement(Component, variables);
      const html = await render(element);
      
      // Process subject template
      const subject = this.simpleTemplateReplace(template.defaultSubject || 'No Subject', variables);
      
      // Inline CSS for better email client compatibility
      const inlinedHtml = await inlineCss(html);
      
      // Generate plain text version
      const text = htmlToText(html);
      
      return {
        html: inlinedHtml,
        text,
        subject
      };
    } catch (error) {
      throw new Error(`Failed to render React template: ${error instanceof Error ? error.message : error}`);
    }
  }

  private async renderRawHtmlTemplate(
    template: RawHtmlTemplate,
    variables: TemplateVariables
  ): Promise<TemplateResult> {
    try {
      // Simple variable replacement for now (will be replaced with Handlebars)
      let html = this.simpleTemplateReplace(template.html, variables);
      
      // Inline CSS for better email client compatibility
      html = inlineCss(html);
      
      let text = template.text 
        ? this.simpleTemplateReplace(template.text, variables) 
        : htmlToText(html);
        
      let subject = template.defaultSubject 
        ? this.simpleTemplateReplace(template.defaultSubject, variables) 
        : variables.subject;

      return {
        html,
        text,
        subject,
      };
    } catch (error) {
      throw new Error(`Failed to render HTML template: ${error}`);
    }
  }

  private async renderDatabaseTemplate(
    dbTemplate: any,
    variables: TemplateVariables
  ): Promise<TemplateResult> {
    try {
      // Treat database templates as raw HTML templates
      let html = this.simpleTemplateReplace(dbTemplate.htmlContent, variables);
      
      // Inline CSS for better email client compatibility
      html = inlineCss(html);
      
      let text = dbTemplate.textContent 
        ? this.simpleTemplateReplace(dbTemplate.textContent, variables) 
        : htmlToText(html);
        
      let subject = dbTemplate.defaultSubject 
        ? this.simpleTemplateReplace(dbTemplate.defaultSubject, variables) 
        : variables.subject || 'No Subject';

      return {
        html,
        text,
        subject,
      };
    } catch (error) {
      throw new Error(`Failed to render database template: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Simple template variable replacement ({{variable}})
   * TODO: Replace with Handlebars when available
   */
  private simpleTemplateReplace(template: string, variables: TemplateVariables): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] || match;
    });
  }

  /**
   * Load a custom template from the database for the given organization
   */
  async loadCustomTemplate(templateId: string, organizationId: number): Promise<boolean> {
    try {
      // Import db here to avoid circular dependencies
      const { default: db } = await import('@/lib/db/db');
      
      const customTemplate = await db.emailTemplate.findFirst({
        where: {
          templateId,
          organizationId,
          type: 'CUSTOM'
        }
      });

      if (customTemplate) {
        this.register(templateId, {
          html: customTemplate.htmlContent,
          text: customTemplate.textContent || undefined,
          defaultSubject: customTemplate.defaultSubject || 'Your Voting Code - {{electionTitle}}',
          previewProps: {
            voterName: 'Juan Dela Cruz',
            votingCode: '123456',
            electionTitle: 'Student Council Elections 2024',
            organizationName: 'Sample University',
            expiryDate: 'December 31, 2024 at 11:59 PM',
            startDate: 'December 1, 2024 at 8:00 AM',
            endDate: 'December 15, 2024 at 6:00 PM',
            instructions: 'Visit the voting portal and enter your 6-digit code when prompted.'
          }
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to load custom template:', error);
      return false;
    }
  }

  /**
   * Enhanced render method that can load custom templates on demand
   */
  async renderWithCustomLoader(templateId: string, variables: TemplateVariables, organizationId?: number): Promise<TemplateResult> {
    // Check if template exists, if not try to load it
    if (!(await this.exists(templateId))) {
      if (organizationId) {
        const loaded = await this.loadCustomTemplate(templateId, organizationId);
        if (!loaded) {
          throw new Error(`Template "${templateId}" not found`);
        }
      } else {
        throw new Error(`Template "${templateId}" not found`);
      }
    }

    return this.render(templateId, variables);
  }
}

/**
 * Default template engine instance
 */
export const templateEngine = new EmailTemplateEngine(templateRegistry);
