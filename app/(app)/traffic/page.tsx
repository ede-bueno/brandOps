import { redirect } from "next/navigation";
import {
  buildLegacyRedirectPath,
  resolveLegacySearchParams,
  type LegacySearchParams,
} from "@/lib/brandops-v3/legacy-route-alias";

export default async function TrafficPage({
  searchParams,
}: {
  searchParams?: Promise<LegacySearchParams>;
}) {
  const resolvedSearchParams = await resolveLegacySearchParams(searchParams);

  redirect(
    buildLegacyRedirectPath("/studio/growth", {
      surface: "traffic",
      tab: "channels",
      context: "legacy",
    }, resolvedSearchParams),
  );
}
