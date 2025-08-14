import db from "@/lib/db/db";

export class SystemMetricsLogger {
  /**
   * Log system uptime metric
   */
  static async logSystemUptime(uptimePercentage: number) {
    try {
      await db.systemMetric.create({
        data: {
          id: `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          metricType: 'uptime',
          value: uptimePercentage,
          metadata: {
            source: 'system_monitor',
            timestamp: new Date().toISOString()
          }
        }
      });
    } catch (error) {
      console.error('Error logging system uptime:', error);
    }
  }

  /**
   * Calculate and log current system uptime based on API success rate
   */
  static async calculateAndLogUptime(hoursBack: number = 24) {
    try {
      const startTime = new Date();
      startTime.setHours(startTime.getHours() - hoursBack);
      
      // Get API logs from the specified time period
      const logs = await db.apiLog.findMany({
        where: {
          createdAt: {
            gte: startTime
          }
        }
      });
      
      if (logs.length === 0) {
        // No data available, assume 100% uptime
        await this.logSystemUptime(100);
        return 100;
      }
      
      // Calculate uptime based on successful API calls
      const successfulCalls = logs.filter(log => log.statusCode >= 200 && log.statusCode < 400);
      const uptimePercentage = (successfulCalls.length / logs.length) * 100;
      
      await this.logSystemUptime(uptimePercentage);
      return uptimePercentage;
    } catch (error) {
      console.error('Error calculating system uptime:', error);
      return 0;
    }
  }

  /**
   * Log database health metrics
   */
  static async logDatabaseHealth() {
    try {
      // Simple database health check - measure query response time
      const startTime = Date.now();
      await db.user.count(); // Simple query to test DB responsiveness
      const responseTime = Date.now() - startTime;
      
      await db.systemMetric.create({
        data: {
          id: `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          metricType: 'database_response_time',
          value: responseTime,
          metadata: {
            source: 'database_monitor',
            query_type: 'count',
            timestamp: new Date().toISOString()
          }
        }
      });
      
      return responseTime;
    } catch (error) {
      console.error('Error logging database health:', error);
      return -1;
    }
  }

  /**
   * Get system metrics for dashboard
   */
  static async getSystemMetrics(hoursBack: number = 24) {
    try {
      const startTime = new Date();
      startTime.setHours(startTime.getHours() - hoursBack);
      
      const metrics = await db.systemMetric.findMany({
        where: {
          recordedAt: {
            gte: startTime
          }
        },
        orderBy: {
          recordedAt: 'desc'
        }
      });
      
      // Group metrics by type
      const metricsByType = metrics.reduce((acc, metric) => {
        if (!acc[metric.metricType]) {
          acc[metric.metricType] = [];
        }
        acc[metric.metricType].push(metric);
        return acc;
      }, {} as Record<string, typeof metrics>);
      
      return metricsByType;
    } catch (error) {
      console.error('Error getting system metrics:', error);
      return {};
    }
  }
}
