"use client";

import { useEffect, useState } from "react";
import { fetchSanitizationReport } from "@/lib/brandops/database";

export function useSanitizationPendingCount(
  brandId: string | null | undefined,
  accessToken?: string | null,
) {
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!brandId || !accessToken) {
      setPendingCount(0);
      return;
    }

    const safeBrandId = brandId;
    let cancelled = false;

    async function loadSummary() {
      try {
        const report = await fetchSanitizationReport(safeBrandId);
        if (!cancelled) {
          setPendingCount(report.meta.pendingCount);
        }
      } catch {
        if (!cancelled) {
          setPendingCount(0);
        }
      }
    }

    void loadSummary();

    return () => {
      cancelled = true;
    };
  }, [accessToken, brandId]);

  return pendingCount;
}
