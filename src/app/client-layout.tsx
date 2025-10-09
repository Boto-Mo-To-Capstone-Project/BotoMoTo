"use client";

import "./globals.css";
import { Provider } from "react-redux";
import { store } from "@/store";
import NavbarWrapper from "@/components/NavbarWrapper";
import SidebarWrapper from "@/components/sidebars/SidebarWrapper";
import { useSidebarVisible } from "@/hooks/useSidebarVisible";
import { useEffect, useState } from "react";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "react-hot-toast";
import usePageTitle from "@/hooks/usePageTitle";

function useIsHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);
  return hydrated;
}

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const hydrated = useIsHydrated();
  const sidebarVisibleValue = useSidebarVisible();
  const sidebarVisible = hydrated ? sidebarVisibleValue : false;

  // ✅ Call your custom hook here
  usePageTitle();

  return (
    <body suppressHydrationWarning={true}>
      <Toaster position="top-center" />
      <SessionProvider>
        <Provider store={store}>
          <NavbarWrapper />
          {sidebarVisible ? (
            <SidebarWrapper>{children}</SidebarWrapper>
          ) : (
            <main>{children}</main>
          )}
        </Provider>
      </SessionProvider>
    </body>
  );
}
