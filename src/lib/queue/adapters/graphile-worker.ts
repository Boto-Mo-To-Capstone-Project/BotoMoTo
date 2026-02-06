import { run, makeWorkerUtils, TaskList, Runner, WorkerUtils } from "graphile-worker";
import { Queue, JobData, JobDefinition, JobContext, JobHandler } from "../types";

type GraphileWorkerConfig = {
  connectionString: string;
  concurrency?: number;
  pollInterval?: number;
  schema?: string;
};

export class GraphileWorkerQueue implements Queue {
  private config: GraphileWorkerConfig;
  private runner: Runner | null = null;
  private workerUtils: WorkerUtils | null = null;
  private jobDefinitions: Map<string, JobDefinition> = new Map();
  private isRunning = false;

  constructor(config: GraphileWorkerConfig) {
    this.config = {
      concurrency: 5,
      pollInterval: 1000,
      schema: 'graphile_worker',
      ...config,
    };
  }

  async enqueue(job: JobData): Promise<string> {
    const utils = await this.getWorkerUtils();
    
    const result = await utils.addJob(
      job.type,
      job.payload,
      {
        jobKey: job.idempotencyKey,
        maxAttempts: job.maxAttempts || 3,
        runAt: job.delay ? new Date(Date.now() + job.delay) : undefined,
        priority: job.priority || 0,
      }
    );

    return result.id.toString();
  }

  async enqueueBatch(jobs: JobData[]): Promise<string[]> {
    const utils = await this.getWorkerUtils();
    const jobIds: string[] = [];

    // Graphile Worker doesn't have native batch insert, so we'll use Promise.all
    const results = await Promise.all(
      jobs.map(job => 
        utils.addJob(
          job.type,
          job.payload,
          {
            jobKey: job.idempotencyKey,
            maxAttempts: job.maxAttempts || 3,
            runAt: job.delay ? new Date(Date.now() + job.delay) : undefined,
            priority: job.priority || 0,
          }
        )
      )
    );

    return results.map(result => result.id.toString());
  }

  async start(jobDefinitions: JobDefinition[]): Promise<void> {
    if (this.isRunning) {
      throw new Error("Queue is already running");
    }

    // Store job definitions
    jobDefinitions.forEach(def => {
      this.jobDefinitions.set(def.name, def);
    });

    // Create task list for Graphile Worker
    const taskList: TaskList = {};
    
    jobDefinitions.forEach(def => {
      taskList[def.name] = async (payload, helpers) => {
        const context: JobContext = {
          attempt: helpers.job.attempts || 1,
          maxAttempts: helpers.job.max_attempts || 3,
          jobId: helpers.job.id.toString(),
          logger: {
            info: (message: string, meta?: any) => {
              helpers.logger.info(message, meta);
            },
            warn: (message: string, meta?: any) => {
              helpers.logger.warn(message, meta);
            },
            error: (message: string, meta?: any) => {
              helpers.logger.error(message, meta);
            },
          },
        };

        try {
          const result = await def.handler(payload, context);
          
          if (result && !result.success) {
            throw new Error(result.error || "Job failed");
          }
          
          return result?.result;
        } catch (error) {
          context.logger.error(`Job ${def.name} failed`, { error: (error as Error).message });
          throw error;
        }
      };
    });

    // Start the runner
    this.runner = await run({
      connectionString: this.config.connectionString,
      taskList,
      concurrency: this.config.concurrency,
      pollInterval: this.config.pollInterval,
    });

    // Run migrations separately
    const utils = await this.getWorkerUtils();
    await utils.migrate();

    this.isRunning = true;
    console.log(`[GraphileWorkerQueue] Started with ${jobDefinitions.length} job types`);
  }

  async stop(): Promise<void> {
    if (this.runner) {
      await this.runner.stop();
      this.runner = null;
    }
    
    if (this.workerUtils) {
      await this.workerUtils.release();
      this.workerUtils = null;
    }
    
    this.isRunning = false;
    console.log("[GraphileWorkerQueue] Stopped");
  }

  async getStatus() {
    // Graphile Worker doesn't expose detailed stats easily
    // This is a simplified implementation
    return {
      isRunning: this.isRunning,
      activeJobs: 0, // Would need to query the jobs table
      completedJobs: 0,
      failedJobs: 0,
    };
  }

  async cleanup(olderThanDays: number): Promise<number> {
    const utils = await this.getWorkerUtils();
    
    // Graphile Worker has built-in cleanup
    // This would typically be handled by the library's maintenance functions
    console.log(`[GraphileWorkerQueue] Cleanup requested for jobs older than ${olderThanDays} days`);
    return 0; // Return number of cleaned jobs
  }

  private async getWorkerUtils(): Promise<WorkerUtils> {
    if (!this.workerUtils) {
      this.workerUtils = await makeWorkerUtils({
        connectionString: this.config.connectionString,
      });
      
      // Run migrations to ensure schema is up to date
      await this.workerUtils.migrate();
    }
    
    return this.workerUtils;
  }
}
