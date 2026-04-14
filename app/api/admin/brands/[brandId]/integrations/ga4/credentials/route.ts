import { NextResponse } from "next/server";
import { requireBrandAccess } from "@/lib/brandops/admin";
import { saveSecretBackedIntegrationCredential } from "@/lib/brandops/integration-config";
import type { IntegrationMode } from "@/lib/brandops/types";

function normalizeMode(value: unknown): IntegrationMode {
  if (value === "api" || value === "disabled" || value === "manual_csv") {
    return value;
  }

  return "disabled";
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
        credentialSource?: unknown;
      };
      apiKey?: unknown;
      clearApiKey?: unknown;
    };

    const integration = await saveSecretBackedIntegrationCredential({
      brandId,
      provider: "ga4",
      userId: context.user.id,
      mode: normalizeMode(body.mode),
      credentialSource: "brand_key",
      secret: typeof body.apiKey === "string" ? body.apiKey : null,
      clearSecret: Boolean(body.clearApiKey),
    });

    return NextResponse.json({ integration });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Nao foi possivel salvar a credencial do GA4.",
      },
      { status: 400 },
    );
  }
}
