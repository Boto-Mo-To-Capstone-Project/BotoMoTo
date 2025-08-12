"use client";

import { useState, useEffect } from "react";
import CreatableSelect from "react-select/creatable";

interface ScopeTypeOption {
  label: string;
  value: string;
}

interface ScopeTypeSelectProps {
  /** CSS class prefix for styling the select component */
  classNamePrefix?: string;
  /** Placeholder text shown when no option is selected */
  placeholder?: string;
  /** Available scope type options */
  options?: ScopeTypeOption[];
  /** Whether the select can be cleared */
  isClearable?: boolean;
  /** Custom styles for the select component */
  styles?: any;
  /** Currently selected value */
  value?: ScopeTypeOption | null;
  /** Callback when selection changes */
  onChange?: (option: ScopeTypeOption | null) => void;
  /** Callback when user creates a new option */
  onCreateOption?: (inputValue: string) => void;
}

/**
 * A client-side only scope type select component that prevents hydration mismatches.
 * Uses the same design system as InputField for consistency.
 */
export function ScopeTypeSelect(props: ScopeTypeSelectProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Show loading placeholder during SSR to prevent hydration mismatch
  // Uses same classes as InputField for consistency
  if (!isMounted) {
    return (
      <div 
        className="w-full h-[44px] border border-[var(--color-secondary)] rounded-md px-3 bg-[var(--color-white)] text-sm text-[var(--color-gray)] flex items-center focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)] transition-colors"
        role="combobox"
        aria-expanded="false"
      >
        {props.placeholder || "Loading scope types..."}
      </div>
    );
  }

  // Simplified styles that leverage your design system
  // This approach is more consistent with how InputField works
  const designSystemStyles = {
    control: (provided: any, state: any) => ({
      ...provided,
      minHeight: 44,
      height: 44,
      border: `1px solid var(--color-secondary)`,
      borderRadius: 6,
      fontSize: 'var(--text-sm)',
      boxShadow: state.isFocused ? '0 0 0 2px var(--color-secondary)' : 'none',
      '&:hover': { borderColor: 'var(--color-secondary)' },
      transition: 'all 0.2s ease-in-out',
    }),
    valueContainer: (provided: any) => ({ 
      ...provided, 
      padding: "0 12px", // Same as InputField px-3
      height: 44,
    }),
    input: (provided: any) => ({ 
      ...provided, 
      margin: 0, 
      padding: 0,
      fontSize: 'var(--text-sm)',
    }),
    indicatorsContainer: (provided: any) => ({ 
      ...provided, 
      height: 44 
    }),
    placeholder: (provided: any) => ({ 
      ...provided, 
      color: "var(--color-gray)",
      fontSize: 'var(--text-sm)',
    }),
    singleValue: (provided: any) => ({ 
      ...provided, 
      color: "var(--color-black)",
      fontSize: 'var(--text-sm)',
    }),
    menu: (provided: any) => ({ 
      ...provided, 
      zIndex: 50,
      border: `1px solid var(--color-secondary)`,
      borderRadius: 6,
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    }),
    menuList: (provided: any) => ({
      ...provided,
      padding: 0,
    }),
    option: (provided: any, state: any) => ({
      ...provided,
      fontSize: 'var(--text-sm)',
      padding: '8px 12px',
      backgroundColor: state.isSelected 
        ? 'var(--color-secondary)' 
        : state.isFocused 
        ? '#f9fafb' // Very light gray for hover
        : 'var(--color-white)',
      color: 'var(--color-black)',
      cursor: 'pointer',
      '&:hover': {
        backgroundColor: state.isSelected ? 'var(--color-secondary)' : '#f9fafb',
      },
    }),
    noOptionsMessage: (provided: any) => ({
      ...provided,
      fontSize: 'var(--text-sm)',
      color: 'var(--color-gray)',
      padding: '8px 12px',
    }),
  };

  // Merge with any custom styles passed as props
  const finalStyles = {
    ...designSystemStyles,
    ...props.styles,
  };

  return <CreatableSelect {...props} styles={finalStyles} />;
}
