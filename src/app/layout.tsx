"use client";

import "./globals.css";
import { Provider } from "react-redux";
import { store } from "@/store";
import NavbarWrapper from "@/components/NavbarWrapper";
import SidebarWrapper from "@/components/sidebars/SidebarWrapper";
import { useSidebarVisible } from "@/hooks/useSidebarVisible";
import { useEffect, useState } from "react";
import { SessionProvider } from "next-auth/react"

function useIsHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);
  return hydrated;
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const hydrated = useIsHydrated();
  const sidebarVisibleValue = useSidebarVisible();
  const sidebarVisible = hydrated ? sidebarVisibleValue : true;

  return (
    <html lang="en">
      <body suppressHydrationWarning={true}>
        
       <SessionProvider>
        <Provider store={store}>
          <NavbarWrapper />
          {sidebarVisible ? (
            <div className="flex flex-col md:flex-row min-h-screen">
              <SidebarWrapper />
              <main className="flex-1 pt-0 md:pt-0 lg:ml-68">{children}</main>
            </div>
          ) : (
            <main className="pt-20 md:pt-0">{children}</main>
          )}
        </Provider>
        </SessionProvider>

      </body>
    </html>
  );
}
