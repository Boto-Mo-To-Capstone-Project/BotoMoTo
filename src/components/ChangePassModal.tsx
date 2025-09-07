"use client";
import { useState } from "react";
import { AuthHeading } from "@/components/AuthHeading";
import { InputField } from "@/components/InputField";
import { SubmitButton } from "@/components/SubmitButton";

interface ChangePassModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: {
    oldPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => void;
}

export function ChangePassModal({ open, onClose, onSave }: ChangePassModalProps) {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  if (!open) return null;
  // Modal layout copied from PartyModal
  return (
    <div className="fixed inset-0 z-[100] flex justify-center items-center bg-black/30 backdrop-blur-sm lg:ml-68"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}>
      <div className="relative max-w-4xl max-h-screen p-10 flex flex-col justify-center w-full">
        <div className="bg-white rounded-lg shadow-sm overflow-y-auto max-h-[80vh] w-full">
          {/* Modal header */}
          <div className="flex items-center justify-between p-4 border-b rounded-t border-gray-200">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Change Password</h3>
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
              Update your account password below.
            </p>
            <form
              onSubmit={e => {
                e.preventDefault();
                onSave({ oldPassword, newPassword, confirmPassword });
              }}
              className="grid gap-4 mb-4 grid-cols-2"
            >
              <div className="col-span-2">
                <InputField label="Old Password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} type="password" placeholder="Enter your current password" required />
              </div>
              <div className="col-span-2">
                <InputField label="New Password" value={newPassword} onChange={e => setNewPassword(e.target.value)} type="password" placeholder="Enter a new password" required />
              </div>
              <div className="col-span-2">
                <InputField label="Confirm Password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} type="password" placeholder="Re-enter new password" required />
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
                  label="Save"
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