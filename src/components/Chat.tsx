"use client";
import { useState, useRef, useEffect } from "react";
import { FiSend, FiPaperclip, FiX } from "react-icons/fi";

type Message = {
  id: string;
  text: string;
  sender: "user" | "other";
  timestamp: Date;
  file?: {
    url: string;
    type: "image" | "video" | "other";
    name: string;
  };
};

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = () => {
    if (!inputText.trim() && !file) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: "user",
      timestamp: new Date(),
    };

    if (file) {
      const fileType = file.type.split("/")[0] as "image" | "video";
      newMessage.file = {
        url: URL.createObjectURL(file),
        type: fileType === "image" || fileType === "video" ? fileType : "other",
        name: file.name,
      };
    }

    setMessages([...messages, newMessage]);
    setInputText("");
    setFile(null);
    setPreviewUrl(null);
  };

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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-gray-100">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Chat header */}
        <div className="bg-secondary text-black p-4 rounded-xl">
          <h1 className="text-xl font-bold">
            You are messaging.. paki lagay ng id dito...
          </h1>
        </div>
        {/* Messages container */}
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.sender === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-xs md:max-w-md lg:max-w-lg rounded-lg p-3 ${
                message.sender === "user"
                  ? "bg-primary text-white rounded-br-none"
                  : "bg-gray-200 text-gray-800 rounded-bl-none"
              }`}
            >
              {message.file && (
                <div className="mb-2">
                  {message.file.type === "image" && (
                    <img
                      src={message.file.url}
                      alt={message.file.name}
                      className="max-h-64 rounded"
                    />
                  )}
                  {message.file.type === "video" && (
                    <video controls className="max-h-64 rounded">
                      <source src={message.file.url} type={file?.type} />
                      Your browser does not support the video tag.
                    </video>
                  )}
                  {message.file.type === "other" && (
                    <div className="p-2 bg-gray-100 rounded">
                      <p className="text-sm truncate">{message.file.name}</p>
                      <a
                        href={message.file.url}
                        download={message.file.name}
                        className="text-blue-500 text-sm hover:underline"
                      >
                        Download
                      </a>
                    </div>
                  )}
                </div>
              )}
              <p className="whitespace-pre-wrap">{message.text}</p>
              <p className="text-xs opacity-70 mt-1">
                {message.timestamp.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-gray-300 p-4 bg-white">
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
          >
            <FiPaperclip size={20} color="#800000" />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden "
            accept="image/*,video/*"
          />
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            rows={1}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputText.trim() && !file}
            className="p-2 bg-primary text-white rounded-lg hover:bg-red-800 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            <FiSend size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
