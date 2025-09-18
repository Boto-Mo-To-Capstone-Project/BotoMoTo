"use client";

import { useSession, } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import BotoMoToLogo from "@/app/assets/BotoMoToLogo_light.png";
import LogomarkHD from "@/app/assets/LogomarkHD.png"
import {
  LayoutDashboard,
  ListChecks,
  ShieldCheck,
  ClipboardList,
  X,
  Users,
  BadgeAlert,
  LogOut,
  Settings,
  FolderKanban,
} from "lucide-react";
import { useLogout } from "@/hooks/useLogout";
import { useEffect } from "react";
import { Avatar } from "@/components/Avatar";

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
  const { data: session } = useSession();

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
    {
      name: "Settings",
      href: "/superadmin/dashboard/settings",
      icon: Settings,
    },
    {
      name: "Manage Admins",
      href: "/superadmin/dashboard/admins",
      icon: FolderKanban,
    },
  ];

  const displayName = session?.user?.name || "Username";
  const displayEmail = session?.user?.email || "Email";
  const displayPic = session?.user?.image;
  
  // Disable scroll when sidebar is open
  useEffect(() => {
    if (open) {
      document.body.classList.add("overflow-hidden");
    } else {
      document.body.classList.remove("overflow-hidden");
    }

    // Cleanup when component unmounts
    return () => {
      document.body.classList.remove("overflow-hidden");
    };
  }, [open]);
  
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
          <div className="flex items-center gap-2">
            <Avatar
              name={displayName}
              image={displayPic}
              defaultImage={LogomarkHD.src}
              size="w-10 h-10"
              className="shrink-0"
            />
            <div>
              <p className="text-white text-sm">{displayName}</p>
              {/* Mobile / small screens → truncated */}
              <p className="text-white text-sm block hidden lg:block">
                {displayEmail.length > 15 
                  ? displayEmail.slice(0, 15) + "..." 
                  : displayEmail}
              </p>

              {/* Large screens → full text */}
              <p className="text-white text-sm lg:hidden ">
                {displayEmail}
              </p>
            </div>   
          </div>  

          <button onClick={handleLogout} className="cursor-pointer text-white">
            <LogOut className="w-6 h-6" />
          </button>
        </div>
      </aside>
    </>
  );
};

export default SuperAdminSidebar;
