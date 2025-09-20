"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return; // Still loading

    // Not authenticated - redirect to login
    if (status === "unauthenticated") {
      router.replace("/auth/login");
      return;
    }

    // Wrong role - redirect to appropriate dashboard
    if (session?.user?.role && session.user.role !== "SUPER_ADMIN") {
      switch (session.user.role) {
        case "ADMIN":
          router.replace("/admin/dashboard");
          break;
        default:
          router.replace("/auth/login");
      }
      return;
    }
  }, [session, status, router]);

  // Show nothing while loading or redirecting (prevents flash of content)
  if (status === "loading" || !session?.user?.role || session.user.role !== "SUPER_ADMIN") {
    return null;
  }

  return <>{children}</>;
}
