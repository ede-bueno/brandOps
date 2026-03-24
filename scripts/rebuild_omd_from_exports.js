const fs = require("fs");
const path = require("path");
const Papa = require("papaparse");
const { createClient } = require("@supabase/supabase-js");

function loadEnvValue(name, envText) {
  const match = envText.match(new RegExp(`${name}="([^"]+)"`));
  return match ? match[1] : "";
}

function parseCsv(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  const result = Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    delimitersToGuess: [",", ";", "\t", "|"],
  });

  if (result.errors.length) {
    throw new Error(`${filePath}: ${result.errors[0].message}`);
  }

  return result.data;
}

function toIsoDate(value) {
  const raw = String(value || "").trim();
  const match = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : raw.slice(0, 10);
}

function parseNumber(value) {
  const raw = String(value || "").trim().replace(/\u00A0/g, " ");
  if (!raw) {
    return 0;
  }

  const negative = /^\(.*\)$/.test(raw) || raw.startsWith("-");
  const sanitized = raw
    .replace(/[R$\s%]/g, "")
    .replace(/[()]/g, "")
    .replace(/[^\d,.-]/g, "");

  if (!sanitized) {
    return 0;
  }

  const lastComma = sanitized.lastIndexOf(",");
  const lastDot = sanitized.lastIndexOf(".");
  let normalized = sanitized;

  if (lastComma >= 0 && lastDot >= 0) {
    normalized =
      lastComma > lastDot
        ? sanitized.replace(/\./g, "").replace(",", ".")
        : sanitized.replace(/,/g, "");
  } else if (lastComma >= 0) {
    const decimalDigits = sanitized.length - lastComma - 1;
    normalized =
      decimalDigits > 0 && decimalDigits <= 2
        ? sanitized.replace(/\./g, "").replace(",", ".")
        : sanitized.replace(/,/g, "");
  } else if ((sanitized.match(/\./g) || []).length > 1) {
    normalized = sanitized.replace(/\./g, "");
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return negative ? -Math.abs(parsed) : parsed;
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function deriveItemSku(productName, productSpecs) {
  return `${productName}__${productSpecs || "sem-especificacao"}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .toLowerCase()
    .slice(0, 255);
}

async function main() {
  const envPath = path.join(process.cwd(), ".env.local");
  const envText = fs.readFileSync(envPath, "utf8");
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

  const folders = ["2025", "2026"].map((year) => path.join(process.cwd(), "Exportações", year));

  const ordersByNumber = new Map();
  const itemsByKey = new Map();
  const salesLinesByKey = new Map();
  const mediaByKey = new Map();
  const productsBySku = new Map();

  for (const folder of folders) {
    const paidOrders = parseCsv(path.join(folder, "Lista de Pedidos.csv"));
    for (const row of paidOrders) {
      const orderNumber = String(row.Pedido || "").trim();
      if (!orderNumber) {
        continue;
      }

      ordersByNumber.set(orderNumber, {
        brand_id: brand.id,
        order_number: orderNumber,
        order_date: `${toIsoDate(row.Data)}T00:00:00`,
        customer_name: row.Cliente || null,
        gross_revenue: parseNumber(row["Valor do Pedido"]),
        discount: parseNumber(row["Valor do Desconto"]),
        net_revenue: parseNumber(row["Valor do Pedido"]),
        payment_status: row["Status de Pagamento"] || null,
        source: row.Origem || null,
        tracking_code: row["Link de Rastreio"] || null,
        payment_method: row["Método de Pagamento"] || null,
        items_in_order: Math.round(parseNumber(row["Items no Pedido"])),
        coupon_name: row["Nome do Cupom"] || null,
        commission_value: parseNumber(row.Comissao),
        shipping_state: row["Estado da Entrega"] || null,
        tracking_url: row["Link de Rastreio"] || null,
        is_ignored: false,
        ignore_reason: null,
      });
    }
  }

  for (const folder of folders) {
    const itemRows = parseCsv(path.join(folder, "Lista de Itens.csv"));
    for (const row of itemRows) {
      const orderNumber = String(row.Pedido || "").trim();
      const productName = String(row["Nome do produto"] || "").trim();
      const productSpecs = String(row["Especificações do Produto"] || "").trim();
      const key = [
        orderNumber,
        toIsoDate(row.Data),
        productName,
        productSpecs,
        parseNumber(row.Quantidade),
        parseNumber(row["Valor Bruto"]),
      ].join("::");

      itemsByKey.set(key, {
        brand_id: brand.id,
        order_number: orderNumber,
        order_date: `${toIsoDate(row.Data)}T00:00:00`,
        customer_name: row["Nome do Cliente"] || null,
        sku: deriveItemSku(productName, productSpecs),
        product_name: productName,
        product_specs: productSpecs || null,
        quantity: Math.round(parseNumber(row.Quantidade)),
        gross_value: parseNumber(row["Valor Bruto"]),
        unit_price: Math.round(parseNumber(row.Quantidade))
          ? parseNumber(row["Valor Bruto"]) / Math.round(parseNumber(row.Quantidade))
          : parseNumber(row["Valor Bruto"]),
        cmv_unit_applied: 0,
        cmv_total_applied: 0,
        cmv_rule_type: null,
        cmv_rule_value: null,
        cmv_rule_label: null,
        cmv_applied_at: null,
        cmv_checkpoint_id: null,
        is_ignored: false,
        ignore_reason: null,
      });
    }

    const salesRows = parseCsv(path.join(folder, "Pedidos Pagos.csv"));
    for (const row of salesRows) {
      const key = [
        row["Número do pedido"],
        toIsoDate(row.Data),
        row["ID produto"],
        row.Descrição,
        row.Quantidade,
        row["Valor unitário"],
      ].join("::");

      salesLinesByKey.set(key, {
        brand_id: brand.id,
        order_number: row["Número do pedido"],
        order_date: `${toIsoDate(row.Data)}T00:00:00`,
        product_id: row["ID produto"] || null,
        product_name: row.Descrição || null,
        quantity: Math.round(parseNumber(row.Quantidade)),
        unit_price: parseNumber(row["Valor unitário"]),
        order_discount_value: parseNumber(row["Desconto do pedido (% ou valor)"]),
        shipping_value: parseNumber(row["Frete pedido"]),
        order_status: row.Situação || null,
        sku: row["Código (SKU)"] || null,
        is_ignored: false,
        ignore_reason: null,
      });
    }

    const mediaRows = parseCsv(path.join(folder, "Meta Export.csv"));
    for (const row of mediaRows) {
      const normalized = {
        brand_id: brand.id,
        date: toIsoDate(row.Dia),
        campaign_name: row["Nome da campanha"] || null,
        adset_name: row["Nome do conjunto de anúncios"] || null,
        account_name: row["Nome da conta"] || null,
        ad_name: row["Nome do anúncio"] || null,
        platform: row.Plataforma || null,
        placement: row.Posicionamento || null,
        device_platform: row["Plataforma do dispositivo"] || null,
        delivery: row["Veiculação do anúncio"] || null,
        spend: parseNumber(row["Valor usado (BRL)"]),
        impressions: Math.round(parseNumber(row["Impressões"])),
        reach: Math.round(parseNumber(row.Alcance)),
        clicks: Math.round(parseNumber(row["Cliques no link"] || row["Cliques (todos)"])),
        clicks_all: Math.round(parseNumber(row["Cliques (todos)"])),
        purchases: Math.round(parseNumber(row.Compras)),
        conversion_value: parseNumber(row["Valor de conversão da compra"]),
        link_clicks: Math.round(parseNumber(row["Cliques no link"])),
        ctr_all: parseNumber(row["CTR (todos)"]),
        ctr_link: parseNumber(row["CTR (taxa de cliques no link)"]),
        add_to_cart: Math.round(parseNumber(row["Adições ao carrinho"])),
        currency: "BRL",
        is_ignored: false,
        ignore_reason: null,
      };

      const key = [
        normalized.date,
        normalized.campaign_name,
        normalized.adset_name,
        normalized.ad_name,
        normalized.platform,
        normalized.placement,
        normalized.device_platform,
      ].join("::");
      mediaByKey.set(key, normalized);
    }

    const feedRows = parseCsv(path.join(folder, "feed_facebook.csv"));
    for (const row of feedRows) {
      const sku = String(row.id || row.sku || row["item_group_id"] || "").trim();
      if (!sku) {
        continue;
      }

      productsBySku.set(sku, {
        brand_id: brand.id,
        sku,
        title: row.title || sku,
        price: parseNumber(row.price),
        sale_price: parseNumber(row.sale_price) || null,
        image_url: row.image_link || null,
        product_url: row.link || null,
        attributes: {
          brand: row.brand || null,
          color: row.color || null,
          gender: row.gender || null,
          material: row.material || null,
          size: row.size || null,
        },
      });
    }
  }

  const orders = [...ordersByNumber.values()];
  const orderItems = [...itemsByKey.values()];
  const salesLines = [...salesLinesByKey.values()];
  const media = [...mediaByKey.values()];
  const products = [...productsBySku.values()];

  await supabase.from("import_logs").delete().eq("brand_id", brand.id);
  await supabase.from("media_performance").delete().eq("brand_id", brand.id);
  await supabase.from("sales_lines").delete().eq("brand_id", brand.id);
  await supabase.from("order_items").delete().eq("brand_id", brand.id);
  await supabase.from("orders").delete().eq("brand_id", brand.id);
  await supabase.from("products").delete().eq("brand_id", brand.id);

  for (let i = 0; i < orders.length; i += 200) {
    const chunk = orders.slice(i, i + 200);
    const { error } = await supabase.from("orders").insert(chunk);
    if (error) {
      throw error;
    }
  }

  const { data: orderMapRows, error: orderMapError } = await supabase
    .from("orders")
    .select("id,order_number")
    .eq("brand_id", brand.id);

  if (orderMapError) {
    throw orderMapError;
  }

  const orderMap = new Map((orderMapRows || []).map((row) => [row.order_number, row.id]));
  const hydratedItems = orderItems
    .filter((item) => orderMap.has(item.order_number))
    .map((item) => ({
      ...item,
      order_id: orderMap.get(item.order_number),
    }));

  for (let i = 0; i < hydratedItems.length; i += 200) {
    const chunk = hydratedItems.slice(i, i + 200);
    const { error } = await supabase.from("order_items").insert(chunk);
    if (error) {
      throw error;
    }
  }

  for (let i = 0; i < salesLines.length; i += 200) {
    const chunk = salesLines.slice(i, i + 200);
    const { error } = await supabase.from("sales_lines").insert(chunk);
    if (error) {
      throw error;
    }
  }

  for (let i = 0; i < media.length; i += 200) {
    const chunk = media.slice(i, i + 200);
    const { error } = await supabase.from("media_performance").insert(chunk);
    if (error) {
      throw error;
    }
  }

  for (let i = 0; i < products.length; i += 200) {
    const chunk = products.slice(i, i + 200);
    const { error } = await supabase.from("products").upsert(chunk, {
      onConflict: "brand_id,sku",
    });
    if (error) {
      throw error;
    }
  }

  console.log(
    JSON.stringify(
      {
        brand: brand.name,
        orders: orders.length,
        orderItems: hydratedItems.length,
        salesLines: salesLines.length,
        media: media.length,
        products: products.length,
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
