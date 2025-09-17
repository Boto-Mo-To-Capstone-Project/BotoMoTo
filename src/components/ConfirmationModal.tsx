"use client";

import { useState } from "react";
import { SubmitButton } from "./SubmitButton";
import { AlertTriangle } from "lucide-react";

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
    <div
  className="fixed inset-0 z-[100] flex justify-center items-center bg-black/30 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative max-w-4xl max-h-screen p-10 flex flex-col justify-center">
        <div className="bg-white rounded-lg shadow-sm overflow-y-auto max-h-[80vh] w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b rounded-t border-gray-200">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              <h2 className="text-lg font-semibold text-red-600">{title}</h2>
            </div>
          </div>
          <div className="p-4">
            <p className="mt-2 text-sm text-gray whitespace-pre-line">{description}</p>
            {/* Footer */}
            <div className="mt-6 flex justify-end gap-3">
              <SubmitButton
                onClick={onClose}
                label={`${cancelLabel}`}
                variant="action"
              />
              <SubmitButton
                onClick={handleConfirm}
                label={`${confirmLabel}`}
                isLoading={loading}
                variant="action-primary"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
