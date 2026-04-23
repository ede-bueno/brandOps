import { StudioModulePage } from "@/components/brandops-v3/StudioModulePage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "BrandOps | Finanças",
};

type StudioSearchParams = Record<string, string | string[] | undefined>;

export default async function StudioFinancePage({
  searchParams,
}: {
  searchParams?: Promise<StudioSearchParams>;
}) {
  return <StudioModulePage module="finance" searchParams={(await searchParams) ?? {}} />;
}
