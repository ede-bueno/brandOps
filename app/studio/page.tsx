import { StudioModulePage } from "@/components/brandops-v3/StudioModulePage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "BrandOps | Comando",
};

type StudioSearchParams = Record<string, string | string[] | undefined>;

export default async function StudioCommandPage({
  searchParams,
}: {
  searchParams?: Promise<StudioSearchParams>;
}) {
  return <StudioModulePage module="command" searchParams={(await searchParams) ?? {}} />;
}
