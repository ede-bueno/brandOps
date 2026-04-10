import { NextResponse } from "next/server";
import { requireBrandAccess } from "@/lib/brandops/admin";
import {
  buildMediaReport,
  normalizeMediaReportPayload,
} from "@/lib/brandops/server/media-report";
import { parseDateParam } from "@/lib/brandops/server/report-params";

const PAGE_SIZE = 1000;
const MEDIA_SELECT_WITH_CREATIVE =
  "id, report_start, date, campaign_id, campaign_name, adset_id, adset_name, ad_id, ad_name, creative_id, creative_name, delivery, reach, impressions, clicks_all, link_clicks, spend, purchases, conversion_value, is_ignored";
const MEDIA_SELECT_BASE =
  "id, report_start, date, campaign_name, adset_name, ad_name, delivery, reach, impressions, clicks_all, link_clicks, spend, purchases, conversion_value, is_ignored";
type MediaReportRows = Parameters<typeof buildMediaReport>[0];

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
  if (report.campaigns.length > 0 && report.ads.rows.length <= 0) {
    return true;
  }

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

function isMissingMediaCreativeColumns(error: unknown) {
  return (
    error instanceof Error &&
    /column media_performance\.(campaign_id|adset_id|ad_id|creative_id|creative_name) does not exist/i.test(
      error.message,
    )
  );
}

async function fetchMediaRows(
  supabase: Awaited<ReturnType<typeof requireBrandAccess>>["supabase"],
  brandId: string,
): Promise<MediaReportRows> {
  try {
    return await fetchAllRows<MediaReportRows[number]>(async (pageFrom, pageTo) =>
      supabase
        .from("media_performance")
        .select(MEDIA_SELECT_WITH_CREATIVE)
        .eq("brand_id", brandId)
        .range(pageFrom, pageTo),
    );
  } catch (error) {
    if (!isMissingMediaCreativeColumns(error)) {
      throw error;
    }

    return fetchAllRows<MediaReportRows[number]>(async (pageFrom, pageTo) =>
      supabase
        .from("media_performance")
        .select(MEDIA_SELECT_BASE)
        .eq("brand_id", brandId)
        .range(pageFrom, pageTo),
    );
  }
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
        fetchMediaRows(supabase, brandId),
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
      fetchMediaRows(supabase, brandId),
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
