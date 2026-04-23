import { redirect } from "next/navigation";
import {
  buildLegacyRedirectPath,
  resolveLegacySearchParams,
  type LegacySearchParams,
} from "@/lib/brandops-v3/legacy-route-alias";

export default async function IntegrationTutorialProviderPage({
  params,
  searchParams,
}: {
  params: Promise<{ provider: string }>;
  searchParams?: Promise<LegacySearchParams>;
}) {
  const [{ provider }, resolvedSearchParams] = await Promise.all([
    params,
    resolveLegacySearchParams(searchParams),
  ]);

  redirect(
    buildLegacyRedirectPath(
      "/studio/ops",
      {
        tab: "integrations",
        entry: "tutorials",
        view: "provider",
        provider,
      },
      resolvedSearchParams,
    ),
  );
}
