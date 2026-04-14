import type { BrandGovernance, UserProfile } from "./types";
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

export function getBrandSelectionSessionKey(userId: string) {
  return `brandops.brand-selection-confirmed.${userId}`;
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

export function hasSessionBrandSelectionConfirmation(userId: string) {
  if (typeof window === "undefined") {
    return false;
  }

  return window.sessionStorage.getItem(getBrandSelectionSessionKey(userId)) === "1";
}

export function markSessionBrandSelectionConfirmed(userId: string, brandId: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(getBrandSelectionSessionKey(userId), "1");
  persistStoredActiveBrandId(userId, brandId);
}

export function clearSessionBrandSelectionConfirmation(userId: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(getBrandSelectionSessionKey(userId));
}

export async function hydrateWorkspace(
  userId: string,
  currentBrandId: string | null,
): Promise<{
  profile: UserProfile;
  brands: BrandWorkspaceOption[];
  activeBrandId: string | null;
  requiresBrandSelection: boolean;
}> {
  const profile = await fetchUserProfile(userId);
  const brands = await fetchAccessibleBrands({
    userId,
    role: profile.role,
  });
  const storedBrandId = readStoredActiveBrandId(userId);
  const hasConfirmedSelection = hasSessionBrandSelectionConfirmation(userId);

  const hasCurrentBrand =
    Boolean(currentBrandId) && brands.some((brand) => brand.id === currentBrandId);
  const hasStoredBrand =
    Boolean(storedBrandId) && brands.some((brand) => brand.id === storedBrandId);
  const requiresBrandSelection = brands.length > 1 && !hasCurrentBrand && !hasConfirmedSelection;

  const activeBrandId =
    (hasCurrentBrand && currentBrandId) ||
    (!requiresBrandSelection && hasStoredBrand && storedBrandId) ||
    (!requiresBrandSelection && brands[0]?.id) ||
    null;

  return {
    profile,
    brands,
    activeBrandId,
    requiresBrandSelection,
  };
}
