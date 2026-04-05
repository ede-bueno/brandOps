import { NextResponse } from "next/server";
import { requireBrandAccess } from "@/lib/brandops/admin";
import { resolveAtlasAnalystGeminiAccess } from "@/lib/brandops/ai/config";
import { generateAtlasBusinessLearning } from "@/lib/brandops/ai/learning";
import {
  completeAtlasBrandLearningRun,
  failAtlasBrandLearningRun,
  getAtlasBrandLearningFeedbackSummary,
  listAtlasBrandLearningSnapshots,
  listAtlasBrandLearningRuns,
  listAtlasContextEntries,
  saveAtlasBrandLearningFeedback,
  saveAtlasBrandLearningSnapshot,
  startAtlasBrandLearningRun,
} from "@/lib/brandops/ai/store";
import type { AtlasBrandLearningFeedbackPayload } from "@/lib/brandops/ai/types";

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
    const gemini = await resolveAtlasAnalystGeminiAccess(brandId);
    const brandContext = await listAtlasContextEntries(context.supabase, brandId, 12);
    const { data: brand } = await context.supabase
      .from("brands")
      .select("name")
      .eq("id", brandId)
      .maybeSingle();

    const run = await startAtlasBrandLearningRun(context.supabase, context.user.id, brandId, {
      model: gemini.model,
      temperature: gemini.temperature,
    });
    runId = run.id;

    const snapshotPayload = await generateAtlasBusinessLearning(request, brandId, {
      brandLabel: brand?.name ?? brandId,
      apiKey: gemini.apiKey,
      model: gemini.model,
      temperature: gemini.temperature,
      contextEntries: brandContext,
    });

    const snapshot = await saveAtlasBrandLearningSnapshot(context.supabase, run.id, {
      ...snapshotPayload,
      runId: run.id,
    });
    const completedRun = await completeAtlasBrandLearningRun(context.supabase, run.id, {
      summary: snapshot.summary,
    });

    return NextResponse.json({
      snapshot,
      run: completedRun,
    });
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
