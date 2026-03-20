import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
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
  title: "Vault Ledger | Financial Intelligence",
  description: "Advanced financial analytics and intelligence platform for POD brands.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&icon_names=account_balance,add,analytics,apps,chevron_right,cleaning_services,cloud_upload,dashboard,filter_list,help,horizontal_rule,lightbulb,monitoring,notifications,payments,query_stats,search,show_chart,trending_down,trending_up,upload_file" />
      </head>
      <body
        className={`${inter.variable} ${manrope.variable} antialiased bg-background text-on-background`}
      >
        {children}
      </body>
    </html>
  );
}
