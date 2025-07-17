import { ReactNode } from 'react';

interface SubmitButtonProps {
  label: string;
  variant?: 'primary' | 'tab' | 'action' | 'small' | 'small-action';
  isActive?: boolean; // for tab highlighting
  isLoading?: boolean;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  type?: 'button' | 'submit' | 'reset';
  icon?: ReactNode; // for action buttons
  title?: string; // for action buttons
}

export function SubmitButton({
  label,
  variant = 'primary',
  isActive = false,
  isLoading = false,
  className = '',
  onClick,
  type = 'submit',
  icon,
  title
}: SubmitButtonProps) {
  let base = 'transition-colors focus:outline-none font-semibold';
  let styles = '';
  if (variant === 'primary') {
    styles = `w-full max-w-[380px] h-[44px] bg-[var(--color-primary)] hover:brightness-90 text-white rounded-md text-sm ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`;
  } else if (variant === 'tab') {
    styles = `w-[90px] h-[44px] md:h-10 flex items-center justify-center text-base rounded-none ${isActive ? 'text-[var(--color-primary)] bg-white' : 'text-gray-700 bg-gray-50 hover:bg-gray-100'} border-0`;
  } else if (variant === 'action') {
    styles = `p-2 bg-white border border-gray-200 rounded hover:bg-gray-100 flex items-center justify-center`;
  } else if (variant === 'small') {
    styles = `w-[80px] h-[40px] flex items-center justify-center rounded bg-[var(--color-primary)] text-white text-sm hover:brightness-90`;
  } else if (variant === 'small-action') {
    styles = `w-[80px] h-[40px] flex items-center justify-center rounded bg-white border border-gray-300 text-gray-700 text-sm hover:bg-gray-100`;
  }
  return (
    <button
      type={type}
      disabled={isLoading}
      onClick={onClick}
      className={`${base} ${styles} ${className}`}
      title={title}
    >
      {icon && (
        label ? (
          <span className="mr-1 flex items-center">{icon}</span>
        ) : (
          <span className="flex items-center justify-center w-full h-full">{icon}</span>
        )
      )}
      {isLoading ? `${label}...` : label}
    </button>
  );
}

