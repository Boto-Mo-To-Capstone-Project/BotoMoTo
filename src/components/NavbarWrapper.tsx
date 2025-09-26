"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import DefaultNavbar from "@/components/DefaultNavbar";
import LoginNav from "@/components/LoginNavbar";

const NavbarWrapper = () => {
  const pathname = usePathname();
  const [isAdminContext, setIsAdminContext] = useState(false);
  const [isSuperAdminContext, setIsSuperAdminContext] = useState(false);

  // Check admin context on mount and pathname changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsAdminContext(sessionStorage.getItem("adminContext") === "true");
      setIsSuperAdminContext(sessionStorage.getItem("superAdminContext") === "true");
    }
  }, [pathname]);

  if (
    [
      "/auth/login",
      "/auth/signup",
      "/auth/forgot-password",
      "/auth/forgot-password/otp",
    ].includes(pathname)
  ) {
    return <LoginNav buttons="auth" />;
  }

  if (["/admin/onboard", "/admin/onboard/create-org", "/admin/onboard/processing", "/admin/onboard/success"].includes(pathname)) {
    return <LoginNav buttons="logout" />;
  }

  // If on voter routes from admin context, don't show any navbar
  if (pathname.startsWith("/voter") && (isAdminContext || isSuperAdminContext) ) {
    return null;
  }

  // Show default navbar for public routes and regular voter routes
  if (pathname === "/" || pathname === "/public/about-us" || pathname === "/public/contact" || pathname.startsWith("/voter")) {
    return <DefaultNavbar />;
  }

  // Else → don't render navbar
  return null;
};

export default NavbarWrapper;
