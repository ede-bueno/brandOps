import "server-only";

import type { FunctionDeclaration } from "@google/genai";
import type {
  AnnualDreReport,
  CatalogReport,
  MediaReport,
  ProductInsightsReport,
  SalesDetailReport,
  SanitizationReport,
  TrafficReport,
} from "@/lib/brandops/types";
import type { AtlasAnalystExecutionInput, AtlasAnalystReportId } from "./types";

export type AtlasAnalystToolName =
  | "get_financial_report"
  | "get_media_report"
  | "get_traffic_report"
  | "get_product_insights_report"
  | "get_sales_report"
  | "get_catalog_report"
  | "get_sanitization_report";

type ToolExecutionResult = {
  reportId: AtlasAnalystReportId;
  snapshotKey: string;
  output: Record<string, unknown>;
};

const EMPTY_TOOL_PARAMETERS = {
  type: "object",
  additionalProperties: false,
  properties: {},
} as const;

function buildQueryString(input: Pick<AtlasAnalystExecutionInput, "from" | "to">) {
  const params = new URLSearchParams();
  if (input.from) {
    params.set("from", input.from);
  }
  if (input.to) {
    params.set("to", input.to);
  }
  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}

async function fetchInternalReport<T>(request: Request, path: string): Promise<T> {
  const authorization = request.headers.get("authorization");
  if (!authorization) {
    throw new Error("Sessao ausente para consultar os relatórios internos.");
  }

  const baseUrl = new URL(request.url).origin;
  const response = await fetch(`${baseUrl}${path}`, {
    method: "GET",
    headers: {
      authorization,
    },
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as { error?: string } | null;
  if (!response.ok) {
    throw new Error(payload?.error ?? `Falha ao carregar ${path}.`);
  }

  return payload as T;
}

function compactFinancialReport(report: AnnualDreReport) {
  return {
    total: {
      grossRevenue: report.total.grossRevenue,
      rld: report.total.rld,
      mediaSpend: report.total.mediaSpend,
      cmvTotal: report.total.cmvTotal,
      contributionAfterMedia: report.total.contributionAfterMedia,
      contributionMargin: report.total.contributionMargin,
      operatingExpensesTotal: report.total.operatingExpensesTotal,
      netResult: report.total.netResult,
      breakEvenDisplay: report.total.breakEvenDisplay,
      breakEvenReliable: report.total.breakEvenReliable,
      breakEvenReason: report.total.breakEvenReason,
      activeMonthCount: report.total.activeMonthCount,
    },
    analysis: {
      momentum: report.analysis.momentum,
      topExpenseCategory: report.analysis.topExpenseCategory,
      bestContributionMonth: report.analysis.bestContributionMonth,
      worstContributionMonth: report.analysis.worstContributionMonth,
      latestMonth: report.analysis.latestMonth,
    },
    recentMonths: report.months.slice(-6).map((month) => ({
      monthKey: month.monthKey,
      label: month.label,
      rld: month.metrics.rld,
      contributionAfterMedia: month.metrics.contributionAfterMedia,
      netResult: month.metrics.netResult,
      fixedExpensesTotal: month.metrics.fixedExpensesTotal,
    })),
  };
}

function compactMediaReport(report: MediaReport) {
  return {
    summary: report.summary,
    commandRoom: report.commandRoom,
    highlights: report.highlights,
    signals: report.signals,
    analysis: report.analysis,
    playbookCounts: {
      scale: report.playbook.scale.count,
      review: report.playbook.review.count,
      monitor: report.playbook.monitor.count,
    },
    scaleCandidates: report.playbook.scale.items.slice(0, 3).map((item) => ({
      campaignName: item.campaignName,
      roas: item.roas,
      cpa: item.cpa,
      ctrLink: item.ctrLink,
      summary: item.summary,
    })),
    reviewCandidates: report.playbook.review.items.slice(0, 3).map((item) => ({
      campaignName: item.campaignName,
      roas: item.roas,
      cpa: item.cpa,
      ctrLink: item.ctrLink,
      summary: item.summary,
    })),
    meta: report.meta,
  };
}

function compactTrafficReport(report: TrafficReport) {
  return {
    summary: report.summary,
    story: report.story,
    frictionSignal: report.frictionSignal,
    highlights: report.highlights,
    signals: report.signals,
    analysis: report.analysis,
    playbookCounts: {
      scale: report.playbook.scale.count,
      review: report.playbook.review.count,
      monitor: report.playbook.monitor.count,
    },
    scaleCandidates: report.playbook.scale.items.slice(0, 3),
    reviewCandidates: report.playbook.review.items.slice(0, 3),
    meta: report.meta,
  };
}

function compactProductInsightsReport(report: ProductInsightsReport) {
  return {
    overview: report.overview,
    momentum: report.momentum,
    hero: report.hero,
    analysis: report.analysis,
    decisions: report.decisions,
    classifications: report.classifications,
    featured: report.featured.slice(0, 3).map((item) => ({
      stampName: item.stampName,
      productType: item.productType,
      decision: item.decision,
      decisionTitle: item.decisionTitle,
      decisionSummary: item.decisionSummary,
      realUnitsSold: item.realUnitsSold,
      realGrossRevenue: item.realGrossRevenue,
      addToCartRate: item.addToCartRate,
      purchaseRate: item.purchaseRate,
      viewGrowth: item.viewGrowth,
    })),
    watchlist: report.watchlist.slice(0, 3).map((item) => ({
      stampName: item.stampName,
      productType: item.productType,
      decision: item.decision,
      decisionTitle: item.decisionTitle,
      decisionSummary: item.decisionSummary,
      realUnitsSold: item.realUnitsSold,
      realGrossRevenue: item.realGrossRevenue,
      addToCartRate: item.addToCartRate,
      purchaseRate: item.purchaseRate,
      viewGrowth: item.viewGrowth,
    })),
    meta: report.meta,
  };
}

function compactSalesReport(report: SalesDetailReport) {
  return {
    highlights: report.highlights,
    analysis: report.analysis,
    topProducts: report.topProducts.slice(0, 5),
    recentDays: report.dailySeries.slice(-10),
    playbookCounts: {
      protect: report.playbook.protect.count,
      grow: report.playbook.grow.count,
      review: report.playbook.review.count,
    },
    protectCandidates: report.playbook.protect.items.slice(0, 3),
    growCandidates: report.playbook.grow.items.slice(0, 3),
    reviewCandidates: report.playbook.review.items.slice(0, 3),
    meta: report.meta,
  };
}

function compactCatalogReport(report: CatalogReport) {
  return {
    summary: report.summary,
    highlights: {
      topSellers: report.highlights.topSellers.slice(0, 3).map((item) => ({
        id: item.id,
        title: item.title,
        unitsSold: item.unitsSold,
        printName: item.printName,
        galleryCount: item.galleryCount,
        dataSource: item.dataSource,
      })),
      uncovered: report.highlights.uncovered.slice(0, 3).map((item) => ({
        id: item.id,
        title: item.title,
        unitsSold: item.unitsSold,
        printName: item.printName,
        galleryCount: item.galleryCount,
        dataSource: item.dataSource,
      })),
    },
    playbookCounts: {
      scale: report.playbook.scale.count,
      review: report.playbook.review.count,
      monitor: report.playbook.monitor.count,
    },
    analysis: report.analysis,
    filters: report.filters,
    meta: report.meta,
  };
}

function compactSanitizationReport(report: SanitizationReport) {
  return {
    meta: report.meta,
    pending: report.pending.slice(0, 5).map((item) => ({
      target: item.target,
      date: item.date,
      campaignName: item.campaignName,
      adsetName: item.adsetName,
      adName: item.adName,
      metric: item.metric,
      value: item.value,
      reason: item.reason,
      severity: item.severity,
      sanitizationStatus: item.sanitizationStatus,
    })),
    history: report.history.slice(0, 5).map((item) => ({
      target: item.target,
      date: item.date,
      campaignName: item.campaignName,
      adsetName: item.adsetName,
      adName: item.adName,
      metric: item.metric,
      value: item.value,
      reason: item.reason,
      severity: item.severity,
      sanitizationStatus: item.sanitizationStatus,
    })),
  };
}

const TOOL_DEFINITIONS: Record<
  AtlasAnalystToolName,
  {
    reportId: AtlasAnalystReportId;
    snapshotKey: string;
    description: string;
    load: (request: Request, input: AtlasAnalystExecutionInput) => Promise<Record<string, unknown>>;
  }
> = {
  get_financial_report: {
    reportId: "financial",
    snapshotKey: "financial",
    description:
      "Carrega o relatório financeiro consolidado com RLD, contribuição, despesas, resultado e break-even do Atlas.",
    load: async (request, input) => {
      const query = buildQueryString(input);
      return compactFinancialReport(
        await fetchInternalReport<AnnualDreReport>(
          request,
          `/api/admin/brands/${input.brandId}/reports/financial${query}`,
        ),
      );
    },
  },
  get_media_report: {
    reportId: "media",
    snapshotKey: "media",
    description:
      "Carrega o relatório de mídia da Meta com command room, sinais, campanhas e playbook de escala, revisão e monitoramento.",
    load: async (request, input) => {
      const query = buildQueryString(input);
      return compactMediaReport(
        await fetchInternalReport<MediaReport>(
          request,
          `/api/admin/brands/${input.brandId}/reports/media${query}`,
        ),
      );
    },
  },
  get_traffic_report: {
    reportId: "traffic",
    snapshotKey: "traffic",
    description:
      "Carrega o relatório de tráfego e funil GA4 com gargalos, sinais de fricção e oportunidades de escala.",
    load: async (request, input) => {
      const query = buildQueryString(input);
      return compactTrafficReport(
        await fetchInternalReport<TrafficReport>(
          request,
          `/api/admin/brands/${input.brandId}/reports/traffic${query}`,
        ),
      );
    },
  },
  get_product_insights_report: {
    reportId: "product-insights",
    snapshotKey: "productInsights",
    description:
      "Carrega os insights de produtos e estampas com hero, watchlist, momentum, decisões e leitura de POD.",
    load: async (request, input) => {
      const query = buildQueryString(input);
      return compactProductInsightsReport(
        await fetchInternalReport<ProductInsightsReport>(
          request,
          `/api/admin/brands/${input.brandId}/reports/product-insights${query}`,
        ),
      );
    },
  },
  get_sales_report: {
    reportId: "sales",
    snapshotKey: "sales",
    description:
      "Carrega o relatório detalhado de vendas com top produtos, dias fortes, playbook e análise comercial.",
    load: async (request, input) => {
      const query = buildQueryString(input);
      return compactSalesReport(
        await fetchInternalReport<SalesDetailReport>(
          request,
          `/api/admin/brands/${input.brandId}/reports/sales${query}`,
        ),
      );
    },
  },
  get_catalog_report: {
    reportId: "catalog",
    snapshotKey: "catalog",
    description:
      "Carrega o relatório do catálogo com top sellers, itens descobertos, cobertura visual e source mode do feed.",
    load: async (request, input) => {
      const query = buildQueryString(input);
      return compactCatalogReport(
        await fetchInternalReport<CatalogReport>(
          request,
          `/api/admin/brands/${input.brandId}/reports/catalog${query}`,
        ),
      );
    },
  },
  get_sanitization_report: {
    reportId: "sanitization",
    snapshotKey: "sanitization",
    description:
      "Carrega o relatório de saneamento com pendências, histórico e sinais de qualidade de dados.",
    load: async (request, input) => compactSanitizationReport(
      await fetchInternalReport<SanitizationReport>(
        request,
        `/api/admin/brands/${input.brandId}/reports/sanitization`,
      ),
    ),
  },
};

export const ATLAS_ANALYST_FUNCTION_DECLARATIONS: FunctionDeclaration[] = (
  Object.entries(TOOL_DEFINITIONS) as Array<[AtlasAnalystToolName, (typeof TOOL_DEFINITIONS)[AtlasAnalystToolName]]>
).map(([name, definition]) => ({
  name,
  description: definition.description,
  parametersJsonSchema: EMPTY_TOOL_PARAMETERS,
}));

export function reportIdToToolName(reportId: AtlasAnalystReportId): AtlasAnalystToolName {
  const match = (Object.entries(TOOL_DEFINITIONS) as Array<
    [AtlasAnalystToolName, (typeof TOOL_DEFINITIONS)[AtlasAnalystToolName]]
  >).find(([, definition]) => definition.reportId === reportId);

  if (!match) {
    throw new Error(`Tool não encontrada para o relatório ${reportId}.`);
  }

  return match[0];
}

export function isAtlasAnalystToolName(value: string): value is AtlasAnalystToolName {
  return value in TOOL_DEFINITIONS;
}

export async function executeAtlasAnalystTool(
  request: Request,
  input: AtlasAnalystExecutionInput,
  toolName: AtlasAnalystToolName,
): Promise<ToolExecutionResult> {
  const definition = TOOL_DEFINITIONS[toolName];
  const output = await definition.load(request, input);

  return {
    reportId: definition.reportId,
    snapshotKey: definition.snapshotKey,
    output,
  };
}

export async function loadReportSnapshots(
  request: Request,
  input: AtlasAnalystExecutionInput,
  reportPlan: AtlasAnalystReportId[],
) {
  const settled = await Promise.allSettled(
    reportPlan.map(async (reportId) => {
      const toolName = reportIdToToolName(reportId);
      const result = await executeAtlasAnalystTool(request, input, toolName);
      return {
        reportId,
        result,
      };
    }),
  );

  const warnings: string[] = [];
  const usedReports: AtlasAnalystReportId[] = [];
  const snapshots: Record<string, unknown> = {};

  settled.forEach((result, index) => {
    const reportId = reportPlan[index];
    if (result.status === "rejected") {
      warnings.push(
        `Nao foi possivel carregar o relatório ${reportId}: ${result.reason instanceof Error ? result.reason.message : "falha desconhecida"}.`,
      );
      return;
    }

    usedReports.push(result.value.reportId);
    snapshots[result.value.result.snapshotKey] = result.value.result.output;
  });

  return {
    warnings,
    usedReports,
    snapshots,
  };
}
