// this hook is to control the logic on when to show sidebar with flex container on layout.tsx
"use client";

import { usePathname } from "next/navigation";

export function useSidebarVisible() {
  const pathname = usePathname();

  const reserved = ["create", "tickets", "profile"]; // electionSelected links will not appear on this route

  const parts = pathname.split("/");

  const adminBaseRoutes = [
    "/admin/onboard/processing",
    "/admin/dashboard",
    "/admin/dashboard/elections",
    "/admin/dashboard/elections/create",
    "/admin/dashboard/elections/tickets",
    "/admin/dashboard/elections/profile",
  ];

  const superAdminBaseRoutes = [
    "/superadmin/dashboard",
    "/superadmin/dashboard/organization-requests",
    "/superadmin/dashboard/elections",
    "/superadmin/dashboard/tickets",
    "/superadmin/dashboard/audits",
    "/superadmin/dashboard/survey",
  ];

  const isAdminDefault = adminBaseRoutes.includes(pathname);

  // logic for admin sidebar when an election is selected
  const isAdminElectionSelected =
    pathname.startsWith("/admin/dashboard/elections/") &&
    parts.length >= 5 &&
    !reserved.includes(parts[4].toLowerCase());

  // logic for super admin sidebar
  const isSuperAdmin = 
  superAdminBaseRoutes.includes(pathname) || pathname.startsWith("/superadmin/dashboard/");

  // Show sidebar for the live-dashboard routes if we came from admin (check sessionStorage)
  const isFromAdmin = typeof window !== 'undefined' && 
    pathname.startsWith("/voter/live-dashboard") && 
    sessionStorage.getItem("adminContext") === "true";

  // Show sidebar for the live-dashboard routes if we came from admin (check sessionStorage)
  const isFromSuperAdmin = typeof window !== 'undefined' && 
    pathname.startsWith("/voter/live-dashboard") && 
    sessionStorage.getItem("superAdminContext") === "true";

  if (isAdminDefault || isAdminElectionSelected || isSuperAdmin || isFromAdmin || isFromSuperAdmin) {
    return true;
  }

  return false;
}
