"use client";
import { useState } from "react";
import { AuthHeading } from "@/components/AuthHeading";
import { InputField } from "@/components/InputField";
import { SubmitButton } from "@/components/SubmitButton";
import {
  PlusIcon,
  PencilSquareIcon,
  ArrowDownTrayIcon,
  FunnelIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

interface ScopeModalProps {    
  open: boolean;
  onClose: () => void;
  onSave: (data: {
    type: string;
    name: string;
    description: string;
    dateBegin: string;
    dateEnd: string;
  }) => void;
}

export function ScopeModal({ open, onClose, onSave }: ScopeModalProps) {
  const [scopingTypes, setScopingTypes] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleAddType = (type: string) => {
    const trimmed = type.trim();
    if (trimmed && !scopingTypes.includes(trimmed)) {
      setScopingTypes([...scopingTypes, trimmed]);
      setInputValue("");
      setDropdownOpen(false);
    }
  };

  const handleRemoveType = (type: string) => {
    setScopingTypes(scopingTypes.filter(t => t !== type));
  };

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm lg:ml-68"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-[95vw] sm:max-w-md md:max-w-lg lg:max-w-xl relative px-4 sm:px-6 pt-8 pb-8 mx-2 sm:mx-4 text-center space-y-6 border border-gray-200 max-h-[90vh] overflow-visible break-words">
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-700"
          onClick={onClose}
        >
          &times;
        </button>
        <AuthHeading title="Scope Form" subtitle="Keep track of, manage, and register scopes — use this form to register a new one." />
        <form
          onSubmit={e => {
            e.preventDefault();
            onSave({
              type: scopingTypes.join(','),
              name,
              description,
              dateBegin: '',
              dateEnd: '',
            });
          }}
          className="flex flex-col gap-4 text-left w-full"
        >
          {/* Tag Input for Scope Types */}
          <div className="mb-4">
            <label className="font-medium block mb-1">Scope Types</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {scopingTypes.map(type => (
                <span key={type} className="flex items-center bg-yellow-100 border border-yellow-400 text-yellow-800 rounded px-2 py-1">
                  {type}
                  <button
                    type="button"
                    className="ml-1 text-yellow-700 hover:text-red-500"
                    onClick={() => handleRemoveType(type)}
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
            <div className="relative flex gap-2 items-end">
              <input
                type="text"
                className="w-full px-4 py-2 border border-yellow-400 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 text-base"
                placeholder="Add or select type"
                value={inputValue}
                onChange={e => {
                  setInputValue(e.target.value);
                  setDropdownOpen(true);
                }}
                onFocus={() => setDropdownOpen(true)}
                onBlur={() => setTimeout(() => setDropdownOpen(false), 100)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddType(inputValue);
                  }
                }}
              />
              {/* Dropdown */}
              {dropdownOpen && (
                <div className="absolute w-full top-full bg-white border border-yellow-400 rounded-md shadow z-10 max-h-40 overflow-auto">
                  {scopingTypes.length === 0 && (
                    <div className="px-4 py-2 text-gray-400">No types yet</div>
                  )}
                  {scopingTypes
                    .filter(type => type.toLowerCase().includes(inputValue.toLowerCase()))
                    .map(type => (
                      <div
                        key={type}
                        className="px-4 py-2 hover:bg-yellow-100 cursor-pointer"
                        onMouseDown={() => handleAddType(type)}
                      >
                        {type}
                      </div>
                    ))}
                </div>
              )}
              <SubmitButton
                label="Add"
                variant="small"
                type="button"
                onClick={() => handleAddType(inputValue)}
              />
            </div>
          </div>
          <InputField label="Scope Name" value={name} onChange={e => setName(e.target.value)} placeholder="Enter your scope name" />
          <InputField label="Scope Description" value={description} onChange={e => setDescription(e.target.value)} placeholder="Enter a description..." textarea={true} rows={3} />
          <div className="flex justify-end gap-2 mt-2">
            <SubmitButton label="Cancel" variant="small-action" type="button" onClick={onClose} />
            <SubmitButton label="Save" variant="small" type="submit" />
          </div>
        </form>
      </div>
    </div>
  );
} 