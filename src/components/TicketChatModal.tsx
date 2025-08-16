"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { FiSend, FiPaperclip, FiX } from "react-icons/fi";
import { io } from "socket.io-client";

const socket = io("http://localhost:3000"); // Use your server URL

interface TicketChatModalProps {
  open: boolean;
  onClose: () => void;
  ticket: any;
  currentUserRole: "ADMIN" | "SUPER_ADMIN";
}

export default function TicketChatModal({
  open,
  onClose,
  ticket,
  currentUserRole,
}: TicketChatModalProps) {
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [localMessages, setLocalMessages] = useState<any[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  // WebSockets
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

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Reset input when modal opens
  useEffect(() => {
    if (open) {
      setReply("");
      setLocalMessages([]);
      setFile(null);
      setPreviewUrl(null);
    }
  }, [open, ticket]);

  // Close enlarged image when escape key is pressed
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setEnlargedImage(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!open || !ticket) return null;

  const orgName = ticket.organization?.name || "Unknown Org";
  const subject = ticket.subject || "No subject";
  const isResolved = (ticket.status || ticket.Status || "").toString().toUpperCase() === "RESOLVED";

  // Normalize role for all comparisons
  const normalizedRole = (role: string) => 
    role ? role.toUpperCase().replace(" ", "_") : "";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);

    // Create preview for images
    if (selectedFile.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const removeFile = () => {
    setFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  // Send reply to backend and update local messages
  const handleSendMessage = async () => {
    if ((!reply.trim() && !file) || sending) return;
    setSending(true);
    
    try {
      // Always send sender in uppercase for backend compatibility
      const sender = normalizedRole(currentUserRole);
      
      // Create message object
      const messageObj: any = {
        content: reply,
        sender,
        timestamp: new Date().toISOString(),
      };

      // Handle file attachment
      if (file) {
        try {
          // Convert file to base64
          const base64Data = await fileToBase64(file);
          
          messageObj.fileData = {
            name: file.name,
            type: file.type,
            size: file.size,
            data: base64Data, // Include base64 data
          };
        } catch (fileError) {
          console.error("File conversion error:", fileError);
        }
      }

      const res = await fetch(`/api/tickets/${ticket.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageObj
        }),
      });
      
      if (!res.ok) throw new Error("Failed to send reply");
      
      // Update local messages for instant UI feedback
      setLocalMessages([
        ...messages,
        messageObj
      ]);
      
      // Emit via websocket
      socket.emit("newMessage", {
        ticketId: ticket.id,
        message: messageObj
      });
      
      // Clear inputs
      setReply("");
      setFile(null);
      setPreviewUrl(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      // Optionally show error to user
      console.error("Error sending message:", err);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-gray-100 rounded-xl shadow-xl w-full max-w-md relative px-0 pb-2 mx-2 text-left border border-gray-200 overflow-hidden max-h-[90vh] flex flex-col">
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 z-10"
          onClick={onClose}
          aria-label="Close"
        >
          &times;
        </button>

        {/* Header - updated to match Chat.tsx */}
        <div className="bg-secondary p-4 border-b text-black">
          <div className="text-lg font-bold text-gray-900">{subject}</div>
          <div className="text-sm text-gray-600">{orgName}</div>
        </div>
        
        {/* Messages container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length > 0 ? (
            messages.map((msg: any, idx: number) => {
              let content = "";
              let sender = "";
              let timestamp = new Date();
              let fileData = null;
              
              if (typeof msg === "string") {
                try {
                  const parsed = JSON.parse(msg);
                  content = parsed.content || msg;
                  sender = parsed.sender || "";
                  timestamp = parsed.timestamp ? new Date(parsed.timestamp) : new Date();
                  fileData = parsed.fileData;
                } catch {
                  content = msg;
                }
              } else if (typeof msg === "object" && msg !== null) {
                content = msg.content || "";
                sender = msg.sender || "";
                timestamp = msg.timestamp ? new Date(msg.timestamp) : new Date();
                fileData = msg.fileData;
              }
              
              const isCurrentUser = normalizedRole(sender) === normalizedRole(currentUserRole);
              
              return (
                <div
                  key={idx}
                  className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[80%] rounded-lg p-3 ${
                    isCurrentUser
                      ? "bg-primary text-white rounded-br-none" // Updated color
                      : "bg-gray-200 text-gray-800 rounded-bl-none"
                  }`}>
                    {fileData && (
                      <div className="mb-2">
                        {fileData.type?.startsWith("image/") && fileData.data && (
                          <img
                            src={fileData.data}
                            alt={fileData.name || "Attachment"}
                            className="max-h-64 rounded cursor-pointer hover:opacity-90"
                            onClick={() => setEnlargedImage(fileData.data)}
                          />
                        )}
                        {fileData.type?.startsWith("video/") && fileData.data && (
                          <video controls className="max-h-64 rounded">
                            <source src={fileData.data} type={fileData.type} />
                            Your browser does not support the video tag.
                          </video>
                        )}
                        {(!fileData.type?.startsWith("image/") && !fileData.type?.startsWith("video/") && fileData.name) && (
                          <div className="p-2 bg-gray-100 rounded text-gray-800">
                            <p className="text-sm truncate">{fileData.name}</p>
                            {fileData.data && (
                              <a
                                href={fileData.data}
                                download={fileData.name}
                                className="text-blue-500 text-sm hover:underline"
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                Download
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    <p className="whitespace-pre-wrap">{content}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-gray-400 text-sm text-center">No messages found.</div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area - only show if not resolved */}
        {!isResolved ? (
          <div className="border-t border-gray-300 p-3 bg-white">
            {previewUrl && (
              <div className="relative mb-2 max-w-xs">
                <img src={previewUrl} alt="Preview" className="rounded max-h-32" />
                <button
                  onClick={removeFile}
                  className="absolute top-1 right-1 bg-gray-800 text-white rounded-full p-1"
                >
                  <FiX size={16} />
                </button>
              </div>
            )}
            {file && !previewUrl && (
              <div className="flex items-center justify-between bg-gray-100 rounded p-2 mb-2">
                <span className="text-sm truncate">{file.name}</span>
                <button
                  onClick={removeFile}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <FiX size={18} />
                </button>
              </div>
            )}
            <div className="flex items-end gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-gray-500 hover:text-gray-700"
                disabled={sending}
              >
                <FiPaperclip size={20} color="#800000" /> {/* Updated color */}
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/*,video/*"
                disabled={sending}
              />
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Reply here..."
                className="flex-1 border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-primary resize-none" // Updated focus color
                rows={1}
                disabled={sending}
              />
              <button
                onClick={handleSendMessage}
                disabled={(!reply.trim() && !file) || sending}
                className="p-2 bg-primary text-white rounded-lg hover:bg-red-800 disabled:bg-gray-400 disabled:cursor-not-allowed" // Updated colors
              >
                <FiSend size={20} />
              </button>
            </div>
          </div>
        ) : (
          <div className="border-t px-2 py-3 bg-gray-50 text-center text-gray-400 text-sm">
            This ticket is resolved. No further replies allowed.
          </div>
        )}
      </div>

      {/* Image Viewer Overlay - unchanged */}
      {enlargedImage && (
        <div 
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80"
          onClick={() => setEnlargedImage(null)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]">
            <button
              className="absolute top-4 right-4 text-white text-xl bg-black/50 rounded-full h-10 w-10 flex items-center justify-center hover:bg-black/70"
              onClick={() => setEnlargedImage(null)}
            >
              &times;
            </button>
            <img 
              src={enlargedImage} 
              alt="Enlarged view" 
              className="max-w-full max-h-[90vh] object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
