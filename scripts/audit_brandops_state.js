const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

function loadEnvValue(name, envText) {
  const match = envText.match(new RegExp(`${name}="([^"]+)"`));
  return match ? match[1] : "";
}

async function main() {
  const envPath = path.join(process.cwd(), ".env.local");
  const envText = fs.readFileSync(envPath, "utf8");
  const supabaseUrl = loadEnvValue("NEXT_PUBLIC_SUPABASE_URL", envText);
  const serviceRoleKey = loadEnvValue("SUPABASE_SERVICE_ROLE_KEY", envText);

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausente em .env.local");
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const tables = [
    "brands",
    "user_profiles",
    "brand_members",
    "orders",
    "order_items",
    "sales_lines",
    "media_performance",
    "cmv_history",
    "cmv_checkpoints",
    "expense_categories",
    "brand_expenses",
    "import_logs",
    "products",
  ];

  const counts = [];
  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select("*", { count: "exact", head: true });

    counts.push({
      table,
      count,
      error: error ? error.message : null,
    });
  }

  const { data: brands } = await supabase
    .from("brands")
    .select("id,name,slug,website_url,contact_email,created_at")
    .order("name");

  const { data: users } = await supabase
    .from("user_profiles")
    .select("id,email,role,full_name")
    .order("email");

  const { data: memberships } = await supabase
    .from("brand_members")
    .select("brand_id,user_id,user_profiles(email,role,full_name)");

  const { data: cmvRules } = await supabase
    .from("cmv_history")
    .select("brand_id,match_type,match_value,match_label,cmv_unit,valid_from,valid_to")
    .order("valid_from");

  const { data: importLogs } = await supabase
    .from("import_logs")
    .select("brand_id,file_type,file_name,status,records_processed,created_at")
    .order("created_at", { ascending: false })
    .limit(20);

  const omdBrand = (brands || []).find((brand) => brand.name === "Oh My Dog");

  let omdCoverage = null;
  if (omdBrand) {
    const { data: orderItems } = await supabase
      .from("order_items")
      .select("order_date,product_name,product_type,quantity,cmv_unit_applied,cmv_total_applied,cmv_rule_type,cmv_rule_label")
      .eq("brand_id", omdBrand.id)
      .order("order_date", { ascending: true });

    const rows = orderItems || [];
    const pre = rows.filter((row) => (row.order_date || "") < "2026-03-01");
    const post = rows.filter((row) => (row.order_date || "") >= "2026-03-01");

    omdCoverage = {
      brand_id: omdBrand.id,
      pre_count: pre.length,
      pre_with_cmv: pre.filter((row) => Number(row.cmv_total_applied || 0) > 0).length,
      pre_without_cmv: pre.filter((row) => Number(row.cmv_total_applied || 0) <= 0).length,
      post_count: post.length,
      post_with_cmv: post.filter((row) => Number(row.cmv_total_applied || 0) > 0).length,
      post_without_cmv: post.filter((row) => Number(row.cmv_total_applied || 0) <= 0).length,
      pre_first: pre.slice(0, 5),
      post_first: post.slice(0, 5),
    };
  }

  const report = {
    generated_at: new Date().toISOString(),
    counts,
    brands,
    users,
    memberships,
    cmv_rules: cmvRules,
    recent_import_logs: importLogs,
    omd_cmv_coverage: omdCoverage,
  };

  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
