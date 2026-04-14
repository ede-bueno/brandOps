import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import type { IntegrationProvider } from "@/lib/brandops/types";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

const SECRET_ENV_KEY = "BRANDOPS_SECRET_ENCRYPTION_KEY";
const IV_LENGTH = 12;

type EncryptedPayload = {
  iv: string;
  tag: string;
  data: string;
};

function getEncryptionKey() {
  const secret = process.env[SECRET_ENV_KEY];
  if (!secret) {
    throw new Error(
      "BRANDOPS_SECRET_ENCRYPTION_KEY não configurada. Defina essa chave para salvar segredos por marca com segurança.",
    );
  }

  return createHash("sha256").update(secret).digest();
}

function serializeEncryptedPayload(payload: EncryptedPayload) {
  return JSON.stringify(payload);
}

function parseEncryptedPayload(payload: string): EncryptedPayload {
  const parsed = JSON.parse(payload) as Partial<EncryptedPayload>;
  if (!parsed.iv || !parsed.tag || !parsed.data) {
    throw new Error("Payload criptografado inválido.");
  }

  return {
    iv: parsed.iv,
    tag: parsed.tag,
    data: parsed.data,
  };
}

export function maskSecret(value: string | null | undefined) {
  const trimmed = (value ?? "").trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.length <= 10) {
    return `${trimmed.slice(0, 3)}***${trimmed.slice(-2)}`;
  }

  return `${trimmed.slice(0, 6)}***${trimmed.slice(-4)}`;
}

export function encryptSecret(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("Informe um segredo válido para criptografar.");
  }

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(trimmed, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return serializeEncryptedPayload({
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    data: encrypted.toString("base64"),
  });
}

export function decryptSecret(payload: string) {
  const parsed = parseEncryptedPayload(payload);
  const decipher = createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(parsed.iv, "base64"),
  );

  decipher.setAuthTag(Buffer.from(parsed.tag, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(parsed.data, "base64")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

export async function getBrandIntegrationSecretMetadata(
  brandId: string,
  provider: IntegrationProvider,
) {
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("brand_integration_secrets")
    .select("secret_hint")
    .eq("brand_id", brandId)
    .eq("provider", provider)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return {
    hasSecret: Boolean(data?.secret_hint),
    secretHint: data?.secret_hint ?? null,
  };
}

export async function getBrandIntegrationSecretValue(
  brandId: string,
  provider: IntegrationProvider,
) {
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("brand_integration_secrets")
    .select("encrypted_secret, secret_hint")
    .eq("brand_id", brandId)
    .eq("provider", provider)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data?.encrypted_secret) {
    return null;
  }

  return {
    secret: decryptSecret(data.encrypted_secret),
    secretHint: data.secret_hint ?? null,
  };
}

export async function upsertBrandIntegrationSecret(options: {
  brandId: string;
  provider: IntegrationProvider;
  secret: string;
  userId: string;
}) {
  const secret = options.secret.trim();
  if (!secret) {
    throw new Error("Informe uma chave válida para salvar.");
  }

  const supabase = createSupabaseServiceRoleClient();
  const { error } = await supabase
    .from("brand_integration_secrets")
    .upsert(
      {
        brand_id: options.brandId,
        provider: options.provider,
        encrypted_secret: encryptSecret(secret),
        secret_hint: maskSecret(secret),
        created_by: options.userId,
        updated_by: options.userId,
      },
      { onConflict: "brand_id,provider" },
    );

  if (error) {
    throw error;
  }

  return {
    secretHint: maskSecret(secret),
  };
}

export async function deleteBrandIntegrationSecret(options: {
  brandId: string;
  provider: IntegrationProvider;
}) {
  const supabase = createSupabaseServiceRoleClient();
  const { error } = await supabase
    .from("brand_integration_secrets")
    .delete()
    .eq("brand_id", options.brandId)
    .eq("provider", options.provider);

  if (error) {
    throw error;
  }
}
