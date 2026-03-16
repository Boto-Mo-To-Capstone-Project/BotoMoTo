"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import toast from "react-hot-toast";
import ConfirmationModal from "@/components/ConfirmationModal";

type UserHeaderProps = {
  name?: string | null;
  organization?: string | null;
  className?: string;
  showLogout?: boolean;
  isLoading?: boolean;
};

export default function UserHeader({
  name,
  organization,
  className = "",
  showLogout = false,
  isLoading = false,
}: UserHeaderProps) {
  const router = useRouter();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  if (isLoading) {
    return (
      <div
        className={`w-full bg-yellow-50 border border-[var(--color-secondary)] rounded-xl px-4 py-3 shadow-sm animate-pulse ${className}`}
      >
        <div className="h-3 w-32 bg-gray-300 rounded mb-2" />
        <div className="h-4 w-44 bg-gray-300 rounded mb-2" />
        <div className="h-3 w-36 bg-gray-200 rounded" />
      </div>
    );
  }

  if (!name && !organization) {
    return null;
  }

  const handleVoterLogout = async () => {
    try {
      await fetch("/api/voter/logout", { method: "POST" });
      toast.success("Logged out successfully!");
    } catch (error) {
      console.error("Error logging out:", error);
    } finally {
      document.cookie = "voter_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      localStorage.removeItem("voterData");
      localStorage.removeItem("mfaFlow");
      router.push("/voter/login");
    }
  };

  return (
    <>
      <div
        className={`w-full bg-yellow-50 border border-[var(--color-secondary)] rounded-xl px-4 py-3 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${className}`}
      >
        <div className="min-w-0 text-left">
          <p className="text-sm font-semibold text-gray-900">{name || "Voter"}</p>
          <p className="text-xs text-gray-600">{organization || "Organization"}</p>
        </div>

        {showLogout && (
          <button
            type="button"
            onClick={() => setShowLogoutModal(true)}
            className="w-full sm:w-9 h-10 sm:h-9 rounded-md border border-[var(--color-secondary)] bg-white text-primary sm:border-transparent sm:bg-primary sm:text-white flex items-center justify-center gap-2 hover:brightness-95 sm:hover:brightness-90 transition-colors self-stretch sm:self-auto shrink-0"
            title="Logout"
            aria-label="Logout"
          >
            <LogOut size={16} />
            <span className="text-sm font-semibold sm:hidden">Logout</span>
          </button>
        )}
      </div>

      <ConfirmationModal
        open={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        title="Confirm Logout"
        description="Are you sure you want to log out of your voter session?"
        confirmLabel="Logout"
        cancelLabel="Cancel"
        onConfirm={handleVoterLogout}
        variant="delete"
      />
    </>
  );
}
