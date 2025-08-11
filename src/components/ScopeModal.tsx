import { useState } from "react";
import { AuthHeading } from "@/components/AuthHeading";
import { InputField } from "@/components/InputField";
import { SubmitButton } from "@/components/SubmitButton";

interface ScopeModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: {
    type: string;
    scopes: { name: string; description: string }[];
  }) => void;
  disableSave?: boolean;
  initialData?: { type: string; name: string; description: string };
}

export function ScopeModal({ open, onClose, onSave, disableSave, initialData }: ScopeModalProps) {
  const [scopeType, setScopeType] = useState(initialData?.type ?? "");
  const [scopes, setScopes] = useState<{ name: string; description: string }[]>([]);
  const [name, setName] = useState(initialData?.name ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [editIndex, setEditIndex] = useState<number | null>(null);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-center items-center bg-black/30 backdrop-blur-sm">
      <div className="relative max-w-4xl max-h-screen p-10 flex flex-col justify-center w-full">
        <div className="bg-white rounded-lg shadow-sm overflow-y-auto max-h-[80vh]">
          {/* Modal header */}
          <div className="flex items-center justify-between p-4 border-b rounded-t border-gray-200">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Scope Form</h3>
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
              Set a scope type, declare its scope name, and put a description.
            </p>
            <form
              onSubmit={e => {
                e.preventDefault();
                if (!scopeType.trim() || !name.trim()) return;
                const newScopes = [{ name, description }];
                onSave({ type: scopeType, scopes: newScopes });
                setScopes(newScopes);
                setName("");
                setDescription("");
                setEditIndex(null);
                onClose();
              }}
              className="grid gap-4 mb-4 grid-cols-1 sm:grid-cols-2"
            >
              <div className="col-span-1 sm:col-span-2">
                <InputField
                  label="Scoping Type*"
                  type="text"
                  value={scopeType}
                  onChange={e => setScopeType(e.target.value)}
                  placeholder="Enter scoping type (e.g., Department)"
                  required
                />
              </div>
              <div className="col-span-1 sm:col-span-2">
                <InputField
                  label="Scope Name*"
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Enter scope name"
                  required
                />
              </div>
              <div className="col-span-1 sm:col-span-2">
                <InputField
                  label="Scope Description"
                  type="text"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Enter a description..."
                />
              </div>
              <div className="col-span-1 sm:col-span-2 flex justify-end gap-2 mt-2">
                <SubmitButton
                  type="button"
                  variant="action"
                  onClick={onClose}
                  label="Cancel"
                />
                <SubmitButton
                  type="submit"
                  variant="small"
                  label={editIndex !== null ? "Update" : "Add"}
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