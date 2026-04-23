import { BrandOpsShellV3 } from "@/components/brandops-v3/BrandOpsShellV3";

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <BrandOpsShellV3>{children}</BrandOpsShellV3>;
}
