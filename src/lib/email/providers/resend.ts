import { Resend } from "resend";
import { EmailProvider } from "../provider";
import { EmailMessage, EmailAddress, SendResult, SendBulkResult, ProviderCapabilities, SendOptions } from "../types";

const toStringAddr = (addr: EmailAddress): string => 
  addr.name ? `${addr.name} <${addr.email}>` : addr.email;

export class ResendEmailProvider implements EmailProvider {
  readonly name = "resend";
  readonly capabilities: ProviderCapabilities = {
    supportsAttachments: true,
    supportsBulk: false, // Resend doesn't have native bulk API
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
