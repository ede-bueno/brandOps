import { redirect } from "next/navigation";
import {
  buildLegacyRedirectPath,
  resolveLegacySearchParams,
  type LegacySearchParams,
} from "@/lib/brandops-v3/legacy-route-alias";

export default async function ImportPage({
  searchParams,
}: {
  searchParams?: Promise<LegacySearchParams>;
}) {
  const resolvedSearchParams = await resolveLegacySearchParams(searchParams);

  redirect(
    buildLegacyRedirectPath(
      "/studio/ops",
      {
        tab: "imports",
        entry: "import",
        view: "upload",
      },
      resolvedSearchParams,
    ),
  );
}
