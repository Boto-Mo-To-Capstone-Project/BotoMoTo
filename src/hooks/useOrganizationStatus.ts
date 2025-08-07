import { useState, useEffect, useRef, useCallback } from 'react';

type OrganizationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'DRAFT';

interface StatusUpdate {
  status: OrganizationStatus;
  timestamp: string;
  organizationId: number;
  previousStatus?: OrganizationStatus;
  error?: string;
}

export function useOrganizationStatus(organizationId: number | null) {
  const [status, setStatus] = useState<OrganizationStatus | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  const maxReconnectAttempts = 5;
  const baseReconnectDelay = 1000; // 1 second

  const cleanup = useCallback(() => {
    console.log('🧹 Cleaning up SSE connection...');
    if (eventSourceRef.current) {
      console.log('🔌 Closing EventSource connection');
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      console.log('⏰ Clearing reconnect timeout');
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    setIsConnected(false);
    setStatus(null); // Reset status when cleaning up
  }, []);

  const connect = useCallback(() => {
    // Don't create multiple connections
    if (eventSourceRef.current?.readyState === EventSource.OPEN) {
      console.log('🔌 SSE already connected');
      return;
    }

    cleanup(); // Clean up any existing connection

    console.log(`🔌 Connecting to SSE stream for organization ${organizationId}`);
    
    const eventSource = new EventSource(`/api/organizations/${organizationId}/status/stream`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('✅ SSE connection established');
      setIsConnected(true);
      setReconnectAttempts(0); // Reset on successful connection
    };

    // Listen to specific event types from our SSE server
    eventSource.addEventListener('status', (event) => {
      try {
        const messageEvent = event as MessageEvent;
        const data: StatusUpdate = JSON.parse(messageEvent.data);
        console.log('📡 Initial status received:', data);
        setStatus(data.status);
        setLastUpdate(data.timestamp);
      } catch (error) {
        console.error('Error parsing SSE status data:', error);
      }
    });

    eventSource.addEventListener('status-change', (event) => {
      try {
        const messageEvent = event as MessageEvent;
        const data: StatusUpdate = JSON.parse(messageEvent.data);
        console.log('📡 Status change received:', data);
        setStatus(data.status);
        setLastUpdate(data.timestamp);

        // Log status changes
        if (data.previousStatus && data.previousStatus !== data.status) {
          console.log(`🔄 Organization status changed: ${data.previousStatus} → ${data.status}`);
        }
      } catch (error) {
        console.error('Error parsing SSE status-change data:', error);
      }
    });

    eventSource.addEventListener('error', (event) => {
      try {
        const messageEvent = event as MessageEvent;
        // Only try to parse if there's actual data
        if (messageEvent.data && messageEvent.data.trim()) {
          const data = JSON.parse(messageEvent.data);
          console.error('❌ SSE error received:', data.error);
        }
      } catch (error) {
        // Don't log parsing errors for interrupted connections
        console.log('SSE error event (likely connection interruption)');
      }
    });

    // Keep the generic onmessage as fallback for events without type
    eventSource.onmessage = (event) => {
      try {
        const data: StatusUpdate = JSON.parse(event.data);
        
        if (data.error) {
          console.error('❌ SSE error received:', data.error);
          return;
        }

        console.log('📡 Generic status update received:', data);
        setStatus(data.status);
        setLastUpdate(data.timestamp);

        // Log status changes
        if (data.previousStatus && data.previousStatus !== data.status) {
          console.log(`🔄 Organization status changed: ${data.previousStatus} → ${data.status}`);
        }
      } catch (error) {
        console.error('Error parsing SSE data:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.log('❌ SSE connection error');
      setIsConnected(false);
      
      // Don't attempt reconnection if organizationId is null (component unmounting)
      if (!organizationId) {
        console.log('🚫 Skipping reconnection - no organization ID');
        cleanup();
        return;
      }
      
      // Don't reconnect if we're already cleaning up
      if (!eventSourceRef.current) {
        console.log('🚫 Skipping reconnection - already cleaned up');
        return;
      }
      
      // Implement exponential backoff for reconnection
      if (reconnectAttempts < maxReconnectAttempts) {
        const delay = baseReconnectDelay * Math.pow(2, reconnectAttempts);
        console.log(`🔄 Reconnecting in ${delay}ms (attempt ${reconnectAttempts + 1}/${maxReconnectAttempts})`);
        
        reconnectTimeoutRef.current = setTimeout(() => {
          // Double-check we still have an organization ID before reconnecting
          if (organizationId && eventSourceRef.current === null) {
            setReconnectAttempts(prev => prev + 1);
            connect();
          }
        }, delay);
      } else {
        console.log('❌ Max reconnection attempts reached');
        cleanup();
      }
    };
  }, [organizationId, reconnectAttempts, cleanup]);

  // Initial connection and cleanup - only connect when organizationId is available
  useEffect(() => {
    if (organizationId) {
      connect();
    } else {
      // Clean up any existing connection when organizationId becomes null
      cleanup();
    }
    return cleanup;
  }, [organizationId, connect, cleanup]);

  // Manual reconnect function
  const reconnect = useCallback(() => {
    setReconnectAttempts(0);
    connect();
  }, [connect]);

  return { 
    status, 
    isConnected, 
    lastUpdate,
    reconnect,
    canReconnect: reconnectAttempts >= maxReconnectAttempts
  };
}
