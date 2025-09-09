"use client";

import { useState } from "react";

interface ConfirmationModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => Promise<void> | void;
  variant?: "delete" | "edit" | "info";
}

export default function ConfirmationModal({
  open,
  onClose,
  title = "Confirm Action",
  description = "Are you sure you want to continue?",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  variant = "info",
}: ConfirmationModalProps) {
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleConfirm = async () => {
    try {
      setLoading(true);
      await onConfirm();
      onClose();
    } catch (err) {
      console.error("Confirmation action failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const confirmBtnStyle =
    variant === "delete"
      ? "bg-primary hover:brightness-90 text-white"
      : variant === "edit"
      ? "bg-yellow-800 hover:brightness-90 text-white"
      : "bg-gray-600 hover:bg-gray-700 text-white";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 z-[9999]"
        onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
        }}>
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
        {/* Header */}
        <h2 className="text-lg font-semibold text-black">{title}</h2>
        <p className="mt-2 text-sm text-gray whitespace-pre-line">{description}</p>

        {/* Footer */}
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-100"
          >
            {cancelLabel}
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className={`px-4 py-2 rounded-lg ${confirmBtnStyle} flex items-center gap-2`}
          >
            {loading && (
              <svg
                className="w-4 h-4 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                />
              </svg>
            )}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
