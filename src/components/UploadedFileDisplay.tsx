"use client";

import { FileText } from 'lucide-react';

interface UploadedFileDisplayProps {
  file: File;
  onDownload?: () => void;
  className?: string;
  isExistingFile?: boolean;
  fileUrl?: string;
  organizationId?: number;
  fileType?: 'logo' | 'letter';
}

export function UploadedFileDisplay({ file, onDownload, className = "", isExistingFile = false, fileUrl, organizationId, fileType }: UploadedFileDisplayProps) {
  const isSample = file.name === "Sample_Letter.pdf";
  const isExisting = isExistingFile || file.name.startsWith("Current_");
  
  let displayName = file.name;
  let downloadUrl = fileUrl;
  
  if (isSample) {
    displayName = "Sample Organization Letter (Template)";
    downloadUrl = "/api/organizations/sample-letter";
  } else if (isExisting && fileUrl && organizationId && fileType) {
    // For existing files, extract filename from the path and use secure API
    const filename = fileUrl.split('/').pop();
    downloadUrl = `/api/organizations/${organizationId}/files/${fileType}/${filename}`;
    displayName = file.name.replace("Current_", "");
  }

  const getFileSize = () => {
    if (isSample) return "Sample File";
    if (isExisting) return "Existing File";
    return file.size > 0 ? `${(file.size / 1024).toFixed(1)} KB` : "0 KB";
  };

  if (isSample || (isExisting && downloadUrl)) {
    // For the sample letter or existing files, clicking anywhere previews and downloads
    return (
      <a
        href={downloadUrl}
        target="_blank"
        rel="noopener noreferrer"
        download
        className={`flex items-center justify-between mt-3 border-2 border-[var(--color-primary)] rounded-xl p-4 text-sm bg-white ${className} cursor-pointer`}
        style={{ textDecoration: "none" }}
        tabIndex={0}
        aria-label={`Preview and Download ${displayName}`}
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
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v10m0 0-4-4m4 4 4-4" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 20h14" />
          </svg>
        </span>
      </a>
    );
  }

  return (
    <div className={`flex items-center justify-between mt-3 border-2 border-[var(--color-primary)] rounded-xl p-4 text-sm bg-white ${className}`}>
      {/* Preview link (icon + name) for sample letter */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[var(--color-primary)]/10">
          <FileText className="w-6 h-6 text-[var(--color-primary)]" />
        </span>
        <div className="flex flex-col min-w-0">
          <span className="font-medium text-gray-900">{displayName}</span>
          <span className="text-xs text-gray-500">{getFileSize()}</span>
        </div>
      </div>
      {/* Download button for sample letter uses API route; for others, uses onDownload */}
      <button
        type="button"
        className="[&>svg]:stroke-[var(--color-primary)] text-[var(--color-primary)] hover:text-[var(--color-primary)] p-2 rounded-full transition-colors ml-2"
        title="Download"
        onClick={onDownload}
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v10m0 0-4-4m4 4 4-4" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 20h14" />
        </svg>
      </button>
    </div>
  );
} 