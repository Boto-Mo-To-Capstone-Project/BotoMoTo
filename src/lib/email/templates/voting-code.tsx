/**
 * Voting Code Email Template
 * React Email template for sending voting codes to voters
 */

import React from 'react';

export interface VotingCodeTemplateProps {
  voterName: string;
  votingCode: string;
  electionTitle: string;
  organizationName: string;
  expiryDate?: string;
  startDate?: string;
  endDate?: string;
  instructions?: string;
}

export const VotingCodeTemplate: React.FC<VotingCodeTemplateProps> = ({
  voterName,
  votingCode,
  electionTitle,
  organizationName,
  expiryDate,
  startDate,
  endDate,
  instructions
}) => {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Your Voting Code for {electionTitle}</title>
        <style dangerouslySetInnerHTML={{
          __html: `
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f9f9f9;
            }
            .container {
              background-color: white;
              border-radius: 8px;
              padding: 40px 30px;
              box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #e5e5e5;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .logo {
              font-size: 24px;
              font-weight: bold;
              color: #2563eb;
              margin-bottom: 10px;
            }
            .election-title {
              font-size: 20px;
              font-weight: 600;
              color: #1f2937;
              margin: 0;
            }
            .greeting {
              font-size: 16px;
              margin-bottom: 20px;
            }
            .voting-code-section {
              background-color: #f3f4f6;
              border: 2px solid #2563eb;
              border-radius: 8px;
              padding: 20px;
              text-align: center;
              margin: 30px 0;
            }
            .voting-code-label {
              font-size: 14px;
              color: #6b7280;
              margin-bottom: 10px;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .voting-code {
              font-size: 32px;
              font-weight: bold;
              color: #2563eb;
              letter-spacing: 8px;
              font-family: 'Courier New', monospace;
            }
            .schedule-info {
              background-color: #fef3c7;
              border-left: 4px solid #f59e0b;
              padding: 15px;
              margin: 20px 0;
            }
            .schedule-title {
              font-weight: 600;
              color: #92400e;
              margin-bottom: 8px;
            }
            .instructions {
              background-color: #ecfdf5;
              border-left: 4px solid #10b981;
              padding: 15px;
              margin: 20px 0;
            }
            .instructions-title {
              font-weight: 600;
              color: #065f46;
              margin-bottom: 8px;
            }
            .footer {
              border-top: 1px solid #e5e5e5;
              padding-top: 20px;
              margin-top: 30px;
              font-size: 14px;
              color: #6b7280;
              text-align: center;
            }
            .important {
              color: #dc2626;
              font-weight: 600;
            }
            .button {
              display: inline-block;
              background-color: #2563eb;
              color: white;
              padding: 12px 24px;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 600;
              margin: 10px 0;
            }
          `
        }} />
      </head>
      <body>
        <div className="container">
          <div className="header">
            <div className="logo">{organizationName}</div>
            <h1 className="election-title">{electionTitle}</h1>
          </div>

          <div className="greeting">
            Dear {voterName},
          </div>

          <p>
            You are eligible to vote in the upcoming election. Below is your unique voting code 
            that you will need to cast your vote.
          </p>

          <div className="voting-code-section">
            <div className="voting-code-label">Your Voting Code</div>
            <div className="voting-code">{votingCode}</div>
          </div>

          <p className="important">
            ⚠️ Please keep this code secure and do not share it with anyone.
          </p>

          {(startDate || endDate) && (
            <div className="schedule-info">
              <div className="schedule-title">📅 Voting Schedule</div>
              {startDate && <div><strong>Starts:</strong> {startDate}</div>}
              {endDate && <div><strong>Ends:</strong> {endDate}</div>}
              {expiryDate && <div><strong>Code Expires:</strong> {expiryDate}</div>}
            </div>
          )}

          {instructions && (
            <div className="instructions">
              <div className="instructions-title">📋 How to Vote</div>
              <div dangerouslySetInnerHTML={{ __html: instructions }} />
            </div>
          )}

          <div style={{ textAlign: 'center', margin: '30px 0' }}>
            <a href="#" className="button">
              Access Voting Portal
            </a>
          </div>

          <p>
            If you have any questions or need assistance, please contact the election administrators.
          </p>

          <div className="footer">
            <p>
              This email was sent to you because you are registered as a voter for this election.
              <br />
              Please do not reply to this email as it is sent from an automated system.
            </p>
            <p>
              <strong>{organizationName}</strong>
              <br />
              Election Management System
            </p>
          </div>
        </div>
      </body>
    </html>
  );
};

export default VotingCodeTemplate;
