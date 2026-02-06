import { Queue, JobData, JobDefinition, JobContext } from "../types";

type InMemoryJob = JobData & {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  attempts: number;
  createdAt: Date;
  scheduledAt: Date;
  error?: string;
};

export class InMemoryQueue implements Queue {
  private jobs: Map<string, InMemoryJob> = new Map();
  private jobDefinitions: Map<string, JobDefinition> = new Map();
  private isRunning = false;
  private processingInterval: NodeJS.Timeout | null = null;
  private activeJobs = 0;
  private completedJobs = 0;
  private failedJobs = 0;
  private idCounter = 0;

  async enqueue(job: JobData): Promise<string> {
    const id = job.id || `inmem-${++this.idCounter}`;
    const scheduledAt = job.delay 
      ? new Date(Date.now() + job.delay) 
      : new Date();

    const inMemoryJob: InMemoryJob = {
      ...job,
      id,
      status: 'pending',
      attempts: 0,
      createdAt: new Date(),
      scheduledAt,
    };

    this.jobs.set(id, inMemoryJob);
    return id;
  }

  async enqueueBatch(jobs: JobData[]): Promise<string[]> {
    const ids = await Promise.all(jobs.map(job => this.enqueue(job)));
    return ids;
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
    this.startProcessing();
    
    console.log(`[InMemoryQueue] Started with ${jobDefinitions.length} job types`);
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    
    // Wait for active jobs to complete
    while (this.activeJobs > 0) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    console.log("[InMemoryQueue] Stopped");
  }

  async getStatus() {
    const pending = Array.from(this.jobs.values()).filter(j => j.status === 'pending').length;
    const processing = Array.from(this.jobs.values()).filter(j => j.status === 'processing').length;
    
    return {
      isRunning: this.isRunning,
      activeJobs: this.activeJobs,
      completedJobs: this.completedJobs,
      failedJobs: this.failedJobs,
      pendingJobs: pending,
      processingJobs: processing,
    };
  }

  async cleanup(olderThanDays: number): Promise<number> {
    const cutoffDate = new Date(Date.now() - (olderThanDays * 24 * 60 * 60 * 1000));
    let cleanedCount = 0;
    
    for (const [id, job] of this.jobs.entries()) {
      if (job.createdAt < cutoffDate && ['completed', 'failed'].includes(job.status)) {
        this.jobs.delete(id);
        cleanedCount++;
      }
    }
    
    console.log(`[InMemoryQueue] Cleaned up ${cleanedCount} old jobs`);
    return cleanedCount;
  }

  private startProcessing(): void {
    const process = async () => {
      if (!this.isRunning) return;

      const readyJobs = Array.from(this.jobs.values())
        .filter(job => 
          job.status === 'pending' && 
          job.scheduledAt <= new Date()
        )
        .sort((a, b) => (b.priority || 0) - (a.priority || 0)) // Higher priority first
        .slice(0, 10); // Process up to 10 jobs at once

      if (readyJobs.length > 0) {
        const processPromises = readyJobs.map(job => this.processJob(job));
        await Promise.allSettled(processPromises);
      }
    };

    this.processingInterval = setInterval(process, 100); // Check every 100ms
  }

  private async processJob(job: InMemoryJob): Promise<void> {
    if (job.status !== 'pending') return;

    const jobDefinition = this.jobDefinitions.get(job.type);
    if (!jobDefinition) {
      console.error(`[InMemoryQueue] Unknown job type: ${job.type}`);
      job.status = 'failed';
      job.error = `Unknown job type: ${job.type}`;
      this.failedJobs++;
      return;
    }

    this.activeJobs++;
    job.status = 'processing';
    job.attempts++;

    try {
      const context: JobContext = {
        attempt: job.attempts,
        maxAttempts: job.maxAttempts || 3,
        jobId: job.id,
        logger: {
          info: (message: string, meta?: any) => 
            console.log(`[InMemoryQueue] [${job.id}] ${message}`, meta),
          warn: (message: string, meta?: any) => 
            console.warn(`[InMemoryQueue] [${job.id}] ${message}`, meta),
          error: (message: string, meta?: any) => 
            console.error(`[InMemoryQueue] [${job.id}] ${message}`, meta),
        },
      };

      const result = await Promise.race([
        jobDefinition.handler(job.payload, context),
        this.createTimeoutPromise(jobDefinition.timeout || 30000),
      ]);

      if (result && !result.success) {
        throw new Error(result.error || "Job failed");
      }

      job.status = 'completed';
      this.completedJobs++;
      
    } catch (error) {
      const errorMessage = (error as Error).message;
      job.error = errorMessage;
      
      // Retry logic
      if (job.attempts < (job.maxAttempts || 3)) {
        job.status = 'pending';
        job.scheduledAt = new Date(Date.now() + (job.attempts * 1000)); // Exponential backoff
        console.warn(`[InMemoryQueue] Job ${job.id} failed, retrying (attempt ${job.attempts})`);
      } else {
        job.status = 'failed';
        this.failedJobs++;
        console.error(`[InMemoryQueue] Job ${job.id} failed permanently:`, errorMessage);
      }
    } finally {
      this.activeJobs--;
    }
  }

  private createTimeoutPromise(timeoutMs: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Job timeout after ${timeoutMs}ms`)), timeoutMs);
    });
  }

  // Helper methods for debugging
  getAllJobs() {
    return Array.from(this.jobs.values());
  }

  getJob(id: string) {
    return this.jobs.get(id);
  }

  clearAllJobs() {
    this.jobs.clear();
    this.completedJobs = 0;
    this.failedJobs = 0;
  }
}
