"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AdminVotingScopeDashboard() {
  const params = useParams();
  const router = useRouter();
  
  useEffect(() => {
    // Set admin context and redirect to voter voting scope page with the correct parameter
    if (params.scopeId) {
      sessionStorage.setItem("adminContext", "true");
      router.replace(`/voter/live-dashboard/voting-scope/${params.scopeId}`);
    }
  }, [params.scopeId, router]);

  // Show loading while redirecting
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <p className="text-lg text-gray-600">Loading voting scope dashboard...</p>
      </div>
    </div>
  );
}
