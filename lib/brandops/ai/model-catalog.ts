import "server-only";

import type { GeminiAvailableModel } from "@/lib/brandops/types";

function asNumberOrNull(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function isSupportedGenerationMethod(method: unknown) {
  return (
    method === "generateContent" ||
    method === "generateMessage" ||
    method === "countTokens"
  );
}

export async function listGeminiAvailableModels(apiKey: string) {
  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000",
    {
      headers: {
        "x-goog-api-key": apiKey,
      },
      cache: "no-store",
    },
  );

  const payload = (await response.json().catch(() => null)) as
    | {
        error?: { message?: string };
        models?: Array<Record<string, unknown>>;
      }
    | null;

  if (!response.ok) {
    throw new Error(payload?.error?.message ?? "Nao foi possivel listar os modelos do Gemini.");
  }

  const models = (payload?.models ?? [])
    .map((model): GeminiAvailableModel | null => {
      const name = typeof model.name === "string" ? model.name : "";
      const modelId = name.startsWith("models/") ? name.replace(/^models\//, "") : name;
      const supportedGenerationMethods = Array.isArray(model.supportedGenerationMethods)
        ? model.supportedGenerationMethods
        : [];
      const supportsGenerateContent = supportedGenerationMethods.some(isSupportedGenerationMethod);

      if (!modelId || !supportsGenerateContent || !modelId.startsWith("gemini")) {
        return null;
      }

      return {
        id: modelId,
        displayName:
          typeof model.displayName === "string" && model.displayName.trim()
            ? model.displayName
            : modelId,
        description:
          typeof model.description === "string" && model.description.trim()
            ? model.description.trim()
            : null,
        inputTokenLimit: asNumberOrNull(model.inputTokenLimit),
        outputTokenLimit: asNumberOrNull(model.outputTokenLimit),
        supportsGenerateContent,
      };
    })
    .filter((model): model is GeminiAvailableModel => Boolean(model))
    .sort((left, right) => left.id.localeCompare(right.id));

  return models;
}
