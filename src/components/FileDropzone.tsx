"use client";
import React, { useState, useCallback } from "react";

interface FileDropzoneProps {
  label: string;
  description?: string;
  accept: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileTypeText: string;
  id?: string;
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({
  label,
  description,
  accept,
  onChange,
  fileTypeText,
  id = "file-upload",
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
      
      // Check if file type matches the accept prop
      const acceptedTypes = accept.split(',').map(type => type.trim());
      const isValidType = acceptedTypes.some(type => {
        if (type.startsWith('.')) {
          return file.name.toLowerCase().endsWith(type.toLowerCase());
        } else if (type.includes('/*')) {
          return file.type.startsWith(type.replace('/*', ''));
        } else {
          return file.type === type;
        }
      });

      if (isValidType) {
        // Create a synthetic event to match the onChange handler
        const syntheticEvent = {
          target: {
            files: files
          }
        } as React.ChangeEvent<HTMLInputElement>;
        
        onChange(syntheticEvent);
      }
    }
  }, [accept, onChange]);

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