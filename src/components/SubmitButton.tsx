interface SubmitButtonProps {
  label: string;
  isLoading: boolean;
  className?: string; // optional className
  onClick?: React.MouseEventHandler<HTMLButtonElement>; // optional onClick
  type?: 'button' | 'submit' | 'reset'; // optional type
}

export function SubmitButton({ label, isLoading, className = "", onClick, type = "submit" }: SubmitButtonProps) {
  return (
    <button
      type={type}
      disabled={isLoading}
      onClick={onClick}
      className={`w-full max-w-[380px] h-[44px] bg-[var(--color-primary)] hover:brightness-90 text-white rounded-md text-sm font-semibold ${
        isLoading ? "opacity-70 cursor-not-allowed" : ""
      } ${className}`}
    >
      {isLoading ? `${label}...` : label}
    </button>
  );
}

