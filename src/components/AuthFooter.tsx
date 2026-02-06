// components/AuthFooter.tsx
interface AuthFooterProps {
  question: string;
  link: string;
  linkText: string;
}

export function AuthFooter({ question, link, linkText }: AuthFooterProps) {
  return (
    <p className="text-sm text-[var(--color-gray)]">
      {question}{" "}
      <a href={link} className="text-[var(--color-primary)] font-medium hover:underline">
        {linkText}
      </a>
    </p>
  );
}