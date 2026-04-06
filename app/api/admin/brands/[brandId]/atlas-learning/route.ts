import { after, NextResponse } from "next/server";
import { requireBrandAccess } from "@/lib/brandops/admin";
import { resolveAtlasAnalystGeminiAccess } from "@/lib/brandops/ai/config";
import { generateAtlasBusinessLearning } from "@/lib/brandops/ai/learning";
import {
  completeAtlasBrandLearningRun,
  failAtlasBrandLearningRun,
  listAtlasBrandLearningFindings,
  getAtlasBrandLearningFeedbackSummary,
  getLatestAtlasBrandLearningSnapshot,
  listAtlasBrandLearningSnapshots,
  listAtlasBrandLearningRuns,
  listAtlasContextEntries,
  saveAtlasBrandLearningFeedback,
  saveAtlasBrandLearningSnapshot,
  startAtlasBrandLearningRun,
} from "@/lib/brandops/ai/store";
import type {
  AtlasBrandLearningFeedbackPayload,
  AtlasBrandLearningRequestPayload,
  AtlasBrandLearningScope,
} from "@/lib/brandops/ai/types";

function resolveLearningWindow(
  scope: AtlasBrandLearningScope | undefined,
  analysisWindowDays: number | null,
) {
  const strategicWindow =
    typeof analysisWindowDays === "number" && Number.isFinite(analysisWindowDays)
      ? Math.max(7, Math.min(120, Math.round(analysisWindowDays)))
      : 30;

  if (scope === "analysis_window") {
    return {
      scope: "analysis_window" as const,
      scopeLabel: `Janela estratégica (${strategicWindow} dias)`,
      analysisWindowDays: strategicWindow,
    };
  }

  if (scope === "30d") {
    return {
      scope: "30d" as const,
      scopeLabel: "Últimos 30 dias",
      analysisWindowDays: 30,
    };
  }

  if (scope === "90d") {
    return {
      scope: "90d" as const,
      scopeLabel: "Últimos 90 dias",
      analysisWindowDays: 90,
    };
  }

  if (scope === "180d") {
    return {
      scope: "180d" as const,
      scopeLabel: "Últimos 180 dias",
      analysisWindowDays: 180,
    };
  }

  return {
    scope: "all" as const,
    scopeLabel: "Todo histórico disponível",
    analysisWindowDays: null,
  };
}

function assertBrandLearningEnabled(
  context: Awaited<ReturnType<typeof requireBrandAccess>>,
) {
  if (!context.brandGovernance.featureFlags.atlasAi) {
    throw new Error(
      "O plano atual desta marca ainda nao libera o Atlas IA. Ative primeiro a camada analitica na governanca da marca.",
    );
  }

  if (!context.brandGovernance.featureFlags.brandLearning) {
    throw new Error(
      "O plano atual desta marca ainda nao libera o modo Aprender negocio do Atlas.",
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ brandId: string }> },
) {
  try {
    const { brandId } = await params;
    const context = await requireBrandAccess(request, brandId);
    assertBrandLearningEnabled(context);
    const [snapshots, runs] = await Promise.all([
      listAtlasBrandLearningSnapshots(context.supabase, brandId, 2),
      listAtlasBrandLearningRuns(context.supabase, brandId),
    ]);
    const [snapshot, previousSnapshot] = snapshots;
    const findings =
      snapshot?.id
        ? await listAtlasBrandLearningFindings(context.supabase, snapshot.id)
        : [];
    const feedback =
      snapshot?.id
        ? await getAtlasBrandLearningFeedbackSummary(
            context.supabase,
            brandId,
            snapshot.id,
            context.user.id,
          )
        : null;

    return NextResponse.json({
      snapshot,
      previousSnapshot: previousSnapshot ?? null,
      findings,
      runs,
      feedback,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Nao foi possivel carregar o aprendizado do negócio no Atlas.",
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
    assertBrandLearningEnabled(context);
    const payload = (await request.json()) as AtlasBrandLearningFeedbackPayload;
    const feedback = await saveAtlasBrandLearningFeedback(
      context.supabase,
      brandId,
      context.user.id,
      payload,
    );

    return NextResponse.json({ feedback });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Nao foi possivel salvar o feedback do aprendizado do Atlas.",
      },
      { status: 400 },
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ brandId: string }> },
) {
  let runId: string | null = null;
  let context:
    | Awaited<ReturnType<typeof requireBrandAccess>>
    | null = null;
  let resolvedBrandId: string | null = null;

  try {
    const { brandId } = await params;
    resolvedBrandId = brandId;
    context = await requireBrandAccess(request, brandId);
    assertBrandLearningEnabled(context);
    const body = (await request.json().catch(() => null)) as AtlasBrandLearningRequestPayload | null;
    const authorization = request.headers.get("authorization");
    if (!authorization) {
      throw new Error("Sessão ausente para executar o aprendizado do Atlas.");
    }
    const run = await startAtlasBrandLearningRun(context.supabase, context.user.id, brandId, {
      scopeLabel: "Preparando aprendizado",
    });
    runId = run.id;

    const serviceRequest = new Request(request.url, {
      method: "GET",
      headers: {
        authorization,
      },
    });

    after(async () => {
      if (!context) {
        return;
      }

      try {
        const gemini = await resolveAtlasAnalystGeminiAccess(brandId);
        const learningWindow = resolveLearningWindow(body?.scope, gemini.analysisWindowDays);
        const [brandContext, previousSnapshot, brandResponse] = await Promise.all([
          listAtlasContextEntries(context.supabase, brandId, 12),
          getLatestAtlasBrandLearningSnapshot(context.supabase, brandId),
          context.supabase.from("brands").select("name").eq("id", brandId).maybeSingle(),
        ]);
        const brand = brandResponse.data;

        await context.supabase
          .from("atlas_brand_learning_runs")
          .update({
            model: gemini.model,
            temperature: gemini.temperature,
            scope_label: learningWindow.scopeLabel,
          })
          .eq("id", run.id);

        const snapshotPayload = await generateAtlasBusinessLearning(serviceRequest, brandId, {
          brandLabel: brand?.name ?? brandId,
          apiKey: gemini.apiKey,
          model: gemini.model,
          temperature: gemini.temperature,
          contextEntries: brandContext,
          previousSnapshot,
          scope: learningWindow.scope,
          analysisWindowDays: learningWindow.analysisWindowDays,
        });

        const snapshot = await saveAtlasBrandLearningSnapshot(context.supabase, run.id, {
          ...snapshotPayload,
          runId: run.id,
        });

        await completeAtlasBrandLearningRun(context.supabase, run.id, {
          summary: snapshot.summary,
        });
      } catch (error) {
        try {
          await failAtlasBrandLearningRun(
            context.supabase,
            run.id,
            error instanceof Error
              ? error.message
              : "Nao foi possivel concluir o aprendizado do negócio.",
          );
        } catch {
          // noop
        }
      }
    });

    return NextResponse.json(
      {
        run: {
          ...run,
          scopeLabel: "Preparando aprendizado",
        },
      },
      { status: 202 },
    );
  } catch (error) {
    if (runId && context && resolvedBrandId) {
      try {
        await failAtlasBrandLearningRun(
          context.supabase,
          runId,
          error instanceof Error
            ? error.message
            : "Nao foi possivel concluir o aprendizado do negócio.",
        );
      } catch {
        // noop: preserve original error
      }
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Nao foi possivel executar o aprendizado do negócio no Atlas.",
      },
      { status: 400 },
    );
  }
}
