import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  isMissingBrandGovernanceSchemaError,
  normalizeBrandGovernance,
} from "@/lib/brandops/governance";

function getBearerToken(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

async function getAuthenticatedContext(request: Request) {
  const accessToken = getBearerToken(request);
  if (!accessToken) {
    throw new Error("Sessão ausente.");
  }

  const supabase = createSupabaseServerClient(accessToken);
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

  if (profileError || !profile) {
    throw new Error("Perfil do usuário não encontrado.");
  }

  return {
    supabase,
    user,
    profile,
  };
}

export async function requireSuperAdmin(request: Request) {
  const context = await getAuthenticatedContext(request);

  if (context.profile.role !== "SUPER_ADMIN") {
    throw new Error("Acesso restrito ao superadmin.");
  }

  return context;
}

export async function requireBrandAccess(request: Request, brandId: string) {
  const context = await getAuthenticatedContext(request);

  const loadBrandGovernance = async () => {
    const { data: brand, error: brandError } = await context.supabase
      .from("brands")
      .select("id, plan_tier, feature_flags")
      .eq("id", brandId)
      .maybeSingle();

    if (brandError) {
      if (isMissingBrandGovernanceSchemaError(brandError)) {
        const fallback = await context.supabase
          .from("brands")
          .select("id")
          .eq("id", brandId)
          .maybeSingle();

        if (fallback.error || !fallback.data) {
          throw new Error("Marca não encontrada.");
        }

        return normalizeBrandGovernance();
      }

      throw new Error("Marca não encontrada.");
    }

    if (!brand) {
      throw new Error("Marca não encontrada.");
    }

    return normalizeBrandGovernance({
      planTier: brand.plan_tier,
      featureFlags: brand.feature_flags,
    });
  };

  if (context.profile.role === "SUPER_ADMIN") {
    return {
      ...context,
      canManageIntegrations: true,
      brandGovernance: await loadBrandGovernance(),
    };
  }

  const { data: membership, error } = await context.supabase
    .from("brand_members")
    .select("brand_id")
    .eq("brand_id", brandId)
    .eq("user_id", context.user.id)
    .maybeSingle();

  if (error || !membership) {
    throw new Error("Você não tem acesso a esta marca.");
  }

  return {
    ...context,
    canManageIntegrations: false,
    brandGovernance: await loadBrandGovernance(),
  };
}
