import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Fraunces, Nunito_Sans } from "next/font/google";
import AppShell from "./AppShell";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  weight: ["400", "600", "700", "900"],
  style: ["normal", "italic"],
});

const nunitoSans = Nunito_Sans({
  subsets: ["latin"],
  variable: "--font-nunito",
  weight: ["400", "600", "700", "800"],
  style: ["normal", "italic"],
});

const themeScript = `try{var t=localStorage.getItem('pfm_theme');if(t==='dark'){document.documentElement.classList.add('dark');}}catch(e){}`;

export const metadata: Metadata = {
  title: "Prayer Fire Movement — Pray 3x, A Cure for Prayerlessness",
  description:
    "Pray 3 Times a Day — A Cure for Prayerlessness. Build a powerful daily prayer habit with guided sessions, a fasting tracker, multi-language scripture, and a global prayer community.",
  icons: {
    icon: "/logo.png",
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Pray 3x",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a1628",
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${fraunces.variable} ${nunitoSans.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="bg-page text-ink antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
