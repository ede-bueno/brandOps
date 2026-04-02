import { NextResponse } from "next/server";
import { requireBrandAccess } from "@/lib/brandops/admin";
import {
  buildMediaReport,
  normalizeMediaReportPayload,
} from "@/lib/brandops/server/media-report";
import { parseDateParam } from "@/lib/brandops/server/report-params";

const PAGE_SIZE = 1000;

async function fetchAllRows<T>(
  fetchPage: (from: number, to: number) => Promise<{ data: T[] | null; error: Error | null }>,
) {
  const rows: T[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await fetchPage(from, to);

    if (error) {
      throw error;
    }

    const page = data ?? [];
    rows.push(...page);

    if (page.length < PAGE_SIZE) {
      break;
    }
  }

  return rows;
}

function needsMediaFallback(report: ReturnType<typeof normalizeMediaReportPayload>) {
  if (report.summary.impressions <= 0) {
    return false;
  }

  if (report.summary.clicksAll > 0 && report.summary.ctrAll <= 0) {
    return true;
  }

  if (report.summary.linkClicks > 0 && report.summary.ctrLink <= 0) {
    return true;
  }

  return report.campaigns.some(
    (campaign) =>
      campaign.impressions > 0 &&
      ((campaign.clicksAll > 0 && campaign.ctrAll <= 0) ||
        (campaign.linkClicks > 0 && campaign.ctrLink <= 0)),
  );
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ brandId: string }> },
) {
  try {
    const { brandId } = await params;
    const { supabase } = await requireBrandAccess(request, brandId);
    const url = new URL(request.url);
    const from = parseDateParam(url.searchParams.get("from"));
    const to = parseDateParam(url.searchParams.get("to"));

    const { data, error } = await supabase.rpc("get_media_report", {
      p_brand_id: brandId,
      p_from: from,
      p_to: to,
    });

    if (error) {
      const [{ data: integration, error: integrationError }, mediaRows] = await Promise.all([
        supabase
          .from("brand_integrations")
          .select("mode, settings")
          .eq("brand_id", brandId)
          .eq("provider", "meta")
          .maybeSingle(),
        fetchAllRows(async (pageFrom, pageTo) =>
          supabase
            .from("media_performance")
            .select(
              "id, report_start, date, campaign_name, adset_name, ad_name, delivery, reach, impressions, clicks_all, link_clicks, spend, purchases, conversion_value, is_ignored",
            )
            .eq("brand_id", brandId)
            .range(pageFrom, pageTo),
        ),
      ]);

      if (integrationError) {
        throw integrationError;
      }

      return NextResponse.json(
        buildMediaReport(mediaRows, {
          mode: integration?.mode ?? "manual_csv",
          manualFallback: Boolean(integration?.settings?.manualFallback),
          from,
          to,
        }),
      );
    }

    const report = normalizeMediaReportPayload(data);

    if (!needsMediaFallback(report)) {
      return NextResponse.json(report);
    }

    const [{ data: integration, error: integrationError }, mediaRows] = await Promise.all([
      supabase
        .from("brand_integrations")
        .select("mode, settings")
        .eq("brand_id", brandId)
        .eq("provider", "meta")
        .maybeSingle(),
      fetchAllRows(async (pageFrom, pageTo) =>
        supabase
          .from("media_performance")
          .select(
            "id, report_start, date, campaign_name, adset_name, ad_name, delivery, reach, impressions, clicks_all, link_clicks, spend, purchases, conversion_value, is_ignored",
          )
          .eq("brand_id", brandId)
          .range(pageFrom, pageTo),
      ),
    ]);

    if (integrationError) {
      throw integrationError;
    }

    return NextResponse.json(
      buildMediaReport(mediaRows, {
        mode: integration?.mode ?? "manual_csv",
        manualFallback: Boolean(integration?.settings?.manualFallback),
        from,
        to,
      }),
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível montar o relatório de Performance Mídia.",
      },
      { status: 400 },
    );
  }
}
