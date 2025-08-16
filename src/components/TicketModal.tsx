"use client";

import React, { useMemo, useState, useRef, useEffect } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:3000"); // Use your server URL

// Add currentUserRole prop
interface TicketModalProps {
  open: boolean;
  onClose: () => void;
  ticket: any;
  currentUserRole: "ADMIN" | "SUPER_ADMIN";
}

export default function TicketModal({
  open,
  onClose,
  ticket,
  currentUserRole,
}: TicketModalProps) {
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [localMessages, setLocalMessages] = useState<any[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Parse messages from ticket or use local state if updated
  const messages = useMemo(() => {
    if (localMessages.length > 0) return localMessages;
    if (!ticket) return [];
    try {
      if (Array.isArray(ticket.messages)) return ticket.messages;
      if (typeof ticket.messages === "string") return JSON.parse(ticket.messages);
    } catch {
      return [];
    }
    return [];
  }, [ticket, localMessages]);

  //WebSockets
  useEffect(() => {
  if (!open || !ticket) return;

  // Join the ticket room
  socket.emit("joinTicket", ticket.id);

  // Listen for new messages
  socket.on("messageReceived", (message) => {
    setLocalMessages((prev) => [...prev, message]);
  });

  // Cleanup on close/unmount
  return () => {
    socket.emit("leaveTicket", ticket.id);
    socket.off("messageReceived");
  };
}, [open, ticket]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.value = "";
      setReply("");
      setLocalMessages([]);
    }
  }, [open, ticket]);

  if (!open || !ticket) return null;

  const orgName = ticket.organization?.name || "Unknown Org";
  const subject = ticket.subject || "No subject";
  const isResolved =
    (ticket.status || ticket.Status || "").toString().toUpperCase() === "RESOLVED";

  // Normalize role for all comparisons
  const normalizedRole = (role: string) =>
  role ? role.toUpperCase().replace(" ", "_") : "";

  
  // Placeholder for both roles
  const replyPlaceholder = "Reply here...";

  // Send reply to backend and update local messages
  const handleReply = async () => {
    if (!reply.trim()) return;
    setSending(true);
    try {
      // Always send sender in uppercase for backend compatibility
      const sender = normalizedRole(currentUserRole);

      const res = await fetch(`/api/tickets/${ticket.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: {
            content: reply,
            sender,
            timestamp: new Date().toISOString(),
          },
        }),
      });
      if (!res.ok) throw new Error("Failed to send reply");
      setLocalMessages([
        ...messages,
        { content: reply, sender, timestamp: new Date().toISOString() },
      ]);
     
        // ...after successful POST...
        socket.emit("newMessage", {
        ticketId: ticket.id,
        message: {
        content: reply,
        sender,
        timestamp: new Date().toISOString(),
          },
      });
      setReply("");
      if (inputRef.current) inputRef.current.value = "";
    } catch (err) {
      // Optionally show error to user
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md relative px-0 pt-8 pb-2 mx-2 text-left border border-gray-200 overflow-y-auto max-h-[90vh] flex flex-col">
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-700"
          onClick={onClose}
          aria-label="Close"
        >
          &times;
        </button>

        {/* Subject */}
        <div className="text-lg font-bold mb-1 text-gray-900 px-6">{subject}</div>
        {/* Organization Name */}
        <div className="text-sm text-gray-600 mb-4 px-6">{orgName}</div>

        {/* Chat Messages */}
        <div className="flex-1 flex flex-col gap-2 px-4 pb-2 overflow-y-auto">
          {messages.length > 0 ? (
            messages.map((msg: any, idx: number) => {
              // ...existing code for message parsing and alignment...
              let content = "";
              let sender = "";
              if (typeof msg === "string") {
                try {
                  const parsed = JSON.parse(msg);
                  content = parsed.content || msg;
                  sender = parsed.sender || "";
                } catch {
                  content = msg;
                  sender = "";
                }
              } else if (typeof msg === "object" && msg !== null) {
                content = msg.content || "";
                sender = msg.sender || "";
              }
              const isCurrentUser =
                normalizedRole(sender) === normalizedRole(currentUserRole);
              return (
                <div
                  key={idx}
                  className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}
                >
                  <div className="px-4 py-2 rounded-2xl max-w-[80%] shadow-sm bg-gray-100 text-gray-900">
                    {content}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-gray-400 text-sm">No messages found.</div>
          )}
        </div>

        {/* Reply Field - only show if not resolved */}
        {!isResolved && (
          <div className="flex items-center border-t px-2 py-3 bg-gray-50 gap-2">
            <input
              ref={inputRef}
              className="flex-1 border-none outline-none bg-transparent px-3 py-2 text-sm"
              placeholder="Reply here..."
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              disabled={sending}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleReply();
                }
              }}
            />
            <button
              className="px-5 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300 font-semibold"
              onClick={handleReply}
              disabled={sending || !reply.trim()}
              style={{ minWidth: 80 }}
            >
              Send
            </button>
          </div>
        )}
        {/* If resolved, show a notice */}
        {isResolved && (
          <div className="border-t px-2 py-3 bg-gray-50 text-center text-gray-400 text-sm">
            This ticket is resolved. No further replies allowed.
          </div>
        )}
      </div>
    </div>
  );
}