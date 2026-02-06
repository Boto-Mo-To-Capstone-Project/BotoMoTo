import { useState } from "react";
import { InputField } from "./InputField";
import { EyeIcon, EyeOffIcon } from "lucide-react";

interface PasswordFieldProps {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  autoComplete?: string;
  error?: string;
  className?: string;
}

export const PasswordField = ({
  label,
  value,
  onChange,
  placeholder = "••••••••",
  autoComplete,
  error,
  className,
}: PasswordFieldProps) => {
  const [showPassword, setShowPassword] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="relative w-full">
      <InputField
        label={label}
        type={showPassword ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        error={error}
        className={className}
      />
      <button
        type="button"
        onClick={togglePasswordVisibility}
        className="absolute right-3 top-[38px] text-gray-500 hover:text-gray-700 focus:outline-none"
        aria-label={showPassword ? "Hide password" : "Show password"}
      >
        {showPassword ? (
          <EyeIcon className="h-5 w-5" />
        ) : (
          <EyeOffIcon className="h-5 w-5" />
        )}
      </button>
    </div>
  );
};
