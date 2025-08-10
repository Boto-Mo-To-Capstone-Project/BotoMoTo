import db from "@/lib/db/db";

export class SessionTracker {
  /**
   * Get current concurrent users from NextAuth sessions
   * This uses existing NextAuth session data instead of duplicate tracking
   */
  static async getCurrentConcurrentUsers(): Promise<number> {
    try {
      const now = new Date();
      
      // Count active NextAuth sessions that haven't expired
      const activeSessionCount = await db.session.count({
        where: {
          expires: {
            gt: now // Session hasn't expired yet
          }
        }
      });
      
      return activeSessionCount;
    } catch (error) {
      console.error('Error getting concurrent users:', error);
      return 0;
    }
  }

  /**
   * Get peak concurrent users for a time period using NextAuth sessions
   */
  static async getPeakConcurrentUsers(hoursBack: number = 24): Promise<number> {
    try {
      const startTime = new Date();
      startTime.setHours(startTime.getHours() - hoursBack);
      
      // Get sessions created in the specified time period
      const sessions = await db.session.findMany({
        where: {
          createdAt: {
            gte: startTime
          }
        },
        select: {
          createdAt: true,
          expires: true,
          userId: true
        }
      });
      
      // Simple approximation - in production you'd want more sophisticated logic
      // This counts unique sessions, but for a more accurate peak, you'd need to
      // sample at intervals and find the maximum concurrent count
      const uniqueUsers = new Set(sessions.map(s => s.userId)).size;
      const currentConcurrent = await this.getCurrentConcurrentUsers();
      
      return Math.max(uniqueUsers, currentConcurrent);
    } catch (error) {
      console.error('Error getting peak concurrent users:', error);
      return 0;
    }
  }

  /**
   * Get user activity analytics using NextAuth sessions
   */
  static async getUserActivityMetrics(hoursBack: number = 24) {
    try {
      const startTime = new Date();
      startTime.setHours(startTime.getHours() - hoursBack);
      
      const sessions = await db.session.findMany({
        where: {
          createdAt: {
            gte: startTime
          }
        },
        include: {
          user: {
            select: {
              role: true
            }
          }
        }
      });
      
      return {
        totalSessions: sessions.length,
        uniqueUsers: new Set(sessions.map(s => s.userId)).size,
        adminSessions: sessions.filter(s => s.user.role === 'ADMIN').length,
        superAdminSessions: sessions.filter(s => s.user.role === 'SUPER_ADMIN').length,
        currentConcurrent: await this.getCurrentConcurrentUsers()
      };
    } catch (error) {
      console.error('Error getting user activity metrics:', error);
      return {
        totalSessions: 0,
        uniqueUsers: 0,
        adminSessions: 0,
        superAdminSessions: 0,
        currentConcurrent: 0
      };
    }
  }
}
