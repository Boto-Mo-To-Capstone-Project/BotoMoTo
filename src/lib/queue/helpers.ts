import { createQueue } from "./index";
import { SendEmailJobPayload, SendBulkEmailJobPayload } from "./jobs";

/**
 * Enqueue a single email to be sent
 */
export async function enqueueEmail(
  payload: SendEmailJobPayload,
  options: {
    idempotencyKey?: string;
    delay?: number;
    priority?: number;
  } = {}
): Promise<string> {
  const queue = createQueue();
  
  const jobData = {
    type: 'email.send',
    payload,
    idempotencyKey: options.idempotencyKey,
    delay: options.delay,
    priority: options.priority,
    maxAttempts: 3,
  };
  
  return queue.enqueue(jobData);
}

/**
 * Enqueue multiple emails to be sent (creates individual jobs for better tracking)
 */
export async function enqueueEmails(
  emails: SendEmailJobPayload[],
  options: {
    batchIdempotencyPrefix?: string;
    delay?: number;
    priority?: number;
  } = {}
): Promise<string[]> {
  const queue = createQueue();
  
  const jobs = emails.map((email, index) => ({
    type: 'email.send',
    payload: email,
    idempotencyKey: options.batchIdempotencyPrefix 
      ? `${options.batchIdempotencyPrefix}-${index}`
      : undefined,
    delay: options.delay,
    priority: options.priority,
    maxAttempts: 3,
  }));
  
  return queue.enqueueBatch(jobs);
}

/**
 * Enqueue bulk email send (single job that processes multiple emails)
 */
export async function enqueueBulkEmail(
  payload: SendBulkEmailJobPayload,
  options: {
    idempotencyKey?: string;
    delay?: number;
    priority?: number;
  } = {}
): Promise<string> {
  const queue = createQueue();
  
  const jobData = {
    type: 'email.send-bulk',
    payload,
    idempotencyKey: options.idempotencyKey,
    delay: options.delay,
    priority: options.priority,
    maxAttempts: 2, // Lower retry count for bulk jobs
  };
  
  return queue.enqueue(jobData);
}

/**
 * Enqueue voting codes for an election
 */
export async function enqueueVotingCodes(
  electionId: string,
  voters: Array<{
    id: string;
    email: string;
    name?: string;
    votingCode: string;
  }>,
  options: {
    templateId?: string;
    templateVars?: Record<string, any>;
    delay?: number;
  } = {}
): Promise<string[]> {
  const emails: SendEmailJobPayload[] = voters.map(voter => ({
    to: { email: voter.email, name: voter.name },
    subject: `Your Voting Code for Election`,
    templateId: options.templateId || 'voting-code',
    templateVars: {
      voterName: voter.name || voter.email,
      votingCode: voter.votingCode,
      electionId,
      ...options.templateVars,
    },
    electionId,
    voterId: voter.id,
    category: 'voting-code' as const,
  }));

  return enqueueEmails(emails, {
    batchIdempotencyPrefix: `election-${electionId}-codes`,
    delay: options.delay,
    priority: 10, // High priority for voting codes
  });
}

/**
 * Get queue status
 */
export async function getQueueStatus() {
  const queue = createQueue();
  return queue.getStatus();
}
