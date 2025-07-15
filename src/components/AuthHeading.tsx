import { ReactNode } from "react";

interface AuthHeadingProps {
  title: string | ReactNode;
  subtitle: string;
}

export function AuthHeading({ title, subtitle }: AuthHeadingProps) {
  return (
    <div>
      <p className="text-2xl font-semibold text-[var(--color-black)]">{title}</p>
      <p className="text-sm text-[var(--color-gray)]">{subtitle}</p>
    </div>
  );
}