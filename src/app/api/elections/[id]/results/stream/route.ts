// Election results stream endpoint (GET) - Real-time SSE for live dashboard
import { NextRequest } from 'next/server';
import db from '@/lib/db/db';
import { ELECTION_STATUS } from '@/lib/constants';

// Global connection manager to prevent multiple SSE connections per election
// This tracks active connections to prevent memory leaks and duplicate connections
const activeConnections = new Map<number, {
  cleanup: () => void;
  isClosed: boolean;
  lastEventId: number;
}>();

// Global counter for event IDs
let globalEventId = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const electionId = parseInt(id);

    if (isNaN(electionId)) {
      return new Response('Invalid election ID', { status: 400 });
    }

    // Verify election exists and is active for real-time streaming
    const election = await db.election.findFirst({
      where: {
        id: electionId,
        isDeleted: false,
        status: { in: [ELECTION_STATUS.ACTIVE, ELECTION_STATUS.CLOSED] }
      },
      include: {
        schedule: true,
        organization: { select: { name: true } }
      }
    });

    if (!election) {
      return new Response('Election not found, deleted, or not streamable', { status: 404 });
    }

    // Close any existing connection for this election to prevent duplicates
    const existingConnection = activeConnections.get(electionId);
    if (existingConnection && !existingConnection.isClosed) {
      console.log(`🔄 Closing existing SSE connection for election ${electionId}`);
      existingConnection.cleanup();
    }

    // Create SSE stream
    const encoder = new TextEncoder();
    let currentResultsHash = '';
    let interval: NodeJS.Timeout;
    let heartbeatInterval: NodeJS.Timeout;
    let timeoutId: NodeJS.Timeout;
    let isClosed = false;
    let lastSentEventId = 0;
    
    // Optimized cleanup function
    const cleanup = () => {
      if (isClosed) return;
      isClosed = true;
      
      console.log(`🔌 Live results SSE connection closed for election ${electionId}`);
      
      if (interval) {
        clearInterval(interval);
        interval = undefined as any;
      }
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = undefined as any;
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = undefined as any;
      }
      
      const connection = activeConnections.get(electionId);
      if (connection) {
        connection.isClosed = true;
        activeConnections.delete(electionId);
      }
    };
    
    // Register this connection with event tracking
    activeConnections.set(electionId, { 
      cleanup, 
      isClosed: false, 
      lastEventId: globalEventId 
    });
    
    const stream = new ReadableStream({
      async start(controller) {
        console.log(`📡 Live results SSE established for election ${electionId}`);

        // Function to fetch comprehensive election results
        const fetchResults = async () => {
          const [
            // Voter statistics
            totalVoters,
            votersWhoVoted,
            
            // Position results with vote counts
            positionResults,
            
            // Voting scope statistics
            scopeStats,
            
            // Recent vote activity
            recentVotes
          ] = await Promise.all([
            // Total registered voters
            db.voter.count({
              where: { electionId, isDeleted: false, isActive: true }
            }),
            
            // Voters who have voted
            db.voter.count({
              where: { 
                electionId, 
                isDeleted: false, 
                voteResponses: { some: { electionId } } 
              }
            }),
            
            // Position results with candidate vote counts
            db.position.findMany({
              where: { electionId, isDeleted: false },
              include: {
                candidates: {
                  where: { isDeleted: false },
                  include: {
                    voter: {
                      select: { firstName: true, middleName: true, lastName: true }
                    },
                    party: {
                      select: { id: true, name: true, color: true }
                    },
                    _count: {
                      select: {
                        voteResponses: {
                          where: { electionId }
                        }
                      }
                    }
                  },
                  orderBy: {
                    voteResponses: {
                      _count: 'desc' // Order by vote count
                    }
                  }
                },
                votingScope: {
                  select: { id: true, name: true }
                }
              },
              orderBy: { order: 'asc' }
            }),
            
            // Voting scope breakdown
            db.votingScope.findMany({
              where: { electionId, isDeleted: false },
              select: {
                id: true,
                name: true,
                _count: {
                  select: {
                    voters: {
                      where: { 
                        isDeleted: false,
                        voteResponses: { some: { electionId } }
                      }
                    }
                  }
                }
              }
            }),
            
            // Recent voting activity (last 5 minutes)
            db.voteResponse.count({
              where: {
                electionId,
                timestamp: {
                  gte: new Date(Date.now() - 5 * 60 * 1000)
                }
              }
            })
          ]);

          return {
            overview: {
              totalVoters,
              votersWhoVoted,
              voterTurnout: totalVoters > 0 ? Math.round((votersWhoVoted / totalVoters) * 100) : 0,
              recentVotes
            },
            positions: positionResults.map(position => ({
              id: position.id,
              name: position.name,
              voteLimit: position.voteLimit,
              numOfWinners: position.numOfWinners,
              votingScope: position.votingScope,
              candidates: position.candidates.map(candidate => ({
                id: candidate.id,
                name: `${candidate.voter.firstName} ${candidate.voter.middleName || ''} ${candidate.voter.lastName}`.trim(),
                party: candidate.party,
                voteCount: candidate._count.voteResponses,
                percentage: votersWhoVoted > 0 ? Math.round((candidate._count.voteResponses / votersWhoVoted) * 100) : 0
              }))
            })),
            demographics: scopeStats.map(scope => ({
              id: scope.id,
              name: scope.name,
              votersWhoVoted: scope._count.voters,
              percentage: totalVoters > 0 ? Math.round((scope._count.voters / totalVoters) * 100) : 0
            })),
            election: {
              id: election.id,
              name: election.name,
              status: election.status,
              organization: election.organization.name,
              schedule: election.schedule
            },
            timestamp: new Date().toISOString()
          };
        };

        // Send initial results
        try {
          const initialResults = await fetchResults();
          currentResultsHash = JSON.stringify(initialResults);
          
          const eventId = ++globalEventId;
          lastSentEventId = eventId;
          const initialData = `id: ${eventId}\nevent: results\ndata: ${JSON.stringify(initialResults)}\n\n`;
          
          controller.enqueue(encoder.encode(initialData));
          console.log(`📊 Initial results sent for election ${electionId}`);
        } catch (error) {
          console.error(`Failed to send initial results for election ${electionId}:`, error);
          cleanup();
          return;
        }

        // Set up polling for result changes (optimized for voting activity)
        interval = setInterval(async () => {
          if (isClosed) {
            clearInterval(interval);
            return;
          }

          try {
            const currentResults = await fetchResults();
            const currentHash = JSON.stringify(currentResults);

            // Only send update if results changed
            if (currentHash !== currentResultsHash) {
              console.log(`🔄 Results updated for election ${electionId}`);
              
              const eventId = ++globalEventId;
              lastSentEventId = eventId;
              const data = `id: ${eventId}\nevent: results-update\ndata: ${JSON.stringify(currentResults)}\n\n`;
              
              if (!isClosed) {
                try {
                  controller.enqueue(encoder.encode(data));
                  currentResultsHash = currentHash;
                } catch (error) {
                  console.log(`Failed to enqueue results for election ${electionId}`);
                  cleanup();
                  return;
                }
              }
            }
          } catch (error) {
            console.error('Results polling error:', error);
            
            const eventId = ++globalEventId;
            lastSentEventId = eventId;
            const errorData = `id: ${eventId}\nevent: error\ndata: ${JSON.stringify({
              error: 'Failed to fetch results',
              timestamp: new Date().toISOString(),
              electionId
            })}\n\n`;
            
            if (!isClosed) {
              try {
                controller.enqueue(encoder.encode(errorData));
              } catch (enqueueError) {
                cleanup();
                return;
              }
            }
          }
        }, 3000); // 3-second intervals for live results

        // Heartbeat to keep connection alive (every 30 seconds)
        heartbeatInterval = setInterval(() => {
          if (isClosed) {
            clearInterval(heartbeatInterval);
            return;
          }

          const eventId = ++globalEventId;
          const heartbeatData = `id: ${eventId}\nevent: heartbeat\ndata: ${JSON.stringify({
            timestamp: new Date().toISOString(),
            electionId,
            status: 'alive'
          })}\n\n`;

          if (!isClosed) {
            try {
              controller.enqueue(encoder.encode(heartbeatData));
              lastSentEventId = eventId;
            } catch (error) {
              console.log(`Heartbeat failed for election ${electionId}`);
              cleanup();
            }
          }
        }, 30000);

        // Client disconnect handling
        request.signal.addEventListener('abort', () => {
          if (isClosed) return;
          console.log(`👋 Client disconnected from election ${electionId} results stream`);
          cleanup();
          try {
            if (!isClosed) controller.close();
          } catch (error) {
            // Controller already closed
          }
        });
        
        // Connection timeout (15 minutes for live dashboard)
        timeoutId = setTimeout(() => {
          if (isClosed) return;
          console.log(`⏰ Live results SSE timeout for election ${electionId}`);
          
          const timeoutEventId = ++globalEventId;
          const timeoutData = `id: ${timeoutEventId}\nevent: timeout\ndata: ${JSON.stringify({
            message: 'Connection timed out',
            timestamp: new Date().toISOString(),
            electionId
          })}\n\n`;
          
          try {
            if (!isClosed) {
              controller.enqueue(encoder.encode(timeoutData));
            }
          } catch (error) {
            // Controller already closed
          }
          
          cleanup();
          try {
            if (!isClosed) controller.close();
          } catch (error) {
            // Controller already closed
          }
        }, 15 * 60 * 1000);
      },
      
      cancel() {
        console.log(`❌ Live results SSE cancelled for election ${electionId}`);
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
        'X-Accel-Buffering': 'no', // Disable proxy buffering
      },
    });
  } catch (error) {
    console.error('Live results SSE error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
