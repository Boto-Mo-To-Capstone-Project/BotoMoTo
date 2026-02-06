import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/helpers/requireAuth';
import { ROLES } from '@/lib/constants';
import db from '@/lib/db/db';

// Global connection manager to prevent multiple SSE connections per organization
// This tracks active connections to prevent memory leaks and duplicate connections
const activeConnections = new Map<number, {
  cleanup: () => void;
  isClosed: boolean;
  lastEventId: number; // For potential event replay
}>();

// Global counter for event IDs
let globalEventId = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth([ROLES.ADMIN, ROLES.SUPER_ADMIN]);
    if (!authResult.authorized) return authResult.response;
    const user = authResult.user;

    const { id } = await params;
    const organizationId = parseInt(id);

    if (isNaN(organizationId)) {
      return new Response('Invalid organization ID', { status: 400 });
    }

    // Verify user can access this organization
    const org = await db.organization.findFirst({
      where: {
        id: organizationId,
        isDeleted: false,
        ...(user.role === ROLES.ADMIN ? { adminId: user.id } : {})
      },
      select: { id: true, status: true, name: true }
    });

    if (!org) {
      return new Response('Organization not found or unauthorized', { status: 403 });
    }

    // Close any existing connection for this organization to prevent duplicates
    const existingConnection = activeConnections.get(organizationId);
    if (existingConnection && !existingConnection.isClosed) {
      console.log(`🔄 Closing existing SSE connection for organization ${organizationId}`);
      existingConnection.cleanup();
    }

    // Create SSE stream
    const encoder = new TextEncoder();
    let currentStatus = org.status;
    let interval: NodeJS.Timeout;
    let timeoutId: NodeJS.Timeout;
    let isClosed = false;
    let lastSentEventId = 0;
    
    // Optimized cleanup function
    const cleanup = () => {
      if (isClosed) return; // Prevent double cleanup
      isClosed = true;
      
      console.log(`🔌 SSE connection closed for organization ${organizationId}`);
      
      // Clear all timers
      if (interval) {
        clearInterval(interval);
        interval = undefined as any;
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = undefined as any;
      }
      
      // Update connection registry
      const connection = activeConnections.get(organizationId);
      if (connection) {
        connection.isClosed = true;
        activeConnections.delete(organizationId);
      }
    };
    
    // Register this connection with event tracking
    activeConnections.set(organizationId, { 
      cleanup, 
      isClosed: false, 
      lastEventId: globalEventId 
    });
    
    const stream = new ReadableStream({
      start(controller) {
        console.log(`📡 SSE connection established for organization ${organizationId}`);
        
        // Send initial status with proper SSE formatting
        const eventId = ++globalEventId;
        lastSentEventId = eventId;
        
        const initialData = `id: ${eventId}\nevent: status\ndata: ${JSON.stringify({ 
          status: currentStatus, 
          timestamp: new Date().toISOString(),
          organizationId: organizationId
        })}\n\n`;
        
        try {
          controller.enqueue(encoder.encode(initialData));
        } catch (error) {
          console.log(`Failed to send initial data for org ${organizationId}`);
          cleanup();
          return;
        }

        // Optimized polling - only poll when status might change
        interval = setInterval(async () => {
          if (isClosed) {
            clearInterval(interval);
            return;
          }
          
          try {
            // Only fetch status, not full org data
            const updatedOrg = await db.organization.findUnique({
              where: { id: organizationId },
              select: { status: true }
            });

            if (updatedOrg && updatedOrg.status !== currentStatus) {
              console.log(`🔄 Status changed for org ${organizationId}: ${currentStatus} → ${updatedOrg.status}`);
              
              const eventId = ++globalEventId;
              lastSentEventId = eventId;
              
              // Proper SSE format with event ID and type
              const data = `id: ${eventId}\nevent: status-change\ndata: ${JSON.stringify({ 
                status: updatedOrg.status, 
                timestamp: new Date().toISOString(),
                organizationId: organizationId,
                previousStatus: currentStatus
              })}\n\n`;
              
              if (!isClosed) {
                try {
                  controller.enqueue(encoder.encode(data));
                  currentStatus = updatedOrg.status; // Update only after successful send
                } catch (error) {
                  console.log(`Failed to enqueue data for org ${organizationId}:`, error instanceof Error ? error.message : String(error));
                  cleanup();
                  return;
                }
              }
            }
          } catch (error) {
            console.error('SSE polling error:', error);
            
            // Send error as proper SSE event
            const eventId = ++globalEventId;
            const errorData = `id: ${eventId}\nevent: error\ndata: ${JSON.stringify({ 
              error: 'Polling failed', 
              timestamp: new Date().toISOString(),
              organizationId: organizationId
            })}\n\n`;
            
            if (!isClosed) {
              try {
                controller.enqueue(encoder.encode(errorData));
              } catch (enqueueError) {
                console.log(`Failed to enqueue error data for org ${organizationId}:`, enqueueError instanceof Error ? enqueueError.message : String(enqueueError));
                cleanup();
                return;
              }
            }
          }
        }, 5000); // Reduced frequency to 5 seconds for efficiency

        // Handle client disconnect
        request.signal.addEventListener('abort', () => {
          if (isClosed) return; // Don't run if already closed
          cleanup();
          try {
            if (!isClosed) controller.close();
          } catch (error) {
            // Controller already closed, ignore
          }
        });
        
        // Reduced timeout to 10 minutes for better resource management
        timeoutId = setTimeout(() => {
          if (isClosed) return; // Don't run if already closed
          console.log(`⏰ SSE connection timeout for organization ${organizationId}`);
          cleanup();
          try {
            if (!isClosed) controller.close();
          } catch (error) {
            // Controller already closed, ignore
          }
        }, 10 * 60 * 1000); // 10 minutes instead of 30
      },
      
      cancel() {
        console.log(`❌ SSE stream cancelled for organization ${organizationId}`);
        cleanup();
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control, Last-Event-ID',
        'Access-Control-Expose-Headers': 'Content-Type',
        // Add retry instruction for client (reconnect after 3 seconds if disconnected)
        'X-Accel-Buffering': 'no', // Disable nginx buffering for real-time streaming
      },
    });
  } catch (error) {
    console.error('SSE error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
