import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AtlasContextEntry,
  AtlasContextEntryImportance,
  AtlasContextEntryPayload,
  AtlasContextEntryType,
} from "./types";

function normalizeTags(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean),
    ),
  ).slice(0, 8);
}

function asContextType(value: unknown): AtlasContextEntryType {
  return value === "campaign" ||
    value === "promotion" ||
    value === "launch" ||
    value === "incident" ||
    value === "insight"
    ? value
    : "insight";
}

function asImportance(value: unknown): AtlasContextEntryImportance {
  return value === "low" || value === "high" || value === "critical" ? value : "normal";
}

function mapContextEntry(row: Record<string, unknown>): AtlasContextEntry {
  return {
    id: String(row.id ?? ""),
    brandId: String(row.brand_id ?? ""),
    userId: String(row.user_id ?? ""),
    entryType: asContextType(row.entry_type),
    title: String(row.title ?? ""),
    summary: String(row.summary ?? ""),
    details: typeof row.details === "string" ? row.details : null,
    source:
      row.source === "imported" || row.source === "analyst" || row.source === "system"
        ? row.source
        : "manual",
    eventDate: typeof row.event_date === "string" ? row.event_date : null,
    importance: asImportance(row.importance),
    tags: normalizeTags(row.tags),
    metadata:
      row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : {},
    createdAt:
      typeof row.created_at === "string" ? row.created_at : new Date().toISOString(),
    updatedAt:
      typeof row.updated_at === "string" ? row.updated_at : new Date().toISOString(),
  };
}

export async function listAtlasContextEntries(
  supabase: SupabaseClient,
  brandId: string,
  limit = 8,
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

  return (data ?? []).map((row) => mapContextEntry(row as Record<string, unknown>));
}

export async function createAtlasContextEntry(
  supabase: SupabaseClient,
  userId: string,
  brandId: string,
  payload: AtlasContextEntryPayload,
) {
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
      tags: normalizeTags(payload.tags),
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

  return mapContextEntry(data as Record<string, unknown>);
}
