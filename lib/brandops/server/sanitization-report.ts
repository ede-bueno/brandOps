import "server-only";

import { buildMediaAnomalies, buildSanitizationHistory } from "@/lib/brandops/metrics";
import type { BrandDataset, SanitizationReport } from "@/lib/brandops/types";

export function buildSanitizationReport(brand: BrandDataset): SanitizationReport {
  const pending = buildMediaAnomalies(brand).filter(
    (anomaly) => anomaly.sanitizationStatus === "PENDING",
  );
  const history = buildSanitizationHistory(brand);

  return {
    pending,
    history,
    meta: {
      generatedAt: new Date().toISOString(),
      pendingCount: pending.length,
      historyCount: history.length,
      hasData: pending.length > 0 || history.length > 0,
    },
  };
}
