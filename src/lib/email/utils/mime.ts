import { EmailMessage, EmailAddress } from "../types";

/**
 * Create MIME message for raw email sending (with attachments)
 */
export function createMimeMessage(message: EmailMessage, from: EmailAddress): string {
  const boundary = `----EmailBoundary${Date.now()}`;
  const to = Array.isArray(message.to) ? message.to : [message.to];
  
  let mime = `MIME-Version: 1.0\r\n`;
  mime += `From: ${formatEmailAddress(from)}\r\n`;
  mime += `To: ${to.map(formatEmailAddress).join(', ')}\r\n`;
  
  if (message.cc?.length) {
    mime += `Cc: ${message.cc.map(formatEmailAddress).join(', ')}\r\n`;
  }
  
  if (message.bcc?.length) {
    mime += `Bcc: ${message.bcc.map(formatEmailAddress).join(', ')}\r\n`;
  }
  
  if (message.replyTo) {
    mime += `Reply-To: ${formatEmailAddress(message.replyTo)}\r\n`;
  }
  
  mime += `Subject: ${message.subject}\r\n`;
  
  // Add custom headers
  if (message.headers) {
    for (const [key, value] of Object.entries(message.headers)) {
      mime += `${key}: ${value}\r\n`;
    }
  }
  
  if (message.attachments?.length) {
    mime += `Content-Type: multipart/mixed; boundary="${boundary}"\r\n\r\n`;
    
    // Email body part
    mime += `--${boundary}\r\n`;
    mime += `Content-Type: multipart/alternative; boundary="${boundary}-alt"\r\n\r\n`;
    
    // Text part
    if (message.text) {
      mime += `--${boundary}-alt\r\n`;
      mime += `Content-Type: text/plain; charset=UTF-8\r\n\r\n`;
      mime += `${message.text}\r\n\r\n`;
    }
    
    // HTML part
    if (message.html) {
      mime += `--${boundary}-alt\r\n`;
      mime += `Content-Type: text/html; charset=UTF-8\r\n\r\n`;
      mime += `${message.html}\r\n\r\n`;
    }
    
    mime += `--${boundary}-alt--\r\n`;
    
    // Attachments
    for (const attachment of message.attachments) {
      mime += `--${boundary}\r\n`;
      mime += `Content-Type: ${attachment.contentType || 'application/octet-stream'}\r\n`;
      mime += `Content-Disposition: attachment; filename="${attachment.filename}"\r\n`;
      mime += `Content-Transfer-Encoding: base64\r\n\r\n`;
      
      // convert to base64 if content exists
      if (attachment.content) {
        const base64Content = Buffer.isBuffer(attachment.content) 
          ? attachment.content.toString('base64')
          : attachment.content;
        mime += `${base64Content}\r\n\r\n`;
      }
    }
    
    mime += `--${boundary}--\r\n`;
  } else {
    // Simple message without attachments
    if (message.html && message.text) {
      mime += `Content-Type: multipart/alternative; boundary="${boundary}"\r\n\r\n`;
      
      mime += `--${boundary}\r\n`;
      mime += `Content-Type: text/plain; charset=UTF-8\r\n\r\n`;
      mime += `${message.text}\r\n\r\n`;
      
      mime += `--${boundary}\r\n`;
      mime += `Content-Type: text/html; charset=UTF-8\r\n\r\n`;
      mime += `${message.html}\r\n\r\n`;
      
      mime += `--${boundary}--\r\n`;
    } else if (message.html) {
      mime += `Content-Type: text/html; charset=UTF-8\r\n\r\n`;
      mime += `${message.html}\r\n`;
    } else if (message.text) {
      mime += `Content-Type: text/plain; charset=UTF-8\r\n\r\n`;
      mime += `${message.text}\r\n`;
    }
  }
  
  return mime;
}

function formatEmailAddress(addr: EmailAddress): string {
  return addr.name ? `${addr.name} <${addr.email}>` : addr.email;
}
