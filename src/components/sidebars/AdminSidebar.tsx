"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import BotoMoToLogo from "@/app/assets/BotoMoToLogo_light.png";
import {
  LayoutDashboard,
  ListChecks,
  PlusCircle,
  Ticket,
  User,
  X,
  Menu,
  BadgeAlert,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

type AdminSidebarProps = {
  variant: "default" | "selectedElection";
  electionId?: string;
};

const AdminSidebar = ({ variant, electionId }: AdminSidebarProps) => {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [showManage, setShowManage] = useState(false);

  const defaultLinks = [
    { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    {
      name: "All Elections",
      href: "/admin/dashboard/elections",
      icon: ListChecks,
    },
    {
      name: "Create Election",
      href: "/admin/dashboard/elections/create",
      icon: PlusCircle,
    },
    {
      name: "Tickets",
      href: "/admin/dashboard/elections/tickets",
      icon: BadgeAlert,
    },
    {
      name: "Profile",
      href: "/admin/dashboard/elections/profile",
      icon: User,
    },
  ];

  const setupLinks = [
    "Overview",
    "Scope",
    "Parties",
    "Voters",
    "Positions",
    "Candidates",
  ].map((sub) => ({
    name: sub,
    href: `/admin/dashboard/elections/${electionId}/setup/${sub.toLowerCase()}`,
  }));

  const manageLinks = [
    "Overview",
    "Security",
    "Ballot Preview",
    "Live Results",
    "Election Status",
  ].map((sub) => ({
    name: sub,
    href: `/admin/dashboard/elections/${electionId}/manage/${sub
      .toLowerCase()
      .replace(" ", "-")}`,
  }));

  return (
    <>
      {/* Hamburger button - mobile only */}
      <div className="lg:hidden flex items-center h-20 px-4 w-full bg-white shadow-sm fixed top-0 left-0 z-[100]">
        <button
          className="text-primary bg-white rounded-full p-2 shadow-md"
          onClick={() => setIsOpen(true)}
          aria-label="Open sidebar"
        >
          <Menu className="w-8 h-8" />
        </button>
      </div>

      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/50 transition-opacity duration-300 ${
          isOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        } lg:hidden`}
        onClick={() => setIsOpen(false)}
        aria-label="Close sidebar overlay"
      ></div>

      {/* Sidebar */}
      <aside
        className={`overflow-y-auto scrollbar-hidden fixed top-0 left-0 h-full min-h-screen w-full max-w-xs bg-primary px-4 py-6 space-y-5 transform transition-transform duration-300 z-[101] ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 lg:flex-shrink-0 lg:w-68 lg:max-w-none`}
        aria-label="Sidebar navigation"
      >
        {/* Mobile close button */}
        <div className="flex justify-between items-center lg:hidden">
          <Image src={BotoMoToLogo} height={45} alt="BotoMoToLogo" />
          <button onClick={() => setIsOpen(false)} aria-label="Close sidebar">
            <X className="w-8 h-8 text-white" />
          </button>
        </div>

        {/* Desktop logo */}
        <div className="hidden lg:block">
          <Image src={BotoMoToLogo} height={45} alt="BotoMoToLogo" />
        </div>

        {/* Links */}
        <nav className="space-y-2">
          {defaultLinks.map((link) => {
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
                onClick={() => setIsOpen(false)}
              >
                <Icon className="h-5 w-5" />
                <span>{link.name}</span>
              </Link>
            );
          })}

          {variant === "selectedElection" && electionId && (
            <>
              {/* Setup Dropdown */}
              <div className="mt-6">
                <button
                  onClick={() => setShowSetup(!showSetup)}
                  className="flex justify-between items-center w-full sidebar-items text-white uppercase"
                >
                  Setup Election
                  {showSetup ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
                {showSetup && (
                  <nav className="space-y-1 mt-2 bg-white rounded-lg">
                    {setupLinks.map((link) => {
                      const isActive = pathname === link.href;
                      return (
                        <Link
                          key={link.href}
                          href={link.href}
                          className={`block pl-4 sidebar-items rounded-lg p-2 ${
                            isActive
                              ? "text-primary"
                              : "text-gray hover:text-primary"
                          }`}
                          onClick={() => setIsOpen(false)}
                        >
                          {link.name}
                        </Link>
                      );
                    })}
                  </nav>
                )}
              </div>

              {/* Manage Dropdown */}
              <div className="mt-4">
                <button
                  onClick={() => setShowManage(!showManage)}
                  className="flex justify-between items-center w-full sidebar-items text-white uppercase"
                >
                  Manage Election
                  {showManage ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
                {showManage && (
                  <nav className="space-y-1 mt-2 bg-white rounded-lg">
                    {manageLinks.map((link) => {
                      const isActive = pathname === link.href;
                      return (
                        <Link
                          key={link.href}
                          href={link.href}
                          className={`block pl-4 sidebar-items rounded-lg p-2 ${
                            isActive
                              ? "text-primary"
                              : "text-gray hover:text-primary"
                          }`}
                          onClick={() => setIsOpen(false)}
                        >
                          {link.name}
                        </Link>
                      );
                    })}
                  </nav>
                )}
              </div>
            </>
          )}
        </nav>
      </aside>
    </>
  );
};

export default AdminSidebar;
