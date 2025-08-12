"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import BotoMoToLogo from "@/app/assets/BotoMoToLogo_light.png";
import {
  LayoutDashboard,
  ListChecks,
  ShieldCheck,
  ClipboardList,
  X,
  Users,
  BadgeAlert,
  LogOut,
} from "lucide-react";
import { useLogout } from "@/hooks/useLogout";

type SuperAdminSidebarProps = {
  variant?: "default";
  open?: boolean;
  onClose?: () => void;
};

const SuperAdminSidebar = ({
  variant = "default",
  open = false,
  onClose,
}: SuperAdminSidebarProps) => {
  const pathname = usePathname();
  const handleLogout = useLogout();
  const links = [
    {
      name: "Dashboard",
      href: "/superadmin/dashboard",
      icon: LayoutDashboard,
    },
    {
      name: "Organization Requests",
      href: "/superadmin/dashboard/organization-requests",
      icon: Users,
    },
    {
      name: "Elections",
      href: "/superadmin/dashboard/elections",
      icon: ListChecks,
    },
    {
      name: "Tickets",
      href: "/superadmin/dashboard/tickets",
      icon: BadgeAlert,
    },
    {
      name: "Audits",
      href: "/superadmin/dashboard/audits",
      icon: ShieldCheck,
    },
    {
      name: "Survey",
      href: "/superadmin/dashboard/survey",
      icon: ClipboardList,
    },
  ];

  const displayName = "Super Admin!!";
  const displayEmail = "superadminmoto@gmail.com";
  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/50 transition-opacity duration-300 ${
          open
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        } lg:hidden`}
        onClick={onClose}
        aria-label="Close sidebar overlay"
      ></div>

      {/* Sidebar */}
      <aside
        className={`overflow-y-auto scrollbar-hidden fixed top-0 left-0 h-full w-full bg-primary px-4 py-6 space-y-5 transform transition-transform duration-300 z-[101] ${
          open ? "translate-x-0" : "-translate-x-full"
        } lg:w-68 lg:max-w-none lg:translate-x-0 flex flex-col`}
        aria-label="Sidebar navigation"
      >
        {/* Mobile close button */}
        <div className="flex justify-between items-center lg:hidden">
          <Image src={BotoMoToLogo} height={45} alt="BotoMoToLogo" />
          <button onClick={onClose} aria-label="Close sidebar">
            <X className="w-8 h-8 text-white" />
          </button>
        </div>

        {/* Desktop logo */}
        <div className="hidden lg:block">
          <Image src={BotoMoToLogo} height={45} alt="BotoMoToLogo" />
        </div>

        {/* Links */}
        <nav className="space-y-2">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 sidebar-items p-2 rounded ${
                  isActive
                    ? "bg-white text-primary"
                    : "hover:font-semibold text-white"
                }`}
                onClick={onClose}
              >
                <Icon className="h-5 w-5" />
                <span>{link.name}</span>
              </Link>
            );
          })}
        </nav>
        {/* Logout Section */}
        <div className="flex items-start justify-between mt-auto">
          <div>
            <p className="text-white text-sm">{displayName}</p>
            <p className="text-white text-sm">{displayEmail}</p>
          </div>

          <button onClick={handleLogout} className="cursor-pointer text-white">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </aside>
    </>
  );
};

export default SuperAdminSidebar;
