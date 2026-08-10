import type { Metadata } from "next";
import { DM_Sans, Fraunces, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["400", "500", "600", "700"],
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  weight: ["500", "600", "700"],
});

const ibmPlex = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-ibm",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Mock Round — AI Interviewer",
  description:
    "Personal AI mock interviewer grounded in your interview-prep materials.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${dmSans.variable} ${fraunces.variable} ${ibmPlex.variable} antialiased`}
        style={
          {
            "--font-body": "var(--font-dm-sans), system-ui, sans-serif",
            "--font-display": "var(--font-fraunces), Georgia, serif",
            "--font-mono": "var(--font-ibm), ui-monospace, monospace",
          } as React.CSSProperties
        }
      >
        {children}
      </body>
    </html>
  );
}
