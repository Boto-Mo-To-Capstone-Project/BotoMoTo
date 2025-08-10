import { NextRequest, NextResponse } from 'next/server';
import { apiResponse } from '@/lib/apiResponse';
import { PerformanceAnalyzer } from '@/lib/performance/analyzer';
import { auth } from '@/lib/auth';
import { requireAuth } from '@/lib/helpers/requireAuth';


/**
 * GET /api/admin/analytics/system-performance
 * 
 * Returns system performance KPIs for superadmin dashboard
 * Requires superadmin role
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication and authorization
    const authResult = await requireAuth(['SUPER_ADMIN']);
    if (!authResult.authorized) return authResult.response;

    // Parse query parameters for date range
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || '24h'; // 24h, 7d, 30d
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Calculate date range
    let dateFrom: Date;
    let dateTo: Date = new Date();

    if (startDate && endDate) {
      dateFrom = new Date(startDate);
      dateTo = new Date(endDate);
    } else {
      // Use predefined time ranges
      switch (timeRange) {
        case '7d':
          dateFrom = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '24h':
        default:
          dateFrom = new Date(Date.now() - 24 * 60 * 60 * 1000);
          break;
      }
    }

    // Get system performance KPIs using the static method
    const systemPerformanceKpis = await PerformanceAnalyzer.getSystemPerformanceKpis(
      Math.ceil((dateTo.getTime() - dateFrom.getTime()) / (1000 * 60 * 60 * 24))
    );

    // Prepare response data
    const systemPerformance = {
      overview: {
        systemUptime: systemPerformanceKpis.systemUptime,
        averageResponseTime: systemPerformanceKpis.averageResponseTime,
        errorRate: systemPerformanceKpis.errorRate,
        peakConcurrentUsers: systemPerformanceKpis.peakConcurrentUsers,
        voteSubmissionSuccessRate: systemPerformanceKpis.voteSubmissionSuccessRate
      },
      metadata: {
        timeRange: timeRange,
        dateFrom: dateFrom.toISOString(),
        dateTo: dateTo.toISOString(),
        generatedAt: new Date().toISOString()
      }
    };

    return apiResponse({
      success: true, 
      message: 'System performance data retrieved successfully', 
      data: systemPerformance
    });

  } catch (error) {
    console.error('Error fetching system performance data:', error);
    return apiResponse({
      success: false, 
      message: 'Failed to fetch system performance data', 
      status: 500
    });
  }
}
