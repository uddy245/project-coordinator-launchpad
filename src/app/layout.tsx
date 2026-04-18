import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Project Coordinator Launchpad",
  description: "AI-powered training from zero to hire-ready Project Coordinator",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
