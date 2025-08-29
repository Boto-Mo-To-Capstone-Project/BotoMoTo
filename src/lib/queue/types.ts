/**
 * Queue system types and interfaces
 */

export type JobData = {
  id?: string;
  type: string;
  payload: any;
  idempotencyKey?: string;
  maxAttempts?: number;
  delay?: number; // milliseconds
  priority?: number; // higher = more priority
};

export type JobResult = {
  success: boolean;
  result?: any;
  error?: string;
};

export type JobContext = {
  attempt: number;
  maxAttempts: number;
  jobId: string;
  logger: {
    info: (message: string, meta?: any) => void;
    warn: (message: string, meta?: any) => void;
    error: (message: string, meta?: any) => void;
  };
};

export type JobHandler<T = any> = (
  payload: T,
  context: JobContext
) => Promise<JobResult | void>;

export type JobDefinition = {
  name: string;
  handler: JobHandler;
  concurrency?: number;
  timeout?: number; // milliseconds
};

/**
 * Queue interface - implemented by all queue backends
 */
export interface Queue {
  /**
   * Add a job to the queue
   */
  enqueue(job: JobData): Promise<string>; // returns job ID

  /**
   * Add multiple jobs to the queue
   */
  enqueueBatch(jobs: JobData[]): Promise<string[]>; // returns job IDs

  /**
   * Start processing jobs (for worker)
   */
  start(jobDefinitions: JobDefinition[]): Promise<void>;

  /**
   * Stop processing jobs
   */
  stop(): Promise<void>;

  /**
   * Get queue health/status
   */
  getStatus(): Promise<{
    isRunning: boolean;
    activeJobs: number;
    completedJobs: number;
    failedJobs: number;
  }>;

  /**
   * Clean up old jobs (optional)
   */
  cleanup?(olderThanDays: number): Promise<number>;
}
