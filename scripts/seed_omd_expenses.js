const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

function loadEnvValue(name, envText) {
  const match = envText.match(new RegExp(`${name}="([^"]+)"`));
  return match ? match[1] : "";
}

async function main() {
  const envText = fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf8");
  const supabase = createClient(
    loadEnvValue("NEXT_PUBLIC_SUPABASE_URL", envText),
    loadEnvValue("SUPABASE_SERVICE_ROLE_KEY", envText),
    { auth: { persistSession: false } },
  );

  const { data: brand, error: brandError } = await supabase
    .from("brands")
    .select("id,name")
    .ilike("name", "%Oh My Dog%")
    .single();

  if (brandError || !brand) {
    throw new Error(`Marca Oh My Dog não encontrada: ${brandError?.message ?? "sem dados"}`);
  }

  const { data: categories, error: categoryError } = await supabase
    .from("expense_categories")
    .select("id,name")
    .or(`brand_id.is.null,brand_id.eq.${brand.id}`);

  if (categoryError) {
    throw categoryError;
  }

  const categoryByName = new Map(
    (categories || []).map((item) => [String(item.name || "").toLowerCase(), item.id]),
  );

  const rows = [
    ["2025-09-01", "IA", "Assinaturas IA", 269.3],
    ["2025-09-01", "Equipamentos", "Equipamentos", 471.7],
    ["2025-10-01", "Salários", "Salário Ede", 5000],
    ["2025-10-01", "IA", "Assinaturas IA", 329.3],
    ["2025-10-01", "Equipamentos", "Equipamentos", 471.7],
    ["2025-11-01", "Salários", "Salário Ede", 5000],
    ["2025-11-01", "IA", "Assinaturas IA", 270.43],
    ["2025-11-01", "Serviços", "Serviços", 1100],
    ["2025-11-01", "Equipamentos", "Equipamentos", 471.7],
    ["2025-12-01", "Salários", "Salário Ede", 5000],
    ["2025-12-01", "IA", "Assinaturas IA", 270.73],
    ["2025-12-01", "Equipamentos", "Equipamentos", 471.7],
    ["2026-01-01", "Salários", "Salário Ede", 5000],
    ["2026-01-01", "IA", "Assinaturas IA", 270.73],
    ["2026-01-01", "Equipamentos", "Equipamentos", 471.7],
    ["2026-02-01", "Salários", "Salário Ede", 5000],
    ["2026-02-01", "IA", "Assinaturas IA", 161.76],
    ["2026-02-01", "Equipamentos", "Equipamentos", 471.7],
    ["2026-03-01", "Salários", "Salário Ede", 5000],
    ["2026-03-01", "IA", "Assinaturas IA", 99],
  ];

  await supabase.from("brand_expenses").delete().eq("brand_id", brand.id);

  const payload = rows.map(([incurredOn, categoryName, description, amount]) => {
    const categoryId = categoryByName.get(String(categoryName).toLowerCase());
    if (!categoryId) {
      throw new Error(`Categoria não encontrada: ${categoryName}`);
    }

    return {
      brand_id: brand.id,
      category_id: categoryId,
      description,
      amount,
      incurred_on: incurredOn,
      created_by: null,
    };
  });

  for (let i = 0; i < payload.length; i += 100) {
    const chunk = payload.slice(i, i + 100);
    const { error } = await supabase.from("brand_expenses").insert(chunk);
    if (error) {
      throw error;
    }
  }

  console.log(JSON.stringify({ brand: brand.name, inserted: payload.length }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
