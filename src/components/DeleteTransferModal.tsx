"use client";
import { useState, useEffect } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { InputField } from "@/components/InputField";
import { PasswordField } from "@/components/PasswordField";
import { MdWarning, MdClose } from "react-icons/md";

type DeleteTransferModalProps = {
  open: boolean;
  onClose: () => void;
  onSave: (data: { 
    action: "delete" | "transfer"; 
    transferData?: {
      newAdminEmail: string;
      currentPassword: string;
      transferReason: string;
    }
  }) => void;
  errors?: {
    newAdminEmail?: string[];
    currentPassword?: string[];
    transferReason?: string[];
  };
};

export function DeleteTransferModal({ open, onClose, onSave, errors = {} }: DeleteTransferModalProps) {
  const [action, setAction] = useState<"delete" | "transfer" | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [transferData, setTransferData] = useState({
    newAdminEmail: "",
    currentPassword: "",
    transferReason: ""
  });

  // reset when modal opens
  useEffect(() => {
    if (open) {
      setAction(null);
      setShowConfirmation(false);
      setDeleteConfirmText("");
      setTransferData({
        newAdminEmail: "",
        currentPassword: "",
        transferReason: ""
      });
    }
  }, [open]);

  if (!open) return null;

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
              <MdClose size={16} />
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
                <div className="grid gap-4 mb-4 grid-cols-1">
                  <div className="col-span-1">
                    <button
                      type="button"
                      onClick={() => setAction("delete")}
                      className="w-full text-left border border-gray-300 rounded-lg p-4 hover:border-red-500 hover:bg-red-50 transition"
                    >
                      <h4 className="font-semibold text-gray-900">Delete Account</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Permanently remove your account and all associated data. This action cannot be undone.
                      </p>
                    </button>
                  </div>
                  <div className="col-span-1">
                    <button
                      type="button"
                      onClick={() => setAction("transfer")}
                      className="w-full text-left border border-gray-300 rounded-lg p-4 hover:border-blue-500 hover:bg-blue-50 transition"
                    >
                      <h4 className="font-semibold text-gray-900">Transfer Admin Rights</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Transfer your admin rights to another user. Your account will be permanently deleted 
                        and the new user will become the admin.
                      </p>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2a: Delete */}
            {action === "delete" && !showConfirmation && (
              <form
                onSubmit={e => {
                  e.preventDefault();
                  setShowConfirmation(true);
                }}
                className="grid gap-4 mb-4 grid-cols-1"
              >
                <div className="col-span-1">
                  <div className="w-full text-left border border-red-300 rounded-lg p-4 bg-red-50 text-red-800">
                    <div className="flex items-start">
                      <MdWarning className="text-red-600 mt-0.5 mr-3 flex-shrink-0" size={20} />
                      <div>
                        <p className="font-medium">⚠️ Permanent Account Deletion</p>
                        <p className="mt-1">
                          This will permanently delete your account and all associated data.{' '}
                          <strong>This action cannot be undone.</strong>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-span-1 flex justify-end gap-2 mt-2">
                  <SubmitButton type="button" variant="action" label="Back" onClick={() => setAction(null)} />
                  <SubmitButton type="submit" variant="action-primary" label="Continue" />
                </div>
              </form>
            )}

            {/* Step 2b: Transfer */}
            {action === "transfer" && !showConfirmation && (
              <form
                onSubmit={e => {
                  e.preventDefault();
                  setShowConfirmation(true);
                }}
                className="grid gap-4 mb-4 grid-cols-1"
              >
                {/* Warning Banner */}
                <div className="col-span-1">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <MdWarning className="text-yellow-600 mt-0.5 mr-3 flex-shrink-0" size={20} />
                      <div className="text-sm text-yellow-800">
                        <p className="font-medium">⚠️ Important Warning</p>
                        <p className="mt-1">
                          This action will transfer all admin rights to the new email address and{" "}
                          <strong>permanently delete your account</strong>. You will lose access to this organization.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-span-1">
                  <InputField
                    label="New Admin Email"
                    type="email"
                    value={transferData.newAdminEmail}
                    onChange={e => setTransferData(prev => ({ ...prev, newAdminEmail: e.target.value }))}
                    placeholder="Enter new admin email"
                    required
                    error={errors.newAdminEmail?.[0]}
                  />
                </div>

                <div className="col-span-1">
                  <PasswordField
                    label="Your Current Password"
                    value={transferData.currentPassword}
                    onChange={e => setTransferData(prev => ({ ...prev, currentPassword: e.target.value }))}
                    placeholder="Enter your current password"
                    autoComplete="current-password"
                  />
                </div>

                <div className="col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Transfer Reason (Optional)
                  </label>
                  <textarea
                    value={transferData.transferReason}
                    onChange={e => setTransferData(prev => ({ ...prev, transferReason: e.target.value }))}
                    placeholder="Reason for transferring admin rights (e.g., retiring, changing roles)"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500 resize-none"
                    rows={3}
                  />
                  {errors.transferReason?.[0] && (
                    <p className="text-red-600 text-xs mt-1">{errors.transferReason[0]}</p>
                  )}
                </div>

                {/* Confirmation Text */}
                <div className="col-span-1">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-800">
                      By clicking "Transfer Admin Rights", you confirm that:
                    </p>
                    <ul className="text-xs text-red-700 mt-2 ml-4 list-disc space-y-1">
                      <li>You understand this action cannot be undone</li>
                      <li>Your account will be permanently deleted</li>
                      <li>All admin rights will transfer to the new email</li>
                      <li>You will be logged out immediately</li>
                    </ul>
                  </div>
                </div>

                <div className="col-span-1 flex justify-end gap-2 mt-2">
                  <SubmitButton type="button" variant="action" label="Back" onClick={() => setAction(null)} />
                  <SubmitButton 
                    type="submit" 
                    variant="action-primary" 
                    label="Continue"
                    isLoading={false}
                  />
                </div>
              </form>
            )}

            {/* Step 3: Final Confirmation for Delete */}
            {action === "delete" && showConfirmation && (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
                    <MdWarning className="h-8 w-8 text-red-600" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Are you absolutely sure?
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
                  </p>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">This will delete:</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Your admin account and profile</li>
                    <li>• All organization data and settings</li>
                    <li>• All elections and voting records</li>
                    <li>• All candidates and voter information</li>
                    <li>• All associated files and documents</li>
                  </ul>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800">
                    <strong>Warning:</strong> Please type "DELETE" below to confirm this action.
                  </p>
                  <input
                    type="text"
                    placeholder="Type DELETE to confirm"
                    value={deleteConfirmText}
                    className="mt-2 w-full rounded-lg border border-red-300 px-3 py-2 text-sm focus:border-red-500 focus:ring-red-500"
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <SubmitButton 
                    type="button" 
                    variant="action" 
                    label="Back" 
                    onClick={() => setShowConfirmation(false)} 
                  />
                  <SubmitButton 
                    type="button" 
                    variant="action-primary" 
                    label="Delete Account Permanently"
                    isLoading={deleteConfirmText !== "DELETE"}
                    onClick={() => {
                      if (deleteConfirmText === "DELETE") {
                        onSave({ action: "delete" });
                        onClose();
                      }
                    }}
                  />
                </div>
              </div>
            )}

            {/* Step 3: Final Confirmation for Transfer */}
            {action === "transfer" && showConfirmation && (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-4">
                    <MdWarning className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Confirm Admin Transfer
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    You are about to transfer admin rights and permanently delete your account.
                  </p>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Transfer Summary:</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li><strong>New Admin:</strong> {transferData.newAdminEmail}</li>
                    <li><strong>Your Account:</strong> Will be permanently deleted</li>
                    <li><strong>Organization:</strong> Will transfer to new admin</li>
                    {transferData.transferReason && (
                      <li><strong>Reason:</strong> {transferData.transferReason}</li>
                    )}
                  </ul>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <MdWarning className="text-yellow-600 mt-0.5 mr-3 flex-shrink-0" size={20} />
                    <div className="text-sm text-yellow-800">
                      <p className="font-medium">Final Warning</p>
                      <p className="mt-1">
                        Once you confirm, your account will be deleted and you will be logged out immediately. 
                        The new admin will receive an email notification about their new role.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <SubmitButton 
                    type="button" 
                    variant="action" 
                    label="Back" 
                    onClick={() => setShowConfirmation(false)} 
                  />
                  <SubmitButton 
                    type="button" 
                    variant="action-primary" 
                    label="Confirm Transfer"
                    onClick={() => {
                      onSave({ 
                        action: "transfer", 
                        transferData: transferData 
                      });
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
