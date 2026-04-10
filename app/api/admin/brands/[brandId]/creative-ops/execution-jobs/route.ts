import { NextResponse } from "next/server";
import { requireBrandAccess } from "@/lib/brandops/admin";
import {
  listCreativeOpsExecutionJobs,
  updateCreativeOpsExecutionJob,
} from "@/lib/brandops/creative-ops";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ brandId: string }> },
) {
  try {
    const { brandId } = await params;
    const context = await requireBrandAccess(request, brandId);
    const jobs = await listCreativeOpsExecutionJobs(context.supabase, brandId);
    return NextResponse.json({ jobs });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível carregar a fila operacional.",
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
    const body = (await request.json()) as {
      jobId?: string;
      action?: "mark_completed" | "mark_error";
      errorMessage?: string | null;
    };

    if (!body.jobId || !body.action) {
      throw new Error("Job e ação são obrigatórios.");
    }

    const job = await updateCreativeOpsExecutionJob(
      context.supabase,
      context.user.id,
      brandId,
      body.jobId,
      body.action,
      body.errorMessage ?? null,
    );

    return NextResponse.json(job);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível atualizar a fila operacional.",
      },
      { status: 400 },
    );
  }
}
