"use client";

import "./globals.css";
import { Provider } from "react-redux";
import { store } from "@/store";
import NavbarWrapper from "@/components/NavbarWrapper";
import SidebarWrapper from "@/components/sidebars/SidebarWrapper";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning={true}>
        <Provider store={store}>
          <NavbarWrapper />
          <div className="flex">
            <SidebarWrapper />
            {children}
          </div>
        </Provider>
      </body>
    </html>
  );
}
