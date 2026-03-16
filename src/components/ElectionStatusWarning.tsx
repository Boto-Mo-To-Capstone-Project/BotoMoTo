interface ElectionStatusWarningProps {
  electionStatus: 'DRAFT' | 'ACTIVE' | 'CLOSED' | null;
  context?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionLoading?: boolean;
}

export function ElectionStatusWarning({
  electionStatus,
  context = "configurations",
  actionLabel,
  onAction,
  actionLoading = false,
}: ElectionStatusWarningProps) {
  if (!electionStatus || electionStatus !== 'ACTIVE') return null;

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-500 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-yellow-800">
              This election is currently <span className="font-semibold">ACTIVE</span> and open to the public.
              You cannot edit {context} while the election is running for security and integrity purposes.
            </p>
          </div>
        </div>

        {actionLabel && onAction && (
          <button
            type="button"
            onClick={onAction}
            disabled={actionLoading}
            className={`inline-flex items-center justify-center whitespace-nowrap rounded-md border border-[#7b1c1c] px-4 py-2 text-sm font-semibold text-[#7b1c1c] transition-colors ${
              actionLoading
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-[#7b1c1c] hover:text-white"
            }`}
          >
            {actionLoading ? "Closing..." : actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
