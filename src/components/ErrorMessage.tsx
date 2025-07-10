// components/ErrorMessage.tsx
interface ErrorMessageProps {
  message: string;
}

export function ErrorMessage({ message }: ErrorMessageProps) {
  return <div className="text-red-500 text-sm mb-4">{message}</div>;
}
