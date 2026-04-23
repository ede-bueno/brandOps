import { StudioModulePage } from "@/components/brandops-v3/StudioModulePage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "BrandOps | Oferta",
};

type StudioSearchParams = Record<string, string | string[] | undefined>;

export default async function StudioOfferPage({
  searchParams,
}: {
  searchParams?: Promise<StudioSearchParams>;
}) {
  return <StudioModulePage module="offer" searchParams={(await searchParams) ?? {}} />;
}
