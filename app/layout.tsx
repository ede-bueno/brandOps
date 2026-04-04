import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { BrandOpsProvider } from "@/components/BrandOpsProvider";
import { BRANDING } from "@/lib/branding";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-headline",
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
        var saved = localStorage.getItem("atlas.theme");
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
        className={`${inter.variable} ${spaceGrotesk.variable} antialiased bg-background text-on-background`}
      >
        <BrandOpsProvider>{children}</BrandOpsProvider>
      </body>
    </html>
  );
}
