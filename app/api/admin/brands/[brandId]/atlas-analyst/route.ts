import { NextResponse } from "next/server";
import { requireBrandAccess } from "@/lib/brandops/admin";
import { runAtlasAnalyst } from "@/lib/brandops/ai/agent";
import { resolveAtlasAnalystGeminiAccess } from "@/lib/brandops/ai/config";
import {
  listAtlasContextEntries,
  listAtlasAnalystRuns,
  persistAtlasAnalystRun,
  saveAtlasAnalystFeedback,
} from "@/lib/brandops/ai/store";
import type {
  AtlasAnalystFeedbackPayload,
  AtlasAnalystRequestPayload,
} from "@/lib/brandops/ai/types";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ brandId: string }> },
) {
  try {
    const { brandId } = await params;
    const context = await requireBrandAccess(request, brandId);
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

    const body = (await request.json()) as AtlasAnalystRequestPayload;
    const question = String(body.question ?? "").trim();

    if (!question) {
      return NextResponse.json(
        { error: "Informe uma pergunta para o Atlas Analyst." },
        { status: 400 },
      );
    }

    const [recentRuns, brandContext] = await Promise.all([
      listAtlasAnalystRuns(context.supabase, brandId, context.user.id, 4),
      listAtlasContextEntries(context.supabase, brandId, 8),
    ]);
    const gemini = await resolveAtlasAnalystGeminiAccess(brandId);
    const response = await runAtlasAnalyst(
      request,
      {
        brandId,
        question,
        skill: body.skill ?? "auto",
        pageContext: body.pageContext ?? null,
        periodLabel: body.periodLabel ?? null,
        brandLabel: body.brandLabel ?? null,
        from: body.from ?? null,
        to: body.to ?? null,
      },
      {
        apiKey: gemini.apiKey,
        model: gemini.model,
        recentRuns,
        brandContext,
      },
    );

    const runId = await persistAtlasAnalystRun(
      context.supabase,
      context.user.id,
      {
        brandId,
        question,
        skill: body.skill ?? "auto",
        pageContext: body.pageContext ?? null,
        periodLabel: body.periodLabel ?? null,
        brandLabel: body.brandLabel ?? null,
        from: body.from ?? null,
        to: body.to ?? null,
      },
      response,
      {
        model: gemini.model,
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
