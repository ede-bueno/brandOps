const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");

function loadEnv() {
  const envPath = path.join(process.cwd(), ".env.local");
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  const entries = lines
    .filter(Boolean)
    .filter((line) => !line.trim().startsWith("#"))
    .map((line) => {
      const separator = line.indexOf("=");
      return [line.slice(0, separator), line.slice(separator + 1).replace(/^"|"$/g, "")];
    });

  return Object.fromEntries(entries);
}

function normalizeText(value) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function hasWord(haystack, needle) {
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z])${escaped}([^a-z]|$)`).test(haystack);
}

function detectProductType(title, context) {
  const haystack = `${normalizeText(title)} ${normalizeText(context)}`.trim();
  if (!haystack) {
    return null;
  }

  if (haystack.includes("cropped moletom")) return "Cropped moletom";
  if (haystack.includes("hoodie moletom") || haystack.includes("moletom hoodie") || haystack.includes("hoodie")) {
    return "Hoodie moletom";
  }
  if (haystack.includes("sueter moletom") || haystack.includes("sueter")) return "Suéter moletom";
  if (haystack.includes("dad hat") || hasWord(haystack, "bone")) return "Bone Dad Hat";
  if (haystack.includes("oversized")) return "Oversized";
  if (haystack.includes("peruana") || haystack.includes("algodao peruano")) return "Camiseta Peruana";
  if (haystack.includes("body infantil") || hasWord(haystack, "body")) return "Body";
  if (hasWord(haystack, "infantil") || hasWord(haystack, "mini")) return "Mini";
  if (hasWord(haystack, "regata")) return "Regata";
  if (hasWord(haystack, "cropped")) return "Cropped";
  if (
    hasWord(haystack, "camiseta") ||
    hasWord(haystack, "masculino") ||
    hasWord(haystack, "feminino") ||
    hasWord(haystack, "unissex")
  ) {
    return "Camiseta";
  }

  return null;
}

function isoDate(value) {
  return String(value).slice(0, 10);
}

function chunk(items, size = 100) {
  const result = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

function buildOmdRules(brandId) {
  const source = "omd_cmv_backfill_20260323";
  const base = [
    { label: "Regata", value: "regata", oldCost: 37, newCost: 46 },
    { label: "Cropped", value: "cropped", oldCost: 37, newCost: 44 },
    { label: "Mini", value: "mini", oldCost: 37, newCost: 46 },
    { label: "Body", value: "body", oldCost: 37, newCost: 46 },
    { label: "Camiseta", value: "camiseta", oldCost: 44, newCost: 49.9 },
    { label: "Camiseta Peruana", value: "camiseta peruana", oldCost: 59, newCost: 65 },
    { label: "Oversized", value: "oversized", oldCost: 69, newCost: 75 },
    { label: "Cropped moletom", value: "cropped moletom", oldCost: 69, newCost: 69 },
    { label: "Suéter moletom", value: "sueter moletom", oldCost: 90, newCost: 90 },
    { label: "Hoodie moletom", value: "hoodie moletom", oldCost: 110, newCost: 110 },
    { label: "Bone Dad Hat", value: "bone dad hat", oldCost: null, newCost: 46 },
  ];

  const rules = [];
  for (const rule of base) {
    if (rule.oldCost !== null) {
      rules.push({
        brand_id: brandId,
        sku: rule.value,
        match_type: "TYPE",
        match_value: rule.value,
        match_label: rule.label,
        cmv_unit: rule.oldCost,
        valid_from: "2025-01-01T00:00:00+00:00",
        valid_to: rule.newCost !== rule.oldCost ? "2026-03-01T00:00:00+00:00" : null,
        source,
      });
    }

    if (rule.newCost !== rule.oldCost || rule.oldCost === null) {
      rules.push({
        brand_id: brandId,
        sku: rule.value,
        match_type: "TYPE",
        match_value: rule.value,
        match_label: rule.label,
        cmv_unit: rule.newCost,
        valid_from: "2026-03-01T00:00:00+00:00",
        valid_to: null,
        source,
      });
    }
  }

  return rules;
}

function resolveRule(rules, productType, orderDate) {
  const normalizedType = normalizeText(productType);
  if (!normalizedType) {
    return null;
  }

  return rules
    .filter((rule) => rule.match_value === normalizedType)
    .filter((rule) => rule.valid_from <= orderDate)
    .filter((rule) => !rule.valid_to || rule.valid_to > orderDate)
    .sort((left, right) => right.valid_from.localeCompare(left.valid_from))[0] ?? null;
}

async function main() {
  const env = loadEnv();
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const { data: brand, error: brandError } = await supabase
    .from("brands")
    .select("id, name")
    .eq("name", "Oh My Dog")
    .single();

  if (brandError || !brand) {
    throw brandError ?? new Error("Marca Oh My Dog não encontrada.");
  }

  const { data: user } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("email", "contato@ohmydogloja.com")
    .maybeSingle();

  const rules = buildOmdRules(brand.id);

  const { error: deleteRulesError } = await supabase
    .from("cmv_history")
    .delete()
    .eq("brand_id", brand.id)
    .in("match_type", ["TYPE", "PRODUCT", "SKU"]);

  if (deleteRulesError) {
    throw deleteRulesError;
  }

  for (const batch of chunk(rules, 50)) {
    const { error } = await supabase.from("cmv_history").insert(batch);
    if (error) {
      throw error;
    }
  }

  const checkpointId = crypto.randomUUID();
  const checkpointTime = new Date().toISOString();

  const { error: checkpointInsertError } = await supabase.from("cmv_checkpoints").insert({
    id: checkpointId,
    brand_id: brand.id,
    created_by: user?.id ?? null,
    note: "Base oficial OMD por tipo com vigencia 2025-01-01 e 2026-03-01",
    items_updated: 0,
    unmatched_items: 0,
    created_at: checkpointTime,
  });

  if (checkpointInsertError) {
    throw checkpointInsertError;
  }

  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select("id, order_date, product_name, product_specs, sku, quantity")
    .eq("brand_id", brand.id);

  if (itemsError) {
    throw itemsError;
  }

  let updatedCount = 0;
  let unmatchedCount = 0;

  for (const item of items ?? []) {
    const productType = detectProductType(item.product_name, `${item.product_specs ?? ""} ${item.sku ?? ""}`);
    const rule = resolveRule(rules, productType, isoDate(item.order_date));

    const payload = {
      product_type: productType,
      cmv_unit_applied: rule ? Number(rule.cmv_unit) : 0,
      cmv_total_applied: rule ? Number(rule.cmv_unit) * Number(item.quantity ?? 0) : 0,
      cmv_rule_type: rule ? "TYPE" : null,
      cmv_rule_value: rule?.match_value ?? null,
      cmv_rule_label: rule?.match_label ?? null,
      cmv_applied_at: checkpointTime,
      cmv_checkpoint_id: checkpointId,
    };

    const { error } = await supabase
      .from("order_items")
      .update(payload)
      .eq("id", item.id);

    if (error) {
      throw error;
    }

    updatedCount += 1;
    if (!rule) {
      unmatchedCount += 1;
    }
  }

  const { error: checkpointUpdateError } = await supabase
    .from("cmv_checkpoints")
    .update({
      items_updated: updatedCount,
      unmatched_items: unmatchedCount,
    })
    .eq("id", checkpointId);

  if (checkpointUpdateError) {
    throw checkpointUpdateError;
  }

  console.log(
    JSON.stringify(
      {
        brand: brand.name,
        checkpointId,
        rulesInserted: rules.length,
        itemsUpdated: updatedCount,
        unmatchedItems: unmatchedCount,
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
