import { NextResponse } from "next/server";
import { requireBrandAccess } from "@/lib/brandops/admin";
import {
  ATLAS_GEMINI_DEFAULT_MODEL,
  getBrandGeminiIntegration,
  getGeminiIntegrationErrorMessage,
  saveBrandGeminiIntegration,
} from "@/lib/brandops/ai/config";
import type { AtlasAnalystBehaviorSkill, IntegrationMode } from "@/lib/brandops/types";

function normalizeMode(value: unknown): IntegrationMode {
  return value === "api" ? "api" : "disabled";
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ brandId: string }> },
) {
  try {
    const { brandId } = await params;
    await requireBrandAccess(request, brandId);

    const integration = await getBrandGeminiIntegration(brandId);
    return NextResponse.json({ integration });
  } catch (error) {
    return NextResponse.json(
      {
        error: getGeminiIntegrationErrorMessage(
          error,
          "Nao foi possivel carregar a integracao Gemini.",
        ),
      },
      { status: 400 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ brandId: string }> },
) {
  try {
    const { brandId } = await params;
    const context = await requireBrandAccess(request, brandId);
    const body = (await request.json()) as {
      mode?: unknown;
      settings?: {
        model?: unknown;
        temperature?: unknown;
        analysisWindowDays?: unknown;
        defaultSkill?: unknown;
        operatorGuidance?: unknown;
        credentialSource?: unknown;
      };
      apiKey?: unknown;
      clearApiKey?: unknown;
    };

    const mode = normalizeMode(body.mode);
    const canSelectGeminiModel =
      context.brandGovernance.featureFlags.atlasAi &&
      context.brandGovernance.featureFlags.geminiModelCatalog;
    const integration = await saveBrandGeminiIntegration({
      brandId,
      userId: context.user.id,
      mode,
      model:
        canSelectGeminiModel
          ? typeof body.settings?.model === "string"
            ? body.settings.model.trim()
            : null
          : ATLAS_GEMINI_DEFAULT_MODEL,
      temperature:
        typeof body.settings?.temperature === "number" ? body.settings.temperature : null,
      analysisWindowDays:
        typeof body.settings?.analysisWindowDays === "number"
          ? body.settings.analysisWindowDays
          : null,
      defaultSkill:
        typeof body.settings?.defaultSkill === "string"
          ? (body.settings.defaultSkill as AtlasAnalystBehaviorSkill)
          : null,
      operatorGuidance:
        typeof body.settings?.operatorGuidance === "string"
          ? body.settings.operatorGuidance
          : null,
      credentialSource: "brand_key",
      apiKey: typeof body.apiKey === "string" ? body.apiKey : null,
      clearApiKey: Boolean(body.clearApiKey),
    });

    return NextResponse.json({ integration });
  } catch (error) {
    return NextResponse.json(
      {
        error: getGeminiIntegrationErrorMessage(
          error,
          "Nao foi possivel salvar a integracao Gemini.",
        ),
      },
      { status: 400 },
    );
  }
}
