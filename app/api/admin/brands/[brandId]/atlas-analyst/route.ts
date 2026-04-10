import { NextResponse } from "next/server";
import { requireBrandAccess } from "@/lib/brandops/admin";
import { runAtlasAnalyst } from "@/lib/brandops/ai/agent";
import { resolveAtlasAnalystGeminiAccess } from "@/lib/brandops/ai/config";
import { searchInkHelpArticles } from "@/lib/brandops/ink-knowledge";
import type { InkHelpArticleMatch } from "@/lib/brandops/ink-knowledge";
import {
  getLatestAtlasBrandLearningSnapshot,
  listAtlasBrandLearningFindings,
  listAtlasContextEntries,
  listAtlasAnalystRuns,
  persistAtlasAnalystRun,
  saveAtlasAnalystFeedback,
} from "@/lib/brandops/ai/store";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import type {
  AtlasAnalystSkillId,
  AtlasAnalystFeedbackPayload,
  AtlasAnalystRequestPayload,
} from "@/lib/brandops/ai/types";

function assertAtlasAiEnabled(context: Awaited<ReturnType<typeof requireBrandAccess>>) {
  if (!context.brandGovernance.featureFlags.atlasAi) {
    throw new Error(
      "O plano atual desta marca ainda nao libera o Atlas IA. Ajuste a governanca da marca em Acessos para ativar a camada analitica.",
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
    assertAtlasAiEnabled(context);
    const [runs, contextItems] = await Promise.all([
      listAtlasAnalystRuns(context.supabase, brandId, context.user.id),
      listAtlasContextEntries(context.supabase, brandId),
    ]);

    return NextResponse.json({ runs, contextItems });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Nao foi possivel carregar o historico do Atlas Analyst.",
      },
      { status: 400 },
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ brandId: string }> },
) {
  try {
    const { brandId } = await params;
    const context = await requireBrandAccess(request, brandId);
    assertAtlasAiEnabled(context);

    const body = (await request.json()) as AtlasAnalystRequestPayload;
    const question = String(body.question ?? "").trim();

    if (!question) {
      return NextResponse.json(
        { error: "Informe uma pergunta para o Atlas Analyst." },
        { status: 400 },
      );
    }

    const [recentRuns, brandContext, brandLearningSnapshot] = await Promise.all([
      listAtlasAnalystRuns(context.supabase, brandId, context.user.id, 4),
      listAtlasContextEntries(context.supabase, brandId, 8),
      getLatestAtlasBrandLearningSnapshot(context.supabase, brandId),
    ]);
    const brandLearningFindings =
      brandLearningSnapshot?.id
        ? await listAtlasBrandLearningFindings(context.supabase, brandLearningSnapshot.id)
        : [];
    let inkKnowledgeMatches: InkHelpArticleMatch[] = [];
    try {
      const privilegedSupabase = createSupabaseServiceRoleClient();
      inkKnowledgeMatches = await searchInkHelpArticles(privilegedSupabase, {
        query: body.question,
        pageContext: body.pageContext ?? null,
        limit: 3,
      });
    } catch {
      inkKnowledgeMatches = [];
    }
    const gemini = await resolveAtlasAnalystGeminiAccess(brandId);
    const requestedSkill = body.skill ?? "auto";
    const resolvedSkill: AtlasAnalystSkillId =
      requestedSkill === "auto" ? gemini.defaultSkill ?? "auto" : requestedSkill;

    const response = await runAtlasAnalyst(
      request,
      {
        brandId,
        question,
        skill: resolvedSkill,
        pageContext: body.pageContext ?? null,
        periodLabel: body.periodLabel ?? null,
        brandLabel: body.brandLabel ?? null,
        userLabel: body.userLabel ?? context.user.email ?? null,
        from: body.from ?? null,
        to: body.to ?? null,
      },
      {
        apiKey: gemini.apiKey,
        model: gemini.model,
        temperature: gemini.temperature,
        recentRuns,
        brandContext,
        brandLearningSnapshot,
        brandLearningFindings,
        inkKnowledgeMatches,
        operatorGuidance: gemini.operatorGuidance,
      },
    );

    const runId = await persistAtlasAnalystRun(
      context.supabase,
      context.user.id,
      {
        brandId,
        question,
        skill: resolvedSkill,
        pageContext: body.pageContext ?? null,
        periodLabel: body.periodLabel ?? null,
        brandLabel: body.brandLabel ?? null,
        userLabel: body.userLabel ?? context.user.email ?? null,
        from: body.from ?? null,
        to: body.to ?? null,
      },
      response,
      {
        model: gemini.model,
        temperature: gemini.temperature,
      },
    );

    return NextResponse.json({
      ...response,
      runId,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Nao foi possivel executar o Atlas Analyst.",
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
    assertAtlasAiEnabled(context);
    const body = (await request.json()) as AtlasAnalystFeedbackPayload;

    if (!body.runId?.trim()) {
      throw new Error("Informe a execucao do Atlas Analyst que recebera o feedback.");
    }

    if (body.vote !== "helpful" && body.vote !== "not_helpful") {
      throw new Error("Feedback invalido para o Atlas Analyst.");
    }

    const vote = await saveAtlasAnalystFeedback(context.supabase, context.user.id, brandId, {
      runId: body.runId.trim(),
      vote: body.vote,
      note: body.note ?? null,
    });

    return NextResponse.json({
      runId: body.runId.trim(),
      vote,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Nao foi possivel salvar o feedback do Atlas Analyst.",
      },
      { status: 400 },
    );
  }
}


