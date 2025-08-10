import { ApiLogger } from '../src/lib/performance/apiLogger.js';

/**
 * Generate sample performance data for testing the analytics API
 */
async function generateSampleData() {
  console.log('Generating sample performance data...');
  
  const logger = new ApiLogger();
  
  // Generate sample API logs for the last 24 hours
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  const endpoints = [
    '/api/organizations',
    '/api/users', 
    '/api/elections',
    '/api/voters',
    '/api/candidates',
    '/api/auth/login'
  ];
  
  const statusCodes = [200, 201, 400, 401, 403, 404, 500];
  const methods = ['GET', 'POST', 'PUT', 'DELETE'];
  
  // Generate 100 random API logs
  for (let i = 0; i < 100; i++) {
    const randomTime = new Date(
      twentyFourHoursAgo.getTime() + 
      Math.random() * (now.getTime() - twentyFourHoursAgo.getTime())
    );
    
    const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
    const method = methods[Math.floor(Math.random() * methods.length)];
    const statusCode = statusCodes[Math.floor(Math.random() * statusCodes.length)];
    const responseTime = Math.floor(Math.random() * 2000) + 50; // 50-2050ms
    
    await logger.logApiRequest({
      endpoint,
      method,
      statusCode,
      responseTime,
      userId: Math.random() > 0.3 ? `user-${Math.floor(Math.random() * 10)}` : null,
      userAgent: 'Test Browser',
      ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
      createdAt: randomTime
    });
  }
  
  // Generate some system metrics
  await logger.logSystemMetric('uptime', 99.5);
  await logger.logSystemMetric('cpu_usage', Math.random() * 80 + 10);
  await logger.logSystemMetric('memory_usage', Math.random() * 70 + 20);
  
  // Generate some user sessions
  for (let i = 0; i < 20; i++) {
    const sessionStart = new Date(
      twentyFourHoursAgo.getTime() + 
      Math.random() * (now.getTime() - twentyFourHoursAgo.getTime())
    );
    
    const sessionEnd = new Date(sessionStart.getTime() + Math.random() * 3600000); // Up to 1 hour sessions
    
    await logger.logUserSession({
      userId: `user-${Math.floor(Math.random() * 10)}`,
      sessionStart,
      sessionEnd: Math.random() > 0.2 ? sessionEnd : null, // 20% ongoing sessions
      ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
      userAgent: 'Test Browser'
    });
  }
  
  console.log('Sample data generation completed!');
}

// Run the data generation
generateSampleData()
  .then(() => {
    console.log('✅ Sample performance data generated successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error generating sample data:', error);
    process.exit(1);
  });
