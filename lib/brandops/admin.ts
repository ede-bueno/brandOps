import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

function getBearerToken(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

export async function requireSuperAdmin(request: Request) {
  const accessToken = getBearerToken(request);
  if (!accessToken) {
    throw new Error("Sessão ausente.");
  }

  const supabase = createSupabaseServiceRoleClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(accessToken);

  if (userError || !user) {
    throw new Error("Sessão inválida.");
  }

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("id, role, email, full_name")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || profile.role !== "SUPER_ADMIN") {
    throw new Error("Acesso restrito ao superadmin.");
  }

  return {
    supabase,
    user,
    profile,
  };
}
