import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: {
    default: "Holdout | Dataset leakage audit",
    template: "%s | Holdout",
  },
  description:
    "Holdout audits a dataset before you model it. It finds leaked columns, reproduces the evidence, and measures how much of your validation score is fiction.",
  applicationName: "Holdout",
  keywords: ["data leakage", "machine learning", "validation", "dataset audit", "MLOps"],
  openGraph: {
    title: "Holdout | Dataset leakage audit",
    description:
      "Find the leak before the leaderboard does. Eight detectors, verified findings, and a measured honesty gap.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#070809",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`}>
      <body className="min-h-dvh bg-bg text-ink">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-blue focus:px-3 focus:py-2 focus:text-[13px] focus:font-medium focus:text-black"
        >
          Skip to content
        </a>
        <SiteNav />
        <main id="main">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
