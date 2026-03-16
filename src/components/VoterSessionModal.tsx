"use client";

import { SubmitButton } from "./SubmitButton";

type SessionDetails = {
  sessionToken: string;
  lastActiveAt: string | Date;
  expires: string | Date;
};

type VoterSessionModalProps = {
  open: boolean;
  voterName: string;
  session: SessionDetails | null;
  onClose: () => void;
  onTerminate: () => Promise<void> | void;
  isTerminating?: boolean;
};

const formatDateTime = (value: string | Date) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
};

const truncateToken = (token: string) => {
  if (!token) return "—";
  if (token.length <= 18) return token;
  return `${token.slice(0, 8)}...${token.slice(-6)}`;
};

export default function VoterSessionModal({
  open,
  voterName,
  session,
  onClose,
  onTerminate,
  isTerminating = false,
}: VoterSessionModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg bg-white rounded-lg shadow border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Live Session Details</h2>
          <p className="text-sm text-gray-600 mt-1">{voterName}</p>
        </div>

        <div className="px-5 py-4 space-y-3">
          <div className="text-sm">
            <span className="font-medium text-gray-700">Session Token:</span>{" "}
            <span className="font-mono text-xs text-gray-800">
              {session ? truncateToken(session.sessionToken) : "No active session"}
            </span>
          </div>
          <div className="text-sm">
            <span className="font-medium text-gray-700">Last Active At:</span>{" "}
            <span className="text-gray-800">
              {session ? formatDateTime(session.lastActiveAt) : "—"}
            </span>
          </div>
          <div className="text-sm">
            <span className="font-medium text-gray-700">Expiry Time:</span>{" "}
            <span className="text-gray-800">
              {session ? formatDateTime(session.expires) : "—"}
            </span>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-gray-200 flex justify-end gap-3">
          <SubmitButton label="Close" onClick={onClose} variant="action" />
          {session && (
            <SubmitButton
              label="Terminate Session"
              onClick={onTerminate}
              variant="action-primary"
              isLoading={isTerminating}
            />
          )}
        </div>
      </div>
    </div>
  );
}
