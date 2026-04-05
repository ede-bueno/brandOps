import "server-only";

import {
  deleteBrandIntegrationSecret,
  getBrandIntegrationSecretMetadata,
  getBrandIntegrationSecretValue,
  upsertBrandIntegrationSecret,
} from "@/lib/brandops/integration-secrets";
import type {
  BrandIntegrationConfig,
  IntegrationMode,
  IntegrationProvider,
} from "@/lib/brandops/types";
import { parseGa4ServiceAccount } from "@/lib/integrations/ga4";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export type IntegrationCredentialSource = "brand_key";
export type SecretBackedIntegrationProvider = "meta" | "ga4";

const SECRET_BACKED_PROVIDERS = new Set<IntegrationProvider>(["meta", "ga4"]);

function asSettingsObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function normalizeCredentialSource(): IntegrationCredentialSource {
  return "brand_key";
}

export function isSecretBackedIntegrationProvider(
  provider: IntegrationProvider,
): provider is SecretBackedIntegrationProvider {
  return SECRET_BACKED_PROVIDERS.has(provider);
}

export function normalizeIntegrationSettings(
  provider: IntegrationProvider,
  value: unknown,
) {
  const source = asSettingsObject(value);

  if (provider === "meta") {
    return {
      adAccountId:
        typeof source.adAccountId === "string" && source.adAccountId.trim()
          ? source.adAccountId.trim()
          : null,
      catalogId:
        typeof source.catalogId === "string" && source.catalogId.trim()
          ? source.catalogId.trim()
          : null,
      manualFallback:
        typeof source.manualFallback === "boolean" ? source.manualFallback : true,
      syncWindowDays:
        typeof source.syncWindowDays === "number" &&
        Number.isFinite(source.syncWindowDays)
          ? Math.max(1, Math.min(365, Math.round(source.syncWindowDays)))
          : 30,
      catalogSyncAt:
        typeof source.catalogSyncAt === "string" ? source.catalogSyncAt : null,
      catalogSyncStatus:
        typeof source.catalogSyncStatus === "string"
          ? source.catalogSyncStatus
          : "idle",
      catalogSyncError:
        typeof source.catalogSyncError === "string"
          ? source.catalogSyncError
          : null,
      catalogProductCount:
        typeof source.catalogProductCount === "number" &&
        Number.isFinite(source.catalogProductCount)
          ? source.catalogProductCount
          : undefined,
      credentialSource: normalizeCredentialSource(),
      hasApiKey: Boolean(source.hasApiKey),
      apiKeyHint:
        typeof source.apiKeyHint === "string" && source.apiKeyHint.trim()
          ? source.apiKeyHint.trim()
          : null,
    };
  }

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
      credentialSource: normalizeCredentialSource(),
      hasApiKey: Boolean(source.hasApiKey),
      apiKeyHint:
        typeof source.apiKeyHint === "string" && source.apiKeyHint.trim()
          ? source.apiKeyHint.trim()
          : null,
    };
  }

  return source;
}

export async function hydrateIntegrationConfig(
  brandId: string,
  integration: BrandIntegrationConfig,
): Promise<BrandIntegrationConfig> {
  if (!isSecretBackedIntegrationProvider(integration.provider)) {
    return integration;
  }

  const secretMetadata = await getBrandIntegrationSecretMetadata(brandId, integration.provider);

  const settings = normalizeIntegrationSettings(integration.provider, integration.settings);

  return {
    ...integration,
    settings: {
      ...settings,
      hasApiKey: secretMetadata.hasSecret,
      apiKeyHint: secretMetadata.secretHint,
    },
  };
}

export async function hydrateIntegrationConfigs(
  brandId: string,
  integrations: BrandIntegrationConfig[],
) {
  const next: BrandIntegrationConfig[] = [];

  for (const integration of integrations) {
    next.push(await hydrateIntegrationConfig(brandId, integration));
  }

  return next;
}

export async function saveSecretBackedIntegrationCredential(options: {
  brandId: string;
  provider: SecretBackedIntegrationProvider;
  userId: string;
  mode?: IntegrationMode | null;
  settings?: Record<string, unknown> | null;
  credentialSource?: IntegrationCredentialSource | null;
  secret?: string | null;
  clearSecret?: boolean;
}) {
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("brand_integrations")
    .select("id, mode, settings, last_sync_at, last_sync_status, last_sync_error")
    .eq("brand_id", options.brandId)
    .eq("provider", options.provider)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const currentSettings = normalizeIntegrationSettings(options.provider, data?.settings);
  let nextApiKeyHint = currentSettings.apiKeyHint;
  let hasApiKey = currentSettings.hasApiKey;

  if (options.clearSecret) {
    await deleteBrandIntegrationSecret({
      brandId: options.brandId,
      provider: options.provider,
    });
    nextApiKeyHint = null;
    hasApiKey = false;
  } else if (options.secret?.trim()) {
    const result = await upsertBrandIntegrationSecret({
      brandId: options.brandId,
      provider: options.provider,
      secret: options.secret,
      userId: options.userId,
    });
    nextApiKeyHint = result.secretHint;
    hasApiKey = true;
  }

  const persistedSettings = {
    ...currentSettings,
  } as Record<string, unknown>;

  const nextSettings: Record<string, unknown> = {
    ...persistedSettings,
    ...(options.settings ?? {}),
    credentialSource:
      options.credentialSource ?? currentSettings.credentialSource ?? "brand_key",
    hasApiKey,
    apiKeyHint: nextApiKeyHint,
  };

  const { error: upsertError } = await supabase.from("brand_integrations").upsert(
    {
      brand_id: options.brandId,
      provider: options.provider,
      mode: options.mode ?? data?.mode ?? "disabled",
      settings: nextSettings,
    },
    { onConflict: "brand_id,provider" },
  );

  if (upsertError) {
    throw upsertError;
  }

  return hydrateIntegrationConfig(options.brandId, {
    id: data?.id ?? "",
    provider: options.provider,
    mode: (options.mode ?? data?.mode ?? "disabled") as IntegrationMode,
    settings: nextSettings,
    lastSyncAt: data?.last_sync_at ?? null,
    lastSyncStatus: data?.last_sync_status ?? "idle",
    lastSyncError: data?.last_sync_error ?? null,
  });
}

export async function resolveMetaAccessTokenForBrand(options: {
  brandId: string;
  settings: unknown;
}) {
  const brandSecret = await getBrandIntegrationSecretValue(options.brandId, "meta");

  if (!brandSecret?.secret) {
    throw new Error(
      "Nenhum token próprio da Meta foi salvo para esta marca. Cada loja precisa informar sua própria credencial no painel de integrações.",
    );
  }

  return {
    accessToken: brandSecret.secret,
    source: "brand_key" as const,
    secretHint: brandSecret.secretHint,
  };
}

export async function resolveGa4CredentialsForBrand(options: {
  brandId: string;
  settings: unknown;
}) {
  const brandSecret = await getBrandIntegrationSecretValue(options.brandId, "ga4");

  if (!brandSecret?.secret) {
    throw new Error(
      "Nenhuma credencial própria do GA4 foi salva para esta marca. Cada loja precisa informar seu JSON no painel de integrações.",
    );
  }

  return {
    credentials: parseGa4ServiceAccount(brandSecret.secret),
    source: "brand_key" as const,
    secretHint: brandSecret.secretHint,
  };
}





