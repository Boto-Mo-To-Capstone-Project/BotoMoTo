import { useState, useEffect } from "react";
import { AuthHeading } from "@/components/AuthHeading";
import { InputField } from "@/components/InputField";
import { SubmitButton } from "@/components/SubmitButton";

type PositionsModalProps = {
  open: boolean;
  onClose: () => void;
  onSave: (data: {
    position: string;
    voteLimit: number;
    numberOfWinners: number;
    order: number;
    votingScopeId?: number | null;
  }) => void;
  initialData?: {
    position?: string;
    voteLimit?: number;
    numberOfWinners?: number;
    order?: number;
    votingScopeId?: number | null;
    electionId?: number; // For order suggestions
    positionId?: number; // For edit mode
  };
  votingScopes?: { id: number; name: string }[];
  disableSave?: boolean;
  title?: string;
  submitLabel?: string;
};

export function PositionsModal({
  open,
  onClose,
  onSave,
  initialData = { position: "", voteLimit: 1, numberOfWinners: 1, order: 1 },
  votingScopes,
  disableSave,
  title = "Position Form",
  submitLabel = "Add",
}: PositionsModalProps) {
  const [position, setPosition] = useState(initialData.position || "");
  const [voteLimit, setVoteLimit] = useState(initialData.voteLimit || 1);
  const [numberOfWinners, setNumberOfWinners] = useState(initialData.numberOfWinners || 1);
  const [order, setOrder] = useState(initialData.order || 1);
  const [votingScopeId, setVotingScopeId] = useState<number | null | undefined>(
    initialData?.votingScopeId === undefined ? undefined : initialData?.votingScopeId
  );

  // Simple state for suggested order and existing orders
  const [suggestedOrder, setSuggestedOrder] = useState(1);
  const [existingOrders, setExistingOrders] = useState<number[]>([]);
  const [orderDirty, setOrderDirty] = useState(false); // track manual edits to order so we don't auto-reset it
  const [submitting, setSubmitting] = useState(false); // real submitting state for the Save button

  // Fetch suggested order and existing orders when scope changes or modal opens
  useEffect(() => {
    if (!open || !initialData?.electionId) return;

    // Clear existing orders immediately when scope changes to avoid showing stale data
    setExistingOrders([]);

    const controller = new AbortController();
    const t = setTimeout(async () => {
      try {
        const scopeParam = votingScopeId ? `&votingScopeId=${votingScopeId}` : '';
        const excludeParam = initialData?.positionId ? `&excludePositionId=${initialData.positionId}` : '';

        const res = await fetch(`/api/positions/next-order?electionId=${initialData.electionId}${scopeParam}${excludeParam}`, { signal: controller.signal });
        const json = await res.json();

        if (res.ok && json.success) {
          setSuggestedOrder(json.data.nextOrder);
          setExistingOrders(json.data.usedOrders || []);

          // Auto-set order only for new positions (not edit mode) and only if user hasn't changed it yet
          if (!initialData?.positionId && !orderDirty) {
            setOrder(json.data.nextOrder);
          }
        }
      } catch (e: any) {
        if (e?.name !== 'AbortError') console.error('Failed to fetch order info:', e);
      }
    }, 150); // small debounce to avoid rapid refetching

    return () => {
      controller.abort();
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, votingScopeId, initialData?.electionId, initialData?.positionId, orderDirty]);

  useEffect(() => {
    if (!open) return;

    // Only update if we have actual initialData (edit mode) using positionId
    if (initialData && initialData.positionId) {
      setPosition(initialData.position || "");
      setVoteLimit(initialData.voteLimit || 1);
      setNumberOfWinners(initialData.numberOfWinners || 1);
      setOrder(initialData.order || 1);
      // Preserve null when there is no scope (do not convert to undefined)
      setVotingScopeId(initialData.votingScopeId === undefined ? undefined : initialData.votingScopeId);
      setOrderDirty(false);
    } else {
      // Clear form for new entry mode
      setPosition("");
      setVoteLimit(1);
      setNumberOfWinners(1);
      setOrder(suggestedOrder || 1);
      // In create mode, treat empty as null (no scope)
      setVotingScopeId(null);
      setOrderDirty(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialData?.positionId]);

  // Simple validation
  const voteError = voteLimit > numberOfWinners ? "Vote limit cannot exceed number of winners" : "";
  const orderError = order <= 0 ? "Order must be greater than 0" : "";
  const duplicateOrderError = existingOrders.includes(order) ? "This order is already taken for this scope" : "";
  const hasErrors = voteError || orderError || duplicateOrderError;

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[100] flex justify-center items-center bg-black/30 backdrop-blur-sm lg:ml-68"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative max-w-4xl max-h-screen p-10 flex flex-col justify-center">
        <div className="bg-white rounded-lg shadow-sm overflow-y-auto max-h-[80vh]">
          {/* Modal header */}
          <div className="flex items-center justify-between p-4 border-b rounded-t border-gray-200">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
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
              Create and manage positions for the election that candidates will run for.
            </p>
            <form
              onSubmit={async e => {
                e.preventDefault();

                // Simple validation
                if (voteLimit > numberOfWinners) {
                  alert("Vote limit cannot be greater than number of winners");
                  return;
                }

                if (order <= 0) {
                  alert("Order must be greater than 0");
                  return;
                }

                if (existingOrders.includes(order)) {
                  alert("This order is already taken for this scope. Please choose a different order.");
                  return;
                }

                try {
                  setSubmitting(true);
                  // Explicitly include votingScopeId in the payload, even when null
                  const payload = { 
                    position, 
                    voteLimit, 
                    numberOfWinners, 
                    order, 
                    votingScopeId: votingScopeId === undefined ? null : votingScopeId 
                  };
                  await onSave(payload);
                  onClose();
                } finally {
                  setSubmitting(false);
                }
              }}
              className="grid gap-4 mb-4 grid-cols-2"
            >
              <div className="col-span-2">
                <InputField
                  label="Position*"
                  type="text"
                  value={position}
                  onChange={e => setPosition(e.target.value)}
                  placeholder="Enter Position (e.g., President)"
                  required
                />
              </div>
              <div className="sm:col-span-1">
                <InputField
                  label="Vote Limit*"
                  type="number"
                  value={voteLimit}
                  onChange={e => setVoteLimit(Math.max(1, Number(e.target.value)))}
                  min={1}
                  max={numberOfWinners}
                  required
                />
                {voteError && (
                  <p className="mt-1 text-xs text-red-600">{voteError}</p>
                )}
              </div>
              <div className="sm:col-span-1">
                <InputField
                  label="Number of Winners*"
                  type="number"
                  value={numberOfWinners}
                  onChange={e => {
                    const val = Math.max(1, Number(e.target.value));
                    setNumberOfWinners(val);
                    // Auto-adjust vote limit if it exceeds number of winners
                    if (voteLimit > val) {
                      setVoteLimit(val);
                    }
                  }}
                  min={1}
                  required
                />
              </div>
              {/* NEW: Voting Scope selector (optional) */}
              <div className="sm:col-span-1">
                <label className="block mb-2 text-sm font-medium text-gray-900">Voting Scope</label>
                <select
                  className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5"
                  value={votingScopeId ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setVotingScopeId(val === "" ? null : Number(val));
                  }}
                >
                  <option value="">All voters (no scope)</option>
                  {votingScopes?.map((scope) => (
                    <option key={scope.id} value={scope.id}>
                      {scope.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">Optional. Limit who can vote for this position.</p>
              </div>
              <div className="sm:col-span-1">
                <InputField
                  label="Order*"
                  type="number"
                  value={order}
                  onChange={e => {
                    setOrderDirty(true);
                    setOrder(Math.max(1, Number(e.target.value)));
                  }}
                  min={1}
                  placeholder={`Suggested: ${suggestedOrder}`}
                  required
                />
                {orderError && (
                  <p className="mt-1 text-xs text-red-600">{orderError}</p>
                )}
                {duplicateOrderError && (
                  <p className="mt-1 text-xs text-red-600">{duplicateOrderError}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Order within the selected scope. Suggested: {suggestedOrder}
                  {existingOrders.length > 0 && (
                    <span className="block">Used orders: {existingOrders.join(', ')}</span>
                  )}
                </p>
              </div>
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
                  label={submitLabel}
                  className={`px-5 py-2.5 text-sm font-medium rounded-lg ${disableSave || hasErrors ? 'opacity-60 cursor-not-allowed' : ''}`}
                  isLoading={submitting}
                />
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}