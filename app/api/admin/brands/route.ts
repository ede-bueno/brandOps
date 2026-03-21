import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/brandops/admin";

export async function GET(request: Request) {
  try {
    const { supabase } = await requireSuperAdmin(request);
    const { data, error } = await supabase
      .from("brands")
      .select(`
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
        updated_at,
        brand_members (
          user_id,
          user_profiles (
            email,
            full_name,
            role
          )
        )
      `)
      .order("name");

    if (error) {
      throw error;
    }

    return NextResponse.json({ brands: data ?? [] });
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
    };

    if (!payload.name) {
      throw new Error("Nome da loja é obrigatório.");
    }

    const { data: brand, error: brandError } = await supabase
      .from("brands")
      .insert(payload)
      .select("id, name")
      .single();

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
