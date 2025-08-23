import { useState } from "react";

import { InputField } from "@/components/InputField";
import { SubmitButton } from "@/components/SubmitButton";


type MFAModalProps = {
  open: boolean;
  onClose: () => void;
  onSave: (data: {
    mfa: string;
    voterName: string;
    scope: string;
    email: string;
    contactNumber: string;
    voterLimit: number;
    numberOfWinners: number;
  }) => void;
  initialData?: {
    mfa: string;
    voterName?: string;
    scope?: string;
    email?: string;
    contactNumber?: string;
    voterLimit?: number;
    numberOfWinners?: number;
  };
  disableSave?: boolean;
};

export function MFAModal({
  open,
  onClose,
  onSave,
  initialData = {
    voterName: "",
    mfa: "Department 1",
    email: "",
    contactNumber: "",
    voterLimit: 1,
    numberOfWinners: 1,
  },
  disableSave,
}: MFAModalProps) {

  const [mfa, setMFA] = useState(initialData.mfa || "unique-code-email");

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[100] flex justify-center items-center bg-black/30 backdrop-blur-sm lg:ml-68"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative max-w-4xl max-h-screen p-10 flex flex-col justify-center w-full">
        <div className="bg-white rounded-lg shadow-sm overflow-y-auto max-h-[80vh]">
          {/* Modal header */}
          <div className="flex items-center justify-between p-4 border-b rounded-t border-gray-200">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Multi-Factor Authentication</h3>
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
              This can help the election more securely verify voter identities.
            </p>
            <form
              onSubmit={e => {
                e.preventDefault();
                onSave({
                    mfa,
                    voterName: "",
                    scope: "",
                    email: "",
                    contactNumber: "",
                    voterLimit: 0,
                    numberOfWinners: 0
                });
                onClose();
              }}
              className="grid gap-4 mb-4 grid-cols-2"
            >
              
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Choose Multi-Factor Authentication Method*
                </label>
                <select
                  value={mfa}
                  onChange={e => setMFA(e.target.value)}
                  className="w-full border border-[var(--color-secondary)] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-[var(--color-secondary)] bg-white text-gray-900"
                  required
                >
                  <option value="unique-code-email">Unique Code via Email</option>
                  <option value="otp-email">One-Time Password (OTP) via Email</option>
                  <option value="otp-sms">One-Time Password (OTP) via SMS</option>
                  <option value="passphrase-email">Passphrase via Email</option>
                </select>
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
                  label="Send"
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