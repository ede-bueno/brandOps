import { redirect } from "next/navigation";

type SearchParamValue = string | string[] | undefined;
type SearchParams = Record<string, SearchParamValue>;

function buildRedirectPath(
  pathname: string,
  defaults: Record<string, string>,
  searchParams?: SearchParams,
) {
  const params = new URLSearchParams();

  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          if (item) {
            params.append(key, item);
          }
        }
      } else if (value) {
        params.set(key, value);
      }
    }
  }

  for (const [key, value] of Object.entries(defaults)) {
    params.set(key, value);
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export default async function FeedPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const resolvedSearchParams = await searchParams;

  redirect(
    buildRedirectPath(
      "/studio/offer",
      {
        tab: "catalog",
        entry: "feed",
        view: "overview",
      },
      resolvedSearchParams,
    ),
  );
}
