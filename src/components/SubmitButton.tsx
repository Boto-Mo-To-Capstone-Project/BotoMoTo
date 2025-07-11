interface SubmitButtonProps {
  label: string;
  isLoading: boolean;
  className?: string; // optional className
}

export function SubmitButton({ label, isLoading, className = "" }: SubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={isLoading}
      className={`w-full max-w-[380px] h-[44px] bg-[var(--color-primary)] hover:brightness-90 text-white rounded-md text-sm font-semibold ${
        isLoading ? "opacity-70 cursor-not-allowed" : ""
      } ${className}`} // allow external styles
    >
      {isLoading ? `${label}...` : label}
    </button>
  );
}

