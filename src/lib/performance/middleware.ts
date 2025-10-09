import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/adminAuth";
import { ApiLogger } from "./apiLogger";

/**
 * Performance Logging Middleware
 * 
 * This middleware automatically logs performance data for API routes.
 * It wraps around your existing API handlers and captures:
 * - Request/response timing
 * - HTTP status codes
 * - User information (if authenticated)
 * - Error details
 * - IP addresses and user agents
 * 
 * Usage:
 * export const GET = withPerformanceLogging(async (request) => {
 *   // Your existing API logic here
 *   return NextResponse.json({ data: "Hello World" });
 * });
 */

type ApiHandler = (request: NextRequest, context?: any) => Promise<NextResponse | Response> | NextResponse | Response;

/**
 * Higher-order function that wraps API handlers with performance logging
 * 
 * @param handler - Your existing API route handler
 * @param options - Optional configuration for logging behavior
 * @returns Wrapped handler with automatic performance logging
 */
export function withPerformanceLogging(
  handler: ApiHandler,
  options: {
    skipAuth?: boolean;      // Skip session lookup for public endpoints
    skipLogging?: boolean;   // Temporarily disable logging for this endpoint
    logLevel?: 'minimal' | 'full'; // Control how much data to log
  } = {}
): ApiHandler {
  return async (request: NextRequest, context?: any): Promise<NextResponse | Response> => {
    // Skip logging if disabled for this endpoint
    if (options.skipLogging) {
      return handler(request, context);
    }

    // Start performance timing
    const startTime = Date.now();
    let session: any = null;
    let response: NextResponse | Response;
    let error: string | undefined;

    try {
      // Get user session for user tracking (if not skipped)
      if (!options.skipAuth) {
        try {
          session = await auth();
        } catch (sessionError) {
          // Don't fail the request if session lookup fails
          console.warn('Session lookup failed in performance middleware:', sessionError);
        }
      }

      // Execute the actual API handler
      response = await handler(request, context);

    } catch (handlerError) {
      // Capture error information
      error = handlerError instanceof Error ? handlerError.message : String(handlerError);
      
      // Create error response if handler didn't return one
      response = NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }

    // Log the performance data asynchronously (non-blocking)
    const userId = session?.user?.id;
    
    // Fire and forget - don't wait for logging to complete
    ApiLogger.logApiRequest(request, response, startTime, userId, error)
      .catch(logError => {
        // Log errors should never break the API response
        console.error('Performance logging failed:', logError);
      });

    return response;
  };
}

/**
 * Lightweight version of performance logging for high-traffic endpoints
 * Logs only essential metrics to reduce database load
 */
export function withLightweightLogging(handler: ApiHandler): ApiHandler {
  return withPerformanceLogging(handler, { 
    logLevel: 'minimal',
    skipAuth: true // Skip session lookup for better performance
  });
}

/**
 * Session tracking helper for login/logout events
 * Call this when users log in to start session tracking
 */
export async function startSessionTracking(request: NextRequest, userId: string): Promise<string | null> {
  try {
    const ipAddress = extractIpAddress(request);
    const userAgent = request.headers.get('user-agent') || undefined;

    return await ApiLogger.startUserSession({
      userId,
      ipAddress,
      userAgent
    });
  } catch (error) {
    console.error('Failed to start session tracking:', error);
    return null;
  }
}

/**
 * End session tracking helper for logout events
 */
export async function endSessionTracking(sessionId: string): Promise<void> {
  try {
    await ApiLogger.endUserSession(sessionId);
  } catch (error) {
    console.error('Failed to end session tracking:', error);
  }
}

/**
 * Batch logging for multiple API calls
 * Useful for bulk operations to reduce database calls
 */
export class BatchLogger {
  private logs: Array<{
    request: NextRequest;
    response: NextResponse | Response;
    startTime: number;
    userId?: string;
    error?: string;
  }> = [];

  /**
   * Add a log entry to the batch
   */
  addLog(
    request: NextRequest,
    response: NextResponse | Response,
    startTime: number,
    userId?: string,
    error?: string
  ): void {
    this.logs.push({ request, response, startTime, userId, error });
  }

  /**
   * Flush all batched logs to database
   */
  async flush(): Promise<void> {
    if (this.logs.length === 0) return;

    try {
      // Process all logs in parallel for better performance
      const logPromises = this.logs.map(log =>
        ApiLogger.logApiRequest(
          log.request,
          log.response,
          log.startTime,
          log.userId,
          log.error
        )
      );

      await Promise.all(logPromises);
      this.logs = []; // Clear the batch after successful logging
    } catch (error) {
      console.error('Batch logging failed:', error);
      // Clear the batch anyway to prevent memory leaks
      this.logs = [];
    }
  }

  /**
   * Get the current batch size
   */
  size(): number {
    return this.logs.length;
  }
}

// Helper function for IP extraction (reused from ApiLogger)
function extractIpAddress(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  return 'unknown';
}
