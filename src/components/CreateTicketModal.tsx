"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { SubmitButton } from "@/components/SubmitButton";

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
      className="fixed inset-0 z-[200] flex justify-center items-center bg-black/30 backdrop-blur-sm lg:ml-68"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative max-w-2xl max-h-screen p-10 flex flex-col justify-center w-full">
        <div className="bg-white rounded-lg shadow-sm overflow-y-auto max-h-[80vh]">
          {/* Modal header */}
          <div className="flex items-center justify-between p-4 border-b rounded-t border-gray-200">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Create Ticket</h3>
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
                Create a new support ticket for assistance.
              </p>

            {/* Form */}
            <form
              onSubmit={handleSubmit}
              className="grid gap-4 mb-4 grid-cols-1"
            >
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject*
                </label>
                <input
                  type="text"
                  className="w-full border border-[var(--color-secondary)] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-[var(--color-secondary)] bg-white text-gray-900"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Enter ticket subject"
                  disabled={submitting}
                  required
                  maxLength={50}
                />
              </div>
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message*
                </label>
                <textarea
                  className="w-full border border-[var(--color-secondary)] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-[var(--color-secondary)] bg-white text-gray-900"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your issue or request"
                  disabled={submitting}
                  required
                  rows={4}
                />
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
                  label={submitting ? "Creating" : "Create"}
                  className="px-5 py-2.5 text-sm font-medium rounded-lg"
                  isLoading={submitting}
                />
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}