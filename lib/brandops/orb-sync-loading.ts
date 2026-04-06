"use client";

export const ATLAS_ORB_SYNC_LOADING_EVENT = "atlas:sync-loading";

export type AtlasOrbSyncLoadingDetail = {
  active: boolean;
  label?: string;
};

export function setAtlasOrbSyncLoading(detail: AtlasOrbSyncLoadingDetail) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<AtlasOrbSyncLoadingDetail>(ATLAS_ORB_SYNC_LOADING_EVENT, {
      detail,
    }),
  );
}

