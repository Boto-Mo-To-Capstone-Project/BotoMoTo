import { TemplateRegistry, RawHtmlTemplate, ReactEmailTemplate } from './types';
import { VotingCodeTemplate, VotingCodeTemplateProps } from './voting-code';

/**
 * Voting code React Email template
 */
export const votingCodeReactTemplate: ReactEmailTemplate = {
  component: VotingCodeTemplate,
  defaultSubject: 'Your Voting Code - {{electionTitle}}',
  previewProps: {
    voterName: 'Juan Dela Cruz',
    votingCode: '123456',
    electionTitle: 'Student Council Elections 2024',
    organizationName: 'Sample University',
    expiryDate: 'December 31, 2024 at 11:59 PM',
    startDate: 'December 1, 2024 at 8:00 AM',
    endDate: 'December 15, 2024 at 6:00 PM',
    instructions: 'Visit the voting portal and enter your 6-digit code when prompted. Make sure to vote for all available positions.'
  }
};

/**
 * Legacy raw HTML template (fallback)
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
        .header { line-height: 0; }
        .header img { width: 100%; height: auto; display: block; }
        .content { padding: 20px; background: #f9f9f9; }
        .code { background: #f0f0f0; color: maroon; padding: 15px; font-size: 24px; font-weight: bold; text-align: center; margin: 20px 0; letter-spacing: 3px; }
        .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="https://www.boto-mo-to.online/assets/HeaderFinal.png" alt="BOTO MO 'TO, BOSES MO 'TO!" style="width: 100%; height: auto; display: block;">
        </div>
        <div class="content">
          <p>Dear <b>{{voterName}},</b></p>
          <p>You are now casting your vote for the <strong>{{electionTitle}}</strong>. Please keep your voting code private and ensure that you vote correctly and responsibly. Your vote matters! <b>Boto Mo 'To, Boses Mo 'To!</b></p>
          <p style="margin-top: 25px;"><strong>To submit your ballot, please follow these steps carefully:</strong></p>
          <ol style="margin: 20px 0; padding-left: 25px;">
            <li style="margin-bottom: 15px;">Access the voting portal by clicking the button below:</li>
            <div style="text-align: center; margin: 30px 0;">
            <a href="https://boto-mo-to.online/" style="background-color: #800000; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
              Access Voting Portal
            </a>
            </div>
            <li style="margin-bottom: 15px;">Enter your unique voting code when prompted</li>
          </ol>
          <div class="code">{{votingCode}}</div>

          </div>
          <p>Please keep this code secure. The voting period is from <b>{{startDate}}</b> to <b>{{endDate}}</b>.</p>
          <p>If you have any questions, please contact the election administrator.</p>
        </div>
        <div class="footer">
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `,
  text: `Your Voting Code

Dear {{voterName}},

Your voting code for the {{electionTitle}} election is: {{votingCode}}

Please keep this code secure and use it to cast your vote. 
The voting period is from {{startDate}} to {{endDate}}.

If you have any questions, please contact the election administrator.

This is an automated message. Please do not reply to this email.`,
  defaultSubject: 'Your Voting Code - {{electionTitle}}',
  previewProps: {
    voterName: 'John Doe',
    electionTitle: 'Student Council Election 2025',
    votingCode: 'ABC123',
    startDate: 'March 1, 2025',
    endDate: 'March 7, 2025'
  }
};

/**
 * Default template registry
 */
export const defaultTemplates: TemplateRegistry = {
  'voting-code': votingCodeReactTemplate, // Use React Email template as primary
  'voting-code-html': votingCodeTemplate, // Keep raw HTML as fallback
};

/**
 * Template registry with all available templates
 */
export const templateRegistry = defaultTemplates;
