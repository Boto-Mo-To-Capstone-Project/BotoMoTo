import { Queue, JobDefinition } from "./types";
import { GraphileWorkerQueue, SqsQueue, InMemoryQueue } from "./adapters";
import { validateEmailConfig } from "../email/config";

let queueInstance: Queue | null = null;

export function createQueue(): Queue {
  if (queueInstance) {
    return queueInstance;
  }

  const config = validateEmailConfig();
  
  switch (config.QUEUE_BACKEND) {
    case 'graphile':
      const connectionString = config.QUEUE_DATABASE_URL || config.DATABASE_URL;
      if (!connectionString) {
        throw new Error("DATABASE_URL or QUEUE_DATABASE_URL is required for graphile queue backend");
      }
      
      queueInstance = new GraphileWorkerQueue({
        connectionString,
        concurrency: 5,
        pollInterval: 1000,
      });
      console.log("[Queue] Using Graphile Worker backend");
      break;

    case 'sqs':
      if (!config.SQS_QUEUE_URL) {
        throw new Error("SQS_QUEUE_URL is required for sqs queue backend");
      }
      
      queueInstance = new SqsQueue({
        queueUrl: config.SQS_QUEUE_URL,
        region: config.AWS_REGION || 'us-east-1',
        credentials: config.AWS_ACCESS_KEY_ID && config.AWS_SECRET_ACCESS_KEY ? {
          accessKeyId: config.AWS_ACCESS_KEY_ID,
          secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
        } : undefined,
      });
      console.log("[Queue] Using SQS backend");
      break;

    case 'inmemory':
    default:
      queueInstance = new InMemoryQueue();
      console.log("[Queue] Using InMemory backend (development only)");
      break;
  }

  return queueInstance;
}

export function resetQueue(): void {
  queueInstance = null;
}

// Re-export types and adapters
export type { Queue, JobData, JobDefinition, JobContext, JobHandler } from "./types";
export { GraphileWorkerQueue, SqsQueue, InMemoryQueue } from "./adapters";
export { emailJobDefinitions } from "./jobs";
export * from "./helpers";
