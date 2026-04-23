import { StudioModulePage } from "@/components/brandops-v3/StudioModulePage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "BrandOps | Crescimento",
};

type StudioSearchParams = Record<string, string | string[] | undefined>;

export default async function StudioGrowthPage({
  searchParams,
}: {
  searchParams?: Promise<StudioSearchParams>;
}) {
  return <StudioModulePage module="growth" searchParams={(await searchParams) ?? {}} />;
}
