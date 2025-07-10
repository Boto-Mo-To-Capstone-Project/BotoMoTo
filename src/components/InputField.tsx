interface InputFieldProps {
  label: string;
  type: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
}

export function InputField({
  label,
  type,
  value,
  onChange,
  placeholder,
}: InputFieldProps) {
  return (
    <div className="w-[380px]">
      <label className="block text-sm font-medium text-[var(--color-black)] mb-1 voterlogin-label">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full h-11 border border-secondary rounded-md px-3 text-md focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)]"
      />
    </div>
  );
}
