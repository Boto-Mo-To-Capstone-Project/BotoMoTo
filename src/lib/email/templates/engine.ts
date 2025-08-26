// Template engine dependencies
import { render } from '@react-email/render';
import Handlebars from 'handlebars';
import juice from 'juice';
import { convert } from 'html-to-text';

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

  async render(templateId: string, variables: TemplateVariables): Promise<TemplateResult> {
    const template = this.templates[templateId];
    if (!template) {
      throw new Error(`Template "${templateId}" not found`);
    }

    if (this.isReactTemplate(template)) {
      return this.renderReactTemplate(template, variables);
    } else {
      return this.renderRawHtmlTemplate(template, variables);
    }
  }

  async exists(templateId: string): Promise<boolean> {
    return templateId in this.templates;
  }

  async list(): Promise<string[]> {
    return Object.keys(this.templates);
  }

  private isReactTemplate(template: ReactEmailTemplate | RawHtmlTemplate): template is ReactEmailTemplate {
    return 'component' in template;
  }

  private async renderReactTemplate(
    template: ReactEmailTemplate,
    variables: TemplateVariables
  ): Promise<TemplateResult> {
    try {
      // Import React for creating elements
      const React = require('react');
      
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

  /**
   * Simple template variable replacement ({{variable}})
   * TODO: Replace with Handlebars when available
   */
  private simpleTemplateReplace(template: string, variables: TemplateVariables): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] || match;
    });
  }
}

/**
 * Default template engine instance
 */
export const templateEngine = new EmailTemplateEngine(templateRegistry);
