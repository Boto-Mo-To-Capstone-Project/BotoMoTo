import DefaultNavbar from "@/components/DefaultNavbar";
import "./globals.css";
import { Provider } from "react-redux";
import { store } from "@/store";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Provider store={store}>
          <DefaultNavbar />
          {children}
        </Provider>
      </body>
    </html>
  );
}
