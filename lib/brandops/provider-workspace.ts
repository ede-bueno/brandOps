import type { BrandGovernance, CustomDateRange, PeriodFilter, UserProfile } from "./types";
import { fetchAccessibleBrands, fetchUserProfile } from "./workspace";

export type BrandWorkspaceOption = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  governance: BrandGovernance;
};

export function getBrandContextStorageKey(userId: string) {
  return `brandops.active-brand.${userId}`;
}

export function getPeriodFilterStorageKey(userId: string) {
  return `brandops.period-filter.${userId}`;
}

export function getCustomDateRangeStorageKey(userId: string) {
  return `brandops.period-range.${userId}`;
}

export function readStoredActiveBrandId(userId: string) {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(getBrandContextStorageKey(userId));
}

export function persistStoredActiveBrandId(userId: string, brandId: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(getBrandContextStorageKey(userId), brandId);
}

export function clearStoredActiveBrandId(userId: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(getBrandContextStorageKey(userId));
}

export function readStoredPeriodContext(userId: string): {
  period: PeriodFilter | null;
  customDateRange: CustomDateRange | null;
} {
  if (typeof window === "undefined") {
    return {
      period: null,
      customDateRange: null,
    };
  }

  const period = window.localStorage.getItem(getPeriodFilterStorageKey(userId)) as PeriodFilter | null;
  const serializedRange = window.localStorage.getItem(getCustomDateRangeStorageKey(userId));

  let customDateRange: CustomDateRange | null = null;
  if (serializedRange) {
    try {
      const parsed = JSON.parse(serializedRange) as CustomDateRange;
      if (typeof parsed?.from === "string" && typeof parsed?.to === "string") {
        customDateRange = parsed;
      }
    } catch {
      customDateRange = null;
    }
  }

  return {
    period,
    customDateRange,
  };
}

export function persistStoredPeriodContext(
  userId: string,
  period: PeriodFilter,
  customDateRange: CustomDateRange,
) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(getPeriodFilterStorageKey(userId), period);
  window.localStorage.setItem(getCustomDateRangeStorageKey(userId), JSON.stringify(customDateRange));
}

export function clearStoredPeriodContext(userId: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(getPeriodFilterStorageKey(userId));
  window.localStorage.removeItem(getCustomDateRangeStorageKey(userId));
}

export async function hydrateWorkspace(
  userId: string,
  currentBrandId: string | null,
): Promise<{
  profile: UserProfile;
  brands: BrandWorkspaceOption[];
  activeBrandId: string | null;
}> {
  const [profile, brands] = await Promise.all([fetchUserProfile(userId), fetchAccessibleBrands()]);
  const storedBrandId = readStoredActiveBrandId(userId);

  const activeBrandId =
    (currentBrandId && brands.some((brand) => brand.id === currentBrandId) && currentBrandId) ||
    (storedBrandId && brands.some((brand) => brand.id === storedBrandId) && storedBrandId) ||
    brands[0]?.id ||
    null;

  return {
    profile,
    brands,
    activeBrandId,
  };
}
