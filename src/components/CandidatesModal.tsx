import { useState, useEffect, useMemo } from "react";
import { SubmitButton } from "@/components/SubmitButton";

// Define lightweight types used internally for fetched options
type VoterOpt = { id: number; firstName: string; lastName: string; email?: string };
// Extend PositionOpt to optionally carry scope data coming from API (various possible keys)
type PositionOpt = { id: number; name: string; votingScopeId?: number | null; votingScope?: { id: number; name: string } | null; votingScopeName?: string; scopeName?: string };
type PartyOpt = { id: number; name: string };

type CandidatesModalProps = {
  open: boolean;
  onClose: () => void;
  // Will receive a FormData already prepared for /api/candidates on create,
  // and a plain object payload on edit
  onSave: (payload: FormData | {
    positionId?: number;
    partyId?: number | null;
    imageUrl?: string | null;
    credentialUrl?: string | null;
  }) => void;
  electionId: number;
  // Optional pre-provided options; if not provided, the modal will fetch them
  voters?: VoterOpt[];
  positions?: PositionOpt[];
  parties?: PartyOpt[];
  initialData?: {
    voterId?: number;
    positionId?: number;
    partyId?: number | null;
    imageUrl?: string | null;
    credentialUrl?: string | null;
  };
  disableSave?: boolean;
  isEditMode?: boolean;
};

export function CandidatesModal({
  open,
  onClose,
  onSave,
  electionId,
  voters: votersProp,
  positions: positionsProp,
  parties: partiesProp,
  initialData = {
    voterId: undefined,
    positionId: undefined,
    partyId: undefined,
    imageUrl: undefined,
    credentialUrl: undefined,
  },
  disableSave,
  isEditMode = false,
}: CandidatesModalProps) {
  const [voterId, setVoterId] = useState<number | undefined>(initialData.voterId);
  const [positionId, setPositionId] = useState<number | undefined>(initialData.positionId);
  const [partyId, setPartyId] = useState<number | null>(initialData.partyId ?? null);
  const [image, setImage] = useState<File | null>(null);
  const [credentials, setCredentials] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null | undefined>(initialData.imageUrl);
  const [credentialUrl, setCredentialUrl] = useState<string | null | undefined>(initialData.credentialUrl);

  // Sync state when modal opens or initialData changes (for edit prefill)
  useEffect(() => {
    if (!open) return;

    // Only update if we have actual initialData (edit mode)
    if (initialData && initialData.voterId) {
      setVoterId(initialData.voterId);
      setPositionId(initialData.positionId);
      setPartyId(initialData.partyId ?? null);
      setImageUrl(initialData.imageUrl);
      setCredentialUrl(initialData.credentialUrl);
    } else if (!initialData || !initialData.voterId) {
      // Clear form for new entry mode
      setVoterId(undefined);
      setPositionId(undefined);
      setPartyId(null);
      setImageUrl(undefined);
      setCredentialUrl(undefined);
    }
    
    // Always reset file inputs when modal opens
    setImage(null);
    setCredentials(null);

    // Reset options if we need to fetch them fresh
    const needVoters = !votersProp || votersProp.length === 0;
    const needPositions = !positionsProp || positionsProp.length === 0;
    const needParties = !partiesProp || partiesProp.length === 0;

    if (needVoters) setVoters([]);
    if (needPositions) setPositions([]);
    if (needParties) setParties([]);
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialData?.voterId]);

  // Local option state; seed from props when present
  const [voters, setVoters] = useState<VoterOpt[]>([]);
  const [positions, setPositions] = useState<PositionOpt[]>([]);
  const [parties, setParties] = useState<PartyOpt[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  // Seed from props when modal opens
  useEffect(() => {
    if (!open) return;
    
    if (votersProp && votersProp.length > 0) {
      setVoters(votersProp);
    }
    if (positionsProp && positionsProp.length > 0) {
      setPositions(positionsProp);
    }
    if (partiesProp && partiesProp.length > 0) {
      setParties(partiesProp);
    }
  }, [open, votersProp, positionsProp, partiesProp]);

  // NEW: Build a map of name -> count to detect duplicates & provide scope context
  const duplicateNameCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    positions.forEach(p => { counts[p.name] = (counts[p.name] || 0) + 1; });
    return counts;
  }, [positions]);

  // NEW: Helper to derive a human-friendly scope label (fallbacks for different API shapes)
  const getScopeLabel = (p: PositionOpt) => {
    const scopeName = p.votingScope?.name || p.votingScopeName || p.scopeName;
    if (scopeName) return scopeName;
    if (p.votingScopeId) return `Scope #${p.votingScopeId}`;
    return "All voters"; // no scope restriction
  };

  // When modal opens, fetch options if not provided
  useEffect(() => {
    if (!open) return;

    const needVoters = !votersProp || votersProp.length === 0;
    const needPositions = !positionsProp || positionsProp.length === 0;
    const needParties = !partiesProp || partiesProp.length === 0;

    if (!needVoters && !needPositions && !needParties) return;

    let cancelled = false;
    const fetchOptions = async () => {
      try {
        setLoadingOptions(true);
        
        // Fetch each endpoint individually for better error handling
        if (needVoters && !cancelled) {
          try {
            const res = await fetch(`/api/voters?electionId=${electionId}&all=true`);
            if (res.ok) {
              const json = await res.json();
              const items = json?.data?.voters;
              if (!cancelled && Array.isArray(items)) {
                setVoters(items);
              }
            } else {
              console.warn('Failed to fetch voters:', res.status, res.statusText);
            }
          } catch (e) {
            console.warn('Error fetching voters:', e);
          }
        }

        if (needPositions && !cancelled) {
          try {
            const res = await fetch(`/api/positions?electionId=${electionId}&all=true`);
            if (res.ok) {
              const json = await res.json();
              const items = json?.data?.positions;
              if (!cancelled && Array.isArray(items)) {
                setPositions(items);
              }
            } else {
              console.warn('Failed to fetch positions:', res.status, res.statusText);
            }
          } catch (e) {
            console.warn('Error fetching positions:', e);
          }
        }

        if (needParties && !cancelled) {
          try {
            const res = await fetch(`/api/parties?electionId=${electionId}&all=true`);
            if (res.ok) {
              const json = await res.json();
              const items = json?.data?.parties;
              if (!cancelled && Array.isArray(items)) {
                setParties(items);
              }
            } else {
              console.warn('Failed to fetch parties:', res.status, res.statusText);
            }
          } catch (e) {
            console.warn('Error fetching parties:', e);
          }
        }
      } catch (e) {
        console.error('Error in fetchOptions:', e);
      } finally {
        if (!cancelled) setLoadingOptions(false);
      }
    };

    fetchOptions();
    return () => {
      cancelled = true;
    };
  }, [open, electionId, votersProp, positionsProp, partiesProp]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!voterId || !positionId) {
      alert("Please select both a voter and a position");
      return;
    }

    if (isEditMode) {
      // For edit, send a JSON payload compatible with PUT /api/candidates/[id]
      const payload: { positionId: number; partyId?: number | null } = {
        positionId,
      };
      // Always include partyId, even if null
      payload.partyId = partyId;
      onSave(payload);
      onClose();
      return;
    }

    // Create FormData object matching API expectations for create
    const formData = new FormData();
    formData.append('electionId', electionId.toString());
    formData.append('voterId', voterId.toString());
    formData.append('positionId', positionId.toString());

    // Handle party ID - if null, append 'null' string, otherwise append the ID
    if (partyId !== null) {
      formData.append('partyId', partyId.toString());
    } else {
      // Explicitly append 'null' string if no party is selected
      formData.append('partyId', 'null');
    }
    
    if (image) formData.append('image', image);
    if (credentials) formData.append('credentials', credentials);

    onSave(formData);
    onClose();
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex justify-center items-center bg-black/30 backdrop-blur-sm lg:ml-68"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative max-w-4xl max-h-screen p-10 flex flex-col justify-center">
        <div className="bg-white rounded-lg shadow-sm overflow-y-auto max-h-[80vh]">
          {/* Modal header */}
          <div className="flex items-center justify-between p-4 border-b rounded-t border-gray-200">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{isEditMode ? 'Edit Candidate' : 'Candidate Form'}</h3>
            </div>
            <button
              type="button"
              className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 inline-flex justify-center items-center"
              onClick={onClose}
            >
              <svg className="w-3 h-3" aria-hidden="true" fill="none" viewBox="0 0 14 14">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"/>
              </svg>
              <span className="sr-only">Close modal</span>
            </button>
          </div>
          {/* Modal body */}
          <div className="p-4">
            <p className="text-sm text-gray-500 mb-4">
              {isEditMode
                ? 'Update the candidate\'s details. Voter cannot be changed.'
                : 'Select a voter to be a candidate for a position, and upload their photo and credentials.'}
            </p>
            <form
              onSubmit={handleSubmit}
              encType="multipart/form-data"
              className="grid gap-4 mb-4 grid-cols-2"
            >
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Voter (Candidate)*
                </label>
                <select
                  value={voterId ?? ''}
                  onChange={e => setVoterId(e.target.value ? Number(e.target.value) : undefined)}
                  className={`w-full border border-[var(--color-secondary)] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-[var(--color-secondary)] bg-white text-gray-900 ${isEditMode ? 'opacity-60' : ''}`}
                  required
                  disabled={isEditMode}
                >
                  <option value="">Select a voter to become a candidate</option>
                  {voters.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.firstName} {v.lastName}{v.email ? ` (${v.email})` : ''}
                    </option>
                  ))}
                </select>
                {isEditMode && (
                  <p className="text-xs text-gray-500 mt-1">
                    Voter cannot be changed when editing a candidate
                  </p>
                )}
              </div>

              <div className="sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Position* <span className="text-xs text-gray-500 font-normal">(scope shown if duplicated)</span>
                </label>
                <select
                  value={positionId ?? ''}
                  onChange={e => setPositionId(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full border border-[var(--color-secondary)] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-[var(--color-secondary)] bg-white text-gray-900"
                  required
                >
                  <option value="">Select a position for the candidate</option>
                  {positions.map(p => {
                    const needsScope = duplicateNameCounts[p.name] > 1;
                    const label = needsScope ? `${p.name} (${getScopeLabel(p)})` : p.name;
                    return (
                      <option key={p.id} value={p.id}>{label}</option>
                    );
                  })}
                </select>
              </div>

              <div className="sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Party
                </label>
                <select
                  value={partyId ?? ''}
                  onChange={e => setPartyId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full border border-[var(--color-secondary)] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-[var(--color-secondary)] bg-white text-gray-900"
                >
                  <option value="">No party</option>
                  {parties.map(pt => (
                    <option key={pt.id} value={pt.id}>{pt.name}</option>
                  ))}
                </select>
              </div>

              {/* Files section */}
              {isEditMode ? (
                <div className="col-span-2 grid grid-cols-2 gap-4">
                  <div className="sm:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Current Photo</label>
                    {imageUrl ? (
                      <a href={imageUrl} target="_blank" rel="noreferrer" className="text-blue-600 text-sm break-all">
                        {imageUrl}
                      </a>
                    ) : (
                      <p className="text-sm text-gray-500">None</p>
                    )}
                  </div>
                  <div className="sm:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Current Credentials</label>
                    {credentialUrl ? (
                      <a href={credentialUrl} target="_blank" rel="noreferrer" className="text-blue-600 text-sm break-all">
                        {credentialUrl}
                      </a>
                    ) : (
                      <p className="text-sm text-gray-500">None</p>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <div className="sm:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Candidate Photo
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => setImage(e.target.files?.[0] || null)}
                      className="w-full border border-[var(--color-secondary)] rounded-md px-3 py-2 text-sm bg-white text-gray-900"
                    />
                  </div>

                  <div className="sm:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Candidate Credentials (PDF)
                    </label>
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={e => setCredentials(e.target.files?.[0] || null)}
                      className="w-full border border-[var(--color-secondary)] rounded-md px-3 py-2 text-sm bg-white text-gray-900"
                    />
                  </div>
                </>
              )}

              <div className="col-span-2 flex justify-end gap-2 mt-2">
                <SubmitButton
                  type="button"
                  variant="action"
                  onClick={onClose}
                  label="Cancel"
                />
                <SubmitButton
                  type="submit"
                  variant="small"
                  label={isEditMode ? 'Save' : 'Add'}
                  isLoading={disableSave || loadingOptions}
                  className="px-5 py-2.5 text-sm font-medium rounded-lg"
                />
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}