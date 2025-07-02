import DefaultNavbar from "@/components/DefaultNavbar";
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <DefaultNavbar />
        {children}
      </body>
    </html>
  );
}
