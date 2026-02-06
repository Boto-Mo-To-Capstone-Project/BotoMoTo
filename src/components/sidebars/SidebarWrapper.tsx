"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import AdminSidebar from "./AdminSidebar";
import SuperAdminSidebar from "./SuperAdminSidebar"; // use real component
import AppHeader from "../AppHeader";

export default function SidebarWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const eidParam = searchParams.get("eid") ?? undefined;
  const parts = pathname.split("/");

  // Simple state for election number
  const [electionNumber, setElectionNumber] = useState<number | null>(null);

  // Get current election ID
  const currentElectionId = (() => {
    // For URL parameter
    if (eidParam) return parseInt(eidParam);
    
    // For path-based election ID (e.g., /admin/dashboard/elections/44/setup)
    if (parts[4] && !["create", "tickets", "profile"].includes(parts[4]?.toLowerCase())) {
      const id = parseInt(parts[4]);
      return isNaN(id) ? undefined : id;
    }
    
    // For admin context in voter routes
    if (typeof window !== 'undefined' && 
        (sessionStorage.getItem("adminContext") === "true" || 
         sessionStorage.getItem("superAdminContext") === "true")) {
      const adminElectionId = sessionStorage.getItem("adminElectionId");
      return adminElectionId ? parseInt(adminElectionId) : undefined;
    }
    
    return undefined;
  })();

  // Simple direct fetch
  useEffect(() => {
    if (currentElectionId) {
      fetch(`/api/elections/${currentElectionId}/admin-number`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setElectionNumber(data.data.electionNumber);
          } else {
            setElectionNumber(null);
          }
        })
        .catch(() => setElectionNumber(null));
    } else {
      setElectionNumber(null);
    }
  }, [currentElectionId]);

  // Simple format function
  const formatElectionTitle = (number: number | null, suffix?: string): string => {
    if (number === null) {
      return suffix ? `Election - ${suffix}` : "Election";
    }
    return suffix ? `Election ${number} - ${suffix}` : `Election ${number}`;
  };

  // === OLD LOGIC MERGED ===

  const reserved = ["create", "tickets", "profile"];

  const adminBaseRoutes = [
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

  const isCreateWithEid = pathname === "/admin/dashboard/elections/create" && !!eidParam;

  const isAdminElectionSelected =
    (pathname.startsWith("/admin/dashboard/elections/") &&
      parts.length >= 5 &&
      !reserved.includes(parts[4]?.toLowerCase())) ||
    (pathname === "/admin/dashboard/elections" && !!eidParam) ||
    isCreateWithEid;

  const isSuperAdmin =
    superAdminBaseRoutes.includes(pathname) ||
    pathname.startsWith("/superadmin/dashboard/");

  // Check if we're on voter livedashboard but coming from admin context
  const isFromAdmin = typeof window !== 'undefined' && 
    pathname.startsWith("/voter/live-dashboard") && 
    sessionStorage.getItem("adminContext") === "true";

  // Check if we're on voter livedashboard but coming from superadmin context
  const isFromSuperadmin = typeof window !== 'undefined' && 
    pathname.startsWith("/voter/live-dashboard") && 
    sessionStorage.getItem("superAdminContext") === "true";

  const sidebarElectionId =
    (!reserved.includes(parts[4]?.toLowerCase()) && parts[4]) || eidParam;

  // === PAGE TITLE LOGIC ===
  const pageTitle = (() => {
    if (pathname === "/admin/dashboard") return "Admin Dashboard";
    if (pathname === "/admin/dashboard/elections")
      return eidParam ? formatElectionTitle(electionNumber) : "Admin Elections";
    if (pathname === "/admin/dashboard/elections/create")
      return eidParam ? formatElectionTitle(electionNumber, "Edit") : "Election Form";
    if (pathname === "/admin/dashboard/elections/tickets")
      return "Admin Tickets";
    if (pathname === "/admin/dashboard/elections/profile")
      return "Admin Profile";
    if (pathname === "/admin/dashboard/elections/manage")
      return formatElectionTitle(electionNumber, "Manage");
    // matches: /admin/dashboard/elections/[id]/setup/[section]

    // === ADMIN: ELECTION VERIFY INTEGRITY ===
    // matches: /admin/dashboard/elections/[id]/setup/manage-election/verify-integrity
    if (
      parts[0] === "" &&
      parts[1] === "admin" &&
      parts[2] === "dashboard" &&
      parts[3] === "elections" &&
      parts[5] === "setup" &&
      parts[6] === "manage-election" &&
      parts[7] === "verify-integrity"
    ) {
      return formatElectionTitle(electionNumber, "Verify Integrity");
    }

    // === ADMIN: ELECTION SETUP ===
    // matches: /admin/dashboard/elections/[id]/setup/[section]
    if (
      parts[0] === "" &&
      parts[1] === "admin" &&
      parts[2] === "dashboard" &&
      parts[3] === "elections" &&
      parts[5] === "setup" &&
      parts.length >= 7
    ) {
      const section = parts[6]
        ?.replace(/-/g, " ") // replace hyphens with spaces
        .replace(/\b\w/g, (l) => l.toUpperCase()); // capitalize each word
      return formatElectionTitle(electionNumber, `Setup ${section}`);
    }

    // === ADMIN: MANAGE ELECTION ===
    // matches: /admin/dashboard/elections/[id]/manage/[section]
    if (
      parts[0] === "" &&
      parts[1] === "admin" &&
      parts[2] === "dashboard" &&
      parts[3] === "elections" &&
      parts[5] === "manage" &&
      parts.length >= 7
    ) {
      const section = parts[6]
        ?.replace(/-/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase());
      return formatElectionTitle(electionNumber, `Manage ${section}`);
    }

    // Handle voter routes when coming from admin context to set title
    if (pathname.startsWith("/voter/live-dashboard") && typeof window !== 'undefined' && 
    ((sessionStorage.getItem("adminContext") === "true") ||
    (sessionStorage.getItem("superAdminContext") === "true"))) {
      if (pathname === "/voter/live-dashboard") return formatElectionTitle(electionNumber, "Live Dashboard");
      if (pathname.includes("/candidate/")) return formatElectionTitle(electionNumber, "Candidate Dashboard");
      if (pathname.includes("/voting-scope/")) return formatElectionTitle(electionNumber, "Voting Scope Dashboard");
      return `Live Dashboard`;
    }

    if (pathname === "/superadmin/dashboard") return "Super Admin Dashboard";
    if (pathname === "/superadmin/dashboard/organization-requests")
      return "Super Admin Organization Requests";
    if (pathname === "/superadmin/dashboard/elections")
      return "Super Admin Elections";
    if (pathname === "/superadmin/dashboard/tickets")
      return "Super Admin Tickets";
    if (pathname === "/superadmin/dashboard/audits")
      return "Super Admin Audits";
    if (pathname === "/superadmin/dashboard/survey")
      return "Super Admin Survey";
    if (pathname === "/superadmin/dashboard/create-survey")
      return "Super Admin Create Survey";
    if (pathname.startsWith("/superadmin/dashboard/edit-survey"))
      return "Super Admin Edit Survey";
    if (pathname.startsWith("/superadmin/dashboard/survey"))
      return "Super Admin Survey";
    if (pathname === "/superadmin/dashboard/settings")
      return "Super Admin Settings";
    if (pathname === "/superadmin/dashboard/admins")
      return "Super Admin Manage Admins";
    if (pathname.startsWith("/superadmin/dashboard/tickets/"))
      return "Ticket Messaging";

    // Add more as needed
    return "Default, Check sidebar wrapper";
  })();

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      {(isAdminDefault || isAdminElectionSelected || isFromAdmin) && (
        <AdminSidebar
          variant={isAdminElectionSelected ? "selectedElection" : "default"}
          electionId={isAdminElectionSelected ? sidebarElectionId : undefined}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
      )}

      {(isSuperAdmin || isFromSuperadmin) && (
        <SuperAdminSidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex flex-col w-screen ">
        <AppHeader title={pageTitle} onMenuClick={() => setSidebarOpen(true)} />
        <main className="lg:ml-68 ">{children}</main>
      </div>
    </div>
  );
}
