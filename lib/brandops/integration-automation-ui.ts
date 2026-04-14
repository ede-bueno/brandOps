import type { BrandIntegrationConfig } from "@/lib/brandops/types";

export const INTEGRATION_AUTO_SYNC_INTERVAL_OPTIONS = [1, 2, 3, 6, 12, 24] as const;

export function normalizeAutoSyncIntervalHoursForUi(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 6;
  }

  const rounded = Math.max(1, Math.min(24, Math.round(value)));
  return (
    INTEGRATION_AUTO_SYNC_INTERVAL_OPTIONS.find((option) => option === rounded) ?? 6
  );
}

export function getIntegrationAutoSyncSettings(
  integration: Pick<BrandIntegrationConfig, "settings" | "lastSyncAt"> | null | undefined,
) {
  if (!integration) {
    return {
      enabled: false,
      intervalHours: 6,
      lastRunAt: null,
      nextRunAt: null,
    };
  }

  const settings = integration.settings ?? {};

  return {
    enabled: Boolean(settings.autoSyncEnabled),
    intervalHours: normalizeAutoSyncIntervalHoursForUi(settings.autoSyncIntervalHours),
    lastRunAt:
      typeof settings.autoSyncLastRunAt === "string"
        ? settings.autoSyncLastRunAt
        : integration.lastSyncAt ?? null,
    nextRunAt:
      typeof settings.autoSyncNextRunAt === "string" ? settings.autoSyncNextRunAt : null,
  };
}

export function getNextAutoSyncAtLabel(
  integration: Pick<BrandIntegrationConfig, "settings" | "lastSyncAt"> | null | undefined,
) {
  const autoSync = getIntegrationAutoSyncSettings(integration);

  if (!autoSync.enabled) {
    return "Automação desligada";
  }

  if (autoSync.nextRunAt) {
    const nextRun = new Date(autoSync.nextRunAt);
    if (!Number.isNaN(nextRun.getTime())) {
      return nextRun.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  }

  if (autoSync.lastRunAt) {
    return `Após ${autoSync.intervalHours}h da última sincronização`;
  }

  return "Na próxima janela horária";
}
