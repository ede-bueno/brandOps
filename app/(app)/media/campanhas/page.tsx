import { redirect } from "next/navigation";

type LegacySearchParams = Record<string, string | string[] | undefined>;

function buildLegacyHref(
  destination: string,
  searchParams: LegacySearchParams,
  semanticParams: Record<string, string>,
) {
  const nextSearchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (Array.isArray(value)) {
      value.forEach((item) => nextSearchParams.append(key, item));
      continue;
    }

    if (value !== undefined) {
      nextSearchParams.set(key, value);
    }
  }

  for (const [key, value] of Object.entries(semanticParams)) {
    nextSearchParams.set(key, value);
  }

  const query = nextSearchParams.toString();
  return query ? `${destination}?${query}` : destination;
}

export default async function MediaCampaignsPage({
  searchParams,
}: {
  searchParams?: Promise<LegacySearchParams>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};

  redirect(
    buildLegacyHref("/studio/growth", resolvedSearchParams, {
      surface: "media",
      subview: "campaigns",
      context: "legacy",
    }),
  );
}
