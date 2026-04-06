import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

type CronLockRpcRow = {
  acquired?: boolean | null;
  renewed?: boolean | null;
  released?: boolean | null;
  expires_at?: string | null;
  owner_id?: string | null;
};

function getRpcRow(data: unknown): CronLockRpcRow | null {
  if (Array.isArray(data)) {
    return (data[0] as CronLockRpcRow | undefined) ?? null;
  }

  if (data && typeof data === "object") {
    return data as CronLockRpcRow;
  }

  return null;
}

export async function acquireCronJobLock(
  supabase: SupabaseClient,
  options: {
    jobName: string;
    ownerId: string;
    ttlSeconds: number;
    meta?: Record<string, unknown>;
  },
) {
  const { data, error } = await supabase.rpc("acquire_cron_job_lock", {
    p_job_name: options.jobName,
    p_owner_id: options.ownerId,
    p_ttl_seconds: options.ttlSeconds,
    p_meta: options.meta ?? {},
  });

  if (error) {
    throw error;
  }

  const row = getRpcRow(data);

  return {
    acquired: Boolean(row?.acquired),
    expiresAt: row?.expires_at ?? null,
    ownerId: row?.owner_id ?? null,
  };
}

export async function renewCronJobLock(
  supabase: SupabaseClient,
  options: {
    jobName: string;
    ownerId: string;
    ttlSeconds: number;
  },
) {
  const { data, error } = await supabase.rpc("renew_cron_job_lock", {
    p_job_name: options.jobName,
    p_owner_id: options.ownerId,
    p_ttl_seconds: options.ttlSeconds,
  });

  if (error) {
    throw error;
  }

  const row = getRpcRow(data);

  return {
    renewed: Boolean(row?.renewed),
    expiresAt: row?.expires_at ?? null,
  };
}

export async function releaseCronJobLock(
  supabase: SupabaseClient,
  options: {
    jobName: string;
    ownerId: string;
  },
) {
  const { data, error } = await supabase.rpc("release_cron_job_lock", {
    p_job_name: options.jobName,
    p_owner_id: options.ownerId,
  });

  if (error) {
    throw error;
  }

  const row = getRpcRow(data);

  return {
    released: Boolean(row?.released),
  };
}
