import React from "react";

type InputFieldProps = (
  ({ textarea?: false } & React.InputHTMLAttributes<HTMLInputElement>) |
  ({ textarea: true; rows?: number } & React.TextareaHTMLAttributes<HTMLTextAreaElement>)
) & {
  label: string;
  wrapperClassName?: string;
};

export function InputField(props: InputFieldProps) {
  const { label, wrapperClassName = "", className = "", textarea = false, ...rest } = props;
  return (
    <div className={`w-full ${wrapperClassName}`}>
      <label className="block text-sm font-medium text-[var(--color-black)] mb-1">
        {label}
      </label>
      {textarea ? (
        <textarea
          {...(rest as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
          rows={"rows" in props ? props.rows : undefined}
          className={`w-full border border-[var(--color-secondary)] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)] resize-none ${className}`}
        />
      ) : (
        <input
          {...(rest as React.InputHTMLAttributes<HTMLInputElement>)}
          className={`w-full h-[44px] border border-[var(--color-secondary)] rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)] ${className}`}
        />
      )}
    </div>
  );
}
