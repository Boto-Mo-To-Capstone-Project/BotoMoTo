import { JobHandler, JobDefinition } from "../types";
import { createEmailService } from "../../email";
import db from "../../db/db";

// Helper function to update voter send status
async function updateVoterEmailStatus(
  voterId: string, 
  status: 'PENDING' | 'SENDING' | 'SENT' | 'FAILED',
  messageId?: string | null,
  error?: string | null
) {
  try {
    await db.voter.update({
      where: { id: parseInt(voterId) },
      data: { 
        codeSendStatus: status,
        // Could add more fields like lastEmailSentAt, emailError if needed
      }
    });
  } catch (err) {
    console.error(`Failed to update voter ${voterId} status to ${status}:`, err);
  }
}

// Email job payload types
export type SendEmailJobPayload = {
  to: { email: string; name?: string } | { email: string; name?: string }[];
  subject: string;
  html?: string;
  text?: string;
  templateId?: string;
  templateVars?: Record<string, any>;
  cc?: { email: string; name?: string }[];
  bcc?: { email: string; name?: string }[];
  replyTo?: { email: string; name?: string };
  attachments?: {
    filename: string;
    content?: string; // base64
    contentType?: string;
  }[];
  // Metadata for tracking
  electionId?: string;
  voterId?: string;
  category?: 'voting-code' | 'notification' | 'reminder';
};

export type SendBulkEmailJobPayload = {
  emails: SendEmailJobPayload[];
  electionId?: string;
  category?: string;
};

/**
 * Single email send job handler
 */
export const sendEmailHandler: JobHandler<SendEmailJobPayload> = async (payload, context) => {
  try {
    context.logger.info(`Sending email to ${Array.isArray(payload.to) ? payload.to.length : 1} recipient(s)`, {
      subject: payload.subject,
      templateId: payload.templateId,
      electionId: payload.electionId,
      voterId: payload.voterId,
    });

    const emailService = createEmailService();

    // If templateId is provided, render template first
    let emailContent = {
      html: payload.html,
      text: payload.text,
      subject: payload.subject,
    };

    if (payload.templateId) {
      // TODO: Template rendering will be implemented in Step 4
      context.logger.warn("Template rendering not yet implemented, using provided html/text");
    }

    const result = await emailService.send({
      to: payload.to,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
      cc: payload.cc,
      bcc: payload.bcc,
      replyTo: payload.replyTo,
      attachments: payload.attachments,
    });

    context.logger.info(`Email sent successfully`, {
      messageId: result.id,
      provider: result.provider,
      electionId: payload.electionId,
      voterId: payload.voterId,
    });

    // TODO: Update database status (will be implemented in Step 6)
    // if (payload.voterId) {
    //   await updateVoterEmailStatus(payload.voterId, 'SENT', result.id);
    // }

    // Update voter status on success
    if (payload.voterId) {
      await updateVoterEmailStatus(payload.voterId, 'SENT', result.id);
    }

    return {
      success: true,
      result: {
        messageId: result.id,
        provider: result.provider,
      },
    };
  } catch (error) {
    const errorMessage = (error as Error).message;
    
    context.logger.error("Email send failed", {
      error: errorMessage,
      electionId: payload.electionId,
      voterId: payload.voterId,
    });

    // Update voter status on failure
    if (payload.voterId) {
      await updateVoterEmailStatus(payload.voterId, 'FAILED', null, errorMessage);
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
};

/**
 * Bulk email send job handler
 */
export const sendBulkEmailHandler: JobHandler<SendBulkEmailJobPayload> = async (payload, context) => {
  try {
    context.logger.info(`Processing bulk email send`, {
      emailCount: payload.emails.length,
      electionId: payload.electionId,
      category: payload.category,
    });

    const emailService = createEmailService();
    const results: any[] = [];
    const errors: any[] = [];

    // Process emails in chunks to avoid overwhelming providers
    const chunkSize = 50;
    
    for (let i = 0; i < payload.emails.length; i += chunkSize) {
      const chunk = payload.emails.slice(i, i + chunkSize);
      
      context.logger.info(`Processing chunk ${Math.floor(i / chunkSize) + 1}/${Math.ceil(payload.emails.length / chunkSize)}`);
      
      // Process chunk concurrently
      const chunkPromises = chunk.map(async (email) => {
        try {
          const result = await emailService.send({
            to: email.to,
            subject: email.subject,
            html: email.html,
            text: email.text,
            cc: email.cc,
            bcc: email.bcc,
            replyTo: email.replyTo,
            attachments: email.attachments,
          });
          
          // Update voter status on success
          if (email.voterId) {
            await updateVoterEmailStatus(email.voterId, 'SENT', result.id);
          }
          
          return { success: true, result, email };
        } catch (error) {
          // Update voter status on failure
          if (email.voterId) {
            await updateVoterEmailStatus(email.voterId, 'FAILED', null, (error as Error).message);
          }
          
          return { success: false, error: (error as Error).message, email };
        }
      });

      const chunkResults = await Promise.allSettled(chunkPromises);
      
      chunkResults.forEach((promiseResult, index) => {
        if (promiseResult.status === 'fulfilled') {
          const emailResult = promiseResult.value;
          if (emailResult.success) {
            results.push(emailResult);
          } else {
            errors.push(emailResult);
          }
        } else {
          errors.push({ 
            success: false, 
            error: promiseResult.reason?.message || 'Unknown error',
            email: chunk[index],
          });
        }
      });

      // Add delay between chunks to respect rate limits
      if (i + chunkSize < payload.emails.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    context.logger.info(`Bulk email send completed`, {
      totalEmails: payload.emails.length,
      successful: results.length,
      failed: errors.length,
      electionId: payload.electionId,
    });

    return {
      success: true,
      result: {
        totalEmails: payload.emails.length,
        successful: results.length,
        failed: errors.length,
        results,
        errors: errors.slice(0, 10), // Include first 10 errors only
      },
    };
  } catch (error) {
    const errorMessage = (error as Error).message;
    
    context.logger.error("Bulk email send failed", {
      error: errorMessage,
      electionId: payload.electionId,
    });

    return {
      success: false,
      error: errorMessage,
    };
  }
};

// Job definitions
export const emailJobDefinitions: JobDefinition[] = [
  {
    name: 'email.send',
    handler: sendEmailHandler,
    concurrency: 5,
    timeout: 30000, // 30 seconds
  },
  {
    name: 'email.send-bulk',
    handler: sendBulkEmailHandler,
    concurrency: 2, // Lower concurrency for bulk jobs
    timeout: 300000, // 5 minutes
  },
];
