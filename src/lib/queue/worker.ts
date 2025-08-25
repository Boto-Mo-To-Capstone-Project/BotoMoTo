#!/usr/bin/env tsx
/**
 * Queue worker entry point
 * Run this as a separate process: npm run worker
 */

import { createQueue } from "./index";
import { emailJobDefinitions } from "./jobs";

async function startWorker() {
  console.log("[Worker] Starting queue worker...");
  
  try {
    const queue = createQueue();
    
    // Start processing jobs
    await queue.start(emailJobDefinitions);
    
    console.log(`[Worker] Queue worker started with ${emailJobDefinitions.length} job types`);
    
    // Graceful shutdown
    const shutdown = async () => {
      console.log("[Worker] Shutting down worker...");
      await queue.stop();
      console.log("[Worker] Worker stopped");
      process.exit(0);
    };
    
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    
    // Keep the process alive
    process.on('uncaughtException', (error) => {
      console.error("[Worker] Uncaught exception:", error);
      shutdown();
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      console.error("[Worker] Unhandled rejection at:", promise, "reason:", reason);
      shutdown();
    });
    
  } catch (error) {
    console.error("[Worker] Failed to start worker:", error);
    process.exit(1);
  }
}

// Start the worker if this file is run directly
if (require.main === module) {
  startWorker();
}

export { startWorker };
