import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import { BrandOpsProvider } from "@/components/BrandOpsProvider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
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
        className={`${inter.variable} ${manrope.variable} antialiased bg-background text-on-background`}
      >
        <BrandOpsProvider>{children}</BrandOpsProvider>
      </body>
    </html>
  );
}
