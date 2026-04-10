import { NextResponse } from "next/server";
import { requireBrandAccess } from "@/lib/brandops/admin";
import {
  createCreativeOpsTask,
  listCreativeOpsTasks,
  updateCreativeOpsTask,
  type CreateCreativeTaskPayload,
  type UpdateCreativeTaskPayload,
} from "@/lib/brandops/creative-ops";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ brandId: string }> },
) {
  try {
    const { brandId } = await params;
    const context = await requireBrandAccess(request, brandId);
    const tasks = await listCreativeOpsTasks(context.supabase, brandId);
    return NextResponse.json({ tasks });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível carregar o backlog criativo.",
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
    const body = (await request.json()) as CreateCreativeTaskPayload;
    const task = await createCreativeOpsTask(
      context.supabase,
      context.user.id,
      brandId,
      body,
    );
    return NextResponse.json(task);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível criar a tarefa criativa.",
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
    const body = (await request.json()) as UpdateCreativeTaskPayload & { taskId: string };

    if (!body.taskId) {
      throw new Error("Tarefa não informada.");
    }

    const task = await updateCreativeOpsTask(
      context.supabase,
      context.user.id,
      brandId,
      body.taskId,
      body,
    );

    return NextResponse.json(task);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível atualizar a tarefa criativa.",
      },
      { status: 400 },
    );
  }
}
