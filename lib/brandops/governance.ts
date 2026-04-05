import type {
  BrandFeatureFlags,
  BrandGovernance,
  BrandPlanTier,
} from "@/lib/brandops/types";

type GovernanceSchemaError = {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
};

export const BRAND_PLAN_LABELS: Record<BrandPlanTier, string> = {
  starter: "Starter",
  growth: "Growth",
  scale: "Scale",
  enterprise: "Enterprise",
};

const DEFAULT_FEATURES_BY_PLAN: Record<BrandPlanTier, BrandFeatureFlags> = {
  starter: {
    atlasAi: false,
    atlasCommandCenter: false,
    brandLearning: false,
    geminiModelCatalog: false,
  },
  growth: {
    atlasAi: true,
    atlasCommandCenter: false,
    brandLearning: true,
    geminiModelCatalog: true,
  },
  scale: {
    atlasAi: true,
    atlasCommandCenter: true,
    brandLearning: true,
    geminiModelCatalog: true,
  },
  enterprise: {
    atlasAi: true,
    atlasCommandCenter: true,
    brandLearning: true,
    geminiModelCatalog: true,
  },
};

function asObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asGovernanceSchemaError(value: unknown): GovernanceSchemaError | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  return {
    code: typeof candidate.code === "string" ? candidate.code : undefined,
    message: typeof candidate.message === "string" ? candidate.message : undefined,
    details: typeof candidate.details === "string" ? candidate.details : null,
    hint: typeof candidate.hint === "string" ? candidate.hint : null,
  };
}

export function isMissingBrandGovernanceSchemaError(error: unknown) {
  const candidate = asGovernanceSchemaError(error);
  const haystack = `${candidate?.message ?? ""} ${candidate?.details ?? ""} ${candidate?.hint ?? ""}`.toLowerCase();

  return (
    haystack.includes("plan_tier") ||
    haystack.includes("feature_flags") ||
    haystack.includes("column brands.plan_tier does not exist") ||
    haystack.includes("column brands.feature_flags does not exist")
  );
}

export function withNormalizedBrandGovernance<
  T extends {
    plan_tier?: unknown;
    feature_flags?: unknown;
  },
>(brand: T) {
  return {
    ...brand,
    governance: normalizeBrandGovernance({
      planTier: brand.plan_tier,
      featureFlags: brand.feature_flags,
    }),
  };
}

export function normalizeBrandPlanTier(value: unknown): BrandPlanTier {
  return value === "growth" ||
    value === "scale" ||
    value === "enterprise" ||
    value === "starter"
    ? value
    : "starter";
}

export function normalizeBrandGovernance(input?: {
  planTier?: unknown;
  featureFlags?: unknown;
}): BrandGovernance {
  const planTier = normalizeBrandPlanTier(input?.planTier);
  const featureFlags = asObject(input?.featureFlags);
  const defaults = DEFAULT_FEATURES_BY_PLAN[planTier];

  return {
    planTier,
    featureFlags: {
      atlasAi:
        typeof featureFlags.atlasAi === "boolean"
          ? featureFlags.atlasAi
          : defaults.atlasAi,
      atlasCommandCenter:
        typeof featureFlags.atlasCommandCenter === "boolean"
          ? featureFlags.atlasCommandCenter
          : defaults.atlasCommandCenter,
      brandLearning:
        typeof featureFlags.brandLearning === "boolean"
          ? featureFlags.brandLearning
          : defaults.brandLearning,
      geminiModelCatalog:
        typeof featureFlags.geminiModelCatalog === "boolean"
          ? featureFlags.geminiModelCatalog
          : defaults.geminiModelCatalog,
    },
  };
}

export function hasBrandFeature(
  governance: BrandGovernance | null | undefined,
  feature: keyof BrandFeatureFlags,
) {
  if (!governance) {
    return false;
  }

  return Boolean(governance.featureFlags[feature]);
}
