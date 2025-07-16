"use client"; // usePathname only works on client components

import Link from "next/link";
import { usePathname } from "next/navigation";

const NavLink = ({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) => {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={`hover:brightness-110 ${
        isActive ? "text-primary" : "nav-text"
      }`}
    >
      {children}
    </Link>
  );
};

const NavButton = ({
  onClick,
  children,
  className = "",
  href,
}: {
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  href?: string;
}) => {
  const pathname = usePathname();
  const isActive = href ? pathname === href : false;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`hover:brightness-110 ${isActive ? "text-primary" : "nav-text"} ${className}`}
    >
      {children}
    </button>
  );
};

export { NavButton };
export default NavLink;
