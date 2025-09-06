"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";

import { SubmitButton } from "@/components/SubmitButton";

type MFAModalProps = {
  open: boolean;
  onClose: () => void;
  electionId: number;
  onSave?: (data: {
    mfaMethods: string[];
  }) => void;
  initialData?: {
    mfaMethods?: string[];
  };
  disableSave?: boolean;
};

export function MFAModal({
  open,
  onClose,
  electionId,
  onSave,
  initialData = {
    mfaMethods: [],
  },
  disableSave,
}: MFAModalProps) {

  const [selectedMethods, setSelectedMethods] = useState<string[]>(initialData.mfaMethods || []);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  // Fetch current MFA settings when modal opens
  useEffect(() => {
    if (open && electionId) {
      fetchMfaSettings();
    }
  }, [open, electionId]);

  const fetchMfaSettings = async () => {
    setFetching(true);
    try {
      const response = await fetch(`/api/elections/${electionId}/mfa`);
      const data = await response.json();
      
      if (response.ok && data.success) {
        setSelectedMethods(data.data.mfaMethods || []);
      } else {
        toast.error(data.message || "Failed to fetch MFA settings");
      }
    } catch (error) {
      toast.error("Failed to fetch MFA settings");
      console.error("Error fetching MFA settings:", error);
    } finally {
      setFetching(false);
    }
  };

  const saveMfaSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/elections/${electionId}/mfa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mfaMethods: selectedMethods,
        }),
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        toast.success(data.message || "MFA settings saved successfully");
        if (onSave) {
          onSave({ mfaMethods: selectedMethods });
        }
        onClose();
      } else {
        toast.error(data.message || "Failed to save MFA settings");
      }
    } catch (error) {
      toast.error("Failed to save MFA settings");
      console.error("Error saving MFA settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMethodToggle = (method: string) => {
    setSelectedMethods(prev => 
      prev.includes(method) 
        ? prev.filter(m => m !== method)
        : [...prev, method]
    );
  };

  const mfaOptions = [
    {
      id: "email-confirmation",
      title: "Email Confirmation",
      description: "Voter must enter their registered email address"
    },
    {
      id: "otp-email", 
      title: "One-Time Password (OTP)",
      description: "4-digit code sent to voter's email"
    },
    {
      id: "passphrase-email",
      title: "Secure Passphrase", 
      description: "Random phrase sent to voter's email"
    }
  ];

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
              This can help the election more securely verify voter identities. You can select multiple authentication methods for enhanced security.
            </p>
            
            {fetching ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                <span className="ml-2 text-gray-600">Loading current settings...</span>
              </div>
            ) : (
              <form
                onSubmit={e => {
                  e.preventDefault();
                  saveMfaSettings();
                }}
                className="grid gap-4 mb-4 grid-cols-1"
              >
              
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Choose Authentication Methods (You can select multiple)
                </label>
                <div className="space-y-3">
                  {mfaOptions.map((option) => (
                    <label 
                      key={option.id}
                      className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedMethods.includes(option.id)}
                        onChange={() => handleMethodToggle(option.id)}
                        className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary accent-primary"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{option.title}</div>
                        <div className="text-sm text-gray-500">{option.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
                
                {selectedMethods.length > 0 && (
                  <div className="mt-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <p className="text-sm text-orange-800">
                      <strong>Selected methods:</strong> Voters will need to complete {selectedMethods.length} authentication step{selectedMethods.length > 1 ? 's' : ''}
                    </p>
                    <ul className="mt-2 text-sm text-orange-700">
                      {selectedMethods.map((methodId) => {
                        const method = mfaOptions.find(opt => opt.id === methodId);
                        return method ? <li key={methodId}>• {method.title}</li> : null;
                      })}
                    </ul>
                  </div>
                )}

                {selectedMethods.length === 0 && (
                  <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <p className="text-sm text-yellow-800">
                      No authentication methods selected. Voters will only need their voter code to login.
                    </p>
                  </div>
                )}
              </div>
              
              <div className="col-span-1 flex justify-end gap-2 mt-2">
                <SubmitButton
                  type="button"
                  variant="action"
                  onClick={onClose}
                  label="Cancel"
                />
                <SubmitButton
                  type="submit"
                  variant="small"
                  label={loading ? "Saving" : "Save"}
                  isLoading={loading || fetching}
                  className="px-5 py-2.5 text-sm font-medium rounded-lg"
                />
              </div>
            </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
