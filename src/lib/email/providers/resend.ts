import { Resend } from "resend";
import { EmailProvider } from "../provider";
import { EmailMessage, EmailAddress, SendResult, SendBulkResult, ProviderCapabilities, SendOptions } from "../types";

const toStringAddr = (addr: EmailAddress): string => 
  addr.name ? `${addr.name} <${addr.email}>` : addr.email;

export class ResendEmailProvider implements EmailProvider {
  readonly name = "resend";
  readonly capabilities: ProviderCapabilities = {
    supportsAttachments: true,
    supportsBulk: true, // ✅ Resend DOES support bulk via batch API
    maxMessageSize: 40 * 1024 * 1024, // 40MB limit
  };

  private client: Resend;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("Resend API key is required");
    }
    this.client = new Resend(apiKey);
  }

  async send(message: EmailMessage & { from: EmailAddress }, options?: SendOptions): Promise<SendResult> {
    try {
      const from = message.from;
      
      const to = Array.isArray(message.to) 
        ? message.to.map(toStringAddr) 
        : [toStringAddr(message.to)];

      const payload: any = {
        from: toStringAddr(from),
        to,
        subject: message.subject,
        html: message.html,
        text: message.text,
        headers: message.headers,
      };

      // Optional fields
      if (message.cc?.length) {
        payload.cc = message.cc.map(toStringAddr);
      }
      
      if (message.bcc?.length) {
        payload.bcc = message.bcc.map(toStringAddr);
      }
      
      if (message.replyTo) {
        payload.reply_to = toStringAddr(message.replyTo);
      }

      // Attachments
      if (message.attachments?.length) {
        payload.attachments = message.attachments.map(att => ({
          filename: att.filename,
          content: att.content,
          path: att.path,
          content_type: att.contentType,
        }));
      }

      // Tags (Resend-specific)
      if (options?.tags) {
        payload.tags = Object.entries(options.tags).map(([name, value]) => ({
          name,
          value,
        }));
      }

      console.log("[Resend] Sending email with payload:", {
        from: payload.from,
        to: payload.to,
        subject: payload.subject,
        hasHtml: !!payload.html,
        hasText: !!payload.text
      });

      const response = await this.client.emails.send(payload);

      if (response.error) {
        console.error("[Resend] API Error Details:", response.error);
        throw new Error(`Resend API error: ${response.error.message || JSON.stringify(response.error)}`);
      }

      if (!response.data) {
        console.error("[Resend] No data in response:", response);
        throw new Error("Resend API returned no data");
      }

      return { id: response.data.id ?? "" };
    } catch (error) {
      throw new Error(`Resend send failed: ${(error as Error).message}`);
    }
  }

  async sendBulk(messages: (EmailMessage & { from: EmailAddress })[], options?: SendOptions): Promise<SendBulkResult> {
    try {
      console.log(`[Resend] Preparing batch send for ${messages.length} emails using native batch API`);
      
      const batchPayload = messages.map(message => {
        const payload: any = {
          from: toStringAddr(message.from),
          to: Array.isArray(message.to) 
            ? message.to.map(toStringAddr) 
            : [toStringAddr(message.to)],
          subject: message.subject,
          html: message.html,
          text: message.text,
          headers: message.headers,
        };

        // Optional fields
        if (message.cc?.length) {
          payload.cc = message.cc.map(toStringAddr);
        }
        
        if (message.bcc?.length) {
          payload.bcc = message.bcc.map(toStringAddr);
        }
        
        if (message.replyTo) {
          payload.reply_to = toStringAddr(message.replyTo);
        }

        // Attachments
        if (message.attachments?.length) {
          payload.attachments = message.attachments.map(att => ({
            filename: att.filename,
            content: att.content,
            path: att.path,
            content_type: att.contentType,
          }));
        }

        // Tags (Resend-specific)
        if (options?.tags) {
          payload.tags = Object.entries(options.tags).map(([name, value]) => ({
            name,
            value,
          }));
        }

        return payload;
      });

      console.log(`[Resend] Sending batch of ${messages.length} emails via batch.send()`);
      
      const response = await this.client.batch.send(batchPayload);

      if (response.error) {
        console.error("[Resend] Batch API Error Details:", response.error);
        throw new Error(`Resend batch API error: ${response.error.message || JSON.stringify(response.error)}`);
      }

      if (!response.data) {
        console.error("[Resend] No data in batch response:", response);
        throw new Error("Resend batch API returned no data");
      }

      // Handle batch response - extract message IDs
      let messageIds: string[] = [];
      try {
        const data = response.data as any;
        if (Array.isArray(data)) {
          messageIds = data.map((item: any) => item.id || item || "");
        } else if (data && typeof data === 'object') {
          if (data.id) {
            messageIds = [data.id];
          } else if (data.data && Array.isArray(data.data)) {
            messageIds = data.data.map((item: any) => item.id || item || "");
          } else {
            // Log the actual response structure for debugging
            console.log("[Resend] Unexpected batch response structure:", data);
            messageIds = [JSON.stringify(data)];
          }
        } else {
          messageIds = [String(data)];
        }
      } catch (parseError) {
        console.error("[Resend] Error parsing batch response:", parseError);
        messageIds = ["batch-unknown-id"];
      }

      console.log(`[Resend] Batch send successful! Message IDs: ${messageIds.length} emails sent`);

      return {
        ids: messageIds
      };
    } catch (error) {
      console.error("[Resend] Batch send failed:", error);
      throw new Error(`Resend batch send failed: ${(error as Error).message}`);
    }
  }

  async verifyConnection(): Promise<void> {
    try {
      // Simple API health check
      await this.client.domains.list();
    } catch (error) {
      throw new Error(`Resend connection failed: ${(error as Error).message}`);
    }
  }

  getRateLimit() {
    return {
      requestsPerSecond: 14, // Resend default rate limit
    };
  }

}
