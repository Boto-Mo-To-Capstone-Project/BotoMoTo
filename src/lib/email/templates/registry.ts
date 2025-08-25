import { TemplateRegistry, RawHtmlTemplate } from './types';

/**
 * Sample voting code email template
 */
export const votingCodeTemplate: RawHtmlTemplate = {
  html: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Your Voting Code</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .code { background: #e5e7eb; padding: 15px; font-size: 24px; font-weight: bold; text-align: center; margin: 20px 0; letter-spacing: 3px; }
        .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Your Voting Code</h1>
        </div>
        <div class="content">
          <p>Dear {{voterName}},</p>
          <p>Your voting code for the <strong>{{electionName}}</strong> election is:</p>
          <div class="code">{{votingCode}}</div>
          <p>Please keep this code secure and use it to cast your vote. The voting period is from {{startDate}} to {{endDate}}.</p>
          <p>If you have any questions, please contact the election administrator.</p>
        </div>
        <div class="footer">
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `,
  text: `
Your Voting Code

Dear {{voterName}},

Your voting code for the {{electionName}} election is: {{votingCode}}

Please keep this code secure and use it to cast your vote. 
The voting period is from {{startDate}} to {{endDate}}.

If you have any questions, please contact the election administrator.

This is an automated message. Please do not reply to this email.
  `,
  defaultSubject: 'Your Voting Code - {{electionName}}',
  previewProps: {
    voterName: 'John Doe',
    electionName: 'Student Council Election 2025',
    votingCode: 'ABC123XYZ',
    startDate: 'March 1, 2025',
    endDate: 'March 7, 2025'
  }
};

/**
 * Default template registry
 */
export const defaultTemplates: TemplateRegistry = {
  'voting-code': votingCodeTemplate,
};

/**
 * Template registry with all available templates
 */
export const templateRegistry = defaultTemplates;
