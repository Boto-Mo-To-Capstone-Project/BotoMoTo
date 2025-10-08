"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// If pathname starts with /admin -> Admin | Boto Mo 'To
// If pathname starts with /superadmin -> Superadmin | Boto Mo 'To
// If pathname starts with /voter -> Voter | Boto Mo 'To
// Otherwise -> use the last part of the path, capitalize it, handle dashes, and make an exception for FAQs

export default function usePageTitle(baseTitle: string = "Boto Mo 'To") {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;

    let title = baseTitle;

    if (pathname.startsWith("/admin")) {
      title = `Admin | ${baseTitle}`;
    } else if (pathname.startsWith("/superadmin")) {
      title = `Superadmin | ${baseTitle}`;
    } else if (pathname.startsWith("/voter")) {
      title = `Voter | ${baseTitle}`;
    } else {
      // Get the last segment of the URL
      const segments = pathname.split("/").filter(Boolean);
      const lastSegment = segments[segments.length - 1] || "";

      // Handle special case
      let formatted =
        lastSegment.toLowerCase() === "faqs"
          ? "FAQs"
          : lastSegment
              .replace(/-/g, " ") // replace dashes
              .replace(/\b\w/g, (c) => c.toUpperCase()); // capitalize words

      // Home route exception
      if (pathname === "/") formatted = "Home";

      title = `${formatted} | ${baseTitle}`;
    }

    document.title = title;
  }, [pathname, baseTitle]);
}
