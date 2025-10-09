"use client";
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { FiChevronDown, FiFilter, FiX } from "react-icons/fi";

interface FilterOption {
  value: string;
  label: string;
}

interface Filter {
  key: string;
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
}

interface FilterToolbarProps {
  filters: Filter[];
  onClearAll?: () => void;
  className?: string;
  buttonText?: string;
}

export function FilterToolbar({
  filters,
  onClearAll,
  className = "",
  buttonText = "Filters"
}: FilterToolbarProps) {
  const [open, setOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  // Count active filters (not "all")
  const activeFiltersCount = filters.filter(f => f.value !== "all").length;

  // Calculate dropdown position
  const updateDropdownPosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const dropdownWidth = 320;
      const isMd = window.innerWidth >= 768; // Tailwind's md breakpoint

      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: isMd
          ? rect.right + window.scrollX - dropdownWidth // align to right 
          : rect.left + window.scrollX, // align to left when md+
        width: rect.width,
      });
    }
  };

  // Close on outside click or escape
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          buttonRef.current && !buttonRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const handleResize = () => {
      if (open) updateDropdownPosition();
    };
    
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEsc);
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize);
    
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEsc);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize);
    };
  }, [open]);

  // Update position when opening
  useEffect(() => {
    if (open) {
      updateDropdownPosition();
    }
  }, [open]);

  const handleClearAll = () => {
    filters.forEach(filter => {
      if (filter.value !== "all") {
        filter.onChange("all");
      }
    });
    onClearAll?.();
  };

  return (
    <>
      <div className={`relative ${className}`}>
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setOpen(o => !o)}
          className={`flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-300 text-sm font-medium text-gray-700 ${activeFiltersCount > 0 ? 'border-orange-300 bg-orange-50 text-orange-700' : ''}`}
        >
          <FiFilter size={16} />
          {buttonText}
          {activeFiltersCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-orange-200 text-orange-800 rounded-full">
              {activeFiltersCount}
            </span>
          )}
          <FiChevronDown className={`transition-transform ${open ? 'rotate-180' : ''}`} size={16} />
        </button>
      </div>

      {open && typeof window !== 'undefined' && createPortal(
        <div
          ref={dropdownRef}
          className={`fixed bg-white border border-gray-200 rounded-lg shadow-xl z-[9999] flex flex-col transition-all duration-200
            ${window.innerWidth < 414 
              ? 'w-[90%] max-w-sm left-1/2 -translate-x-1/2' 
              : 'w-80'}
          `}
          style={{
            top: `${dropdownPosition.top}px`,
            left: window.innerWidth >= 414 ? `${dropdownPosition.left}px` : undefined,
          }}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800">Filter Options</p>
              {activeFiltersCount > 0 && (
                <p className="text-xs text-gray-500">{activeFiltersCount} filter(s) active</p>
              )}
            </div>
            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="text-xs text-orange-600 hover:text-orange-700 font-medium flex items-center gap-1"
              >
                <FiX size={12} />
                Clear All
              </button>
            )}
          </div>

          {/* Filter list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {filters.map((filter) => (
              <div key={filter.key} className="space-y-2">
                <label className="text-sm font-medium text-gray-700 block">
                  {filter.label}
                </label>
                <select
                  value={filter.value}
                  onChange={(e) => filter.onChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-300"
                >
                  {filter.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {/* Footer actions */}
          <div className="border-t border-gray-100 p-3">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-full px-3 py-2 text-sm rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium"
            >
              Apply Filters
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
