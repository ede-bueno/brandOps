import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AtlasAnalystExecutionInput,
  AtlasAnalystFeedbackPayload,
  AtlasAnalystFeedbackVote,
  AtlasAnalystHistoryItem,
  AtlasAnalystReportId,
  AtlasAnalystResponse,
  AtlasBrandLearningFeedbackPayload,
  AtlasBrandLearningFeedbackSummary,
  AtlasBrandLearningFeedbackVote,
  AtlasBrandLearningRun,
  AtlasBrandLearningSnapshot,
  AtlasBrandLearningStatus,
  AtlasContextEntry,
  AtlasContextEntryImportance,
  AtlasContextEntryPayload,
  AtlasContextEntrySource,
  AtlasContextEntryType,
} from "./types";

const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const CONTEXT_ENTRY_LIMIT = 12;

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

function asContextEntryType(value: unknown): AtlasContextEntryType {
  return value === "campaign" ||
    value === "promotion" ||
    value === "launch" ||
    value === "incident" ||
    value === "insight"
    ? value
    : "insight";
}

function asContextEntrySource(value: unknown): AtlasContextEntrySource {
  return value === "manual" || value === "imported" || value === "analyst" || value === "system"
    ? value
    : "manual";
}

function asContextEntryImportance(value: unknown): AtlasContextEntryImportance {
  return value === "low" || value === "normal" || value === "high" || value === "critical"
    ? value
    : "normal";
}

function asContextTags(value: unknown) {
  return Array.from(new Set(asStringArray(value))).slice(0, 12);
}

function asJsonObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function asLearningStatus(value: unknown): AtlasBrandLearningStatus {
  return value === "running" || value === "completed" || value === "failed" ? value : "running";
}

function asLearningFeedbackVote(value: unknown): AtlasBrandLearningFeedbackVote | null {
  return value === "aligned" || value === "needs_review" ? value : null;
}

function asConfidence(value: unknown): "low" | "medium" | "high" {
  return value === "low" || value === "medium" || value === "high" ? value : "medium";
}

function asNumberOrNull(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function mapContextEntryRow(row: Record<string, unknown>): AtlasContextEntry {
  return {
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
  };
}

function mapLearningRunRow(row: Record<string, unknown>): AtlasBrandLearningRun {
  return {
    id: String(row.id ?? ""),
    brandId: String(row.brand_id ?? ""),
    status: asLearningStatus(row.status),
    scopeLabel: typeof row.scope_label === "string" ? row.scope_label : "Todo histórico disponível",
    model: typeof row.model === "string" ? row.model : null,
    temperature: asNumberOrNull(row.temperature),
    summary: typeof row.summary === "string" ? row.summary : null,
    errorMessage: typeof row.error_message === "string" ? row.error_message : null,
    startedAt: typeof row.started_at === "string" ? row.started_at : new Date().toISOString(),
    completedAt: typeof row.completed_at === "string" ? row.completed_at : null,
  };
}

function mapLearningSnapshotRow(row: Record<string, unknown>): AtlasBrandLearningSnapshot {
  const payload = asJsonObject(row.learning_payload);

  return {
    id: String(row.id ?? ""),
    brandId: String(row.brand_id ?? ""),
    runId: typeof row.run_id === "string" ? row.run_id : null,
    scopeLabel: typeof row.scope_label === "string" ? row.scope_label : "Todo histórico disponível",
    scopeKey:
      payload.scopeKey === "all" ||
      payload.scopeKey === "180d" ||
      payload.scopeKey === "90d" ||
      payload.scopeKey === "30d" ||
      payload.scopeKey === "analysis_window"
        ? payload.scopeKey
        : null,
    periodFrom: typeof payload.periodFrom === "string" ? payload.periodFrom : null,
    periodTo: typeof payload.periodTo === "string" ? payload.periodTo : null,
    summary: typeof row.summary === "string" ? row.summary : "",
    confidence: asConfidence(row.confidence),
    businessProfile: typeof row.business_profile === "string" ? row.business_profile : "",
    nicheProfile: typeof row.niche_profile === "string" ? row.niche_profile : "",
    performanceBaseline:
      typeof row.performance_baseline === "string" ? row.performance_baseline : "",
    operationalRisks: asStringArray(row.operational_risks),
    recurringErrors: asStringArray(row.recurring_errors),
    growthOpportunities: asStringArray(row.growth_opportunities),
    evidenceSources: asStringArray(row.evidence_sources),
    dataGaps: asStringArray(row.data_gaps),
    businessSignals: asStringArray(payload.businessSignals),
    seasonalityPatterns: asStringArray(payload.seasonalityPatterns),
    campaignPatterns: asStringArray(payload.campaignPatterns),
    catalogPatterns: asStringArray(payload.catalogPatterns),
    priorityStack: asStringArray(payload.priorityStack),
    nextMilestones: asStringArray(payload.nextMilestones),
    watchItems: asStringArray(payload.watchItems),
    relearnTriggers: asStringArray(payload.relearnTriggers),
    generatedAt: typeof row.generated_at === "string" ? row.generated_at : new Date().toISOString(),
  };
}

export async function persistAtlasAnalystRun(
  supabase: SupabaseClient,
  userId: string,
  input: AtlasAnalystExecutionInput,
  response: AtlasAnalystResponse,
  options?: {
    model?: string;
    temperature?: number;
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
          temperature:
            typeof options?.temperature === "number" && Number.isFinite(options.temperature)
              ? options.temperature
              : null,
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
    throw new Error("Execucao do Atlas Analyst nao encontrada para esta marca.");
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
  const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 24) : CONTEXT_ENTRY_LIMIT;
  const { data, error } = await supabase
    .from("atlas_context_entries")
    .select(
      "id, brand_id, user_id, entry_type, title, summary, details, source, event_date, importance, tags, metadata, created_at, updated_at",
    )
    .eq("brand_id", brandId)
    .order("event_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => mapContextEntryRow(row as Record<string, unknown>));
}

export async function createAtlasContextEntry(
  supabase: SupabaseClient,
  userId: string,
  brandId: string,
  payload: AtlasContextEntryPayload,
): Promise<AtlasContextEntry> {
  const title = String(payload.title ?? "").trim();
  const summary = String(payload.summary ?? "").trim();
  const details = typeof payload.details === "string" ? payload.details.trim() : "";

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
      metadata: asJsonObject(payload.metadata),
    })
    .select(
      "id, brand_id, user_id, entry_type, title, summary, details, source, event_date, importance, tags, metadata, created_at, updated_at",
    )
    .single();

  if (error) {
    throw error;
  }

  return mapContextEntryRow(data as Record<string, unknown>);
}

export async function startAtlasBrandLearningRun(
  supabase: SupabaseClient,
  userId: string,
  brandId: string,
  options?: {
    model?: string | null;
    temperature?: number | null;
    scopeLabel?: string | null;
  },
) {
  const { data: runningRun, error: runningError } = await supabase
    .from("atlas_brand_learning_runs")
    .select("*")
    .eq("brand_id", brandId)
    .eq("status", "running")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (runningError) {
    throw runningError;
  }

  if (runningRun) {
    throw new Error(
      "Ja existe uma execucao de aprendizado em andamento para esta marca. Aguarde a conclusao antes de iniciar outra.",
    );
  }

  const { data, error } = await supabase
    .from("atlas_brand_learning_runs")
    .insert({
      brand_id: brandId,
      user_id: userId,
      status: "running",
      scope_label: options?.scopeLabel?.trim() || "Todo histórico disponível",
      model: options?.model?.trim() || null,
      temperature:
        typeof options?.temperature === "number" && Number.isFinite(options.temperature)
          ? options.temperature
          : null,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return mapLearningRunRow(data as Record<string, unknown>);
}

export async function completeAtlasBrandLearningRun(
  supabase: SupabaseClient,
  runId: string,
  payload: {
    summary: string;
  },
) {
  const { data, error } = await supabase
    .from("atlas_brand_learning_runs")
    .update({
      status: "completed",
      summary: payload.summary,
      completed_at: new Date().toISOString(),
      error_message: null,
    })
    .eq("id", runId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return mapLearningRunRow(data as Record<string, unknown>);
}

export async function failAtlasBrandLearningRun(
  supabase: SupabaseClient,
  runId: string,
  errorMessage: string,
) {
  const { error } = await supabase
    .from("atlas_brand_learning_runs")
    .update({
      status: "failed",
      error_message: errorMessage,
      completed_at: new Date().toISOString(),
    })
    .eq("id", runId);

  if (error) {
    throw error;
  }
}

export async function saveAtlasBrandLearningSnapshot(
  supabase: SupabaseClient,
  runId: string,
  snapshot: Omit<AtlasBrandLearningSnapshot, "id" | "generatedAt">,
) {
  const { data, error } = await supabase
    .from("atlas_brand_learning_snapshots")
    .insert({
      brand_id: snapshot.brandId,
      run_id: runId,
      scope_label: snapshot.scopeLabel,
      confidence: snapshot.confidence,
      summary: snapshot.summary,
      business_profile: snapshot.businessProfile,
      niche_profile: snapshot.nicheProfile,
      performance_baseline: snapshot.performanceBaseline,
      operational_risks: snapshot.operationalRisks,
      recurring_errors: snapshot.recurringErrors,
      growth_opportunities: snapshot.growthOpportunities,
      evidence_sources: snapshot.evidenceSources,
      data_gaps: snapshot.dataGaps,
      learning_payload: {
        scopeKey: snapshot.scopeKey ?? null,
        periodFrom: snapshot.periodFrom ?? null,
        periodTo: snapshot.periodTo ?? null,
        summary: snapshot.summary,
        businessProfile: snapshot.businessProfile,
        nicheProfile: snapshot.nicheProfile,
        performanceBaseline: snapshot.performanceBaseline,
        operationalRisks: snapshot.operationalRisks,
        recurringErrors: snapshot.recurringErrors,
      growthOpportunities: snapshot.growthOpportunities,
      evidenceSources: snapshot.evidenceSources,
      dataGaps: snapshot.dataGaps,
      businessSignals: snapshot.businessSignals,
      seasonalityPatterns: snapshot.seasonalityPatterns,
      campaignPatterns: snapshot.campaignPatterns,
      catalogPatterns: snapshot.catalogPatterns,
      priorityStack: snapshot.priorityStack,
      nextMilestones: snapshot.nextMilestones,
      watchItems: snapshot.watchItems,
      relearnTriggers: snapshot.relearnTriggers,
      },
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return mapLearningSnapshotRow(data as Record<string, unknown>);
}

export async function listAtlasBrandLearningRuns(
  supabase: SupabaseClient,
  brandId: string,
  limit = 6,
): Promise<AtlasBrandLearningRun[]> {
  const { data, error } = await supabase
    .from("atlas_brand_learning_runs")
    .select("*")
    .eq("brand_id", brandId)
    .order("started_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => mapLearningRunRow(row as Record<string, unknown>));
}

export async function getLatestAtlasBrandLearningSnapshot(
  supabase: SupabaseClient,
  brandId: string,
): Promise<AtlasBrandLearningSnapshot | null> {
  const { data, error } = await supabase
    .from("atlas_brand_learning_snapshots")
    .select("*")
    .eq("brand_id", brandId)
    .order("generated_at", { ascending: false })
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapLearningSnapshotRow(data as Record<string, unknown>) : null;
}

export async function listAtlasBrandLearningSnapshots(
  supabase: SupabaseClient,
  brandId: string,
  limit = 2,
): Promise<AtlasBrandLearningSnapshot[]> {
  const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 12) : 2;
  const { data, error } = await supabase
    .from("atlas_brand_learning_snapshots")
    .select("*")
    .eq("brand_id", brandId)
    .order("generated_at", { ascending: false })
    .limit(safeLimit);

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => mapLearningSnapshotRow(row as Record<string, unknown>));
}

export async function getAtlasBrandLearningFeedbackSummary(
  supabase: SupabaseClient,
  brandId: string,
  snapshotId: string,
  userId: string,
): Promise<AtlasBrandLearningFeedbackSummary> {
  const { data, error } = await supabase
    .from("atlas_brand_learning_feedback")
    .select("user_id, vote")
    .eq("brand_id", brandId)
    .eq("snapshot_id", snapshotId);

  if (error) {
    throw error;
  }

  const rows = data ?? [];
  const currentVote = asLearningFeedbackVote(
    rows.find((row) => row.user_id === userId)?.vote,
  );

  return {
    snapshotId,
    currentVote,
    alignedCount: rows.filter((row) => row.vote === "aligned").length,
    needsReviewCount: rows.filter((row) => row.vote === "needs_review").length,
  };
}

export async function saveAtlasBrandLearningFeedback(
  supabase: SupabaseClient,
  brandId: string,
  userId: string,
  payload: AtlasBrandLearningFeedbackPayload,
): Promise<AtlasBrandLearningFeedbackSummary> {
  const { data: snapshot, error: snapshotError } = await supabase
    .from("atlas_brand_learning_snapshots")
    .select("id")
    .eq("id", payload.snapshotId)
    .eq("brand_id", brandId)
    .maybeSingle();

  if (snapshotError || !snapshot) {
    throw new Error("Snapshot de aprendizado nao encontrado para esta marca.");
  }

  const vote = asLearningFeedbackVote(payload.vote);

  if (!vote) {
    throw new Error("Vote invalido para o aprendizado do Atlas.");
  }

  const { error } = await supabase
    .from("atlas_brand_learning_feedback")
    .upsert(
      {
        brand_id: brandId,
        snapshot_id: payload.snapshotId,
        user_id: userId,
        vote,
        note: payload.note?.trim() || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "snapshot_id,user_id" },
    );

  if (error) {
    throw error;
  }

  return getAtlasBrandLearningFeedbackSummary(supabase, brandId, payload.snapshotId, userId);
}
