import { useState, useEffect } from "react";
import { AuthHeading } from "@/components/AuthHeading";
import { InputField } from "@/components/InputField";
import { SubmitButton } from "@/components/SubmitButton";

type PositionsModalProps = {
  open: boolean;
  onClose: () => void;
  onSave: (data: { position: string; voteLimit: number; numberOfWinners: number; order: number }) => void;
  initialData?: { position?: string; voteLimit?: number; numberOfWinners?: number; order?: number };
  disableSave?: boolean;
  title?: string;
  submitLabel?: string;
};

export function PositionsModal({
  open,
  onClose,
  onSave,
  initialData = { position: "", voteLimit: 1, numberOfWinners: 1, order: 0 },
  disableSave,
  title = "Position Form",
  submitLabel = "Add",
}: PositionsModalProps) {
  const [position, setPosition] = useState(initialData.position || "");
  const [voteLimit, setVoteLimit] = useState(initialData.voteLimit || 1);
  const [numberOfWinners, setNumberOfWinners] = useState(initialData.numberOfWinners || 1);
  const [order, setOrder] = useState(initialData.order || 0);

  useEffect(() => {
    if (!open) return;
    
    // Only update if we have actual initialData (edit mode)
    if (initialData && initialData.position) {
      setPosition(initialData.position || "");
      setVoteLimit(initialData.voteLimit || 1);
      setNumberOfWinners(initialData.numberOfWinners || 1);
      setOrder(initialData.order || 0);
    } else if (!initialData || !initialData.position) {
      // Clear form for new entry mode
      setPosition("");
      setVoteLimit(1);
      setNumberOfWinners(1);
      setOrder(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialData?.position]);

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
              onSubmit={e => {
                e.preventDefault();
                onSave({ position, voteLimit, numberOfWinners, order });
                onClose();
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
                  required
                />
              </div>
              <div className="sm:col-span-1">
                <InputField
                  label="Number of Winners*"
                  type="number"
                  value={numberOfWinners}
                  onChange={e => setNumberOfWinners(Math.max(1, Number(e.target.value)))}
                  min={1}
                  required
                />
              </div>
              <div className="sm:col-span-1">
                <InputField
                  label="Order*"
                  type="number"
                  value={order}
                  onChange={e => setOrder(Math.max(0, Number(e.target.value)))}
                  min={0}
                  placeholder="Display order (0 = first)"
                  required
                />
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
                  className="px-5 py-2.5 text-sm font-medium rounded-lg"
                  isLoading={disableSave}
                />
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}