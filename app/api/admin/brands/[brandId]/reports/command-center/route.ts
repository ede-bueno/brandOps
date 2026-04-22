import { NextResponse } from "next/server";
import { requireBrandAccess } from "@/lib/brandops/admin";
import {
  buildManagementSnapshotV2,
  upsertExecutiveActionQueue,
} from "@/lib/brandops/server/management-reports";
import { parseDateParam } from "@/lib/brandops/server/report-params";
import type { ExecutiveActionItem, ExecutiveActionStatus } from "@/lib/brandops/types";

function parseStatus(value: unknown): ExecutiveActionStatus | null {
  return value === "new" ||
    value === "in_progress" ||
    value === "deferred" ||
    value === "resolved"
    ? value
    : null;
}

function parseDomain(value: unknown): ExecutiveActionItem["domain"] | null {
  return value === "cash" ||
    value === "acquisition" ||
    value === "offer" ||
    value === "operations"
    ? value
    : null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ brandId: string }> },
) {
  try {
    const { brandId } = await params;
    const { supabase } = await requireBrandAccess(request, brandId);
    const url = new URL(request.url);
    const from = parseDateParam(url.searchParams.get("from"));
    const to = parseDateParam(url.searchParams.get("to"));

    return NextResponse.json(
      await buildManagementSnapshotV2(supabase, brandId, from, to),
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível montar o Centro de Comando.",
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
    const { supabase, user } = await requireBrandAccess(request, brandId);
    const payload = (await request.json()) as {
      actionKey?: string;
      domain?: ExecutiveActionItem["domain"];
      status?: ExecutiveActionStatus;
      reviewAt?: string | null;
      from?: string | null;
      to?: string | null;
    };

    const actionKey = payload.actionKey?.trim();
    const domain = parseDomain(payload.domain);
    const status = parseStatus(payload.status);
    const from = parseDateParam(payload.from ?? null);
    const to = parseDateParam(payload.to ?? null);
    const reviewAt = parseDateParam(payload.reviewAt ?? null);

    if (!actionKey || !domain || !status) {
      throw new Error("Dados inválidos para atualizar a fila executiva.");
    }

    await upsertExecutiveActionQueue(supabase, {
      brandId,
      userId: user.id,
      actionKey,
      domain,
      status,
      reviewAt,
      from,
      to,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Não foi possível atualizar a fila executiva.";
    const status = message.includes("ainda não está persistida") ? 503 : 400;

    return NextResponse.json(
      { error: message },
      { status },
    );
  }
}
