interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  wrapperClassName?: string;
}

export function InputField({
  label,
  wrapperClassName = "",
  className = "",
  ...props
}: InputFieldProps) {
  return (
    <div className={`w-full ${wrapperClassName}`}>
      <label className="block text-sm font-medium text-[var(--color-black)] mb-1">
        {label}
      </label>
      <input
        {...props}
        className={`w-full h-[44px] border border-[var(--color-secondary)] rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)] ${className}`}
      />
    </div>
  );
}
