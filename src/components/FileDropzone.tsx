"use client";
import React, { useState, useCallback } from "react";

interface FileDropzoneProps {
  label: string;
  description?: string;
  accept: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileTypeText: string;
  id?: string;
  maxSizeMB?: number; // Optional max file size in MB
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({
  label,
  description,
  accept,
  onChange,
  fileTypeText,
  id = "file-upload",
  maxSizeMB = 5, // Default 5MB limit
}) => {
  const [isDragOver, setIsDragOver] = useState(false);

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
        console.warn(`File too large: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)}MB). Max: ${maxSizeMB}MB`);
        return;
      }

      // Check if file type matches the accept prop
      const acceptedTypes = accept.split(',').map(type => type.trim());
      const isValidType = acceptedTypes.some(type => {
        if (type.startsWith('.')) {
          // Check by file extension
          return file.name.toLowerCase().endsWith(type.toLowerCase());
        } else if (type.includes('/*')) {
          // Handle MIME type patterns like "image/*" (FIXED: was missing '/')
          const mimeCategory = type.replace('/*', '');
          return file.type.startsWith(mimeCategory + '/');
        } else {
          // Check exact MIME type match
          return file.type === type;
        }
      });

      // Additional validation for images (fallback for browsers that don't set MIME types properly)
      const isImageUpload = accept.includes('image');
      const hasImageExtension = isImageUpload && /\.(jpg|jpeg|png|gif|bmp|webp|svg|tiff|ico|avif)$/i.test(file.name);
      const hasImageMimeType = file.type.startsWith('image/');

      if (isValidType || (isImageUpload && (hasImageExtension || hasImageMimeType))) {
        // Create a synthetic event to match the onChange handler
        const syntheticEvent = {
          target: { files: files }
        } as React.ChangeEvent<HTMLInputElement>;
        
        // Clear the input value to allow re-uploading the same file
        const input = document.getElementById(id) as HTMLInputElement | null;
        if (input) input.value = '';
        
        onChange(syntheticEvent);
      } else {
        console.warn(`Invalid file type: ${file.name} (${file.type}). Accepted: ${accept}`);
      }
    }
  }, [accept, onChange, maxSizeMB]);

  const handleClick = () => {
    const input = document.getElementById(id) as HTMLInputElement | null;
    if (input) input.click();
  };

  return (
    <div className="w-full max-w-[380px]">
      <label className="block text-sm font-medium text-[var(--color-black)] mb-1">
        {label}
      </label>
      {description && (
        <p className="text-xs text-[var(--color-gray)] mb-2">{description}</p>
      )}
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
        <div className="text-center">
          <div className="text-2xl mb-2">📄</div>
          <div>Click to upload or drag and drop</div>
          <div className="text-xs text-gray-400 mt-1">{fileTypeText}</div>
        </div>
        <input
          type="file"
          accept={accept}
          onChange={onChange}
          className="hidden"
          id={id}
        />
      </div>
    </div>
  );
}; 