import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Inicializa o cliente do Supabase com a chave de serviço para uso em background/cron
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: Request) {
  try {
    // Autenticação básica para proteger a rota de cron
    const authHeader = request.headers.get("Authorization");
    const cronSecret = process.env.CRON_SECRET;
    
    // Se o CRON_SECRET estiver configurado, exigimos que ele venha no header
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { META_ACCESS_TOKEN, META_AD_ACCOUNT_ID } = process.env;
    if (!META_ACCESS_TOKEN || !META_AD_ACCOUNT_ID) {
      return NextResponse.json({ error: "Variáveis de ambiente do Meta ausentes" }, { status: 500 });
    }

    // 1. Obter o ID da marca "Oh My Dog"
    // No BrandOps atual, as credenciais estão em .env (Global) focadas no MVP do Oh My Dog
    const { data: brand, error: brandError } = await supabase
      .from("brands")
      .select("id")
      .ilike("name", "%oh my dog%")
      .single();

    if (brandError || !brand) {
      return NextResponse.json({ error: "Marca 'Oh My Dog' não encontrada no banco." }, { status: 404 });
    }
    const brandId = brand.id;

    // 2. Consultar a Meta Graph API (Ontem / D-1)
    // Buscamos nível 'ad' para capturar o melhor nível de granularidade disponível no nosso schema
    const fields = [
      "campaign_name",
      "adset_name",
      "ad_name",
      "spend",
      "impressions",
      "clicks",
      "inline_link_clicks",
      "reach",
      "actions",
      "action_values"
    ].join(",");

    // A requisição puxa o D-1 consolidado (yesterday)
    const metaApiUrl = `https://graph.facebook.com/v19.0/${META_AD_ACCOUNT_ID}/insights?level=ad&fields=${fields}&date_preset=yesterday&access_token=${META_ACCESS_TOKEN}`;

    const metaResponse = await fetch(metaApiUrl);
    const metaData = await metaResponse.json();

    if (metaData.error) {
      console.error("Meta API Error:", metaData.error);
      return NextResponse.json({ error: "Erro na API da Meta", details: metaData.error }, { status: 502 });
    }

    const insights = metaData.data || [];

    // Se não rodou nada ontem
    if (insights.length === 0) {
      return NextResponse.json({ message: "Nenhum dado encontrado para D-1" });
    }

    // 3. Mapeamento do formato da Meta para o schema RPC do BrandOps
    const payload = insights.map((row: any) => {
      // Extraindo ações (Purchases e Add To Cart)
      const actions = row.actions || [];
      const actionValues = row.action_values || [];

      const purchasesMeta = actions.find((a: any) => a.action_type === "offsite_conversion.fb_pixel_purchase" || a.action_type === "purchase")?.value || 0;
      const addToCartMeta = actions.find((a: any) => a.action_type === "offsite_conversion.fb_pixel_add_to_cart" || a.action_type === "add_to_cart")?.value || 0;
      const conversionValueMeta = actionValues.find((a: any) => a.action_type === "offsite_conversion.fb_pixel_purchase" || a.action_type === "purchase")?.value || 0;

      return {
        brand_id: brandId,
        date: row.date_start, // formato YYYY-MM-DD
        campaign_name: row.campaign_name,
        adset_name: row.adset_name,
        ad_name: row.ad_name,
        platform: "facebook",  // fixo por enquanto, a menos que adicionemos breakdowns
        placement: "unspecified",
        device_platform: "unspecified",
        delivery: "active",
        reach: parseInt(row.reach || "0", 10),
        impressions: parseInt(row.impressions || "0", 10),
        clicks_all: parseInt(row.clicks || "0", 10),
        spend: parseFloat(row.spend || "0"),
        purchases: parseInt(purchasesMeta, 10),
        conversion_value: parseFloat(conversionValueMeta),
        link_clicks: parseInt(row.inline_link_clicks || "0", 10),
        ctr_all: parseFloat(row.clicks || "0") / parseFloat(row.impressions || "1") * 100,
        ctr_link: parseFloat(row.inline_link_clicks || "0") / parseFloat(row.impressions || "1") * 100,
        add_to_cart: parseInt(addToCartMeta, 10)
      };
    });

    // 4. Inserção no Banco de Dados via RPC
    const { error: rpcError } = await supabase.rpc("ingest_meta_raw", {
      p_brand_id: brandId,
      p_rows: payload
    });

    if (rpcError) {
      console.error("Supabase RPC Error:", rpcError);
      return NextResponse.json({ error: "Erro ao gravar dados no Supabase", details: rpcError }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      records_processed: payload.length,
      brand_id: brandId,
      date_synced: insights[0]?.date_start
    });
  } catch (err: any) {
    console.error("Erro inesperado no cron da Meta:", err);
    return NextResponse.json({ error: "Erro interno", details: err.message }, { status: 500 });
  }
}
