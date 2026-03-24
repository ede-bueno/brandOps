import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/brandops/admin";
import type { IntegrationMode, IntegrationProvider } from "@/lib/brandops/types";

const allowedProviders = new Set<IntegrationProvider>(["ink", "meta", "ga4"]);
const allowedModes = new Set<IntegrationMode>(["manual_csv", "api", "disabled"]);

function normalizeSettings(provider: IntegrationProvider, settings: unknown) {
  const source =
    settings && typeof settings === "object" && !Array.isArray(settings)
      ? (settings as Record<string, unknown>)
      : {};

  if (provider === "ga4") {
    return {
      propertyId:
        typeof source.propertyId === "string" && source.propertyId.trim()
          ? source.propertyId.trim()
          : null,
      timezone:
        typeof source.timezone === "string" && source.timezone.trim()
          ? source.timezone.trim()
          : "America/Sao_Paulo",
    };
  }

  if (provider === "meta") {
    return {
      adAccountId:
        typeof source.adAccountId === "string" && source.adAccountId.trim()
          ? source.adAccountId.trim()
          : null,
      manualFallback:
        typeof source.manualFallback === "boolean" ? source.manualFallback : true,
      syncWindowDays:
        typeof source.syncWindowDays === "number" && Number.isFinite(source.syncWindowDays)
          ? source.syncWindowDays
          : 30,
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
    const { supabase } = await requireSuperAdmin(request);
    const { brandId } = await params;

    const { data, error } = await supabase
      .from("brand_integrations")
      .select("id, provider, mode, settings, last_sync_at, last_sync_status, last_sync_error")
      .eq("brand_id", brandId)
      .order("provider");

    if (error) {
      throw error;
    }

    return NextResponse.json({ integrations: data ?? [] });
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
        settings: normalizeSettings(provider, entry.settings),
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

    return NextResponse.json({ integrations: data ?? [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao atualizar integrações." },
      { status: 400 },
    );
  }
}
