import { after, NextResponse } from "next/server";
import { requireBrandAccess } from "@/lib/brandops/admin";
import { resolveAtlasAnalystGeminiAccess } from "@/lib/brandops/ai/config";
import { generateAtlasBusinessLearning } from "@/lib/brandops/ai/learning";
import {
  completeAtlasBrandLearningRun,
  listAtlasBrandLearningEvidence,
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

function getLearningErrorMessage(
  error: unknown,
  fallback: string,
) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  const postgrestError = asPostgrestLikeError(error);
  if (postgrestError?.message) {
    if (postgrestError.details) {
      return `${postgrestError.message} ${postgrestError.details}`;
    }

    return postgrestError.message;
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  return fallback;
}

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

async function executeAtlasBrandLearningRun(options: {
  context: Awaited<ReturnType<typeof requireBrandAccess>>;
  brandId: string;
  runId: string;
  request: Request;
  scope?: AtlasBrandLearningScope;
}) {
  const { context, brandId, runId, request, scope } = options;
  const authorization = request.headers.get("authorization");

  if (!authorization) {
    throw new Error("Sessão ausente para executar o aprendizado do Atlas.");
  }

  const serviceRequest = new Request(request.url, {
    method: "GET",
    headers: {
      authorization,
    },
  });

  const gemini = await resolveAtlasAnalystGeminiAccess(brandId);
  const learningWindow = resolveLearningWindow(scope, gemini.analysisWindowDays);
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
    .eq("id", runId);

  const learningResult = await generateAtlasBusinessLearning(serviceRequest, brandId, {
    brandLabel: brand?.name ?? brandId,
    apiKey: gemini.apiKey,
    model: gemini.model,
    temperature: gemini.temperature,
    contextEntries: brandContext,
    previousSnapshot,
    scope: learningWindow.scope,
    analysisWindowDays: learningWindow.analysisWindowDays,
  });

  const snapshot = await saveAtlasBrandLearningSnapshot(
    context.supabase,
    runId,
    {
      ...learningResult.snapshot,
      runId,
    },
    learningResult.evidences,
  );

  await completeAtlasBrandLearningRun(context.supabase, runId, {
    summary: snapshot.summary,
  });
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
    const evidences =
      snapshot?.id
        ? await listAtlasBrandLearningEvidence(context.supabase, snapshot.id)
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
      evidences,
      runs,
      feedback,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: getLearningErrorMessage(
          error,
          "Nao foi possivel carregar o aprendizado do negócio no Atlas.",
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
        error: getLearningErrorMessage(
          error,
          "Nao foi possivel salvar o feedback do aprendizado do Atlas.",
        ),
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
    const run = await startAtlasBrandLearningRun(context.supabase, context.user.id, brandId, {
      scopeLabel: "Preparando aprendizado",
    });
    runId = run.id;

    const runLearning = async () => {
      if (!context) {
        return;
      }

      try {
        await executeAtlasBrandLearningRun({
          context,
          brandId,
          runId: run.id,
          request,
          scope: body?.scope,
        });
      } catch (error) {
        try {
          await failAtlasBrandLearningRun(
            context.supabase,
            run.id,
            getLearningErrorMessage(
              error,
              "Nao foi possivel concluir o aprendizado do negócio.",
            ),
          );
        } catch {
          // noop
        }
      }
    };

    try {
      after(async () => {
        await runLearning();
      });
    } catch {
      void runLearning();
    }

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
        error: getLearningErrorMessage(
          error,
          "Nao foi possivel executar o aprendizado do negócio no Atlas.",
        ),
      },
      { status: 400 },
    );
  }
}
