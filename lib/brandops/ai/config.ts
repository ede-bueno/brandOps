import "server-only";

import type { IntegrationMode } from "@/lib/brandops/types";
import { getBrandIntegrationSecretMetadata, getBrandIntegrationSecretValue, upsertBrandIntegrationSecret, deleteBrandIntegrationSecret } from "@/lib/brandops/integration-secrets";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export type AtlasGeminiCredentialSource = "platform_key" | "brand_key";

const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

type PostgrestLikeError = {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
};

function asPostgrestLikeError(value: unknown): PostgrestLikeError | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  return {
    code: typeof candidate.code === "string" ? candidate.code : undefined,
    message: typeof candidate.message === "string" ? candidate.message : undefined,
    details: typeof candidate.details === "string" ? candidate.details : null,
    hint: typeof candidate.hint === "string" ? candidate.hint : null,
  };
}

function isSchemaCacheError(
  error: PostgrestLikeError | null,
  ...needles: string[]
) {
  const haystack = `${error?.message ?? ""} ${error?.details ?? ""} ${error?.hint ?? ""}`.toLowerCase();
  return (
    (error?.code === "PGRST204" || error?.code === "PGRST205") &&
    needles.some((needle) => haystack.includes(needle.toLowerCase()))
  );
}

function isMissingSecretsTableError(error: PostgrestLikeError | null) {
  const haystack = `${error?.message ?? ""} ${error?.details ?? ""} ${error?.hint ?? ""}`;
  return (
    (error?.code === "42P01" && haystack.includes("brand_integration_secrets")) ||
    isSchemaCacheError(error, "brand_integration_secrets")
  );
}

function isGeminiProviderConstraintError(error: PostgrestLikeError | null) {
  const haystack = `${error?.message ?? ""} ${error?.details ?? ""}`;
  return error?.code === "23514" && haystack.includes("brand_integrations_provider_check");
}

function isGeminiSchemaCacheMismatchError(error: PostgrestLikeError | null) {
  return isSchemaCacheError(error, "brand_integrations", "brand_integration_secrets", "schema cache");
}

function isMissingUserProfileReferenceError(error: PostgrestLikeError | null) {
  const haystack = `${error?.message ?? ""} ${error?.details ?? ""}`;
  return error?.code === "23503" && haystack.includes("brand_integration_secrets");
}

export function getGeminiIntegrationErrorMessage(
  error: unknown,
  fallback = "Nao foi possivel operar a integracao Gemini.",
) {
  const postgrestError = asPostgrestLikeError(error);

  if (isGeminiProviderConstraintError(postgrestError)) {
    return "O banco conectado ainda nao aceita o provider 'gemini' em brand_integrations. Aplique a migration 20260403113001_brandops_gemini_brand_integration.sql antes de salvar a integracao.";
  }

  if (isMissingSecretsTableError(postgrestError)) {
    return "O Supabase ainda nao reconhece a tabela brand_integration_secrets no schema cache. Confirme a migration 20260403113001_brandops_gemini_brand_integration.sql e, se ela ja tiver sido aplicada, aguarde alguns segundos para o PostgREST atualizar o schema.";
  }

  if (isGeminiSchemaCacheMismatchError(postgrestError)) {
    return "O schema cache do Supabase ainda nao refletiu completamente a integracao Gemini. Aguarde alguns segundos e tente novamente. Se persistir, reaplique a migration 20260403113001_brandops_gemini_brand_integration.sql no projeto conectado.";
  }

  if (isMissingUserProfileReferenceError(postgrestError)) {
    return "Nao foi possivel vincular o autor da chave Gemini. Confirme se o usuario atual possui registro valido em public.user_profiles.";
  }

  if (postgrestError?.message) {
    return postgrestError.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

function toGeminiIntegrationError(error: unknown, fallback?: string) {
  return new Error(getGeminiIntegrationErrorMessage(error, fallback));
}

function asSettingsObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function normalizeGeminiSettings(value: unknown) {
  const source = asSettingsObject(value);
  return {
    model:
      typeof source.model === "string" && source.model.trim()
        ? source.model.trim()
        : DEFAULT_MODEL,
    credentialSource:
      "brand_key" as const,
    hasApiKey: Boolean(source.hasApiKey),
    apiKeyHint:
      typeof source.apiKeyHint === "string" && source.apiKeyHint.trim()
        ? source.apiKeyHint.trim()
        : null,
  };
}

export async function getBrandGeminiIntegration(brandId: string) {
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("brand_integrations")
    .select("id, mode, settings, last_sync_at, last_sync_status, last_sync_error")
    .eq("brand_id", brandId)
    .eq("provider", "gemini")
    .maybeSingle();

  if (error) {
    throw error;
  }

  const settings = normalizeGeminiSettings(data?.settings);
  let secretMetadata = {
    hasSecret: false,
    secretHint: null as string | null,
  };

  try {
    secretMetadata = await getBrandIntegrationSecretMetadata(brandId, "gemini");
  } catch (secretError) {
    const postgrestError = asPostgrestLikeError(secretError);
    if (!isMissingSecretsTableError(postgrestError)) {
      throw toGeminiIntegrationError(
        secretError,
        "Nao foi possivel carregar os metadados da chave Gemini desta marca.",
      );
    }
  }

  return {
    id: data?.id ?? null,
    provider: "gemini" as const,
    mode:
      data?.mode === "api" || data?.mode === "disabled" || data?.mode === "manual_csv"
        ? (data.mode as IntegrationMode)
        : ("disabled" as IntegrationMode),
    settings: {
      ...settings,
      hasApiKey: secretMetadata.hasSecret,
      apiKeyHint: secretMetadata.secretHint,
    },
    lastSyncAt: data?.last_sync_at ?? null,
    lastSyncStatus: data?.last_sync_status ?? "idle",
    lastSyncError: data?.last_sync_error ?? null,
  };
}

export async function saveBrandGeminiIntegration(options: {
  brandId: string;
  userId: string;
  mode: IntegrationMode;
  model?: string | null;
  credentialSource?: AtlasGeminiCredentialSource | null;
  apiKey?: string | null;
  clearApiKey?: boolean;
}) {
  const supabase = createSupabaseServiceRoleClient();
  const current = await getBrandGeminiIntegration(options.brandId);

  let nextApiKeyHint = current.settings.apiKeyHint;
  let hasApiKey = current.settings.hasApiKey;

  if (options.clearApiKey) {
    try {
      await deleteBrandIntegrationSecret({
        brandId: options.brandId,
        provider: "gemini",
      });
    } catch (error) {
      throw toGeminiIntegrationError(
        error,
        "Nao foi possivel remover a chave Gemini salva para esta marca.",
      );
    }
    nextApiKeyHint = null;
    hasApiKey = false;
  } else if (options.apiKey?.trim()) {
    let result;
    try {
      result = await upsertBrandIntegrationSecret({
        brandId: options.brandId,
        provider: "gemini",
        secret: options.apiKey,
        userId: options.userId,
      });
    } catch (error) {
      throw toGeminiIntegrationError(
        error,
        "Nao foi possivel salvar a chave Gemini desta marca.",
      );
    }
    nextApiKeyHint = result.secretHint;
    hasApiKey = true;
  }

  const { error } = await supabase
    .from("brand_integrations")
    .upsert(
      {
        brand_id: options.brandId,
        provider: "gemini",
        mode: options.mode,
        settings: {
          model: options.model?.trim() || current.settings.model || DEFAULT_MODEL,
          credentialSource: options.credentialSource ?? current.settings.credentialSource,
          hasApiKey,
          apiKeyHint: nextApiKeyHint,
        },
      },
      { onConflict: "brand_id,provider" },
    );

  if (error) {
    throw toGeminiIntegrationError(
      error,
      "Nao foi possivel salvar a configuracao Gemini desta marca.",
    );
  }

  return getBrandGeminiIntegration(options.brandId);
}

export async function resolveAtlasAnalystGeminiAccess(brandId: string) {
  const integration = await getBrandGeminiIntegration(brandId);
  const mode = integration.mode;

  if (mode !== "api") {
    throw new Error("A integração Gemini desta marca está desabilitada no painel.");
  }

  let brandSecret;
  try {
    brandSecret = await getBrandIntegrationSecretValue(brandId, "gemini");
  } catch (error) {
    throw toGeminiIntegrationError(
      error,
      "Nao foi possivel carregar a chave Gemini salva para esta marca.",
    );
  }

  if (!brandSecret?.secret) {
    throw new Error("Nenhuma chave própria do Gemini foi salva para esta marca. Cada loja precisa informar sua própria chave no painel de integrações.");
  }

  return {
    apiKey: brandSecret.secret,
    model: integration.settings.model || DEFAULT_MODEL,
    source: "brand_key" as const,
    secretHint: brandSecret.secretHint,
  };
}


