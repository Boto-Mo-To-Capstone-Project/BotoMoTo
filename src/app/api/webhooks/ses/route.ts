/**
 * AWS SES webhook endpoint for email events (delivery, bounce, complaint)
 */
import { NextRequest } from "next/server";
import { EmailDatabaseService } from "@/lib/email/database/service";
import { headers } from "next/headers";
import crypto from "crypto";

const emailDb = new EmailDatabaseService();

// Verify AWS SNS signature
function verifyAWSSignature(payload: string, signature: string, signingCertURL: string): boolean {
  // In production, you should:
  // 1. Download and cache the signing certificate from signingCertURL
  // 2. Verify the certificate is from AWS
  // 3. Use the certificate to verify the signature
  // For now, we'll just log and return true (implement proper verification in production)
  
  console.log('AWS SNS signature verification - implement in production');
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headersList = await headers();
    
    // Parse SNS message
    const message = JSON.parse(body);
    
    // Handle SNS subscription confirmation
    if (message.Type === 'SubscriptionConfirmation') {
      console.log('SNS Subscription confirmation received');
      // In production, you should confirm the subscription by making a GET request to SubscribeURL
      console.log('SubscribeURL:', message.SubscribeURL);
      return new Response('OK', { status: 200 });
    }

    // Handle SNS notification
    if (message.Type === 'Notification') {
      const sesMessage = JSON.parse(message.Message);
      
      console.log('SES webhook event:', sesMessage.eventType || sesMessage.notificationType);

      // Handle different SES event types
      if (sesMessage.eventType) {
        // SES Event Publishing (delivery, reject, bounce, complaint, delivery delay)
        await handleSESEvent(sesMessage);
      } else if (sesMessage.notificationType) {
        // SES Configuration Set Events (bounce, complaint)
        await handleSESNotification(sesMessage);
      }
    }

    return new Response('OK', { status: 200 });
    
  } catch (error) {
    console.error('SES webhook error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

async function handleSESEvent(event: any) {
  const messageId = event.mail?.messageId;
  
  switch (event.eventType) {
    case 'send': {
      // Email was sent
      try {
        await emailDb.updateEmailLogByMessageId(messageId, {
          status: 'SENT',
          sentAt: new Date(),
        });
      } catch (error) {
        console.error('Failed to update email log for send event:', error);
      }
      break;
    }

    case 'delivery': {
      // Email was delivered
      try {
        await emailDb.updateEmailLogByMessageId(messageId, {
          status: 'DELIVERED',
          deliveredAt: new Date(),
        });
      } catch (error) {
        console.error('Failed to update email log for delivery event:', error);
      }
      break;
    }

    case 'bounce': {
      // Email bounced
      const bounceType = event.bounce?.bounceType;
      const bounceSubType = event.bounce?.bounceSubType;
      
      try {
        await emailDb.updateEmailLogByMessageId(messageId, {
          status: 'BOUNCED',
          error: `Bounce: ${bounceType} - ${bounceSubType}`,
        });

        // Add bounced emails to suppression list
        for (const recipient of event.bounce?.bouncedRecipients || []) {
          await emailDb.addSuppression({
            email: recipient.emailAddress,
            reason: 'BOUNCE',
            source: 'ses_webhook',
            bounceType: `${bounceType}_${bounceSubType}`,
          });
        }
      } catch (error) {
        console.error('Failed to process SES bounce event:', error);
      }
      break;
    }

    case 'complaint': {
      // Email was marked as spam
      const complaintType = event.complaint?.complaintFeedbackType;
      
      try {
        await emailDb.updateEmailLogByMessageId(messageId, {
          status: 'COMPLAINED',
          error: `Complaint: ${complaintType}`,
        });

        // Add complained emails to suppression list
        for (const recipient of event.complaint?.complainedRecipients || []) {
          await emailDb.addSuppression({
            email: recipient.emailAddress,
            reason: 'COMPLAINT',
            source: 'ses_webhook',
            complaintType: complaintType,
          });
        }
      } catch (error) {
        console.error('Failed to process SES complaint event:', error);
      }
      break;
    }

    case 'reject': {
      // Email was rejected
      try {
        await emailDb.updateEmailLogByMessageId(messageId, {
          status: 'FAILED',
          error: `Rejected: ${event.reject?.reason}`,
        });
      } catch (error) {
        console.error('Failed to update email log for reject event:', error);
      }
      break;
    }

    default:
      console.log('Unknown SES event type:', event.eventType);
  }
}

async function handleSESNotification(notification: any) {
  // Handle SES Configuration Set notifications (similar to events but different format)
  const messageId = notification.mail?.messageId;
  
  switch (notification.notificationType) {
    case 'Bounce':
      // Similar to bounce event handling
      await handleSESEvent({
        eventType: 'bounce',
        mail: notification.mail,
        bounce: notification.bounce
      });
      break;
      
    case 'Complaint':
      // Similar to complaint event handling
      await handleSESEvent({
        eventType: 'complaint',
        mail: notification.mail,
        complaint: notification.complaint
      });
      break;
      
    default:
      console.log('Unknown SES notification type:', notification.notificationType);
  }
}
