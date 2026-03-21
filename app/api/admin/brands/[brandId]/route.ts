import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/brandops/admin";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ brandId: string }> },
) {
  try {
    const { supabase } = await requireSuperAdmin(request);
    const { brandId } = await params;
    const body = await request.json();

    const payload = {
      name: body.name ? String(body.name).trim() : undefined,
      slug: body.slug === undefined ? undefined : String(body.slug || "").trim().toLowerCase() || null,
      website_url: body.websiteUrl === undefined ? undefined : String(body.websiteUrl || "").trim() || null,
      description: body.description === undefined ? undefined : String(body.description || "").trim() || null,
      logo_url: body.logoUrl === undefined ? undefined : String(body.logoUrl || "").trim() || null,
      contact_email: body.contactEmail === undefined ? undefined : String(body.contactEmail || "").trim().toLowerCase() || null,
      instagram_url: body.instagramUrl === undefined ? undefined : String(body.instagramUrl || "").trim() || null,
      facebook_url: body.facebookUrl === undefined ? undefined : String(body.facebookUrl || "").trim() || null,
      address_line: body.addressLine === undefined ? undefined : String(body.addressLine || "").trim() || null,
      city: body.city === undefined ? undefined : String(body.city || "").trim() || null,
      state: body.state === undefined ? undefined : String(body.state || "").trim() || null,
      postal_code: body.postalCode === undefined ? undefined : String(body.postalCode || "").trim() || null,
      tax_id: body.taxId === undefined ? undefined : String(body.taxId || "").trim() || null,
      notes: body.notes === undefined ? undefined : String(body.notes || "").trim() || null,
    };

    const { data, error } = await supabase
      .from("brands")
      .update(payload)
      .eq("id", brandId)
      .select("id, name, updated_at")
      .single();

    if (error || !data) {
      throw error ?? new Error("Não foi possível atualizar a loja.");
    }

    return NextResponse.json({ brand: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao atualizar loja." },
      { status: 400 },
    );
  }
}
