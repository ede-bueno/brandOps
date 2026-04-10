import type { Metadata } from "next";
import {
  IBM_Plex_Mono,
  IBM_Plex_Sans,
} from "next/font/google";
import { BrandOpsProvider } from "@/components/BrandOpsProvider";
import { BRANDING } from "@/lib/branding";
import "./globals.css";

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

const plexSansHeadline = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-headline",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: BRANDING.appName,
  description: BRANDING.description,
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const themeBootScript = `
    (function() {
      try {
        var saved = localStorage.getItem("brandops.theme");
        var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        var dark = saved ? saved === "dark" : prefersDark;
        var html = document.documentElement;
        html.classList.remove("light", "dark");
        html.classList.add(dark ? "dark" : "light");
        html.dataset.theme = dark ? "dark" : "light";
      } catch (error) {
        document.documentElement.classList.add("light");
        document.documentElement.dataset.theme = "light";
      }
    })();
  `;

  return (
    <html lang="pt-BR" className="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body
        className={`${plexSans.variable} ${plexSansHeadline.variable} ${plexMono.variable} antialiased bg-background text-on-background`}
      >
        <BrandOpsProvider>{children}</BrandOpsProvider>
      </body>
    </html>
  );
}
