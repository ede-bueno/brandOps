import { redirect } from "next/navigation";
import {
  buildLegacyRedirectPath,
  resolveLegacySearchParams,
  type LegacySearchParams,
} from "@/lib/brandops-v3/legacy-route-alias";

function resolveMode(searchParams?: LegacySearchParams) {
  const mode = searchParams?.mode;
  const normalizedMode = Array.isArray(mode) ? mode[0] : mode;

  if (
    normalizedMode === "executive" ||
    normalizedMode === "radar" ||
    normalizedMode === "detail"
  ) {
    return normalizedMode;
  }

  return null;
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
        surface: "products",
        mode: resolveMode(resolvedSearchParams),
      },
      resolvedSearchParams,
    ),
  );
}
