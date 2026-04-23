import { StudioModulePage } from "@/components/brandops-v3/StudioModulePage";

type StudioSearchParams = Record<string, string | string[] | undefined>;

export default async function StudioOfferPage({
  searchParams,
}: {
  searchParams?: Promise<StudioSearchParams>;
}) {
  return <StudioModulePage module="offer" searchParams={(await searchParams) ?? {}} />;
}
