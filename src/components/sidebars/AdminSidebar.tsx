"use client";

import { useSession, signOut } from "next-auth/react";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import BotoMoToLogo from "@/app/assets/BotoMoToLogo_light.png";
import {
  LayoutDashboard,
  ListChecks,
  PlusCircle,
  User,
  X,
  Menu,
  BadgeAlert,
  ChevronDown,
  ChevronUp,
  Settings,
  Wrench,
  LogOut,
} from "lucide-react";
import { useLogout } from "@/hooks/useLogout";
import Button from "../Button";

type AdminSidebarProps = {
  variant: "default" | "selectedElection";
  electionId?: string;
  open?: boolean;
  onClose?: () => void;
};

const AdminSidebar = ({
  variant,
  electionId,
  open = false,
  onClose,
}: AdminSidebarProps) => {
  const { data: session } = useSession();

  const pathname = usePathname();
  const [showSetup, setShowSetup] = useState(false);
  const [showManage, setShowManage] = useState(false);

  const handleLogout = useLogout();

  // Split links into two groups
  const beforeElectionLinks = [
    { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    {
      name: "All Elections",
      href: "/admin/dashboard/elections",
      icon: ListChecks,
    },
    // {
    //   name: "Create Election",
    //   href: "/admin/dashboard/elections/create",
    //   icon: PlusCircle,
    // },
  ];

  const afterElectionLinks = [
    {
      name: "Tickets",
      href: "/admin/dashboard/elections/tickets",
      icon: BadgeAlert,
    },
    { name: "Profile", href: "/admin/dashboard/elections/profile", icon: User },
  ];

  const setupLinks = ["Overview", "Voters", "Positions", "Candidates"].map(
    (sub) => ({
      name: sub,
      href: `/admin/dashboard/elections/${electionId}/setup/${sub.toLowerCase()}`,
    })
  );

  const displayName = session?.user?.name || "Hardcoded name";
  const displayEmail = session?.user?.email || "Hardcoded@gmail.com";

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
          {beforeElectionLinks.map((link) => {
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

          {variant === "selectedElection" && electionId && (
            <>
              {/* Setup Dropdown */}
              <div className="">
                <button
                  onClick={() => setShowSetup(!showSetup)}
                  className={`flex items-center justify-between w-full p-2 rounded sidebar-items ${
                    showSetup
                      ? "bg-white text-primary"
                      : "text-white hover:font-semibold"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    <span>Setup Election</span>
                  </div>
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
                          onClick={onClose}
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

          {afterElectionLinks.map((link) => {
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

export default AdminSidebar;
