import { redirect } from "next/navigation";
import {
  buildLegacyRedirectPath,
  resolveLegacySearchParams,
  type LegacySearchParams,
} from "@/lib/brandops-v3/legacy-route-alias";

export default async function CostCenterPage({
  searchParams,
}: {
  searchParams?: Promise<LegacySearchParams>;
}) {
  const resolvedSearchParams = await resolveLegacySearchParams(searchParams);

  redirect(
    buildLegacyRedirectPath("/studio/finance", {
      surface: "cost-center",
      tab: "launches",
      subview: "overview",
      context: "legacy",
    }, resolvedSearchParams),
  );
}
