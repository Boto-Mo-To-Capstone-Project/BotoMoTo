import React from "react";

type InputFieldProps = (
  ({ textarea?: false } & React.InputHTMLAttributes<HTMLInputElement>) |
  ({ textarea: true; rows?: number } & React.TextareaHTMLAttributes<HTMLTextAreaElement>)
) & {
  label: string;
  wrapperClassName?: string;
  error?: string;
};

export function InputField(props: InputFieldProps) {
  const { label, wrapperClassName = "", className = "", textarea = false, error, ...rest } = props;
  
  const hasError = !!error;
  const borderColor = hasError 
    ? "border-red-500 focus:ring-red-500" 
    : "border-[var(--color-secondary)] focus:ring-[var(--color-secondary)]";
  
  return (
    <div className={`w-full ${wrapperClassName}`}>
      <label className="block text-sm font-medium text-[var(--color-black)] mb-1">
        {label}
      </label>
      <div className="relative group">
        {textarea ? (
          <textarea
            {...(rest as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
            rows={"rows" in props ? props.rows : undefined}
            className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 resize-none transition-colors ${borderColor} ${className}`}
          />
        ) : (
          <input
            {...(rest as React.InputHTMLAttributes<HTMLInputElement>)}
            className={`w-full h-[44px] border rounded-md px-3 text-sm focus:outline-none focus:ring-2 transition-colors ${borderColor} ${className}`}
          />
        )}
        {hasError && (
          <>
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            {/* Tooltip that appears on hover and focus */}
            <div className="absolute left-0 top-full mt-1 px-3 py-2 bg-red-600 text-white text-sm rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible group-focus-within:opacity-100 group-focus-within:visible transition-all duration-200 z-10 max-w-xs whitespace-normal">
              {error}
              {/* Tooltip arrow */}
              <div className="absolute -top-1 left-4 w-2 h-2 bg-red-600 transform rotate-45"></div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
