"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AdminCandidateDashboard() {
  const params = useParams();
  const router = useRouter();
  
  useEffect(() => {
    // Set admin context and redirect to voter candidate page with the correct parameter
    if (params.candidateId) {
      sessionStorage.setItem("adminContext", "true");
      router.replace(`/voter/live-dashboard/candidate/${params.candidateId}`);
    }
  }, [params.candidateId, router]);

  // Show loading while redirecting
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <p className="text-lg text-gray-600">Loading candidate dashboard...</p>
      </div>
    </div>
  );
}
