export interface TemplateVariables {
  [key: string]: any;
}

export interface TemplateResult {
  html: string;
  text?: string;
  subject?: string;
}

export interface TemplateEngine {
  /**
   * Render a template with variables
   */
  render(templateId: string, variables: TemplateVariables): Promise<TemplateResult>;
  
  /**
   * Check if a template exists
   */
  exists(templateId: string): Promise<boolean>;
  
  /**
   * List available templates
   */
  list(): Promise<string[]>;
}

export interface ReactEmailTemplate {
  /**
   * React component for the email template
   */
  component: React.ComponentType<any>;
  
  /**
   * Default subject line (can be overridden by variables)
   */
  defaultSubject?: string;
  
  /**
   * Preview props for development
   */
  previewProps?: TemplateVariables;
}

export interface RawHtmlTemplate {
  /**
   * HTML content with template variables (using handlebars syntax)
   */
  html: string;
  
  /**
   * Optional text version
   */
  text?: string;
  
  /**
   * Default subject line (can be overridden by variables)
   */
  defaultSubject?: string;
  
  /**
   * Preview variables for development
   */
  previewProps?: TemplateVariables;
}

export type EmailTemplate = ReactEmailTemplate | RawHtmlTemplate;

export interface TemplateRegistry {
  [templateId: string]: EmailTemplate;
}
