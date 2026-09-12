import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "ChefConnect",
    template: "%s · ChefConnect",
  },
  description: "Find and host cooking classes with home chefs, restaurant chefs, creators and cooking schools.",
};

export const viewport: Viewport = {
  themeColor: "#F3EBDD",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
