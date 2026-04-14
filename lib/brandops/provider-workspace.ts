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
