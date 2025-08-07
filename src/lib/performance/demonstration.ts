/**
 * STEP 3 DEMONSTRATION: How Performance Logging Middleware Works
 * 
 * This file shows the before and after of adding performance logging
 * to your API routes. You don't need to use this file - it's just for
 * understanding how the middleware works.
 */

import { NextRequest, NextResponse } from "next/server";
import { withPerformanceLogging } from "@/lib/performance/middleware";

// ============================================================================
// BEFORE: Your typical API handler (this is what you have now)
// ============================================================================
async function simpleApiHandler(request: NextRequest): Promise<NextResponse> {
  try {
    // Your business logic here
    const data = { message: "Hello World", timestamp: new Date().toISOString() };
    
    // Return your response
    return NextResponse.json({
      success: true,
      data
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Something went wrong" },
      { status: 500 }
    );
  }
}

// ============================================================================
// AFTER: Same handler wrapped with performance logging
// ============================================================================

// Method 1: Direct wrapping (recommended)
export const GET = withPerformanceLogging(simpleApiHandler);

// Method 2: Inline function (if you prefer)
export const POST = withPerformanceLogging(async (request: NextRequest) => {
  try {
    const body = await request.json();
    
    // Simulate some processing time
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return NextResponse.json({
      success: true,
      data: { received: body, processed: true }
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Processing failed" },
      { status: 500 }
    );
  }
});

// Method 3: Lightweight logging for high-traffic endpoints
import { withLightweightLogging } from "@/lib/performance/middleware";

export const PUT = withLightweightLogging(async (request: NextRequest) => {
  // This version skips session lookup for better performance
  // Useful for endpoints that get hit frequently
  return NextResponse.json({ status: "updated" });
});

/**
 * WHAT HAPPENS WHEN A REQUEST COMES IN:
 * 
 * 1. **Middleware starts** 🕐
 *    - Records start time: `startTime = Date.now()`
 *    - Tries to get user session for tracking
 * 
 * 2. **Your handler runs** 🔧
 *    - All your existing business logic executes normally
 *    - Database queries, validations, file processing, etc.
 *    - Returns a NextResponse
 * 
 * 3. **Middleware finishes** 📊
 *    - Calculates response time: `Date.now() - startTime`
 *    - Extracts endpoint, method, status code, user info
 *    - Logs everything to database (asynchronously - no blocking!)
 * 
 * 4. **Response goes to client** ✅
 *    - User gets their response normally
 *    - Zero performance impact on the actual API call
 * 
 * PERFORMANCE DATA SAVED:
 * ```json
 * {
 *   "endpoint": "/api/example",
 *   "method": "GET", 
 *   "statusCode": 200,
 *   "responseTime": 156, // milliseconds
 *   "userId": "user_abc123", // if authenticated
 *   "ipAddress": "192.168.1.1",
 *   "userAgent": "Mozilla/5.0...",
 *   "error": null, // or error message if failed
 *   "createdAt": "2025-08-07T10:30:00Z"
 * }
 * ```
 * 
 * DASHBOARD BENEFITS:
 * - See which endpoints are slowest
 * - Track error rates over time  
 * - Monitor system performance trends
 * - Identify peak usage times
 * - Spot performance regressions
 */
