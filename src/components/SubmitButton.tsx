// components/SubmitButton.tsx
interface SubmitButtonProps {
  label: string;
  isLoading: boolean;
}

export function SubmitButton({ label, isLoading }: SubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={isLoading}
      className={`w-[380px] h-[44px] bg-[var(--color-primary)] hover:brightness-90 text-white rounded-md text-sm font-semibold ${
        isLoading ? "opacity-70 cursor-not-allowed" : ""
      }`}
    >
      {isLoading ? `${label}...` : label}
    </button>
  );
}
