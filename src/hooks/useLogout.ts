"use client";

import { signOut } from "next-auth/react";

export function useLogout() {
  const handleLogout = async () => {
    try {
      console.log("Logging out...");
      await signOut({ callbackUrl: "/" });
      console.log("Redirected to homepage");
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  return handleLogout;
}
