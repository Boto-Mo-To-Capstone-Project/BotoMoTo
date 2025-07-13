// this hook is to control the logic on when to show sidebar with flex container on layout.tsx
"use client";

import { usePathname } from "next/navigation";

export function useSidebarVisible() {
  const pathname = usePathname();

  const reserved = ["create", "tickets", "profile"];

  const parts = pathname.split("/");

  const adminBaseRoutes = [
    "/admin/onboard/processing",
    "/admin/dashboard",
    "/admin/dashboard/elections",
    "/admin/dashboard/elections/create",
    "/admin/dashboard/elections/tickets",
    "/admin/dashboard/elections/profile",
  ];

  const isAdminDefault = adminBaseRoutes.includes(pathname);

  const isAdminElectionSelected =
    pathname.startsWith("/admin/dashboard/elections/") &&
    parts.length >= 5 &&
    !reserved.includes(parts[4].toLowerCase());

  if (isAdminDefault || isAdminElectionSelected) {
    return true;
  }

  // Add more logic here for SuperAdmin sidebar
  // if (pathname.startsWith("/superadmin")) return true;

  return false;
}
