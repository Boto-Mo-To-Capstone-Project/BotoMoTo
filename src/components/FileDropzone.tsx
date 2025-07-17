"use client";
import React from "react";

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
}) => (
  <div className="w-full max-w-[380px]">
    <label className="block text-sm font-medium text-[var(--color-black)] mb-1">
      {label}
    </label>
    {description && (
      <p className="text-xs text-[var(--color-gray)] mb-2">{description}</p>
    )}
    <div
      className="w-full border-2 border-dashed border-gray-300 rounded-md flex flex-col items-center justify-center py-8 text-sm text-[var(--color-gray)] hover:bg-gray-50 transition cursor-pointer"
      onClick={() => {
        const input = document.getElementById(id) as HTMLInputElement | null;
        if (input) input.click();
      }}
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