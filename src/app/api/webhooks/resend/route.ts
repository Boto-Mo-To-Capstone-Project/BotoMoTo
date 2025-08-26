/**
 * Resend webhook endpoint for email events (delivery, bounce, complaint)
 */
import { NextRequest } from "next/server";
import { EmailDatabaseService } from "@/lib/email/database/service";
import { headers } from "next/headers";
import crypto from "crypto";

const emailDb = new EmailDatabaseService();

// Verify Resend webhook signature
function verifyResendWebhook(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
    
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get('resend-signature');
    
    // Verify webhook signature (if secret is configured)
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
    if (webhookSecret && signature) {
      if (!verifyResendWebhook(body, signature, webhookSecret)) {
        console.error('Invalid Resend webhook signature');
        return new Response('Unauthorized', { status: 401 });
      }
    }

    const event = JSON.parse(body);
    
    console.log('Resend webhook event:', event.type, event.data);

    switch (event.type) {
      case 'email.sent': {
        // Email was successfully sent
        const { email_id, from, to, subject } = event.data;
        
        try {
          await emailDb.updateEmailLogByMessageId(email_id, {
            status: 'SENT',
            sentAt: new Date(),
          });
        } catch (error) {
          console.error('Failed to update email log for sent event:', error);
        }
        break;
      }

      case 'email.delivered': {
        // Email was delivered to recipient
        const { email_id } = event.data;
        
        try {
          await emailDb.updateEmailLogByMessageId(email_id, {
            status: 'DELIVERED',
            deliveredAt: new Date(),
          });
        } catch (error) {
          console.error('Failed to update email log for delivered event:', error);
        }
        break;
      }

      case 'email.opened': {
        // Email was opened by recipient
        const { email_id } = event.data;
        
        try {
          await emailDb.updateEmailLogByMessageId(email_id, {
            status: 'OPENED',
            openedAt: new Date(),
          });
        } catch (error) {
          console.error('Failed to update email log for opened event:', error);
        }
        break;
      }

      case 'email.clicked': {
        // Link in email was clicked
        const { email_id } = event.data;
        
        try {
          await emailDb.updateEmailLogByMessageId(email_id, {
            status: 'CLICKED',
            clickedAt: new Date(),
          });
        } catch (error) {
          console.error('Failed to update email log for clicked event:', error);
        }
        break;
      }

      case 'email.bounced': {
        // Email bounced
        const { email_id, to } = event.data;
        
        try {
          // Update email log
          await emailDb.updateEmailLogByMessageId(email_id, {
            status: 'BOUNCED',
            error: 'Email bounced',
          });

          // Add to suppression list
          await emailDb.addSuppression({
            email: to,
            reason: 'BOUNCE',
            source: 'resend_webhook',
            bounceType: 'unknown', // Resend doesn't provide detailed bounce types
          });
        } catch (error) {
          console.error('Failed to process bounce event:', error);
        }
        break;
      }

      case 'email.complained': {
        // Email was marked as spam
        const { email_id, to } = event.data;
        
        try {
          // Update email log
          await emailDb.updateEmailLogByMessageId(email_id, {
            status: 'COMPLAINED',
            error: 'Email marked as spam',
          });

          // Add to suppression list
          await emailDb.addSuppression({
            email: to,
            reason: 'COMPLAINT',
            source: 'resend_webhook',
            complaintType: 'spam',
          });
        } catch (error) {
          console.error('Failed to process complaint event:', error);
        }
        break;
      }

      default:
        console.log('Unknown Resend webhook event type:', event.type);
    }

    return new Response('OK', { status: 200 });
    
  } catch (error) {
    console.error('Resend webhook error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
