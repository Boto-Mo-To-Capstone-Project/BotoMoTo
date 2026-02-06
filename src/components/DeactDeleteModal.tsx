import { useState, useEffect } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { InputField } from "@/components/InputField";

type AccountModalProps = {
  open: boolean;
  onClose: () => void;
  onSave: (data: { action: "deactivate" | "delete"; duration?: string; reason?: string }) => void;
};

export function AccountModal({ open, onClose, onSave }: AccountModalProps) {
  const [action, setAction] = useState<"deactivate" | "delete" | null>(null);
  const [duration, setDuration] = useState("7");
  const [reason, setReason] = useState("");

  // reset when modal opens
  useEffect(() => {
    if (open) {
      setAction(null);
      setDuration("7");
      setReason("");
    }
  }, [open]);

  if (!open) return null;
  // Layout and size copied from ChangePassModal
  return (
    <div className="fixed inset-0 z-[100] flex justify-center items-center bg-black/30 backdrop-blur-sm lg:ml-68"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}>
      <div className="relative max-w-4xl max-h-screen p-10 flex flex-col justify-center w-full">
        <div className="bg-white rounded-lg shadow-sm overflow-y-auto max-h-[80vh] w-full">
          {/* Modal header */}
          <div className="flex items-center justify-between p-4 border-b rounded-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Manage Account</h3>
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
            {/* Step 1: Choose */}
            {!action && (
              <div className="space-y-4">
                <p className="text-sm text-gray-500 mb-2">
                  Choose what you want to do with your account:
                </p>
                <div className="grid gap-4 mb-4 grid-cols-2">
                  <div className="col-span-2">
                    <button
                      type="button"
                      onClick={() => setAction("deactivate")}
                      className="w-full text-left border border-gray-300 rounded-lg p-4 hover:border-[var(--color-primary,#b91c1c)] hover:bg-gray-50 transition"
                    >
                      <h4 className="font-semibold text-gray-900">Deactivate Account</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Temporarily disable your account. You won’t lose your data, but you won’t be
                        able to access the system until you reactivate it.
                      </p>
                    </button>
                  </div>
                  <div className="col-span-2">
                    <button
                      type="button"
                      onClick={() => setAction("delete")}
                      className="w-full text-left border border-gray-300 rounded-lg p-4 hover:border-[var(--color-primary,#b91c1c)] hover:bg-gray-50 transition"
                    >
                      <h4 className="font-semibold text-gray-900">Delete Account</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Permanently remove your account and all associated data. This action cannot be
                        undone.
                      </p>
                    </button>
                  </div>
                </div>
              </div>
            )}
            {/* Step 2a: Deactivate */}
            {action === "deactivate" && (
              <form
                onSubmit={e => {
                  e.preventDefault();
                  onSave({ action: "deactivate", duration, reason });
                  onClose();
                }}
                className="grid gap-4 mb-4 grid-cols-2"
              >
                <div className="col-span-2">
                  <p className="text-sm text-gray-600 mb-2">
                    Your account will be temporarily disabled. You can reactivate it anytime after the
                    chosen period ends.
                  </p>
                </div>
                <div className="col-span-2">
                  <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
                  <select
                    name="duration"
                    id="duration"
                    value={duration}
                    onChange={e => setDuration(e.target.value)}
                    className="w-full border border-[var(--color-secondary)] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-[var(--color-secondary)] bg-white text-gray-900"
                  >
                    <option value="3">3 days</option>
                    <option value="7">7 days</option>
                    <option value="30">30 days</option>
                    <option value="manual">Don’t activate my account until I come back</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <InputField
                    label="Reason (optional)"
                    type="text"
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    placeholder="Enter your reason"
                  />
                </div>
                <div className="col-span-2 flex justify-end gap-2 mt-2">
                  <SubmitButton type="button" variant="action" label="Back" onClick={() => setAction(null)} />
                  <SubmitButton type="submit" variant="action-primary" label="Deactivate" />
                </div>
              </form>
            )}
            {/* Step 2b: Delete */}
            {action === "delete" && (
              <form
                onSubmit={e => {
                  e.preventDefault();
                  onSave({ action: "delete" });
                  onClose();
                }}
                className="grid gap-4 mb-4 grid-cols-2"
              >
                <div className="col-span-2">
                  <p  className="w-full text-left border border-red-300 rounded-lg p-4 bg-red-50 text-red-800">
                    This will permanently delete your account and all associated data.{' '}
                    <strong>This action cannot be undone.</strong>
                  </p>
                </div>
                <div className="col-span-2 flex justify-end gap-2 mt-2">
                  <SubmitButton type="button" variant="action" label="Back" onClick={() => setAction(null)} />
                  <SubmitButton type="submit" variant="action-primary" label="Delete Permanently" />
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
