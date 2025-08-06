import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/helpers/requireAuth';
import { ROLES } from '@/lib/constants';
import db from '@/lib/db/db';

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

    // Create SSE stream
    const encoder = new TextEncoder();
    let currentStatus = org.status;
    let interval: NodeJS.Timeout;
    let timeoutId: NodeJS.Timeout;
    let isClosed = false;
    
    // Define cleanup function outside to make it accessible
    const cleanup = () => {
      if (isClosed) return; // Prevent double cleanup
      isClosed = true;
      
      console.log(`🔌 SSE connection closed for organization ${organizationId}`);
      if (interval) clearInterval(interval);
      if (timeoutId) clearTimeout(timeoutId);
    };
    
    const stream = new ReadableStream({
      start(controller) {
        console.log(`📡 SSE connection established for organization ${organizationId}`);
        
        // Send initial status immediately
        const initialData = `data: ${JSON.stringify({ 
          status: currentStatus, 
          timestamp: new Date().toISOString(),
          organizationId: organizationId
        })}\n\n`;
        controller.enqueue(encoder.encode(initialData));

        // Poll for status changes every 3 seconds
        interval = setInterval(async () => {
          if (isClosed) return; // Don't continue if closed
          
          try {
            const updatedOrg = await db.organization.findUnique({
              where: { id: organizationId },
              select: { status: true }
            });

            if (updatedOrg && updatedOrg.status !== currentStatus) {
              console.log(`🔄 Status changed for org ${organizationId}: ${currentStatus} → ${updatedOrg.status}`);
              
              const data = `data: ${JSON.stringify({ 
                status: updatedOrg.status, 
                timestamp: new Date().toISOString(),
                organizationId: organizationId,
                previousStatus: currentStatus
              })}\n\n`;
              
              if (!isClosed) {
                controller.enqueue(encoder.encode(data));
              }
              
              // Update cached status
              currentStatus = updatedOrg.status;
            }
          } catch (error) {
            console.error('SSE polling error:', error);
            // Send error event
            const errorData = `data: ${JSON.stringify({ 
              error: 'Polling failed', 
              timestamp: new Date().toISOString() 
            })}\n\n`;
            
            if (!isClosed) {
              controller.enqueue(encoder.encode(errorData));
            }
          }
        }, 3000); // Check every 3 seconds

        // Handle client disconnect
        request.signal.addEventListener('abort', () => {
          cleanup();
          try {
            controller.close();
          } catch (error) {
            // Controller might already be closed, ignore error
          }
        });
        
        // Set a timeout to prevent long-running connections (optional)
        timeoutId = setTimeout(() => {
          console.log(`⏰ SSE connection timeout for organization ${organizationId}`);
          cleanup();
          try {
            controller.close();
          } catch (error) {
            // Controller might already be closed, ignore error
          }
        }, 30 * 60 * 1000); // 30 minutes max
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
        'Access-Control-Allow-Headers': 'Cache-Control'
      },
    });
  } catch (error) {
    console.error('SSE error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
