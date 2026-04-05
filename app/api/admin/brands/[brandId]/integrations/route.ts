import { NextResponse } from "next/server";
import { requireBrandAccess, requireSuperAdmin } from "@/lib/brandops/admin";
import {
  hydrateIntegrationConfigs,
  normalizeIntegrationSettings,
} from "@/lib/brandops/integration-config";
import type { IntegrationMode, IntegrationProvider } from "@/lib/brandops/types";

const allowedProviders = new Set<IntegrationProvider>(["ink", "meta", "ga4"]);
const allowedModes = new Set<IntegrationMode>(["manual_csv", "api", "disabled"]);

function normalizeSettings(provider: IntegrationProvider, settings: unknown) {
  const source = normalizeIntegrationSettings(provider, settings);

  if (provider === "ga4") {
    return {
      propertyId: source.propertyId,
      timezone: source.timezone,
      credentialSource: source.credentialSource,
      hasApiKey: source.hasApiKey,
      apiKeyHint: source.apiKeyHint,
    };
  }

  if (provider === "meta") {
    return {
      adAccountId: source.adAccountId,
      catalogId: source.catalogId,
      manualFallback: source.manualFallback,
      syncWindowDays: source.syncWindowDays,
      catalogSyncAt: source.catalogSyncAt,
      catalogSyncStatus: source.catalogSyncStatus,
      catalogSyncError: source.catalogSyncError,
      catalogProductCount: source.catalogProductCount,
      credentialSource: source.credentialSource,
      hasApiKey: source.hasApiKey,
      apiKeyHint: source.apiKeyHint,
    };
  }

  return {
    manualFallback:
      typeof source.manualFallback === "boolean" ? source.manualFallback : true,
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ brandId: string }> },
) {
  try {
    const { brandId } = await params;
    const { supabase } = await requireBrandAccess(request, brandId);

    const { data, error } = await supabase
      .from("brand_integrations")
      .select("id, provider, mode, settings, last_sync_at, last_sync_status, last_sync_error")
      .eq("brand_id", brandId)
      .order("provider");

    if (error) {
      throw error;
    }

    const integrations = await hydrateIntegrationConfigs(
      brandId,
      (data ?? []).map((row) => ({
        id: row.id,
        provider: row.provider as IntegrationProvider,
        mode: row.mode as IntegrationMode,
        settings:
          row.settings && typeof row.settings === "object" && !Array.isArray(row.settings)
            ? row.settings
            : {},
        lastSyncAt: row.last_sync_at ?? null,
        lastSyncStatus: row.last_sync_status ?? "idle",
        lastSyncError: row.last_sync_error ?? null,
      })),
    );

    return NextResponse.json({ integrations });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao carregar integrações." },
      { status: 400 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ brandId: string }> },
) {
  try {
    const { supabase } = await requireSuperAdmin(request);
    const { brandId } = await params;
    const body = await request.json();
    const updates = Array.isArray(body.integrations)
      ? (body.integrations as Array<{
          provider?: string;
          mode?: string;
          settings?: unknown;
        }>)
      : [];

    if (!updates.length) {
      throw new Error("Nenhuma integração informada para atualização.");
    }

    const { data: currentRows, error: currentError } = await supabase
      .from("brand_integrations")
      .select("provider, settings")
      .eq("brand_id", brandId);

    if (currentError) {
      throw currentError;
    }

    const currentSettingsMap = new Map(
      (currentRows ?? []).map((row) => [
        row.provider as IntegrationProvider,
        row.settings && typeof row.settings === "object" && !Array.isArray(row.settings)
          ? (row.settings as Record<string, unknown>)
          : {},
      ]),
    );

    const rows = updates.map((entry) => {
      const provider = String(entry.provider ?? "").trim() as IntegrationProvider;
      const mode = String(entry.mode ?? "").trim() as IntegrationMode;

      if (!allowedProviders.has(provider)) {
        throw new Error(`Provedor inválido: ${provider || "desconhecido"}.`);
      }

      if (!allowedModes.has(mode)) {
        throw new Error(`Modo inválido para ${provider}.`);
      }

      return {
        brand_id: brandId,
        provider,
        mode,
        settings: {
          ...currentSettingsMap.get(provider),
          ...normalizeSettings(provider, entry.settings),
        },
      };
    });

    const { error } = await supabase
      .from("brand_integrations")
      .upsert(rows, { onConflict: "brand_id,provider" });

    if (error) {
      throw error;
    }

    const { data, error: refreshError } = await supabase
      .from("brand_integrations")
      .select("id, provider, mode, settings, last_sync_at, last_sync_status, last_sync_error")
      .eq("brand_id", brandId)
      .order("provider");

    if (refreshError) {
      throw refreshError;
    }

    const integrations = await hydrateIntegrationConfigs(
      brandId,
      (data ?? []).map((row) => ({
        id: row.id,
        provider: row.provider as IntegrationProvider,
        mode: row.mode as IntegrationMode,
        settings:
          row.settings && typeof row.settings === "object" && !Array.isArray(row.settings)
            ? row.settings
            : {},
        lastSyncAt: row.last_sync_at ?? null,
        lastSyncStatus: row.last_sync_status ?? "idle",
        lastSyncError: row.last_sync_error ?? null,
      })),
    );

    return NextResponse.json({ integrations });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao atualizar integrações." },
      { status: 400 },
    );
  }
}
