import { NextResponse } from "next/server";
import { requireBrandAccess } from "@/lib/brandops/admin";
import { getBrandGeminiIntegration, getGeminiIntegrationErrorMessage, saveBrandGeminiIntegration } from "@/lib/brandops/ai/config";
import type { IntegrationMode } from "@/lib/brandops/types";

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
        credentialSource?: unknown;
      };
      apiKey?: unknown;
      clearApiKey?: unknown;
    };

    const mode = normalizeMode(body.mode);
    const credentialSource =
      body.settings?.credentialSource === "brand_key" ? "brand_key" : "platform_key";

    const integration = await saveBrandGeminiIntegration({
      brandId,
      userId: context.user.id,
      mode,
      model:
        typeof body.settings?.model === "string" ? body.settings.model.trim() : null,
      credentialSource,
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
