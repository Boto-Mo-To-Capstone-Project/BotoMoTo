"use client";

import { usePathname } from "next/navigation";
import DefaultNavbar from "@/components/DefaultNavbar";
import LoginNav from "@/components/LoginNavbar";

const NavbarWrapper = () => {
  const pathname = usePathname();

  if (
    [
      "/auth/login",
      "/auth/signup",
      "/auth/forgotpassword",
      "/auth/forgotpasswordOTP",
    ].includes(pathname)
  ) {
    return <LoginNav buttons="auth" />;
  }

  if (["/organization/welcome", "/organization/create"].includes(pathname)) {
    return <LoginNav buttons="logout" />;
  }

  if (pathname === "/" || pathname.startsWith("/voter")) {
    return <DefaultNavbar />;
  }

  // Else → don't render navbar
  return null;
};

export default NavbarWrapper;
