import db from "@/lib/db/db";
import { NextRequest, NextResponse } from "next/server";

// Types for our logging data
interface ApiLogData {
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  userId?: string;
  ipAddress: string;
  userAgent?: string;
  error?: string;
}

interface SessionData {
  userId: string;
  ipAddress: string;
  userAgent?: string;
}

/**
 * ApiLogger - Handles all performance logging for analytics
 * 
 * This class captures:
 * - API request/response times
 * - Error rates and types
 * - User session tracking
 * - System performance metrics
 */
export class ApiLogger {
  
  /**
   * Log an API request with performance data
   * This is the main function called by middleware
   */
  static async logApiRequest(
    request: NextRequest,
    response: NextResponse | Response,
    startTime: number,
    userId?: string,
    error?: string
  ): Promise<void> {
    try {
      const responseTime = Date.now() - startTime;
      const endpoint = this.cleanEndpoint(request.url);
      const ipAddress = this.extractIpAddress(request);
      const userAgent = request.headers.get('user-agent') || undefined;

      const logData: ApiLogData = {
        endpoint,
        method: request.method,
        statusCode: response.status,
        responseTime,
        userId,
        ipAddress,
        userAgent,
        error: error ? this.truncateError(error) : undefined
      };

      // Log asynchronously without blocking the response
      this.saveApiLog(logData).catch(err => {
        console.error('Failed to save API log:', err);
      });

    } catch (err) {
      // Never let logging break the actual API response
      console.error('ApiLogger.logApiRequest error:', err);
    }
  }

  /**
   * Start tracking a user session
   * Called when user logs in or starts using the system
   */
  static async startUserSession(sessionData: SessionData): Promise<string | null> {
    try {
      const session = await db.userSession.create({
        data: {
          id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userId: sessionData.userId,
          startedAt: new Date(),
          ipAddress: sessionData.ipAddress,
          userAgent: sessionData.userAgent,
        }
      });

      return session.id;
    } catch (error) {
      console.error('Failed to start user session:', error);
      return null;
    }
  }

  /**
   * End tracking a user session
   * Called when user logs out or session expires
   */
  static async endUserSession(sessionId: string): Promise<void> {
    try {
      await db.userSession.update({
        where: { id: sessionId },
        data: { endedAt: new Date() }
      });
    } catch (error) {
      console.error('Failed to end user session:', error);
    }
  }

  /**
   * Clean up old logs to prevent database bloat
   * Should be called periodically (daily/weekly)
   */
  static async cleanupOldLogs(daysToKeep: number = 90): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      // Clean up old API logs
      await db.apiLog.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate
          }
        }
      });

      // Clean up old completed sessions
      await db.userSession.deleteMany({
        where: {
          endedAt: {
            not: null,
            lt: cutoffDate
          }
        }
      });

      console.log(`Cleaned up logs older than ${daysToKeep} days`);
    } catch (error) {
      console.error('Failed to cleanup old logs:', error);
    }
  }

  // Private helper methods

  /**
   * Save API log data to database
   * Private method with error handling
   */
  private static async saveApiLog(logData: ApiLogData): Promise<void> {
    await db.apiLog.create({
      data: {
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        endpoint: logData.endpoint,
        method: logData.method,
        statusCode: logData.statusCode,
        responseTime: logData.responseTime,
        userId: logData.userId,
        ipAddress: logData.ipAddress,
        userAgent: logData.userAgent,
        error: logData.error,
        createdAt: new Date()
      }
    });
  }

  /**
   * Extract and clean the endpoint path from full URL
   * Removes query parameters and cleans up the path
   */
  private static cleanEndpoint(url: string): string {
    try {
      const urlObj = new URL(url);
      let pathname = urlObj.pathname;
      
      // Remove common patterns to group similar endpoints
      // Example: /api/organizations/123 becomes /api/organizations/[id]
      pathname = pathname.replace(/\/\d+/g, '/[id]');
      pathname = pathname.replace(/\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, '/[uuid]');
      
      return pathname;
    } catch {
      return '/unknown';
    }
  }

  /**
   * Extract client IP address from request headers
   * Handles various proxy configurations
   */
  private static extractIpAddress(request: NextRequest): string {
    // Try different headers in order of preference
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

    // Fallback to unknown if no IP found
    return 'unknown';
  }

  /**
   * Truncate error messages to prevent database bloat
   * Keep errors informative but not too long
   */
  private static truncateError(error: string): string {
    const maxLength = 500;
    if (error.length <= maxLength) {
      return error;
    }
    return error.substring(0, maxLength) + '... [truncated]';
  }
}

// Export types for use in other files
export type { ApiLogData, SessionData };
