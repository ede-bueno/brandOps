import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/brandops/admin";

const brandAccessRole = "BRAND_OWNER";

function buildTemporaryPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  const source = randomBytes(12);
  return Array.from(source, (value) => alphabet[value % alphabet.length]).join("");
}

async function findAuthUserByEmail(
  supabase: Awaited<ReturnType<typeof requireSuperAdmin>>["supabase"],
  email: string,
) {
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 200,
    });

    if (error) {
      throw error;
    }

    const user = data.users.find((item) => item.email?.toLowerCase() === email);
    if (user) {
      return user;
    }

    if (data.users.length < 200) {
      return null;
    }

    page += 1;
  }
}

export async function POST(request: Request) {
  try {
    const { supabase } = await requireSuperAdmin(request);
    const body = await request.json();

    const email = String(body.email ?? "").trim().toLowerCase();
    const fullName = String(body.fullName ?? "").trim();
    const brandId = String(body.brandId ?? "").trim();
    const providedPassword = String(body.password ?? "").trim();
    const password = providedPassword || buildTemporaryPassword();

    if (!email) {
      throw new Error("Email é obrigatório.");
    }

    if (!brandId) {
      throw new Error("Selecione a loja para criar o acesso.");
    }

    const { data: existingProfile } = await supabase
      .from("user_profiles")
      .select("id, email, role")
      .eq("email", email)
      .maybeSingle();

    const authUser =
      existingProfile?.id
        ? { id: existingProfile.id }
        : await findAuthUserByEmail(supabase, email);

    let userId = existingProfile?.id ?? authUser?.id ?? null;
    const role = existingProfile?.role === "SUPER_ADMIN" ? "SUPER_ADMIN" : brandAccessRole;

    if (userId) {
      const { error: authUpdateError } = await supabase.auth.admin.updateUserById(userId, {
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName || email,
        },
      });

      if (authUpdateError) {
        throw authUpdateError;
      }
    } else {
      const { data: createdUser, error: createUserError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName || email,
        },
      });

      if (createUserError) {
        throw createUserError;
      }

      userId = createdUser.user?.id ?? null;
      if (!userId) {
        throw new Error("Usuário criado sem ID retornado pela Supabase.");
      }
    }

    const { error: profileError } = await supabase.from("user_profiles").upsert({
      id: userId,
      email,
      full_name: fullName || email,
      role,
    });

    if (profileError) {
      throw profileError;
    }

    const { error: membershipError } = await supabase.from("brand_members").upsert(
      {
        brand_id: brandId,
        user_id: userId,
      },
      {
        onConflict: "brand_id,user_id",
      },
    );

    if (membershipError) {
      throw membershipError;
    }

    return NextResponse.json({
      invited: {
        id: userId,
        email,
        role,
        alreadyExisted: Boolean(existingProfile?.id || authUser?.id),
        password,
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
              : "Falha ao criar acesso.",
      },
      { status: 400 },
    );
  }
}
