import { redirect } from "next/navigation";
import {
  buildLegacyRedirectPath,
  resolveLegacySearchParams,
  type LegacySearchParams,
} from "@/lib/brandops-v3/legacy-route-alias";

export default async function ProductInsightsRadarPage({
  searchParams,
}: {
  searchParams?: Promise<LegacySearchParams>;
}) {
  const resolvedSearchParams = await resolveLegacySearchParams(searchParams);

  redirect(
    buildLegacyRedirectPath(
      "/studio/offer",
      {
        tab: "decisions",
        entry: "product-insights",
        view: "radar",
      },
      resolvedSearchParams,
    ),
  );
}
