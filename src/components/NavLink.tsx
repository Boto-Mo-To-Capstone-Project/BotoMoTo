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

export default NavLink;
