"use client";

import "./globals.css";
import { Provider } from "react-redux";
import { store } from "@/store";
import NavbarWrapper from "@/components/NavbarWrapper";
import SidebarWrapper from "@/components/sidebars/SidebarWrapper";
import { useSidebarVisible } from "@/hooks/useSidebarVisible";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sidebarVisible = useSidebarVisible();

  return (
    <html lang="en">
      <body suppressHydrationWarning={true}>
        <Provider store={store}>
          <NavbarWrapper />
          {sidebarVisible ? (
            <div className="flex min-h-screen">
              <SidebarWrapper />
              <main className="flex-1">{children}</main>
            </div>
          ) : (
            <main>{children}</main>
          )}
        </Provider>
      </body>
    </html>
  );
}
