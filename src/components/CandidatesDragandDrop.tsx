"use client";
import React, { useState, useCallback } from "react";
import { FiDownload } from "react-icons/fi";
import { MdDocumentScanner, MdRemove } from "react-icons/md";
import { SubmitButton } from "./SubmitButton";
interface DragandDropdownProps {
  open: boolean;
  onClose: () => void;
  label: string;
  description?: string;
  accept: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileTypeText: string;
  id?: string;
  maxSizeMB?: number;
}

export const DragandDropdown: React.FC<DragandDropdownProps> = ({
  open,
  onClose,
  label,
  description,
  accept,
  onChange,
  fileTypeText,
  id = "file-upload",
  maxSizeMB = 5,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];

      // File size validation
      const maxSizeBytes = maxSizeMB * 1024 * 1024;
      const isValidSize = file.size <= maxSizeBytes;

      if (!isValidSize) {
        alert(`File too large: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)}MB). Max: ${maxSizeMB}MB`);
        return;
      }

      // Check if file type matches the accept prop
      const acceptedTypes = accept.split(',').map(type => type.trim());
      const isValidType = acceptedTypes.some(type => {
        if (type.startsWith('.')) {
          return file.name.toLowerCase().endsWith(type.toLowerCase());
        } else if (type.includes('/*')) {
          const mimeCategory = type.replace('/*', '');
          return file.type.startsWith(mimeCategory + '/');
        } else {
          return file.type === type;
        }
      });

      if (isValidType) {
        setSelectedFile(file);
        const syntheticEvent = {
          target: { files: files }
        } as React.ChangeEvent<HTMLInputElement>;
        onChange(syntheticEvent);
      } else {
        alert(`Invalid file type: ${file.name} (${file.type}). Accepted: ${accept}`);
      }
    }
  }, [accept, onChange, maxSizeMB]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
    onChange(e);
  };

  const handleClick = () => {
    const input = document.getElementById(id) as HTMLInputElement | null;
    if (input) input.click();
  };

  const handleRemove = () => setSelectedFile(null);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-center items-center bg-black/30 backdrop-blur-sm lg:ml-68"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative max-w-md w-full p-6 flex flex-col justify-center">
        <div className="bg-white rounded-lg shadow-sm overflow-y-auto max-h-[80vh]">
          {/* Modal header */}
          <div className="flex items-center justify-between p-4 border-b rounded-t border-gray-200">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{label}</h3>
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
            {description && (
              <p className="text-sm text-gray-500 mb-4">{description}</p>
            )}

            {/* Drag and Drop UI FIRST */}
            <div
              className={`w-full border-2 border-dashed rounded-md flex flex-col items-center justify-center py-8 text-sm text-[var(--color-gray)] transition cursor-pointer ${
                isDragOver 
                  ? 'border-[var(--color-primary)] bg-blue-50' 
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
              onClick={handleClick}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              tabIndex={0}
              role="button"
              aria-label={label}
            >
              <div className="flex flex-col items-center justify-center w-full">
                <MdDocumentScanner size={40} className="mb-2 text-gray-400" />
                <div>Click to upload or drag and drop</div>
                <div className="text-xs text-gray-400 mt-1">{fileTypeText}</div>
              </div>
              <input
                type="file"
                accept={accept}
                onChange={handleInputChange}
                className="hidden"
                id={id}
              />
            </div>

            {/* Sample File UI BELOW */}
            {!selectedFile ? (
              <div className="border-2 border-[var(--color-primary)] rounded-lg p-3 flex items-center gap-3 mb-6 mt-6">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                  <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[var(--color-primary)] leading-tight">
                    Sample Organization Letter (Template)
                  </div>
                  <div className="text-xs text-gray-500">Sample File</div>
                </div>
                <a
                  href="/assets/sample/candidates.csv"
                  download
                  className="text-[var(--color-primary)] hover:text-[var(--color-primary-dark)] p-2 rounded transition"
                  title="Download sample"
                >
                  <FiDownload size={20} />
                </a>
              </div>
            ) : (
              <div className="mt-4 flex items-center justify-between p-2 bg-gray-100 rounded-md shadow-sm">
                <div className="flex-1 truncate">
                  <span className="font-medium text-[var(--color-black)]">{selectedFile.name}</span>
                  <span className="text-xs text-[var(--color-gray)] ml-1">
                    {selectedFile.size > 1024 * 1024
                      ? `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB`
                      : `${(selectedFile.size / 1024).toFixed(1)} KB`}
                  </span>
                </div>
                <button
                  onClick={handleRemove}
                  className="ml-2 p-1 rounded-md hover:bg-gray-200 transition"
                  aria-label={`Remove ${selectedFile.name}`}
                >
                  <MdRemove />
                </button>
              </div>
            )}
            <div className="col-span-1 sm:col-span-2 flex justify-end gap-2 mt-2">
                <SubmitButton
                  type="button"
                  variant="action"
                  onClick={onClose}
                  label="Cancel"
                />
                <SubmitButton
                  type="submit"
                  variant="small"
                  label={"Import"}
                  className="px-5 py-2.5 text-sm font-medium rounded-lg"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
  );
};