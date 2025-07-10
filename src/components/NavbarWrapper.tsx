"use client";

import { usePathname } from "next/navigation";
import DefaultNavbar from "@/components/DefaultNavbar";
import LoginNav from "@/components/LoginNavbar";

type LoginNavButtonsType = "auth" | "logout" | null; // types of login nav

const NavbarWrapper = () => {
  const pathname = usePathname();

  // Decide which nav to render
  let NavComponent: React.FC<{ buttons?: LoginNavButtonsType }> = DefaultNavbar; // initial value
  let loginNavButtons: LoginNavButtonsType = null;

  if (
    // if these are the routes then dsplay auth loginnav
    [
      "/auth/login",
      "/auth/signup",
      "/auth/forgotpassword",
      "/auth/forgotpasswordOTP",
    ].includes(pathname)
  ) {
    NavComponent = LoginNav;
    loginNavButtons = "auth"; // show Login/Signup buttons
  } else if (
    // if these are the routes then dsplay logout loginnav
    ["/organization/welcome", "/organization/create"].includes(pathname)
  ) {
    NavComponent = LoginNav;
    loginNavButtons = "logout"; // show Logout button
    // if these are the routes then dsplay default navbar
  } else if (pathname === "/" || pathname.startsWith("/voter")) {
    NavComponent = DefaultNavbar;
  } else {
    NavComponent = DefaultNavbar;
  }

  return <NavComponent buttons={loginNavButtons} />;
};

export default NavbarWrapper;
