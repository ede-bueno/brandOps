import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { BrandOpsProvider } from "@/components/BrandOpsProvider";
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
  title: "BrandOps",
  description:
    "Central de operação para acompanhar vendas, mídia e resultado financeiro por marca.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} antialiased bg-background text-on-background`}
      >
        <BrandOpsProvider>{children}</BrandOpsProvider>
      </body>
    </html>
  );
}
