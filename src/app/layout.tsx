import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, IBM_Plex_Serif, Lora } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// Career Programme typography — university × office.
//
//   Display:  IBM Plex Serif — academic / institutional credibility
//   Body:     IBM Plex Sans  — professional Bloomberg/HBS-style grotesque
//   Reading:  Lora           — durable book serif for the Read tab
//   Mono:     IBM Plex Mono  — tabular data, codes, labels
//
// One typeface family across the surface (Plex), with Lora reserved for long-form reading.
const sans = IBM_Plex_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const display = IBM_Plex_Serif({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const reading = Lora({
  subsets: ["latin"],
  variable: "--font-reading-body",
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Project Coordinator Launchpad",
  description: "AI-powered training from zero to hire-ready Project Coordinator",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${display.variable} ${reading.variable} ${mono.variable}`}
    >
      <body className="font-sans antialiased">
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
