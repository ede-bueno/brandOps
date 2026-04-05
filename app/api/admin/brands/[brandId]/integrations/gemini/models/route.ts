import { NextResponse } from "next/server";
import { requireBrandAccess } from "@/lib/brandops/admin";
import {
  getGeminiIntegrationErrorMessage,
  resolveBrandGeminiCatalogAccess,
} from "@/lib/brandops/ai/config";
import { listGeminiAvailableModels } from "@/lib/brandops/ai/model-catalog";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ brandId: string }> },
) {
  try {
    const { brandId } = await params;
    const context = await requireBrandAccess(request, brandId);

    if (!context.brandGovernance.featureFlags.geminiModelCatalog) {
      throw new Error(
        "O plano atual desta marca nao libera a listagem dinamica de modelos Gemini.",
      );
    }

    const access = await resolveBrandGeminiCatalogAccess(brandId);
    const models = await listGeminiAvailableModels(access.apiKey);

    return NextResponse.json({
      source: access.source,
      mode: access.mode,
      secretHint: access.secretHint,
      selectedModel: access.model,
      models,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: getGeminiIntegrationErrorMessage(
          error,
          "Nao foi possivel listar os modelos disponiveis do Gemini para esta marca.",
        ),
      },
      { status: 400 },
    );
  }
}
