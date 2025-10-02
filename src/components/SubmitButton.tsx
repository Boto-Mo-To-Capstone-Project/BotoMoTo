import { ReactNode } from 'react';

interface SubmitButtonProps {
  label: string;
  variant?: 'primary' | 'tab' | 'action' | 'small' | 'small-action' | 'action-primary'| 'action-primary-2'; // <-- added 'action-primary'
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
  const base = 'transition-colors focus:outline-none font-semibold';
  let styles = '';
  if (variant === 'primary') {
    styles = `w-full max-w-[380px] h-[44px] bg-[var(--color-primary)] hover:brightness-90 text-white rounded-[8px] text-sm ${isLoading ? 'opacity-70 cursor-not-allowed' : ''} hover:border-primary-700`;
  } else if (variant === 'tab') {
    styles = `w-[90px] h-[44px] md:h-10 flex items-center justify-center text-base rounded-none ${isActive ? 'text-[var(--color-primary)] bg-white' : 'text-gray-700 bg-gray-50 hover:bg-gray-100'} border-0 hover:border-primary-700`;
  } else if (variant === 'action') {
    styles = `p-2 bg-white border-2 border-gray-200 rounded-[8px] flex items-center justify-center hover:border-gray-800 hover:bg-gray-500 hover:text-white`;
  } else if (variant === 'action-primary') {
    styles = "p-2 bg-white border-2 border-[var(--color-primary,#b91c1c)] text-[var(--color-primary,#b91c1c)] fill-[var(--color-primary,#b91c1c)] rounded-[8px] flex items-center justify-center hover:bg-[var(--color-primary,#b91c1c)] hover:text-white hover:fill-white";
  } else if (variant === 'action-primary-2') {
    styles = "p-2 border-2 bg-primary text-white rounded-[8px] flex items-center justify-center hover:bg-white hover:text-primary hover:border-2 hover:border-primary";
  } else if (variant === 'small') {
    styles = `p-2 bg-white border-2 border-[var(--color-primary,#b91c1c)] text-[var(--color-primary,#b91c1c)] text-base rounded-[8px] flex items-center justify-center hover:bg-[var(--color-primary,#b91c1c)] hover:text-white`;
  } else if (variant === 'small-action') {
    styles = `w-[80px] h-[40px] flex items-center justify-center rounded-[8px] bg-white border border-gray-300 text-gray-700 text-sm hover:bg-gray-100 hover:border-primary-700`;
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

