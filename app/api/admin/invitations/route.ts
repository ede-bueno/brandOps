import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/brandops/admin";

export async function POST(request: Request) {
  try {
    const { supabase } = await requireSuperAdmin(request);
    const body = await request.json();

    const email = String(body.email ?? "").trim().toLowerCase();
    const fullName = String(body.fullName ?? "").trim();
    const brandId = String(body.brandId ?? "").trim();
    const inviteRole = "BRAND_OWNER";

    if (!email) {
      throw new Error("Email é obrigatório.");
    }

    if (!brandId) {
      throw new Error("Selecione a loja para o convite.");
    }

    const { data: existingProfile } = await supabase
      .from("user_profiles")
      .select("id, email, role")
      .eq("email", email)
      .maybeSingle();

    if (existingProfile?.id) {
      const { error: profileError } = await supabase.from("user_profiles").update({
        full_name: fullName || email,
        role: existingProfile.role === "SUPER_ADMIN" ? "SUPER_ADMIN" : inviteRole,
      }).eq("id", existingProfile.id);

      if (profileError) {
        throw profileError;
      }

      const { error: membershipError } = await supabase.from("brand_members").upsert({
        brand_id: brandId,
        user_id: existingProfile.id,
      }, {
        onConflict: "brand_id,user_id",
      });

      if (membershipError) {
        throw membershipError;
      }

      return NextResponse.json({
        invited: {
          id: existingProfile.id,
          email,
          role: existingProfile.role === "SUPER_ADMIN" ? "SUPER_ADMIN" : inviteRole,
          alreadyExisted: true,
        },
      });
    }

    const origin = new URL(request.url).origin;
    const { data: invitation, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
      email,
      {
        data: {
          full_name: fullName || email,
        },
        redirectTo: `${origin}/login`,
      },
    );

    if (inviteError) {
      throw inviteError;
    }

    const invitedUserId = invitation.user?.id;
    if (!invitedUserId) {
      throw new Error("Convite criado sem usuário retornado pela Supabase.");
    }

    const { error: profileError } = await supabase.from("user_profiles").upsert({
      id: invitedUserId,
      email,
      full_name: fullName || email,
      role: inviteRole,
    });

    if (profileError) {
      throw profileError;
    }

    const { error: membershipError } = await supabase.from("brand_members").upsert({
      brand_id: brandId,
      user_id: invitedUserId,
    }, {
      onConflict: "brand_id,user_id",
    });

    if (membershipError) {
      throw membershipError;
    }

    return NextResponse.json({
      invited: {
        id: invitedUserId,
        email,
        role: inviteRole,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : typeof error === "object" && error && "message" in error
              ? String(error.message)
              : "Falha ao enviar convite.",
      },
      { status: 400 },
    );
  }
}
