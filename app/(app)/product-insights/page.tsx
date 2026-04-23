import { redirect } from "next/navigation";
import {
  buildLegacyRedirectPath,
  resolveLegacySearchParams,
  type LegacySearchParams,
} from "@/lib/brandops-v3/legacy-route-alias";

function resolveView(searchParams?: LegacySearchParams) {
  const mode = searchParams?.mode;
  const normalizedMode = Array.isArray(mode) ? mode[0] : mode;

  if (
    normalizedMode === "executive" ||
    normalizedMode === "radar" ||
    normalizedMode === "detail"
  ) {
    return normalizedMode;
  }

  return "home";
}

export default async function ProductInsightsPage({
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
        view: resolveView(resolvedSearchParams),
      },
      resolvedSearchParams,
    ),
  );
}
