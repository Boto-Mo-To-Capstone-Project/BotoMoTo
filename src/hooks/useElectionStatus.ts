import { useState, useEffect } from 'react';

export function useElectionStatus(electionId: number) {
  const [electionStatus, setElectionStatus] = useState<'DRAFT' | 'ACTIVE' | 'CLOSED' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!electionId) {
      setLoading(false);
      return;
    }

    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/elections/${electionId}`);
        const data = await res.json();
        if (data.success) {
          setElectionStatus(data.data.election.status);
        }
      } catch (error) {
        console.error('Failed to fetch election status:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, [electionId]);

  const canEdit = electionStatus === 'DRAFT' || electionStatus === 'CLOSED';
  const isActive = electionStatus === 'ACTIVE';
  const isDraft = electionStatus === 'DRAFT';

  return { 
    electionStatus, 
    canEdit, 
    isActive, 
    isDraft, 
    loading,
    isEditingDisabled: !canEdit && electionStatus !== null
  };
}
