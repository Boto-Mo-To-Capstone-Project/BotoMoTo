import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db/db';

/**
 * GET /api/debug/performance-logs
 * 
 * Debug endpoint to check if performance logs are being created
 * This is for development/testing only
 */
export async function GET(request: NextRequest) {
  try {
    // Get recent performance logs
    const apiLogs = await db.apiLog.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        endpoint: true,
        method: true,
        statusCode: true,
        responseTime: true,
        userId: true,
        createdAt: true
      }
    });

    const userSessions = await db.userSession.findMany({
      take: 5,
      orderBy: { startedAt: 'desc' },
      select: {
        id: true,
        userId: true,
        startedAt: true,
        endedAt: true,
        ipAddress: true
      }
    });

    const systemMetrics = await db.systemMetric.findMany({
      take: 5,
      orderBy: { recordedAt: 'desc' },
      select: {
        id: true,
        metricType: true,
        value: true,
        recordedAt: true
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Performance logs retrieved successfully',
      data: {
        apiLogs: {
          count: apiLogs.length,
          logs: apiLogs
        },
        userSessions: {
          count: userSessions.length,
          sessions: userSessions
        },
        systemMetrics: {
          count: systemMetrics.length,
          metrics: systemMetrics
        }
      }
    });

  } catch (error) {
    console.error('Error fetching performance logs:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch performance logs',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
