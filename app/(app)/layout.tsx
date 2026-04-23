import { Suspense } from "react";
import { BrandOpsShellV3 } from "@/components/brandops-v3/BrandOpsShellV3";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Suspense><BrandOpsShellV3>{children}</BrandOpsShellV3></Suspense>;
}
