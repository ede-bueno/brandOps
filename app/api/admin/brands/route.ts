import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/brandops/admin";
import {
  isMissingBrandGovernanceSchemaError,
  normalizeBrandGovernance,
  normalizeBrandPlanTier,
} from "@/lib/brandops/governance";

function stripGovernanceColumns<T extends Record<string, unknown>>(payload: T) {
  return Object.fromEntries(
    Object.entries(payload).filter(([key]) => key !== "plan_tier" && key !== "feature_flags"),
  );
}

export async function GET(request: Request) {
  try {
    const { supabase } = await requireSuperAdmin(request);
    const { data: brandsData, error: brandsError } = await supabase
      .from("brands")
      .select(
        `
          id,
          name,
          slug,
          website_url,
          description,
          logo_url,
          contact_email,
          instagram_url,
          facebook_url,
          address_line,
          city,
          state,
          postal_code,
          tax_id,
          notes,
          plan_tier,
          feature_flags,
          created_at,
          updated_at
        `,
      )
      .order("name");

    let safeBrandsData = brandsData ?? [];

    if (brandsError) {
      if (!isMissingBrandGovernanceSchemaError(brandsError)) {
        throw brandsError;
      }

      const fallback = await supabase
        .from("brands")
        .select(
          `
            id,
            name,
            slug,
            website_url,
            description,
            logo_url,
            contact_email,
            instagram_url,
            facebook_url,
            address_line,
            city,
            state,
            postal_code,
            tax_id,
            notes,
            created_at,
            updated_at
          `,
        )
        .order("name");

      if (fallback.error) {
        throw fallback.error;
      }

      safeBrandsData = (fallback.data ?? []).map((brand) => ({
        ...brand,
        plan_tier: null,
        feature_flags: null,
      }));
    }

    const brandIds = safeBrandsData.map((brand) => brand.id);
    let memberships: Array<{
      brand_id: string;
      user_id: string;
      user_profiles: {
        email?: string | null;
        full_name?: string | null;
        role?: string | null;
      } | null;
    }> = [];

    if (brandIds.length > 0) {
      const { data: membersData, error: membersError } = await supabase
        .from("brand_members")
        .select(
          `
            brand_id,
            user_id,
            user_profiles (
              email,
              full_name,
              role
            )
          `,
        )
        .in("brand_id", brandIds);

      if (membersError) {
        throw membersError;
      }

      memberships = (membersData ?? []) as typeof memberships;
    }

    const membershipsByBrand = memberships.reduce<
      Record<
        string,
        Array<{
          user_id: string;
          user_profiles: {
            email?: string | null;
            full_name?: string | null;
            role?: string | null;
          } | null;
        }>
      >
    >((accumulator, membership) => {
      if (!accumulator[membership.brand_id]) {
        accumulator[membership.brand_id] = [];
      }

      accumulator[membership.brand_id].push({
        user_id: membership.user_id,
        user_profiles: membership.user_profiles ?? null,
      });

      return accumulator;
    }, {});

    return NextResponse.json({
      brands: safeBrandsData.map((brand) => ({
        ...brand,
        brand_members: membershipsByBrand[brand.id] ?? [],
        governance: normalizeBrandGovernance({
          planTier: brand.plan_tier,
          featureFlags: brand.feature_flags,
        }),
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao carregar lojas." },
      { status: 400 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireSuperAdmin(request);
    const body = await request.json();

    const governancePayload = {
      plan_tier: normalizeBrandPlanTier(body.planTier),
      feature_flags: normalizeBrandGovernance({
        planTier: body.planTier,
        featureFlags: body.featureFlags,
      }).featureFlags,
    };

    const payload = {
      name: String(body.name ?? "").trim(),
      slug: body.slug ? String(body.slug).trim().toLowerCase() : null,
      website_url: body.websiteUrl ? String(body.websiteUrl).trim() : null,
      description: body.description ? String(body.description).trim() : null,
      logo_url: body.logoUrl ? String(body.logoUrl).trim() : null,
      contact_email: body.contactEmail ? String(body.contactEmail).trim().toLowerCase() : null,
      instagram_url: body.instagramUrl ? String(body.instagramUrl).trim() : null,
      facebook_url: body.facebookUrl ? String(body.facebookUrl).trim() : null,
      address_line: body.addressLine ? String(body.addressLine).trim() : null,
      city: body.city ? String(body.city).trim() : null,
      state: body.state ? String(body.state).trim() : null,
      postal_code: body.postalCode ? String(body.postalCode).trim() : null,
      tax_id: body.taxId ? String(body.taxId).trim() : null,
      notes: body.notes ? String(body.notes).trim() : null,
      ...governancePayload,
    };

    if (!payload.name) {
      throw new Error("Nome da loja é obrigatório.");
    }

    let brandResponse = await supabase.from("brands").insert(payload).select("id, name").single();

    if (brandResponse.error && isMissingBrandGovernanceSchemaError(brandResponse.error)) {
      const fallbackPayload = stripGovernanceColumns(payload);
      brandResponse = await supabase
        .from("brands")
        .insert(fallbackPayload)
        .select("id, name")
        .single();
    }

    const { data: brand, error: brandError } = brandResponse;

    if (brandError || !brand) {
      throw brandError ?? new Error("Não foi possível criar a loja.");
    }

    await supabase.from("brand_members").upsert(
      {
        brand_id: brand.id,
        user_id: user.id,
      },
      {
        onConflict: "brand_id,user_id",
      },
    );

    return NextResponse.json({ brand }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : typeof error === "object" && error && "message" in error
              ? String(error.message)
              : "Falha ao criar loja.",
      },
      { status: 400 },
    );
  }
}
