import { supabase } from "@/lib/supabase";
import type { UserProfile, UserRole } from "./types";
import {
  isMissingBrandGovernanceSchemaError,
  resolveBrandGovernance,
} from "./governance";

type SupabaseLikeError = {
  message?: string;
  details?: string | null;
  hint?: string | null;
};

function getReadableErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message && error.message !== "[object Object]") {
    return error.message;
  }

  if (error && typeof error === "object") {
    const candidate = error as SupabaseLikeError;
    const parts = [candidate.message, candidate.details, candidate.hint]
      .filter((value) => typeof value === "string" && value.trim())
      .map((value) => value!.trim());

    if (parts.length > 0) {
      return parts.join(" ");
    }
  }

  return fallback;
}

export async function fetchUserProfile(userId: string) {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("id, email, full_name, role")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(
      getReadableErrorMessage(error, "Não foi possível carregar o perfil do usuário."),
    );
  }

  if (!data) {
    throw new Error(
      "Seu usuário ainda não está habilitado na plataforma. Confirme o cadastro em user_profiles antes de continuar.",
    );
  }

  return {
    id: data.id,
    email: data.email,
    fullName: data.full_name,
    role: data.role,
  } satisfies UserProfile;
}

export async function fetchAccessibleBrands(options: {
  userId: string;
  role: UserRole;
}) {
  if (options.role !== "SUPER_ADMIN") {
    const { data, error } = await supabase
      .from("brand_members")
      .select(
        `
          brand_id,
          brands (
            id,
            name,
            created_at,
            updated_at,
            plan_tier,
            feature_flags
          )
        `,
      )
      .eq("user_id", options.userId);

    if (error) {
      if (!isMissingBrandGovernanceSchemaError(error)) {
        throw new Error(
          getReadableErrorMessage(error, "Não foi possível carregar as marcas acessíveis."),
        );
      }

      const fallback = await supabase
        .from("brand_members")
        .select(
          `
            brand_id,
            brands (
              id,
              name,
              created_at,
              updated_at
            )
          `,
        )
        .eq("user_id", options.userId);

      if (fallback.error) {
        throw new Error(
          getReadableErrorMessage(
            fallback.error,
            "Não foi possível carregar as marcas acessíveis.",
          ),
        );
      }

      return (fallback.data ?? [])
        .map((membership) => {
          const brand = Array.isArray(membership.brands)
            ? membership.brands[0]
            : membership.brands;

          if (!brand) {
            return null;
          }

          return {
            ...brand,
            governance: resolveBrandGovernance({
              brandId: brand.id,
              brandName: brand.name,
            }),
          };
        })
        .filter((brand): brand is NonNullable<typeof brand> => Boolean(brand))
        .sort((left, right) => left.name.localeCompare(right.name, "pt-BR"));
    }

    return (data ?? [])
      .map((membership) => {
        const brand = Array.isArray(membership.brands)
          ? membership.brands[0]
          : membership.brands;

        if (!brand) {
          return null;
        }

        return {
          ...brand,
          governance: resolveBrandGovernance({
            brandId: brand.id,
            brandName: brand.name,
            planTier: brand.plan_tier,
            featureFlags: brand.feature_flags,
          }),
        };
      })
      .filter((brand): brand is NonNullable<typeof brand> => Boolean(brand))
      .sort((left, right) => left.name.localeCompare(right.name, "pt-BR"));
  }

  const { data, error } = await supabase
    .from("brands")
    .select("id, name, created_at, updated_at, plan_tier, feature_flags")
    .order("name");

  if (error) {
    if (isMissingBrandGovernanceSchemaError(error)) {
      const fallback = await supabase
        .from("brands")
        .select("id, name, created_at, updated_at")
        .order("name");

      if (fallback.error) {
        throw new Error(
          getReadableErrorMessage(fallback.error, "Não foi possível carregar as marcas acessíveis."),
        );
      }

      return (fallback.data ?? []).map((brand) => ({
        ...brand,
        governance: resolveBrandGovernance({
          brandId: brand.id,
          brandName: brand.name,
        }),
      }));
    }

    throw new Error(
      getReadableErrorMessage(error, "Não foi possível carregar as marcas acessíveis."),
    );
  }

  return (data ?? []).map((brand) => ({
    ...brand,
    governance: resolveBrandGovernance({
      brandId: brand.id,
      brandName: brand.name,
      planTier: brand.plan_tier,
      featureFlags: brand.feature_flags,
    }),
  }));
}
