"use client";
import { useState, useEffect } from "react";
import { PasswordField } from "@/components/PasswordField";
import { SubmitButton } from "@/components/SubmitButton";

interface ChangePassModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: {
    oldPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => void;
  errors?: {
    oldPassword?: string[];
    newPassword?: string[];
    confirmPassword?: string[];
  };
}

export function ChangePassModal({ open, onClose, onSave, errors }: ChangePassModalProps) {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Force clear all fields whenever modal opens - prevents auto-fill
  useEffect(() => {
    if (open) {
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  }, [open]);

  // Clear all fields when modal closes for security
  const handleClose = () => {
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    onClose();
  };

  if (!open) return null;
  // Modal layout copied from PartyModal
  return (
    <div className="fixed inset-0 z-[100] flex justify-center items-center bg-black/30 backdrop-blur-sm lg:ml-68"
      onClick={e => {
        if (e.target === e.currentTarget) handleClose();
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
              onClick={handleClose}
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
              autoComplete="off"
            >
              <div className="col-span-2">
                <PasswordField 
                  label="Old Password" 
                  value={oldPassword} 
                  onChange={e => setOldPassword(e.target.value)} 
                  placeholder="Enter your current password"
                  autoComplete="new-password"
                  error={errors?.oldPassword?.[0]}
                />
              </div>
              <div className="col-span-2">
                <PasswordField 
                  label="New Password" 
                  value={newPassword} 
                  onChange={e => setNewPassword(e.target.value)} 
                  placeholder="Enter a new password"
                  autoComplete="new-password"
                  error={errors?.newPassword?.[0]}
                />
              </div>
              <div className="col-span-2">
                <PasswordField 
                  label="Confirm Password" 
                  value={confirmPassword} 
                  onChange={e => setConfirmPassword(e.target.value)} 
                  placeholder="Re-enter new password"
                  autoComplete="new-password"
                  error={errors?.confirmPassword?.[0]}
                />
              </div>
              <div className="col-span-2 flex justify-end gap-2 mt-2">
                <SubmitButton
                  type="button"
                  variant="action"
                  onClick={handleClose}
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