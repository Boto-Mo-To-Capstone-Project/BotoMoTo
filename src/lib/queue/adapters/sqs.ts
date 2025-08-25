import { SQSClient, SendMessageCommand, SendMessageBatchCommand, ReceiveMessageCommand, DeleteMessageCommand } from "@aws-sdk/client-sqs";
import { Queue, JobData, JobDefinition, JobContext } from "../types";

type SqsConfig = {
  queueUrl: string;
  region: string;
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
  };
  maxReceiveCount?: number;
  visibilityTimeoutSeconds?: number;
  messageRetentionPeriod?: number;
};

type SqsMessage = {
  MessageId: string;
  ReceiptHandle: string;
  Body: string;
};

export class SqsQueue implements Queue {
  private client: SQSClient;
  private config: SqsConfig;
  private jobDefinitions: Map<string, JobDefinition> = new Map();
  private isRunning = false;
  private pollingInterval: NodeJS.Timeout | null = null;
  private activeJobs = 0;
  private completedJobs = 0;
  private failedJobs = 0;

  constructor(config: SqsConfig) {
    this.config = {
      maxReceiveCount: 10,
      visibilityTimeoutSeconds: 30,
      messageRetentionPeriod: 1209600, // 14 days
      ...config,
    };

    this.client = new SQSClient({
      region: this.config.region,
      credentials: this.config.credentials,
    });
  }

  async enqueue(job: JobData): Promise<string> {
    const messageBody = JSON.stringify({
      type: job.type,
      payload: job.payload,
      idempotencyKey: job.idempotencyKey,
      maxAttempts: job.maxAttempts || 3,
      createdAt: new Date().toISOString(),
    });

    const command = new SendMessageCommand({
      QueueUrl: this.config.queueUrl,
      MessageBody: messageBody,
      DelaySeconds: job.delay ? Math.floor(job.delay / 1000) : undefined,
      MessageDeduplicationId: job.idempotencyKey, // For FIFO queues
      MessageGroupId: job.type, // For FIFO queues
    });

    const result = await this.client.send(command);
    return result.MessageId || `sqs-${Date.now()}`;
  }

  async enqueueBatch(jobs: JobData[]): Promise<string[]> {
    if (jobs.length === 0) return [];
    
    const messageIds: string[] = [];
    
    // SQS batch limit is 10 messages
    for (let i = 0; i < jobs.length; i += 10) {
      const batch = jobs.slice(i, i + 10);
      const entries = batch.map((job, index) => ({
        Id: `${i + index}`,
        MessageBody: JSON.stringify({
          type: job.type,
          payload: job.payload,
          idempotencyKey: job.idempotencyKey,
          maxAttempts: job.maxAttempts || 3,
          createdAt: new Date().toISOString(),
        }),
        DelaySeconds: job.delay ? Math.floor(job.delay / 1000) : undefined,
        MessageDeduplicationId: job.idempotencyKey,
        MessageGroupId: job.type,
      }));

      const command = new SendMessageBatchCommand({
        QueueUrl: this.config.queueUrl,
        Entries: entries,
      });

      const result = await this.client.send(command);
      
      if (result.Successful) {
        messageIds.push(...result.Successful.map(s => s.MessageId || `sqs-${Date.now()}`));
      }
      
      if (result.Failed && result.Failed.length > 0) {
        console.error("[SqsQueue] Batch send failures:", result.Failed);
      }
    }

    return messageIds;
  }

  async start(jobDefinitions: JobDefinition[]): Promise<void> {
    if (this.isRunning) {
      throw new Error("Queue is already running");
    }

    // Store job definitions
    jobDefinitions.forEach(def => {
      this.jobDefinitions.set(def.name, def);
    });

    this.isRunning = true;
    this.startPolling();
    
    console.log(`[SqsQueue] Started with ${jobDefinitions.length} job types`);
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    
    // Wait for active jobs to complete
    while (this.activeJobs > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log("[SqsQueue] Stopped");
  }

  async getStatus() {
    return {
      isRunning: this.isRunning,
      activeJobs: this.activeJobs,
      completedJobs: this.completedJobs,
      failedJobs: this.failedJobs,
    };
  }

  private startPolling(): void {
    const poll = async () => {
      if (!this.isRunning) return;

      try {
        await this.pollMessages();
      } catch (error) {
        console.error("[SqsQueue] Polling error:", error);
      }
      
      // Continue polling
      if (this.isRunning) {
        this.pollingInterval = setTimeout(poll, 1000);
      }
    };

    poll();
  }

  private async pollMessages(): Promise<void> {
    const command = new ReceiveMessageCommand({
      QueueUrl: this.config.queueUrl,
      MaxNumberOfMessages: 10,
      WaitTimeSeconds: 5, // Long polling
      VisibilityTimeout: this.config.visibilityTimeoutSeconds,
    });

    const result = await this.client.send(command);
    
    if (!result.Messages || result.Messages.length === 0) {
      return;
    }

    // Process messages concurrently
    const processPromises = result.Messages.map(message => this.processMessage(message as SqsMessage));
    await Promise.allSettled(processPromises);
  }

  private async processMessage(message: SqsMessage): Promise<void> {
    this.activeJobs++;
    
    try {
      const jobData = JSON.parse(message.Body);
      const jobDefinition = this.jobDefinitions.get(jobData.type);
      
      if (!jobDefinition) {
        console.error(`[SqsQueue] Unknown job type: ${jobData.type}`);
        await this.deleteMessage(message.ReceiptHandle);
        this.failedJobs++;
        return;
      }

      const context: JobContext = {
        attempt: 1, // SQS doesn't track attempts directly
        maxAttempts: jobData.maxAttempts || 3,
        jobId: message.MessageId,
        logger: {
          info: (msg: string, meta?: any) => console.log(`[SqsQueue] ${msg}`, meta),
          warn: (msg: string, meta?: any) => console.warn(`[SqsQueue] ${msg}`, meta),
          error: (msg: string, meta?: any) => console.error(`[SqsQueue] ${msg}`, meta),
        },
      };

      // Execute job
      const result = await jobDefinition.handler(jobData.payload, context);
      
      if (result && !result.success) {
        throw new Error(result.error || "Job failed");
      }

      // Job succeeded, delete message
      await this.deleteMessage(message.ReceiptHandle);
      this.completedJobs++;
      
    } catch (error) {
      console.error(`[SqsQueue] Job processing failed:`, error);
      this.failedJobs++;
      
      // Message will become visible again after visibility timeout
      // SQS will handle retries based on queue configuration
    } finally {
      this.activeJobs--;
    }
  }

  private async deleteMessage(receiptHandle: string): Promise<void> {
    const command = new DeleteMessageCommand({
      QueueUrl: this.config.queueUrl,
      ReceiptHandle: receiptHandle,
    });

    await this.client.send(command);
  }
}
