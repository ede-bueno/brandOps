const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const Papa = require("papaparse");
const { createClient } = require("@supabase/supabase-js");

function loadEnv() {
  const envPath = path.join(process.cwd(), ".env.local");
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  return Object.fromEntries(
    lines
      .filter(Boolean)
      .filter((line) => !line.trim().startsWith("#"))
      .map((line) => {
        const separator = line.indexOf("=");
        return [line.slice(0, separator), line.slice(separator + 1).replace(/^"|"$/g, "")];
      }),
  );
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
  if (!haystack) return null;
  if (haystack.includes("cropped moletom")) return "Cropped moletom";
  if (haystack.includes("hoodie moletom") || haystack.includes("moletom hoodie") || haystack.includes("hoodie")) return "Hoodie moletom";
  if (haystack.includes("sueter moletom") || haystack.includes("sueter")) return "Suéter moletom";
  if (haystack.includes("oversized")) return "Oversized";
  if (haystack.includes("peruana") || haystack.includes("algodao peruano")) return "Camiseta Peruana";
  if (haystack.includes("body infantil") || hasWord(haystack, "body")) return "Body";
  if (hasWord(haystack, "infantil") || hasWord(haystack, "mini")) return "Mini";
  if (hasWord(haystack, "regata")) return "Regata";
  if (hasWord(haystack, "cropped")) return "Cropped";
  if (hasWord(haystack, "camiseta") || hasWord(haystack, "masculino") || hasWord(haystack, "feminino") || hasWord(haystack, "unissex")) return "Camiseta";
  return null;
}

function parseCurrency(value) {
  return Number(String(value ?? "").trim().replace(/[^\d,.-]/g, "").replace(",", ".")) || 0;
}

function parseIntLike(value) {
  return Math.round(parseCurrency(value));
}

function toIsoDate(value) {
  const match = String(value ?? "").trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return String(value ?? "").trim();
  const [, dd, mm, yyyy] = match;
  return `${yyyy}-${mm}-${dd}`;
}

function deriveSku(productName, productSpecs) {
  return `${productName}__${productSpecs ?? "sem-especificacao"}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .toLowerCase()
    .slice(0, 255);
}

function parseCsv(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  const result = Papa.parse(text, { header: true, skipEmptyLines: true });
  if (result.errors.length) {
    throw new Error(result.errors[0].message);
  }
  return result.data;
}

function chunk(items, size = 100) {
  const result = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

async function main() {
  const env = loadEnv();
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const { data: brand, error: brandError } = await supabase
    .from("brands")
    .select("id")
    .eq("name", "Oh My Dog")
    .single();

  if (brandError || !brand) {
    throw brandError ?? new Error("Marca Oh My Dog não encontrada.");
  }

  const itemsPath = path.join(process.cwd(), "Exportações", "2026", "Lista de Itens.csv");
  const orderRows = parseCsv(path.join(process.cwd(), "Exportações", "2026", "Lista de Pedidos.csv"));
  const itemRows = parseCsv(itemsPath);

  const orderPayload = orderRows.map((row) => ({
    brand_id: brand.id,
    order_number: row.Pedido,
    order_date: `${toIsoDate(row.Data)}T00:00:00+00:00`,
    customer_name: row.Cliente,
    payment_method: row["Método de Pagamento"],
    payment_status: row["Status de Pagamento"],
    items_in_order: parseIntLike(row["Items no Pedido"]),
    net_revenue: parseCurrency(row["Valor do Pedido"]),
    discount: parseCurrency(row["Valor do Desconto"]),
    commission_value: parseCurrency(row.Comissao),
    source: row.Origem || "Loja",
    tracking_url: row["Link de Rastreio"] || null,
    shipping_state: row["Estado da Entrega"] || null,
    coupon_name: row["Nome do Cupom"] || null,
    is_ignored: false,
    ignore_reason: null,
  }));

  for (const batch of chunk(orderPayload, 50)) {
    const { error } = await supabase.from("orders").upsert(batch, { onConflict: "brand_id,order_number" });
    if (error) throw error;
  }

  const orderNumbers = [...new Set(orderPayload.map((row) => row.order_number))];
  const { data: orderRecords, error: orderRecordsError } = await supabase
    .from("orders")
    .select("id, order_number")
    .eq("brand_id", brand.id)
    .in("order_number", orderNumbers);

  if (orderRecordsError) throw orderRecordsError;

  const orderMap = new Map((orderRecords ?? []).map((row) => [row.order_number, row.id]));

  const { data: rules, error: rulesError } = await supabase
    .from("cmv_history")
    .select("match_value, match_label, cmv_unit, valid_from, valid_to")
    .eq("brand_id", brand.id)
    .eq("match_type", "TYPE");

  if (rulesError) throw rulesError;

  function resolveRule(productType, orderDate) {
    const normalizedType = normalizeText(productType);
    return (rules ?? [])
      .filter((rule) => rule.match_value === normalizedType)
      .filter((rule) => String(rule.valid_from).slice(0, 10) <= orderDate)
      .filter((rule) => !rule.valid_to || String(rule.valid_to).slice(0, 10) > orderDate)
      .sort((left, right) => String(right.valid_from).localeCompare(String(left.valid_from)))[0] ?? null;
  }

  const itemsPayload = itemRows.map((row) => {
    const orderDate = toIsoDate(row.Data);
    const productType = detectProductType(row["Nome do produto"], `${row["Especificações do Produto"] ?? ""}`);
    const rule = resolveRule(productType, orderDate);
    const quantity = parseIntLike(row.Quantidade);
    const unitCost = rule ? Number(rule.cmv_unit) : 0;
    const rowHash = crypto
      .createHash("sha256")
      .update(`${brand.id}|${row.Pedido}|${row["Nome do produto"]}|${row["Especificações do Produto"] ?? ""}|${orderDate}`)
      .digest("hex");

    return {
      brand_id: brand.id,
      order_id: orderMap.get(row.Pedido) ?? null,
      order_number: row.Pedido,
      order_date: `${orderDate}T00:00:00+00:00`,
      customer_name: row["Nome do Cliente"] || null,
      sku: deriveSku(row["Nome do produto"], row["Especificações do Produto"]),
      product_name: row["Nome do produto"],
      product_specs: row["Especificações do Produto"] || null,
      product_type: productType,
      quantity,
      gross_value: parseCurrency(row["Valor Bruto"]),
      unit_price: quantity ? parseCurrency(row["Valor Bruto"]) / quantity : parseCurrency(row["Valor Bruto"]),
      cmv_unit_applied: unitCost,
      cmv_total_applied: unitCost * quantity,
      cmv_rule_type: rule ? "TYPE" : null,
      cmv_rule_value: rule?.match_value ?? null,
      cmv_rule_label: rule?.match_label ?? null,
      cmv_applied_at: new Date().toISOString(),
      row_hash: rowHash,
      is_ignored: false,
      ignore_reason: null,
    };
  });

  for (const batch of chunk(orderNumbers, 50)) {
    const { error } = await supabase
      .from("order_items")
      .delete()
      .eq("brand_id", brand.id)
      .in("order_number", batch);
    if (error) throw error;
  }

  for (const batch of chunk(itemsPayload, 50)) {
    const { error } = await supabase.from("order_items").insert(batch);
    if (error) throw error;
  }

  console.log(JSON.stringify({
    ordersUpserted: orderPayload.length,
    itemsInserted: itemsPayload.length,
    unmatchedItems: itemsPayload.filter((item) => !item.cmv_rule_value).length,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
