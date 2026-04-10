import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CreativeExecutionJob,
  CreativeExecutionJobStatus,
  CreativeOpsTask,
  CreativeOpsTaskEvent,
  CreativePublicationPlan,
  CreativeTaskChannel,
  CreativeTaskFormat,
  CreativeTaskPriority,
  CreativeTaskSource,
  CreativeTaskStatus,
  CreativeTaskType,
} from "@/lib/brandops/types";

export type CreateCreativeTaskPayload = {
  source: CreativeTaskSource;
  taskType: CreativeTaskType;
  priority: CreativeTaskPriority;
  title: string;
  objective: string;
  hypothesis?: string | null;
  contextNotes?: string | null;
  metadata?: Record<string, unknown>;
};

export type UpdateCreativeTaskPayload =
  | {
      action: "generate_draft";
    }
  | {
      action: "save_draft";
      latestDraft: string;
    }
  | {
      action: "transition_status";
      status: CreativeTaskStatus;
      scheduledFor?: string | null;
    }
  | {
      action: "save_publication_plan";
      channel: CreativeTaskChannel;
      contentFormat: CreativeTaskFormat;
      scheduledFor?: string | null;
      publishInstruction?: string | null;
      destinationUrl?: string | null;
    };

type CreativeTaskRow = {
  id: string;
  brand_id: string;
  created_by: string;
  assigned_to: string | null;
  approved_by: string | null;
  source: CreativeTaskSource;
  task_type: CreativeTaskType;
  priority: CreativeTaskPriority;
  status: CreativeTaskStatus;
  title: string;
  objective: string;
  hypothesis: string | null;
  context_notes: string | null;
  latest_draft: string | null;
  approved_content: string | null;
  scheduled_for: string | null;
  approved_at: string | null;
  published_at: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

type CreativeTaskEventRow = {
  id: string;
  task_id: string;
  brand_id: string;
  user_id: string | null;
  event_type: CreativeOpsTaskEvent["eventType"];
  event_summary: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type CreativeExecutionJobRow = {
  id: string;
  task_id: string;
  brand_id: string;
  job_status: CreativeExecutionJobStatus;
  channel: CreativeTaskChannel;
  content_format: CreativeTaskFormat;
  due_at: string;
  payload: Record<string, unknown> | null;
  last_error: string | null;
  queued_at: string;
  dispatched_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

function mapTaskEvent(row: CreativeTaskEventRow): CreativeOpsTaskEvent {
  return {
    id: row.id,
    taskId: row.task_id,
    brandId: row.brand_id,
    userId: row.user_id,
    eventType: row.event_type,
    eventSummary: row.event_summary,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
  };
}

function mapExecutionJob(row: CreativeExecutionJobRow): CreativeExecutionJob {
  return {
    id: row.id,
    taskId: row.task_id,
    brandId: row.brand_id,
    jobStatus: row.job_status,
    channel: row.channel,
    contentFormat: row.content_format,
    dueAt: row.due_at,
    payload: row.payload ?? {},
    lastError: row.last_error,
    queuedAt: row.queued_at,
    dispatchedAt: row.dispatched_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapTask(row: CreativeTaskRow, events: CreativeOpsTaskEvent[]): CreativeOpsTask {
  const metadata = row.metadata ?? {};
  const rawPublicationPlan = metadata.publicationPlan as Partial<CreativePublicationPlan> | undefined;
  const publicationPlan =
    rawPublicationPlan && rawPublicationPlan.channel && rawPublicationPlan.contentFormat
      ? {
          channel: rawPublicationPlan.channel,
          contentFormat: rawPublicationPlan.contentFormat,
          publishInstruction: rawPublicationPlan.publishInstruction ?? null,
          destinationUrl: rawPublicationPlan.destinationUrl ?? null,
          updatedAt: rawPublicationPlan.updatedAt ?? null,
        }
      : null;

  return {
    id: row.id,
    brandId: row.brand_id,
    createdBy: row.created_by,
    assignedTo: row.assigned_to,
    approvedBy: row.approved_by,
    source: row.source,
    taskType: row.task_type,
    priority: row.priority,
    status: row.status,
    title: row.title,
    objective: row.objective,
    hypothesis: row.hypothesis,
    contextNotes: row.context_notes,
    latestDraft: row.latest_draft,
    approvedContent: row.approved_content,
    scheduledFor: row.scheduled_for,
    approvedAt: row.approved_at,
    publishedAt: row.published_at,
    metadata,
    publicationPlan,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    events,
  };
}

function buildDraft(
  task: Pick<
    CreativeOpsTask,
    "title" | "objective" | "hypothesis" | "contextNotes" | "taskType"
  >,
) {
  const intro =
    task.taskType === "social_post"
      ? "Objetivo do post"
      : task.taskType === "copy_test"
        ? "Hipótese de copy"
        : "Direção criativa";

  const blocks = [
    `${intro}: ${task.objective}.`,
    task.hypothesis ? `Hipótese: ${task.hypothesis}.` : null,
    task.contextNotes ? `Contexto: ${task.contextNotes}.` : null,
    "Proposta inicial:",
    `- Gancho: ${task.title}.`,
    "- Promessa: destacar o ganho principal com linguagem curta e direta.",
    "- CTA: conduzir para clique, resposta ou teste conforme o objetivo da tarefa.",
  ].filter(Boolean);

  return blocks.join("\n");
}

function normalizeScheduledFor(value?: string | null) {
  if (!value) {
    return null;
  }

  const normalized = new Date(value);
  if (Number.isNaN(normalized.getTime())) {
    throw new Error("Data de agendamento inválida.");
  }

  return normalized.toISOString();
}

async function appendTaskEvent(
  supabase: SupabaseClient,
  payload: {
    taskId: string;
    brandId: string;
    userId: string | null;
    eventType: CreativeOpsTaskEvent["eventType"];
    eventSummary: string;
    metadata?: Record<string, unknown>;
  },
) {
  const { error } = await supabase.from("creative_ops_task_events").insert({
    task_id: payload.taskId,
    brand_id: payload.brandId,
    user_id: payload.userId,
    event_type: payload.eventType,
    event_summary: payload.eventSummary,
    metadata: payload.metadata ?? {},
  });

  if (error) {
    throw error;
  }
}

async function upsertExecutionJob(
  supabase: SupabaseClient,
  task: CreativeOpsTask,
  options?: {
    jobStatus?: CreativeExecutionJobStatus;
    lastError?: string | null;
    completed?: boolean;
  },
) {
  if (!task.publicationPlan || !task.scheduledFor) {
    throw new Error("Plano de saída e data de agendamento são obrigatórios para gerar a fila.");
  }

  const payload = {
    taskId: task.id,
    title: task.title,
    objective: task.objective,
    approvedContent: task.approvedContent ?? task.latestDraft ?? null,
    hypothesis: task.hypothesis ?? null,
    contextNotes: task.contextNotes ?? null,
    publicationPlan: task.publicationPlan,
    metadata: task.metadata,
  };

  const nextStatus =
    options?.jobStatus ??
    (task.status === "published" ? "completed" : task.status === "scheduled" ? "pending" : "ready");

  const { error } = await supabase.from("creative_ops_execution_jobs").upsert(
    {
      task_id: task.id,
      brand_id: task.brandId,
      job_status: nextStatus,
      channel: task.publicationPlan.channel,
      content_format: task.publicationPlan.contentFormat,
      due_at: task.scheduledFor,
      payload,
      last_error: options?.lastError ?? null,
      dispatched_at: nextStatus === "ready" ? new Date().toISOString() : null,
      completed_at: options?.completed || nextStatus === "completed" ? new Date().toISOString() : null,
    },
    { onConflict: "task_id" },
  );

  if (error) {
    throw error;
  }
}

export async function listCreativeOpsExecutionJobs(
  supabase: SupabaseClient,
  brandId: string,
) {
  const { data, error } = await supabase
    .from("creative_ops_execution_jobs")
    .select(
      "id, task_id, brand_id, job_status, channel, content_format, due_at, payload, last_error, queued_at, dispatched_at, completed_at, created_at, updated_at",
    )
    .eq("brand_id", brandId)
    .order("due_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => mapExecutionJob(row as CreativeExecutionJobRow));
}

export async function updateCreativeOpsExecutionJob(
  supabase: SupabaseClient,
  userId: string,
  brandId: string,
  jobId: string,
  action: "mark_completed" | "mark_error",
  errorMessage?: string | null,
) {
  const { data: jobRow, error: jobError } = await supabase
    .from("creative_ops_execution_jobs")
    .select(
      "id, task_id, brand_id, job_status, channel, content_format, due_at, payload, last_error, queued_at, dispatched_at, completed_at, created_at, updated_at",
    )
    .eq("brand_id", brandId)
    .eq("id", jobId)
    .single();

  if (jobError || !jobRow) {
    throw jobError ?? new Error("Item da fila operacional não encontrado.");
  }

  const updates =
    action === "mark_completed"
      ? {
          job_status: "completed",
          completed_at: new Date().toISOString(),
          last_error: null,
        }
      : {
          job_status: "error",
          last_error: errorMessage?.trim() || "Falha no despacho manual.",
        };

  const { error: updateError } = await supabase
    .from("creative_ops_execution_jobs")
    .update(updates)
    .eq("brand_id", brandId)
    .eq("id", jobId);

  if (updateError) {
    throw updateError;
  }

  await appendTaskEvent(supabase, {
    taskId: jobRow.task_id,
    brandId,
    userId,
    eventType: action === "mark_completed" ? "published" : "status_changed",
    eventSummary:
      action === "mark_completed"
        ? "Execução manual concluída."
        : `Falha registrada na fila operacional${updates.last_error ? `: ${updates.last_error}` : "."}`,
    metadata:
      action === "mark_completed"
        ? { executionJobId: jobId, executionStatus: "completed" }
        : { executionJobId: jobId, executionStatus: "error", lastError: updates.last_error },
  });

  if (action === "mark_completed") {
    const { error: taskUpdateError } = await supabase
      .from("creative_ops_tasks")
      .update({
        status: "published",
        published_at: new Date().toISOString(),
      })
      .eq("brand_id", brandId)
      .eq("id", jobRow.task_id);

    if (taskUpdateError) {
      throw taskUpdateError;
    }
  }

  const [nextJob] = await listCreativeOpsExecutionJobs(supabase, brandId).then((jobs) =>
    jobs.filter((job) => job.id === jobId),
  );
  if (!nextJob) {
    throw new Error("Não foi possível recarregar a fila operacional.");
  }

  return nextJob;
}

export async function releaseDueCreativeExecutionJobs(supabase: SupabaseClient) {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("creative_ops_execution_jobs")
    .select(
      "id, task_id, brand_id, job_status, channel, content_format, due_at, payload, last_error, queued_at, dispatched_at, completed_at, created_at, updated_at",
    )
    .eq("job_status", "pending")
    .lte("due_at", now)
    .order("due_at", { ascending: true });

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as CreativeExecutionJobRow[];
  if (!rows.length) {
    return [];
  }

  const results: CreativeExecutionJob[] = [];
  for (const row of rows) {
    const { error: updateError } = await supabase
      .from("creative_ops_execution_jobs")
      .update({
        job_status: "ready",
        dispatched_at: new Date().toISOString(),
        last_error: null,
      })
      .eq("id", row.id);

    if (updateError) {
      throw updateError;
    }

    results.push({
      ...mapExecutionJob(row),
      jobStatus: "ready",
      dispatchedAt: new Date().toISOString(),
      lastError: null,
    });
  }

  return results;
}

export async function listCreativeOpsTasks(
  supabase: SupabaseClient,
  brandId: string,
) {
  const { data: tasks, error: tasksError } = await supabase
    .from("creative_ops_tasks")
    .select(
      "id, brand_id, created_by, assigned_to, approved_by, source, task_type, priority, status, title, objective, hypothesis, context_notes, latest_draft, approved_content, scheduled_for, approved_at, published_at, metadata, created_at, updated_at",
    )
    .eq("brand_id", brandId)
    .order("created_at", { ascending: false });

  if (tasksError) {
    throw tasksError;
  }

  const taskIds = (tasks ?? []).map((task) => task.id);
  let events: CreativeTaskEventRow[] = [];

  if (taskIds.length) {
    const { data: eventRows, error: eventsError } = await supabase
      .from("creative_ops_task_events")
      .select(
        "id, task_id, brand_id, user_id, event_type, event_summary, metadata, created_at",
      )
      .eq("brand_id", brandId)
      .in("task_id", taskIds)
      .order("created_at", { ascending: false });

    if (eventsError) {
      throw eventsError;
    }

    events = eventRows ?? [];
  }

  const eventsByTask = new Map<string, CreativeOpsTaskEvent[]>();
  events.forEach((event) => {
    const current = eventsByTask.get(event.task_id) ?? [];
    current.push(mapTaskEvent(event));
    eventsByTask.set(event.task_id, current);
  });

  return (tasks ?? []).map((task) =>
    mapTask(task as CreativeTaskRow, eventsByTask.get(task.id) ?? []),
  );
}

export async function createCreativeOpsTask(
  supabase: SupabaseClient,
  userId: string,
  brandId: string,
  payload: CreateCreativeTaskPayload,
) {
  const normalizedTitle = payload.title.trim();
  const normalizedObjective = payload.objective.trim();

  if (!normalizedTitle || !normalizedObjective) {
    throw new Error(
      "Título e objetivo são obrigatórios para abrir uma tarefa criativa.",
    );
  }

  const { data, error } = await supabase
    .from("creative_ops_tasks")
    .insert({
      brand_id: brandId,
      created_by: userId,
      source: payload.source,
      task_type: payload.taskType,
      priority: payload.priority,
      status: "draft",
      title: normalizedTitle,
      objective: normalizedObjective,
      hypothesis: payload.hypothesis?.trim() || null,
      context_notes: payload.contextNotes?.trim() || null,
      metadata: payload.metadata ?? {},
    })
    .select(
      "id, brand_id, created_by, assigned_to, approved_by, source, task_type, priority, status, title, objective, hypothesis, context_notes, latest_draft, approved_content, scheduled_for, approved_at, published_at, metadata, created_at, updated_at",
    )
    .single();

  if (error || !data) {
    throw error ?? new Error("Não foi possível criar a tarefa criativa.");
  }

  const eventSummary = `Tarefa criada: ${normalizedTitle}.`;
  await appendTaskEvent(supabase, {
    taskId: data.id,
    brandId,
    userId,
    eventType: "created",
    eventSummary,
    metadata: {
      source: payload.source,
      taskType: payload.taskType,
      priority: payload.priority,
    },
  });

  return mapTask(data as CreativeTaskRow, [
    {
      id: `virtual-created-${data.id}`,
      taskId: data.id,
      brandId,
      userId,
      eventType: "created",
      eventSummary,
      metadata: {
        source: payload.source,
        taskType: payload.taskType,
        priority: payload.priority,
      },
      createdAt: data.created_at,
    },
  ]);
}

export async function updateCreativeOpsTask(
  supabase: SupabaseClient,
  userId: string,
  brandId: string,
  taskId: string,
  payload: UpdateCreativeTaskPayload,
) {
  const { data: taskRow, error: taskError } = await supabase
    .from("creative_ops_tasks")
    .select(
      "id, brand_id, created_by, assigned_to, approved_by, source, task_type, priority, status, title, objective, hypothesis, context_notes, latest_draft, approved_content, scheduled_for, approved_at, published_at, metadata, created_at, updated_at",
    )
    .eq("brand_id", brandId)
    .eq("id", taskId)
    .single();

  if (taskError || !taskRow) {
    throw taskError ?? new Error("Tarefa criativa não encontrada.");
  }

  const currentTask = mapTask(taskRow as CreativeTaskRow, []);
  let updates: Record<string, unknown> = {};
  let eventType: CreativeOpsTaskEvent["eventType"] = "draft_saved";
  let eventSummary = "Tarefa atualizada.";

  if (payload.action === "generate_draft") {
    updates = { latest_draft: buildDraft(currentTask) };
    eventType = "draft_generated";
    eventSummary = `Rascunho base gerado para ${currentTask.title}.`;
  }

  if (payload.action === "save_draft") {
    updates = { latest_draft: payload.latestDraft.trim() || null };
    eventType = "draft_saved";
    eventSummary = `Rascunho salvo em ${currentTask.title}.`;
  }

  if (payload.action === "save_publication_plan") {
    const nextScheduledFor = normalizeScheduledFor(payload.scheduledFor);
    updates = {
      metadata: {
        ...currentTask.metadata,
        publicationPlan: {
          channel: payload.channel,
          contentFormat: payload.contentFormat,
          publishInstruction: payload.publishInstruction?.trim() || null,
          destinationUrl: payload.destinationUrl?.trim() || null,
          updatedAt: new Date().toISOString(),
        },
      },
      scheduled_for: nextScheduledFor ?? currentTask.scheduledFor ?? null,
    };
    eventType = "draft_saved";
    eventSummary = `Plano de saída salvo em ${currentTask.title}.`;
  }

  if (payload.action === "transition_status") {
    const nextScheduledFor =
      payload.status === "scheduled"
        ? normalizeScheduledFor(payload.scheduledFor) ?? currentTask.scheduledFor ?? null
        : currentTask.scheduledFor ?? null;

    if (payload.status === "scheduled" && !nextScheduledFor) {
      throw new Error("Defina data e hora antes de marcar a tarefa como agendada.");
    }

    if (payload.status === "scheduled" && !currentTask.publicationPlan) {
      throw new Error("Salve o plano de saída antes de mandar a tarefa para agenda.");
    }

    updates = {
      status: payload.status,
      approved_by:
        payload.status === "approved" ||
        payload.status === "scheduled" ||
        payload.status === "published"
          ? userId
          : currentTask.approvedBy ?? null,
      approved_at:
        payload.status === "approved" ||
        payload.status === "scheduled" ||
        payload.status === "published"
          ? new Date().toISOString()
          : currentTask.approvedAt ?? null,
      approved_content:
        payload.status === "approved" ||
        payload.status === "scheduled" ||
        payload.status === "published"
          ? currentTask.latestDraft ?? currentTask.approvedContent ?? null
          : currentTask.approvedContent ?? null,
      scheduled_for: nextScheduledFor,
      published_at:
        payload.status === "published"
          ? new Date().toISOString()
          : currentTask.publishedAt ?? null,
    };
    eventType =
      payload.status === "approved"
        ? "approved"
        : payload.status === "scheduled"
          ? "scheduled"
          : payload.status === "published"
            ? "published"
            : "status_changed";
    eventSummary = `Status alterado para ${payload.status} em ${currentTask.title}.`;
  }

  const { error: updateError } = await supabase
    .from("creative_ops_tasks")
    .update(updates)
    .eq("brand_id", brandId)
    .eq("id", taskId);

  if (updateError) {
    throw updateError;
  }

  await appendTaskEvent(supabase, {
    taskId,
    brandId,
    userId,
    eventType,
    eventSummary,
    metadata:
      payload.action === "transition_status"
        ? { status: payload.status }
        : { action: payload.action },
  });

  const [nextTask] = await listCreativeOpsTasks(supabase, brandId).then((tasks) =>
    tasks.filter((task) => task.id === taskId),
  );
  if (!nextTask) {
    throw new Error("Não foi possível recarregar a tarefa criativa.");
  }

  if (payload.action === "transition_status" && payload.status === "scheduled") {
    await upsertExecutionJob(supabase, nextTask, { jobStatus: "pending" });
  }

  if (payload.action === "transition_status" && payload.status === "published") {
    if (nextTask.publicationPlan && nextTask.scheduledFor) {
      await upsertExecutionJob(supabase, nextTask, {
        jobStatus: "completed",
        completed: true,
      });
    }
  }

  return nextTask;
}
