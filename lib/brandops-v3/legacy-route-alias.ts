export type LegacySearchParamValue = string | string[] | undefined;
export type LegacySearchParams = Record<string, LegacySearchParamValue>;

export function buildLegacyRedirectPath(
  pathname: string,
  defaults: Record<string, string | null | undefined>,
  searchParams?: LegacySearchParams,
) {
  const params = new URLSearchParams();

  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          if (item !== undefined) {
            params.append(key, item);
          }
        }
        continue;
      }

      if (value !== undefined) {
        params.set(key, value);
      }
    }
  }

  for (const [key, value] of Object.entries(defaults)) {
    if (value !== null && value !== undefined) {
      params.set(key, value);
    }
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export async function resolveLegacySearchParams(
  searchParams?: Promise<LegacySearchParams>,
) {
  return (await searchParams) ?? {};
}
