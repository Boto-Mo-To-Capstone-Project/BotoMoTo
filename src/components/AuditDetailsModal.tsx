"use client";

import { useMemo, useState } from "react";
import { AuthHeading } from "@/components/AuthHeading";
import { SubmitButton } from "@/components/SubmitButton";

interface AuditDetailsModalProps {
  open: boolean;
  onClose: () => void;
  audit: any | null; // Shape: { id, actorId, actorRole, action, ipAddress, userAgent, resource, resourceId, timestamp, details }
}

export default function AuditDetailsModal({ open, onClose, audit }: AuditDetailsModalProps) {
  const [showRaw, setShowRaw] = useState(false);

  const details = useMemo<any>(() => {
    return (audit?.details as any) || {};
  }, [audit]);

  const actorName = audit?.actorName || details?.actor?.name || "—";
  const actorEmail = audit?.actorEmail || details?.actor?.email || "—";
  const actorRole = audit?.actorRole || details?.actor?.role || "—";
  const action = audit?.action || details?.operation || "—";
  const resource = audit?.resource || details?.resource?.type || "—";
  const resourceId = audit?.resourceId || details?.resource?.id || "—";
  const ipAddress = audit?.ipAddress || details?.client?.ip || "—";
  const userAgent = audit?.userAgent || details?.client?.userAgent || "—";
  const timestamp = audit?.timestamp || details?.timestamp || "";

  if (!open || !audit) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm lg:ml-68"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-[95vw] sm:max-w-md md:max-w-2xl lg:max-w-3xl relative px-4 sm:px-6 pt-8 pb-6 mx-2 sm:mx-4 text-left space-y-6 border border-gray-200 overflow-y-auto max-h-[90vh] overflow-x-hidden break-words">
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-700"
          onClick={onClose}
          aria-label="Close"
        >
          &times;
        </button>

        <AuthHeading title="Audit Details" subtitle="Review the full context of this audit entry." />

        {/* Summary grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <DetailItem label="Action" value={action} badge />
          <DetailItem label="Actor Role" value={String(actorRole)} />
          <DetailItem label="Actor Name" value={String(actorName)} />
          <DetailItem label="Actor Email" value={String(actorEmail)} />
          <DetailItem label="Resource" value={String(resource)} />
          <DetailItem label="Resource ID" value={String(resourceId || "—")} />
          <DetailItem label="IP Address" value={String(ipAddress)} />
          <DetailItem label="User Agent" value={String(userAgent)} long />
          <DetailItem label="Timestamp" value={timestamp ? new Date(timestamp).toLocaleString() : "—"} />
        </section>

        {/* Optional message */}
        {details?.message && (
          <section>
            <h4 className="text-sm font-semibold text-gray-700 mb-1">Message</h4>
            <p className="text-sm text-gray-800 whitespace-pre-wrap">{String(details.message)}</p>
          </section>
        )}

        {/* Changed fields */}
        {details?.changedFields && typeof details.changedFields === "object" && (
          <section>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Changed Fields</h4>
            <div className="space-y-2">
              {Object.entries(details.changedFields as Record<string, { old: any; new: any }>).map(([field, vals]) => (
                <div key={field} className="p-3 border rounded-md bg-gray-50">
                  <div className="text-xs font-semibold text-gray-600">{field}</div>
                  <div className="text-sm text-gray-800">
                    <span className="text-gray-600">Old:</span> {formatValue(vals?.old)}
                  </div>
                  <div className="text-sm text-gray-800">
                    <span className="text-gray-600">New:</span> {formatValue(vals?.new)}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* New data */}
        {details?.newData && typeof details.newData === "object" && (
          <section>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">New Data</h4>
            <div className="space-y-2">
              {Object.entries(details.newData as Record<string, any>).map(([key, val]) => (
                <div key={key} className="p-3 border rounded-md bg-gray-50">
                  <div className="text-xs font-semibold text-gray-600">{key}</div>
                  <div className="text-sm text-gray-800">{formatValue(val)}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Deletion type */}
        {details?.deletionType && (
          <section>
            <h4 className="text-sm font-semibold text-gray-700 mb-1">Deletion Type</h4>
            <p className="text-sm text-gray-800">{String(details.deletionType)}</p>
          </section>
        )}

        {/* Raw toggle */}
        <section className="border-t pt-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-gray-700">Raw JSON</h4>
            <button
              className="text-sm text-indigo-600 hover:text-indigo-700"
              onClick={() => setShowRaw((s) => !s)}
            >
              {showRaw ? "Hide" : "Show"}
            </button>
          </div>
          {showRaw && (
            <pre className="text-xs whitespace-pre-wrap p-3 bg-gray-50 border rounded-md overflow-auto max-h-72">
              {JSON.stringify(details, null, 2)}
            </pre>
          )}
        </section>

        <div className="flex justify-end gap-2">
          <SubmitButton label="Close" variant="small-action" type="button" onClick={onClose} />
        </div>
      </div>
    </div>
  );
}

function formatValue(val: any) {
  if (val === null || val === undefined) return "—";
  if (typeof val === "string" || typeof val === "number" || typeof val === "boolean") return String(val);
  try {
    return JSON.stringify(val);
  } catch {
    return String(val);
  }
}

function DetailItem({ label, value, badge, long }: { label: string; value: string; badge?: boolean; long?: boolean }) {
  return (
    <div className="space-y-1 min-w-0">
      <div className="text-xs font-semibold text-gray-600">{label}</div>
      {badge ? (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
          {value}
        </span>
      ) : (
        <div className={`text-sm text-gray-800 ${long ? "break-words" : "truncate"}`} title={value}>
          {value || "—"}
        </div>
      )}
    </div>
  );
}
