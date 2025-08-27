"use client";
import { useState, useEffect, useRef } from "react";
import { FiChevronDown, FiEye, FiUpload, FiSettings } from "react-icons/fi";

interface TemplateToolbarProps {
  selectedTemplate: string;
  availableTemplates: string[];
  onTemplateChange: (template: string) => void;
  onPreview: () => void;
  onUpload: () => void;
  onManage: () => void;
  className?: string;
}

export function TemplateToolbar({
  selectedTemplate,
  availableTemplates,
  onTemplateChange,
  onPreview,
  onUpload,
  onManage,
  className = ""
}: TemplateToolbarProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const formatTemplateName = (templateName: string) => {
    return templateName
      .replace(/-/g, ' ')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  // Close on outside click or escape
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, []);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-300 text-sm font-medium text-gray-700"
      >
        Email Template
        <FiChevronDown className={`transition-transform ${open ? 'rotate-180' : ''}`} size={16} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-72 sm:w-80 max-h-[420px] overflow-hidden bg-white border border-gray-200 rounded-lg shadow-xl z-50 flex flex-col">
          {/* Header / current selection */}
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Current Template</p>
            <p className="text-sm font-medium text-gray-800 truncate">{formatTemplateName(selectedTemplate)}</p>
          </div>

            {/* Template list */}
            <div className="flex-1 overflow-y-auto">
              <div className="px-4 pt-3 pb-2 text-xs font-semibold text-gray-500">Select Template</div>
              <ul className="max-h-48 overflow-y-auto px-2 pb-2">
                {availableTemplates.length === 0 && (
                  <li className="text-xs text-gray-400 px-3 py-2">No templates available</li>
                )}
                {availableTemplates.map(t => {
                  const active = t === selectedTemplate;
                  return (
                    <li key={t}>
                      <button
                        type="button"
                        onClick={() => { onTemplateChange(t); }}
                        className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md text-left text-sm transition-colors ${active ? 'bg-orange-50 text-orange-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                      >
                        <span className="truncate">{formatTemplateName(t)}</span>
                        {active && <span className="w-2 h-2 rounded-full bg-orange-500" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="border-t border-gray-100" />

            {/* Actions */}
            <div className="p-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => { setOpen(false); onPreview(); }}
                className="flex items-center justify-center gap-1 px-3 py-2 text-xs sm:text-sm rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100"
                title="Preview Template"
              >
                <FiEye size={14} /> Preview
              </button>
              <button
                type="button"
                onClick={() => { setOpen(false); onUpload(); }}
                className="flex items-center justify-center gap-1 px-3 py-2 text-xs sm:text-sm rounded-md bg-green-50 text-green-700 hover:bg-green-100"
                title="Upload Template"
              >
                <FiUpload size={14} /> Upload
              </button>
              <button
                type="button"
                onClick={() => { setOpen(false); onManage(); }}
                className="col-span-2 flex items-center justify-center gap-1 px-3 py-2 text-xs sm:text-sm rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200"
                title="Manage Templates"
              >
                <FiSettings size={14} /> Manage Templates
              </button>
            </div>
        </div>
      )}
    </div>
  );
}
