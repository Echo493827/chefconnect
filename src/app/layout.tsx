import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

// The two families behind the design tokens: Fraunces for display type (a warm,
// slightly rustic serif) and Source Sans 3 for body text. Bundled as local
// variable fonts so the build never depends on Google being reachable and no
// request ever leaves the visitor's browser for them.
const fraunces = localFont({
  src: "./fonts/fraunces-latin.woff2",
  variable: "--font-display",
  weight: "100 900",
  display: "swap",
});

const sourceSans = localFont({
  src: "./fonts/source-sans-3-latin.woff2",
  variable: "--font-body",
  weight: "200 900",
  display: "swap",
});

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
    <html lang="en" className={`${fraunces.variable} ${sourceSans.variable}`}>
      <body>
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
