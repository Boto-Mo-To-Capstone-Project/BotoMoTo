/**
 * Simple Test for Performance Middleware
 * 
 * This creates a basic API route to test our middleware functionality
 * without dependencies on your existing complex routes.
 */

import { NextRequest, NextResponse } from "next/server";
import { withPerformanceLogging } from "@/lib/performance/middleware";

// Simple test handler
async function testHandler(request: NextRequest): Promise<NextResponse> {
  // Simulate some processing time
  await new Promise(resolve => setTimeout(resolve, 50));
  ``
  return NextResponse.json({
    success: true,
    message: "Performance logging test successful",
    timestamp: new Date().toISOString()
  });
}

// Apply middleware
export const GET = withPerformanceLogging(testHandler);

/*
To test this:

1. Start your Next.js development server
2. Make a request to /api/test-performance  
3. Check your database - you should see a new entry in the api_logs table with:
   - endpoint: "/api/test-performance"
   - method: "GET" 
   - responseTime: ~50-100ms
   - statusCode: 200
   - timestamp: current time

This proves the middleware is working!
*/
