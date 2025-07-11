"use client";

interface AuthButtonsProps {
  onCancel?: () => void;
  onSave?: () => void;
  saveLabel?: string;
  isLoading?: boolean;
  cancelLabel?: string;
  className?: string;
}

export function AuthButtons({
  onCancel,
  onSave,
  saveLabel = "Save",
  isLoading = false,
  cancelLabel = "Cancel",
  className = ""
}: AuthButtonsProps) {
  return (
    <div className={`flex justify-end gap-3 w-full ${className}`}>
      <button
        type="button"
        onClick={onCancel}
        className="w-20 h-10 border border-gray-300 rounded-md text-sm hover:bg-gray-50 transition-colors"
      >
        {cancelLabel}
      </button>
      <button
        type="submit"
        onClick={onSave}
        disabled={isLoading}
        className={`w-16 h-10 bg-[var(--color-primary)] text-white rounded-md text-sm font-semibold hover:brightness-90 transition-colors ${
          isLoading ? "opacity-70 cursor-not-allowed" : ""
        }`}
      >
        {isLoading ? `${saveLabel}...` : saveLabel}
      </button>
    </div>
  );
} 