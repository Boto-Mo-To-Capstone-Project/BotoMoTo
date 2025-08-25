import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { EmailProvider } from "../provider";
import { EmailMessage, EmailAddress, SendResult, SendBulkResult, ProviderCapabilities, SendOptions } from "../types";
import { createMimeMessage } from "../utils";

const toStringAddr = (addr: EmailAddress): string => 
  addr.name ? `${addr.name} <${addr.email}>` : addr.email;

type SesConfig = {
  region: string;
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
  };
};

export class SesEmailProvider implements EmailProvider {
  readonly name = "ses";
  readonly capabilities: ProviderCapabilities = {
    supportsAttachments: true,
    supportsBulk: true,
    maxMessageSize: 10 * 1024 * 1024, // 10MB limit for SES
    maxRecipientsPerBatch: 50, // SES bulk limit
  };

  private client: SESv2Client;

  constructor(config: SesConfig) {
    this.client = new SESv2Client({
      region: config.region,
      credentials: config.credentials,
    });
  }

  async send(message: EmailMessage, options?: SendOptions): Promise<SendResult> {
    try {
      const from = this.getFromAddress(options);
      
      // Check if we need Raw MIME (for attachments)
      if (message.attachments?.length) {
        return this.sendRaw(message, from);
      }
      
      // Use Simple email for basic messages
      return this.sendSimple(message, from);
    } catch (error) {
      throw new Error(`SES send failed: ${(error as Error).message}`);
    }
  }

  async sendBulk(messages: EmailMessage[], options?: SendOptions): Promise<SendBulkResult> {
    try {
      const from = this.getFromAddress(options);
      
      // For now, implement bulk as concurrent individual sends
      // SES SendBulkEmail API has complex template requirements
      const results: string[] = [];
      
      // Process in chunks of 10 to avoid overwhelming SES
      for (let i = 0; i < messages.length; i += 10) {
        const chunk = messages.slice(i, i + 10);
        const chunkPromises = chunk.map(message => this.send(message, options));
        const chunkResults = await Promise.all(chunkPromises);
        results.push(...chunkResults.map(r => r.id));
      }

      return { ids: results };
    } catch (error) {
      throw new Error(`SES bulk send failed: ${(error as Error).message}`);
    }
  }

  async verifyConnection(): Promise<void> {
    try {
      // Simple API health check - try to get account info
      const command = new SendEmailCommand({
        FromEmailAddress: "test@example.com",
        Destination: { ToAddresses: ["test@example.com"] },
        Content: {
          Simple: {
            Subject: { Data: "Test", Charset: "UTF-8" },
            Body: { Text: { Data: "Test", Charset: "UTF-8" } },
          },
        },
      });
      
      // We expect this to fail with validation error, which means connection is OK
      try {
        await this.client.send(command);
      } catch (error: any) {
        // Connection is OK if we get a validation error (not network error)
        if (error.name !== 'NetworkingError' && error.name !== 'UnknownEndpoint') {
          return; // Connection successful
        }
        throw error;
      }
    } catch (error) {
      throw new Error(`SES connection failed: ${(error as Error).message}`);
    }
  }

  getRateLimit() {
    return {
      // SES rate limits vary by account, these are conservative defaults
      requestsPerSecond: 14,
      requestsPerDay: 200, // Sandbox limit
    };
  }

  private async sendSimple(message: EmailMessage, from: EmailAddress): Promise<SendResult> {
    const to = Array.isArray(message.to) ? message.to : [message.to];
    
    const command = new SendEmailCommand({
      FromEmailAddress: toStringAddr(from),
      Destination: {
        ToAddresses: to.map(toStringAddr),
        CcAddresses: message.cc?.map(toStringAddr),
        BccAddresses: message.bcc?.map(toStringAddr),
      },
      ReplyToAddresses: message.replyTo ? [toStringAddr(message.replyTo)] : undefined,
      Content: {
        Simple: {
          Subject: { Data: message.subject, Charset: "UTF-8" },
          Body: {
            Html: message.html ? { Data: message.html, Charset: "UTF-8" } : undefined,
            Text: message.text ? { Data: message.text, Charset: "UTF-8" } : undefined,
          },
        },
      },
    });

    const response = await this.client.send(command);
    return { id: response.MessageId ?? "" };
  }

  private async sendRaw(message: EmailMessage, from: EmailAddress): Promise<SendResult> {
    const to = Array.isArray(message.to) ? message.to : [message.to];
    const rawMessage = await createMimeMessage(message, from);

    const command = new SendEmailCommand({
      FromEmailAddress: toStringAddr(from),
      Destination: {
        ToAddresses: to.map(toStringAddr),
      },
      Content: {
        Raw: {
          Data: Buffer.from(rawMessage),
        },
      },
    });

    const response = await this.client.send(command);
    return { id: response.MessageId ?? "" };
  }

  private getFromAddress(options?: SendOptions): EmailAddress {
    if (options?.from) {
      return options.from;
    }
    throw new Error("From address is required for SES");
  }
}
