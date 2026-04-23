import type { Metadata } from "next";
import { ContributionMarginPageV3 } from "@/components/brandops-v3/ContributionMarginPageV3";

export const metadata: Metadata = {
  title: "BrandOps | Margem",
};

export default async function StudioMarginPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const view = Array.isArray(resolvedSearchParams?.view)
    ? resolvedSearchParams?.view[0]
    : resolvedSearchParams?.view;
  const section = Array.isArray(resolvedSearchParams?.section)
    ? resolvedSearchParams?.section[0]
    : resolvedSearchParams?.section;

  return <ContributionMarginPageV3 view={view} section={section} />;
}
