import { NextResponse } from "next/server";
import { requireBrandAccess } from "@/lib/brandops/admin";
import {
  createAtlasContextEntry,
  listAtlasContextEntries,
} from "@/lib/brandops/ai/store";
import type {
  AtlasContextEntry,
  AtlasContextEntryPayload,
} from "@/lib/brandops/ai/types";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ brandId: string }> },
) {
  try {
    const { brandId } = await params;
    const context = await requireBrandAccess(request, brandId);
    const url = new URL(request.url);
    const limitParam = Number(url.searchParams.get("limit") ?? "8");
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 24) : 8;
    const entries = await listAtlasContextEntries(context.supabase, brandId, limit);
    const latestEvent = entries[0]?.eventDate ?? entries[0]?.createdAt ?? null;

    return NextResponse.json({
      summary: entries.length
        ? `${entries.length} contexto(s) curado(s) recente(s) ajudam o Atlas a lembrar campanhas, lancamentos, ajustes e incidentes da marca.`
        : null,
      updatedAt: latestEvent,
      items: entries.map((entry: AtlasContextEntry) => ({
        id: entry.id,
        kind: entry.entryType,
        title: entry.title,
        summary: entry.summary,
        details: entry.details,
        impact:
          entry.importance === "critical"
            ? "critico"
            : entry.importance === "high"
              ? "alto"
              : entry.importance === "low"
                ? "baixo"
                : "normal",
        source: entry.source,
        occurredAt: entry.eventDate ?? entry.createdAt,
        tags: entry.tags,
      })),
      entries,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Nao foi possivel carregar o contexto operacional do Atlas.",
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
    const body = (await request.json()) as AtlasContextEntryPayload;

    if (
      body.entryType !== "campaign" &&
      body.entryType !== "promotion" &&
      body.entryType !== "launch" &&
      body.entryType !== "incident" &&
      body.entryType !== "insight"
    ) {
      throw new Error("Tipo de contexto invalido para o Atlas.");
    }

    const entry = await createAtlasContextEntry(context.supabase, context.user.id, brandId, {
      ...body,
      source: "manual",
    });

    return NextResponse.json(entry);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Nao foi possivel registrar o contexto operacional da marca.",
      },
      { status: 400 },
    );
  }
}
