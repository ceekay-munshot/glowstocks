import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "glowstocks — source-backed equity research",
  description:
    "On-demand, fully-automated, citation-backed equity research dashboards for Indian listed companies (NSE/BSE).",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
