import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KinkgoX — Fundamental Change Intelligence",
  description: "See the change before the market sees the story.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
