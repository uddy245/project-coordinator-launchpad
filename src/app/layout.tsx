import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Manrope, Plus_Jakarta_Sans, Lora } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// Warm classroom typography — a working programme, not a console.
//
//   Display:  Plus Jakarta Sans — warm, rounded, confident headings
//   Body:     Manrope           — humanist grotesque for body/data
//   Reading:  Lora              — durable book serif for the Read tab
//   Mono:     IBM Plex Mono     — reserved for genuinely tabular figures
const sans = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const display = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700", "800"],
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

// Without this, mobile browsers assume a ~980px desktop layout and zoom out,
// so every responsive breakpoint never triggers on a phone.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
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
