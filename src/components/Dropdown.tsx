"use client";

import { useState } from "react";

type DropdownProps = {
  label: string;
  options: string[];
  onSelect?: (value: string) => void;
};

const Dropdown = ({ label, options, onSelect }: DropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const handleSelect = (option: string) => {
    setSelected(option);
    setIsOpen(false);
    onSelect?.(option);
  };

  const handleReset = () => {
    setSelected(null);
    setIsOpen(false);
  };

  return (
    <div className="w-64 relative">
      <label className="block mb-2 voter-election-desc">
        <strong>{label}</strong>
      </label>
      <button
        type="button"
        className="w-full bg-white border border-gray-300 rounded-lg shadow-sm px-4 py-2 text-left focus:outline-none focus:ring-2 focus:ring-blue-500"
        onClick={() => setIsOpen(!isOpen)}
      >
        {selected || "Select an option"}
        <span className="float-right">&#9662;</span>
      </button>

      {isOpen && (
        <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          <li className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-gray-500 border-b border-gray-200" onClick={handleReset} >
            Clear selection
          </li>
          {options.map((option) => (
            <li
              key={option}
              className="px-4 py-2 hover:bg-blue-100 cursor-pointer"
              onClick={() => handleSelect(option)}
            >
              {option}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Dropdown;
