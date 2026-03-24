const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

function loadEnv(filePath) {
  return Object.fromEntries(
    fs
      .readFileSync(filePath, "utf8")
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index), line.slice(index + 1).replace(/^"|"$/g, "")];
      }),
  );
}

async function main() {
  const env = loadEnv(path.join(process.cwd(), ".env.local"));
  const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
  );

  const expenseRows = [
    { incurredOn: "2025-09-01", categoryName: "Pró-labore", description: "Salário Ede", amount: 5000 },
    { incurredOn: "2025-09-01", categoryName: "IA", description: "Assinaturas IA", amount: 269.3 },
    { incurredOn: "2025-09-01", categoryName: "Equipamentos", description: "Equipamentos", amount: 471.7 },
    { incurredOn: "2025-10-01", categoryName: "Pró-labore", description: "Salário Ede", amount: 5000 },
    { incurredOn: "2025-10-01", categoryName: "IA", description: "Assinaturas IA", amount: 329.3 },
    { incurredOn: "2025-10-01", categoryName: "Equipamentos", description: "Equipamentos", amount: 471.7 },
    { incurredOn: "2025-11-01", categoryName: "Pró-labore", description: "Salário Ede", amount: 5000 },
    { incurredOn: "2025-11-01", categoryName: "IA", description: "Assinaturas IA", amount: 270.43 },
    { incurredOn: "2025-11-01", categoryName: "Serviços", description: "Serviços", amount: 1100 },
    { incurredOn: "2025-11-01", categoryName: "Equipamentos", description: "Equipamentos", amount: 471.7 },
    { incurredOn: "2025-12-01", categoryName: "Pró-labore", description: "Salário Ede", amount: 5000 },
    { incurredOn: "2025-12-01", categoryName: "IA", description: "Assinaturas IA", amount: 270.73 },
    { incurredOn: "2025-12-01", categoryName: "Equipamentos", description: "Equipamentos", amount: 471.7 },
    { incurredOn: "2026-01-01", categoryName: "Pró-labore", description: "Salário Ede", amount: 5000 },
    { incurredOn: "2026-01-01", categoryName: "IA", description: "Assinaturas IA", amount: 270.73 },
    { incurredOn: "2026-01-01", categoryName: "Equipamentos", description: "Equipamentos", amount: 471.7 },
    { incurredOn: "2026-02-01", categoryName: "Pró-labore", description: "Salário Ede", amount: 5000 },
    { incurredOn: "2026-02-01", categoryName: "IA", description: "Assinaturas IA", amount: 161.76 },
    { incurredOn: "2026-02-01", categoryName: "Equipamentos", description: "Equipamentos", amount: 471.7 },
    { incurredOn: "2026-03-01", categoryName: "Pró-labore", description: "Salário Ede", amount: 5000 },
    { incurredOn: "2026-03-01", categoryName: "IA", description: "Assinaturas IA", amount: 99 },
  ];

  const { data: brands, error: brandError } = await supabase
    .from("brands")
    .select("id, name")
    .eq("name", "Oh My Dog")
    .limit(1);

  if (brandError) {
    throw brandError;
  }

  const brand = brands?.[0];
  if (!brand) {
    throw new Error("Marca 'Oh My Dog' não encontrada.");
  }

  const { data: profiles, error: profileError } = await supabase
    .from("user_profiles")
    .select("id, email")
    .eq("email", "contato@ohmydogloja.com")
    .limit(1);

  if (profileError) {
    throw profileError;
  }

  const profile = profiles?.[0];
  if (!profile) {
    throw new Error("Usuário contato@ohmydogloja.com não encontrado.");
  }

  const categoryNames = [...new Set(expenseRows.map((row) => row.categoryName))];
  const { data: categories, error: categoryError } = await supabase
    .from("expense_categories")
    .select("id, name, brand_id")
    .or(`brand_id.is.null,brand_id.eq.${brand.id}`)
    .in("name", categoryNames);

  if (categoryError) {
    throw categoryError;
  }

  const categoryMap = new Map(categories.map((category) => [category.name, category.id]));

  for (const name of categoryNames) {
    if (!categoryMap.has(name)) {
      throw new Error(`Categoria de despesa não encontrada: ${name}`);
    }
  }

  const descriptions = [...new Set(expenseRows.map((row) => row.description))];
  const { data: existingExpenses, error: existingError } = await supabase
    .from("brand_expenses")
    .select("id, incurred_on, description")
    .eq("brand_id", brand.id)
    .in("description", descriptions);

  if (existingError) {
    throw existingError;
  }

  const existingKeys = new Map(
    (existingExpenses ?? []).map((row) => [`${row.incurred_on}|${row.description}`, row.id]),
  );

  const idsToDelete = expenseRows
    .map((row) => existingKeys.get(`${row.incurredOn}|${row.description}`))
    .filter(Boolean);

  if (idsToDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from("brand_expenses")
      .delete()
      .in("id", idsToDelete);

    if (deleteError) {
      throw deleteError;
    }
  }

  const payload = expenseRows.map((row) => ({
    brand_id: brand.id,
    category_id: categoryMap.get(row.categoryName),
    description: row.description,
    amount: row.amount,
    incurred_on: row.incurredOn,
    created_by: profile.id,
  }));

  const { error: insertError } = await supabase.from("brand_expenses").insert(payload);

  if (insertError) {
    throw insertError;
  }

  console.log(
    JSON.stringify(
      {
        brandId: brand.id,
        inserted: payload.length,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
