"use client";

import { useState } from 'react';
import { FileText } from 'lucide-react';
import { MdRemove } from 'react-icons/md';
import FileViewer from './FileViewer';

interface UploadedFileDisplayProps {
  file: File;
  onRemove?: () => void;
  className?: string;
  isExistingFile?: boolean;
  fileUrl?: string;
  organizationId?: number;
  fileType?: 'logo' | 'letter';
  objectKey?: string;
}

export function UploadedFileDisplay({ file, onRemove, className = "", isExistingFile = false, fileUrl, organizationId, fileType, objectKey }: UploadedFileDisplayProps) {
  const [showViewer, setShowViewer] = useState(false);
  
  const isSample = file.name === "Sample_Letter.pdf" || file.name === "Sample_Email_Template.html";
  const isExisting = isExistingFile || file.name.startsWith("Current_");
  
  let displayName = file.name;
  let viewUrl = fileUrl;
  
  if (isSample) {
    if (file.name === "Sample_Letter.pdf") {
      displayName = "Sample Organization Letter (Template)";
      viewUrl = "/api/organizations/sample-letter";
    } else if (file.name === "Sample_Email_Template.html") {
      displayName = "Sample Email Template";
      viewUrl = "/assets/sample/email-template.html";
    }
  } else if (isExisting && objectKey) {
    // For existing files, use the secure file serving API with object key
    viewUrl = `/api/files/${objectKey}`;
    displayName = file.name.replace("Current_", "");
  } else if (isExisting && fileUrl) {
    // Fallback: if we have fileUrl but no objectKey (legacy)
    // Assume fileUrl is actually the object key
    viewUrl = `/api/files/${fileUrl}`;
    displayName = file.name.replace("Current_", "");
  } else if (fileUrl) {
    // For newly uploaded files, they might already have blob URLs or direct URLs
    viewUrl = fileUrl;
  }

  const handleView = () => {
    setShowViewer(true);
  };

  const getFileSize = () => {
    if (isSample) return "Sample File";
    if (isExisting) return "Existing File";
    return file.size > 0 ? `${(file.size / 1024).toFixed(1)} KB` : "0 KB";
  };

  if (isSample) {
    // For sample files, use FileViewer for preview
    return (
      <>
        <div
          className={`flex items-center justify-between mt-3 border-2 border-[var(--color-primary)] rounded-xl p-4 text-sm bg-white ${className} cursor-pointer`}
          onClick={handleView}
          tabIndex={0}
          aria-label={`View ${displayName}`}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[var(--color-primary)]/10">
              <FileText className="w-6 h-6 text-[var(--color-primary)]" />
            </span>
            <div className="flex flex-col min-w-0">
              <span className="font-medium text-gray-900">{displayName}</span>
              <span className="text-xs text-gray-500">{getFileSize()}</span>
            </div>
          </div>
          <span className="[&>svg]:stroke-[var(--color-primary)] text-[var(--color-primary)] hover:text-[var(--color-primary)] p-2 rounded-full transition-colors ml-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.639 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.639 0-8.573-3.007-9.963-7.178z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </span>
        </div>
        
        {/* FileViewer Modal for samples */}
        {showViewer && viewUrl && (
          <FileViewer
            fileUrl={viewUrl}
            fileName={displayName}
            onClose={() => setShowViewer(false)}
            title={`View ${displayName}`}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div className={`mt-4 flex items-center justify-between p-2 bg-gray-100 rounded-md shadow-sm ${className}`}>
        <div 
          className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
          onClick={handleView}
        >
          <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[var(--color-primary)]/10">
            <FileText className="w-6 h-6 text-[var(--color-primary)]" />
          </span>
          <div className="flex flex-col min-w-0">
            <span className="font-medium text-[var(--color-black)] truncate">{displayName}</span>
            <span className="text-xs text-[var(--color-gray)]">{getFileSize()}</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="text-[var(--color-primary)] hover:text-[var(--color-primary-dark)] p-2 rounded transition"
            title="View File"
            onClick={handleView}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.639 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.639 0-8.573-3.007-9.963-7.178z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          {onRemove && (
            <button
              onClick={onRemove}
              className="ml-1 p-1 rounded-md hover:bg-gray-200 transition"
              aria-label={`Remove ${displayName}`}
            >
              <MdRemove />
            </button>
          )}
        </div>
      </div>

      {/* FileViewer Modal */}
      {showViewer && viewUrl && (
        <FileViewer
          fileUrl={viewUrl}
          fileName={displayName}
          onClose={() => setShowViewer(false)}
          title={`View ${displayName}`}
        />
      )}
    </>
  );
} 