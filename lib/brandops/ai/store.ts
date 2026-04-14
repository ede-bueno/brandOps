import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AtlasAnalystExecutionInput,
  AtlasAnalystFeedbackPayload,
  AtlasAnalystFeedbackVote,
  AtlasAnalystHistoryItem,
  AtlasAnalystReportId,
  AtlasAnalystResponse,
} from "./types";

const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

function asStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function asUsedReports(value: unknown): AtlasAnalystReportId[] {
  return asStringArray(value).filter((reportId): reportId is AtlasAnalystReportId =>
    reportId === "financial" ||
    reportId === "media" ||
    reportId === "traffic" ||
    reportId === "product-insights" ||
    reportId === "sales" ||
    reportId === "catalog" ||
    reportId === "sanitization",
  );
}

export async function persistAtlasAnalystRun(
  supabase: SupabaseClient,
  userId: string,
  input: AtlasAnalystExecutionInput,
  response: AtlasAnalystResponse,
  options?: {
    model?: string;
  },
) {
  const { data, error } = await supabase
    .from("atlas_analyst_runs")
    .insert({
      brand_id: input.brandId,
      user_id: userId,
      question: input.question,
      skill_id: response.skillId,
      skill_label: response.skillLabel,
      page_context: input.pageContext ?? null,
      period_label: input.periodLabel ?? null,
      period_from: input.from ?? null,
      period_to: input.to ?? null,
      confidence: response.confidence,
      summary: response.summary,
      answer: response.answer,
      evidence: response.evidence,
      actions: response.actions,
      risks: response.risks,
      follow_ups: response.followUps,
      warnings: response.warnings,
      used_reports: response.usedReports,
      model: options?.model ?? DEFAULT_MODEL,
      request_context: {
        brandLabel: input.brandLabel ?? null,
      },
      created_at: response.generatedAt,
    })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return data.id as string;
}

export async function listAtlasAnalystRuns(
  supabase: SupabaseClient,
  brandId: string,
  userId: string,
  limit = 6,
): Promise<AtlasAnalystHistoryItem[]> {
  const { data: runs, error } = await supabase
    .from("atlas_analyst_runs")
    .select(
      "id, question, skill_id, skill_label, page_context, period_label, confidence, summary, answer, evidence, actions, risks, follow_ups, warnings, used_reports, created_at",
    )
    .eq("brand_id", brandId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  const runIds = (runs ?? []).map((row) => row.id);
  const feedbackMap = new Map<string, AtlasAnalystFeedbackVote>();

  if (runIds.length) {
    const { data: feedbackRows, error: feedbackError } = await supabase
      .from("atlas_analyst_feedback")
      .select("run_id, vote")
      .eq("brand_id", brandId)
      .eq("user_id", userId)
      .in("run_id", runIds);

    if (feedbackError) {
      throw feedbackError;
    }

    (feedbackRows ?? []).forEach((row) => {
      if (row.vote === "helpful" || row.vote === "not_helpful") {
        feedbackMap.set(row.run_id, row.vote);
      }
    });
  }

  return (runs ?? []).map((row) => ({
    runId: row.id,
    question: row.question ?? "",
    pageContext: row.page_context ?? null,
    skillId: row.skill_id,
    skillLabel: row.skill_label ?? "Atlas Analyst",
    confidence:
      row.confidence === "low" || row.confidence === "medium" || row.confidence === "high"
        ? row.confidence
        : "medium",
    summary: row.summary ?? "",
    answer: row.answer ?? "",
    evidence: asStringArray(row.evidence),
    actions: asStringArray(row.actions),
    risks: asStringArray(row.risks),
    followUps: asStringArray(row.follow_ups),
    warnings: asStringArray(row.warnings),
    usedReports: asUsedReports(row.used_reports),
    generatedAt: row.created_at ?? new Date().toISOString(),
    periodLabel: row.period_label ?? null,
    feedbackVote: feedbackMap.get(row.id) ?? null,
  })) as AtlasAnalystHistoryItem[];
}

export async function saveAtlasAnalystFeedback(
  supabase: SupabaseClient,
  userId: string,
  brandId: string,
  payload: AtlasAnalystFeedbackPayload,
) {
  const { data: run, error: runError } = await supabase
    .from("atlas_analyst_runs")
    .select("id")
    .eq("id", payload.runId)
    .eq("brand_id", brandId)
    .single();

  if (runError || !run) {
    throw new Error("Execução do Atlas Analyst não encontrada para esta marca.");
  }

  const { error } = await supabase
    .from("atlas_analyst_feedback")
    .upsert(
      {
        run_id: payload.runId,
        brand_id: brandId,
        user_id: userId,
        vote: payload.vote,
        note: payload.note?.trim() || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "run_id,user_id" },
    );

  if (error) {
    throw error;
  }

  return payload.vote;
}

export async function listAtlasContextEntries(
  supabase: SupabaseClient,
  brandId: string,
  limit = CONTEXT_ENTRY_LIMIT,
): Promise<AtlasContextEntry[]> {
  const { data, error } = await supabase
    .from("atlas_context_entries")
    .select(
      "id, brand_id, user_id, entry_type, title, summary, details, source, event_date, importance, tags, metadata, created_at, updated_at",
    )
    .eq("brand_id", brandId)
    .order("event_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({
    id: String(row.id ?? ""),
    brandId: String(row.brand_id ?? ""),
    userId: String(row.user_id ?? ""),
    entryType: asContextEntryType(row.entry_type),
    title: String(row.title ?? ""),
    summary: String(row.summary ?? ""),
    details: typeof row.details === "string" ? row.details : null,
    source: asContextEntrySource(row.source),
    eventDate: typeof row.event_date === "string" ? row.event_date : null,
    importance: asContextEntryImportance(row.importance),
    tags: asContextTags(row.tags),
    metadata: asJsonObject(row.metadata),
    createdAt: typeof row.created_at === "string" ? row.created_at : new Date().toISOString(),
    updatedAt: typeof row.updated_at === "string" ? row.updated_at : new Date().toISOString(),
  }));
}

export async function createAtlasContextEntry(
  supabase: SupabaseClient,
  userId: string,
  brandId: string,
  payload: AtlasContextEntryPayload,
): Promise<AtlasContextEntry> {
  const title = String(payload.title ?? "").trim();
  const summary = String(payload.summary ?? "").trim();
  const details = String(payload.details ?? "").trim();

  if (!title) {
    throw new Error("Informe um titulo para o contexto do Atlas.");
  }

  if (!summary) {
    throw new Error("Informe um resumo curto para o contexto do Atlas.");
  }

  const { data, error } = await supabase
    .from("atlas_context_entries")
    .insert({
      brand_id: brandId,
      user_id: userId,
      entry_type: payload.entryType,
      title,
      summary,
      details: details || null,
      source: payload.source ?? "manual",
      event_date: payload.eventDate?.trim() || null,
      importance: payload.importance ?? "normal",
      tags: asContextTags(payload.tags),
      metadata:
        payload.metadata && typeof payload.metadata === "object" && !Array.isArray(payload.metadata)
          ? payload.metadata
          : {},
    })
    .select(
      "id, brand_id, user_id, entry_type, title, summary, details, source, event_date, importance, tags, metadata, created_at, updated_at",
    )
    .single();

  if (error) {
    throw error;
  }

  return {
    id: String(data.id ?? ""),
    brandId: String(data.brand_id ?? ""),
    userId: String(data.user_id ?? ""),
    entryType: asContextEntryType(data.entry_type),
    title: String(data.title ?? ""),
    summary: String(data.summary ?? ""),
    details: typeof data.details === "string" ? data.details : null,
    source: asContextEntrySource(data.source),
    eventDate: typeof data.event_date === "string" ? data.event_date : null,
    importance: asContextEntryImportance(data.importance),
    tags: asContextTags(data.tags),
    metadata: asJsonObject(data.metadata),
    createdAt: typeof data.created_at === "string" ? data.created_at : new Date().toISOString(),
    updatedAt: typeof data.updated_at === "string" ? data.updated_at : new Date().toISOString(),
  };
}
