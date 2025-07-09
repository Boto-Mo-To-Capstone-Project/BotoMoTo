"use client"; // useState only works in client components

import { useState } from "react";
import { Menu, X } from "lucide-react";

import Image from "next/image";

import BotoMoToLogo from "../app/assets/BotoMoToLogo.png";

import NavLink from "@/components/NavLink";
import Button from "@/components/Button";
import { useRouter } from "next/navigation";

type LoginNavbarProps = {
  buttons?: "auth" | "logout" | null;
};

const LoginNavbar: React.FC<LoginNavbarProps> = ({ buttons }) => {
  // declare state of hamburger
  const [isOpen, setIsOpen] = useState(false);

  // sets the toggle to open vice versa
  const toggleMenu = () => setIsOpen(!isOpen);

  const router = useRouter(); // to go to another route

  const handleLogout = () => {
    console.log("Logging out...");
    // Add logout logic here (e.g., clear token, redirect)
  };

  return (
    <nav className="fixed top-0 left-0 w-full h-20 bg-white flex justify-between items-center shadow-sm px-4 md:px-15 z-3">
      <div className="flex gap-10 items-center">
        {/* Logo */}
        <div className="">
          <Image src={BotoMoToLogo} height={50} alt="BotoMoToLogo" />
        </div>
        {/* Desktop Menu */}
        <div>
          <ul className="hidden md:flex gap-6 nav-text">
            <li>
              <NavLink href="/">Home</NavLink>
            </li>
            <li>
              <NavLink href="/public/about-us">About Us</NavLink>
            </li>
            <li>
              <NavLink href="/public/contact">Contact</NavLink>
            </li>
          </ul>
        </div>
      </div>
      {/* Auth & Logout btns */}

      <div className="hidden md:flex space-x-3">
        {buttons === "auth" && (
          <>
            <Button
              variant="short_secondary"
              onClick={() => router.push("/auth/login")}
            >
              Login
            </Button>
            <Button
              variant="short_primary"
              onClick={() => router.push("/auth/signup")}
            >
              Signup
            </Button>
          </>
        )}
        {buttons === "logout" && (
          <Button variant="short_secondary" onClick={handleLogout}>
            Logout
          </Button>
        )}
      </div>
      {/* Hamburger Icon */}
      <button
        className="md:hidden text-gray focus:outline-none"
        onClick={toggleMenu}
        aria-label="Toggle Menu"
      >
        {isOpen ? <X size={28} /> : <Menu size={28} />}
      </button>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="absolute top-20 left-0 w-full bg-white shadow-md md:hidden z-3">
          <ul className="flex flex-col gap-4 p-4 nav-text">
            <li>
              <NavLink href="/">Home</NavLink>
            </li>
            <li>
              <NavLink href="/about">About Us</NavLink>
            </li>
            <li>
              <NavLink href="/contact">Contact</NavLink>
            </li>
            {buttons === "auth" && (
              <>
                <li>
                  <NavLink href="/login">Login</NavLink>
                </li>
                <li>
                  <NavLink href="/signup">Signup</NavLink>
                </li>
              </>
            )}
            {buttons === "logout" && (
              <>
                <li>
                  <NavLink href="/https://www.youtube.com/watch?v=dQw4w9WgXcQ">
                    Logout
                  </NavLink>
                </li>
              </>
            )}
          </ul>
        </div>
      )}
    </nav>
  );
};

export default LoginNavbar;
