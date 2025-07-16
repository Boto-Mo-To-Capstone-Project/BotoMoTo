"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import BotoMoToLogo from "@/app/assets/BotoMoToLogo_light.png";
import {
  LayoutDashboard,
  ListChecks,
  Ticket,
  ShieldCheck,
  ClipboardList,
  X,
  Menu,
  Users,
  BadgeAlert,
} from "lucide-react";

const SuperAdminSidebar = () => {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

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

  return (
    <>
      {/* Hamburger button - mobile only */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 text-primary"
        onClick={() => setIsOpen(true)}
      >
        <Menu className="w-8 h-8" />
      </button>

      {/* Overlay */}
      <div
        className={`
          fixed inset-0 bg-black transition-opacity duration-300
          ${
            isOpen
              ? "opacity-50 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          }
          lg:hidden
        `}
        onClick={() => setIsOpen(false)}
      ></div>

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full min-h-screen w-68 bg-primary px-4 py-6 space-y-5
          transform transition-transform duration-300 z-50
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0 lg:static lg:flex-shrink-0
        `}
      >
        {/* Mobile close button */}
        <div className="flex justify-between items-center lg:hidden">
          <Image src={BotoMoToLogo} height={45} alt="BotoMoToLogo" />
          <button onClick={() => setIsOpen(false)}>
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
                className={`
                  flex items-center gap-2 sidebar-items p-2 rounded
                  ${
                    isActive
                      ? "bg-white text-primary"
                      : "hover:font-semibold text-white"
                  }
                `}
                onClick={() => setIsOpen(false)}
              >
                <Icon className="h-5 w-5" />
                <span>{link.name}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
};

export default SuperAdminSidebar;
