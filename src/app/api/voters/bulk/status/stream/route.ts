import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/helpers/requireAuth";
import db from "@/lib/db/db";
import { ROLES } from "@/lib/constants";

/**
 * SSE endpoint for real-time bulk email sending status updates
 * Based on the organization status stream pattern
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate the user
    const authResult = await requireAuth([ROLES.ADMIN, ROLES.SUPER_ADMIN]);
    if (!authResult.authorized) return authResult.response;
    const user = authResult.user;

    const { searchParams } = new URL(request.url);
    const electionId = searchParams.get("electionId");

    if (!electionId) {
      return new Response("Election ID is required", { status: 400 });
    }

    // Verify user has access to this election
    const election = await db.election.findFirst({
      where: {
        id: parseInt(electionId),
        isDeleted: false,
        ...(user.role === ROLES.ADMIN && {
          organization: { adminId: user.id }
        })
      }
    });

    if (!election) {
      return new Response("Election not found or access denied", { status: 404 });
    }

    // Create SSE response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // Send initial connection confirmation
        const data = JSON.stringify({
          type: "connected",
          timestamp: new Date().toISOString(),
          electionId: electionId,
        });
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));

        // Function to send status updates
        const sendUpdate = async () => {
          try {
            // Get current voter send status counts
            const statusCounts = await db.voter.groupBy({
              by: ['codeSendStatus'],
              where: {
                electionId: parseInt(electionId),
                isDeleted: false,
              },
              _count: {
                id: true
              }
            });

            // Transform to easier format
            const statusMap = statusCounts.reduce((acc, item) => {
              acc[item.codeSendStatus] = item._count.id;
              return acc;
            }, {} as Record<string, number>);

            // Note: Email logging functionality has been removed
            const recentLogs: any[] = [];

            const updateData = JSON.stringify({
              type: "status_update",
              timestamp: new Date().toISOString(),
              electionId: electionId,
              data: {
                statusCounts: {
                  pending: statusMap.PENDING || 0,
                  sending: statusMap.SENDING || 0,
                  sent: statusMap.SENT || 0,
                  failed: statusMap.FAILED || 0,
                },
                total: Object.values(statusMap).reduce((sum, count) => sum + count, 0),
                recentActivity: recentLogs,
                lastUpdated: new Date().toISOString(),
              }
            });

            controller.enqueue(encoder.encode(`data: ${updateData}\n\n`));
          } catch (error) {
            console.error("Error sending SSE update:", error);
            
            const errorData = JSON.stringify({
              type: "error",
              timestamp: new Date().toISOString(),
              message: "Failed to fetch status update",
            });
            controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          }
        };

        // Send initial status
        await sendUpdate();

        // Set up polling interval (every 2 seconds)
        const interval = setInterval(sendUpdate, 2000);

        // Cleanup function
        const cleanup = () => {
          clearInterval(interval);
        };

        // Handle client disconnect
        request.signal.addEventListener("abort", cleanup);

        // Keep connection alive with periodic heartbeat
        const heartbeat = setInterval(() => {
          const heartbeatData = JSON.stringify({
            type: "heartbeat",
            timestamp: new Date().toISOString(),
          });
          controller.enqueue(encoder.encode(`data: ${heartbeatData}\n\n`));
        }, 30000); // Every 30 seconds

        // Cleanup heartbeat on abort
        request.signal.addEventListener("abort", () => {
          clearInterval(heartbeat);
        });
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "Cache-Control",
      },
    });

  } catch (error) {
    console.error("SSE endpoint error:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
