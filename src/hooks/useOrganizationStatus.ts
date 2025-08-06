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
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const connect = useCallback(() => {
    if (!organizationId) {
      cleanup();
      return;
    }

    // Don't create multiple connections
    if (eventSourceRef.current?.readyState === EventSource.OPEN) {
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

    eventSource.onmessage = (event) => {
      try {
        const data: StatusUpdate = JSON.parse(event.data);
        
        if (data.error) {
          console.error('❌ SSE error received:', data.error);
          return;
        }

        console.log('📡 Status update received:', data);
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
      console.error('❌ SSE connection error:', error);
      setIsConnected(false);
      
      // Implement exponential backoff for reconnection
      if (reconnectAttempts < maxReconnectAttempts) {
        const delay = baseReconnectDelay * Math.pow(2, reconnectAttempts);
        console.log(`🔄 Reconnecting in ${delay}ms (attempt ${reconnectAttempts + 1}/${maxReconnectAttempts})`);
        
        reconnectTimeoutRef.current = setTimeout(() => {
          setReconnectAttempts(prev => prev + 1);
          connect();
        }, delay);
      } else {
        console.log('❌ Max reconnection attempts reached');
        cleanup();
      }
    };
  }, [organizationId, reconnectAttempts, cleanup]);

  // Initial connection and cleanup
  useEffect(() => {
    connect();
    return cleanup;
  }, [connect, cleanup]);

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
