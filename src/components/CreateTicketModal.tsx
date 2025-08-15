"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";

interface CreateTicketModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
  tickets?: any[];
}

export default function CreateTicketModal({
  open,
  onClose,
  onCreated,
  tickets = [],
}: CreateTicketModalProps) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [orgId, setOrgId] = useState<number | null>(null);

  // Extract orgId from tickets if available
  useEffect(() => {
    if (open) {
      if (tickets.length > 0 && tickets[0]._original?.organization?.id) {
        setOrgId(tickets[0]._original.organization.id);
      } else {
        // fallback: fetch from /api/users (returns own user info for admin)
      fetch("/api/users")
        .then((res) => res.json())
        .then((data) => {
          // For admin, user info is in data.data.user
          setOrgId(
            data?.data?.user?.organization?.id ||
            null
            );
          });
      }
    }
  }, [open, tickets]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      toast.error("Subject and message are required.");
      return;
    }
    if (!orgId) {
      toast.error("Organization not found.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          subject,
          messages: [
            {
              content: message,
              sender: "ADMIN",
              timestamp: new Date().toISOString(),
            },
          ],
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.message || "Failed to create ticket.");
        return;
      }
      toast.success("Ticket created!");
      setSubject("");
      setMessage("");
      onClose();
      if (onCreated) onCreated();
    } catch (err) {
      toast.error("Failed to create ticket.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form
        className="bg-white rounded-xl shadow-xl w-full max-w-md relative px-0 pt-8 pb-2 mx-2 text-left border border-gray-200 overflow-y-auto max-h-[90vh] flex flex-col"
        onSubmit={handleSubmit}
      >
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-700"
          onClick={onClose}
          type="button"
          aria-label="Close"
        >
          &times;
        </button>
        <div className="text-lg font-bold mb-1 text-gray-900 px-6">Create Ticket</div>
        <div className="flex flex-col gap-3 px-6 py-4">
          <label className="text-sm font-semibold text-gray-700">
            Subject
            <input
              className="w-full mt-1 px-3 py-2 border rounded bg-gray-50"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={submitting}
              required
              maxLength={50}
            />
          </label>
          <label className="text-sm font-semibold text-gray-700">
            Message
            <textarea
              className="w-full mt-1 px-3 py-2 border rounded bg-gray-50"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={submitting}
              required
              rows={4}
            />
          </label>
        </div>
        <div className="flex justify-end gap-2 px-6 pb-4">
          <button
            type="button"
            className="px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 font-semibold"
            disabled={submitting}
          >
            {submitting ? "Creating..." : "Create"}
          </button>
        </div>
      </form>
    </div>
  );
}