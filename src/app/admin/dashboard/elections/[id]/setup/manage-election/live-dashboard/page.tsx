"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AdminLiveDashboard() {
  const router = useRouter();
  
  useEffect(() => {
    // Set admin context and redirect to voter live dashboard
    sessionStorage.setItem("adminContext", "true");
    router.replace("/voter/live-dashboard");
  }, [router]);

  // Show loading while redirecting
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <p className="text-lg text-gray-600">Loading live dashboard...</p>
      </div>
    </div>
  );
}
