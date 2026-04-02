import "server-only";

import type {
  AnnualDreReport,
  FinancialReportAnalysis,
  FinancialReportMonthHighlight,
  FinancialReportMomentum,
  FinancialReportTopExpenseCategory,
  FinancialReportSummary,
  MonthlyDreEntry,
  MonthlyExpenseBreakdown,
} from "@/lib/brandops/types";

const EMPTY_SUMMARY: FinancialReportSummary = {
  grossRevenue: 0,
  rob: 0,
  netRevenue: 0,
  rld: 0,
  netAfterFees: 0,
  discounts: 0,
  orderCount: 0,
  paidOrderCount: 0,
  unitsSold: 0,
  averageTicket: 0,
  mediaSpend: 0,
  grossRoas: 0,
  grossMargin: 0,
  contributionAfterMedia: 0,
  contributionMargin: 0,
  commissionTotal: 0,
  cmvTotal: 0,
  fixedExpensesTotal: 0,
  operatingExpensesTotal: 0,
  operatingResult: 0,
  netResult: 0,
  operatingMargin: 0,
  itemsPerOrder: 0,
  revenuePerUnit: 0,
  avgMarkup: 0,
  breakEvenPoint: 0,
  couponDiscounts: 0,
  inkProfit: 0,
  averageInkProfit: 0,
  hasItemDetailCoverage: false,
  activeMonthCount: 0,
  averageMonthlyFixedExpenses: 0,
  breakEvenDisplay: null,
  breakEvenReliable: false,
  breakEvenReason: "Sem dados suficientes para calcular o ponto de equilíbrio.",
};

const EMPTY_ANALYSIS: FinancialReportAnalysis = {
  bestContributionMonth: null,
  worstContributionMonth: null,
  latestMonth: null,
  topExpenseCategory: null,
  shares: {
    cmvShare: 0,
    mediaShare: 0,
    expenseShare: 0,
    variableCostShare: 0,
  },
  momentum: {
    tone: "neutral",
    title: "Série insuficiente",
    description: "Ainda não há meses suficientes para comparar a tendência da margem.",
    delta: 0,
    currentAverage: 0,
    previousAverage: 0,
    hasComparison: false,
  },
};

function toNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toBoolean(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }

  return Boolean(value);
}

function toStringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function resolveBreakEvenReason(summary: FinancialReportSummary) {
  if (summary.averageMonthlyFixedExpenses <= 0) {
    return "Sem média mensal de despesas fixas suficiente para estimar o ponto de equilíbrio.";
  }

  if (summary.activeMonthCount <= 0) {
    return "Sem meses ativos suficientes para estimar o ponto de equilíbrio.";
  }

  if (summary.rld <= 0 || summary.contributionMargin <= 0) {
    return "Não calculável com a margem de contribuição atual.";
  }

  if (summary.contributionMargin < 0.03) {
    return "Margem muito comprimida no recorte atual. A meta mensal de RLD fica instável e não é exibida.";
  }

  return "Meta mensal de RLD necessária para cobrir a média de despesas fixas com a margem atual.";
}

function mapSummary(source: unknown): FinancialReportSummary {
  const payload = (source ?? {}) as Partial<FinancialReportSummary>;

  const summary: FinancialReportSummary = {
    ...EMPTY_SUMMARY,
    grossRevenue: toNumber(payload.grossRevenue),
    rob: toNumber(payload.rob),
    netRevenue: toNumber(payload.netRevenue),
    rld: toNumber(payload.rld),
    netAfterFees: toNumber(payload.netAfterFees),
    discounts: toNumber(payload.discounts),
    orderCount: toNumber(payload.orderCount),
    paidOrderCount: toNumber(payload.paidOrderCount),
    unitsSold: toNumber(payload.unitsSold),
    averageTicket: toNumber(payload.averageTicket),
    mediaSpend: toNumber(payload.mediaSpend),
    grossRoas: toNumber(payload.grossRoas),
    grossMargin: toNumber(payload.grossMargin),
    contributionAfterMedia: toNumber(payload.contributionAfterMedia),
    contributionMargin: toNumber(payload.contributionMargin),
    commissionTotal: toNumber(payload.commissionTotal),
    cmvTotal: toNumber(payload.cmvTotal),
    fixedExpensesTotal: toNumber(payload.fixedExpensesTotal),
    operatingExpensesTotal: toNumber(payload.operatingExpensesTotal),
    operatingResult: toNumber(payload.operatingResult),
    netResult: toNumber(payload.netResult),
    operatingMargin: toNumber(payload.operatingMargin),
    itemsPerOrder: toNumber(payload.itemsPerOrder),
    revenuePerUnit: toNumber(payload.revenuePerUnit),
    avgMarkup: toNumber(payload.avgMarkup),
    breakEvenPoint: toNumber(payload.breakEvenPoint),
    couponDiscounts: toNumber(payload.couponDiscounts),
    inkProfit: toNumber(payload.inkProfit),
    averageInkProfit: toNumber(payload.averageInkProfit),
    hasItemDetailCoverage: toBoolean(payload.hasItemDetailCoverage),
    activeMonthCount: toNumber(payload.activeMonthCount),
    averageMonthlyFixedExpenses: toNumber(payload.averageMonthlyFixedExpenses),
    breakEvenDisplay:
      payload.breakEvenDisplay === null || payload.breakEvenDisplay === undefined
        ? null
        : toNumber(payload.breakEvenDisplay),
    breakEvenReliable: toBoolean(payload.breakEvenReliable),
    breakEvenReason: toStringValue(payload.breakEvenReason, EMPTY_SUMMARY.breakEvenReason),
  };

  return {
    ...summary,
    breakEvenReason: resolveBreakEvenReason(summary),
  };
}

function mapMonthEntry(source: unknown): MonthlyDreEntry {
  const payload = (source ?? {}) as {
    monthKey?: unknown;
    label?: unknown;
    metrics?: unknown;
  };

  return {
    monthKey: toStringValue(payload.monthKey),
    label: toStringValue(payload.label),
    metrics: mapSummary(payload.metrics),
  };
}

function mapExpenseBreakdown(source: unknown): MonthlyExpenseBreakdown {
  const payload = (source ?? {}) as {
    categoryId?: unknown;
    categoryName?: unknown;
    valuesByMonth?: Record<string, unknown>;
    total?: unknown;
  };

  return {
    categoryId: toStringValue(payload.categoryId),
    categoryName: toStringValue(payload.categoryName, "Sem categoria"),
    valuesByMonth: Object.fromEntries(
      Object.entries(payload.valuesByMonth ?? {}).map(([monthKey, value]) => [
        monthKey,
        toNumber(value),
      ]),
    ),
    total: toNumber(payload.total),
  };
}

function mapMonthHighlight(month: MonthlyDreEntry | null): FinancialReportMonthHighlight | null {
  if (!month) {
    return null;
  }

  return {
    monthKey: month.monthKey,
    label: month.label,
    contributionAfterMedia: month.metrics.contributionAfterMedia,
    netResult: month.metrics.netResult,
    rld: month.metrics.rld,
    fixedExpensesTotal: month.metrics.fixedExpensesTotal,
    contributionMargin: month.metrics.contributionMargin,
    operatingMargin: month.metrics.operatingMargin,
  };
}

function average(values: number[]) {
  if (!values.length) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function buildMomentum(months: MonthlyDreEntry[]): FinancialReportMomentum {
  const ordered = [...months].sort((left, right) => left.monthKey.localeCompare(right.monthKey));
  const lastThree = ordered.slice(-3);
  const previousThree = ordered.slice(-6, -3);
  const currentAverage = average(lastThree.map((month) => month.metrics.contributionAfterMedia));
  const previousAverage = average(
    previousThree.map((month) => month.metrics.contributionAfterMedia),
  );
  const delta = currentAverage - previousAverage;

  if (!lastThree.length) {
    return EMPTY_ANALYSIS.momentum;
  }

  if (!previousThree.length) {
    return {
      tone: "neutral",
      title: "Janela inicial em formação",
      description:
        "Ainda não há histórico suficiente para comparar a tendência da margem entre duas janelas equivalentes.",
      delta,
      currentAverage,
      previousAverage,
      hasComparison: false,
    };
  }

  if (delta > 0) {
    return {
      tone: "positive",
      title: "Margem em expansão",
      description:
        "Os últimos meses mostram ganho de contribuição antes das despesas. Vale revisar o que sustentou essa evolução para repetir o padrão.",
      delta,
      currentAverage,
      previousAverage,
      hasComparison: true,
    };
  }

  if (delta < 0) {
    return {
      tone: "warning",
      title: "Margem pressionada",
      description:
        "A contribuição caiu na janela mais recente. O foco deve ir para mix de produto, gasto de mídia e despesas fixas que comprimiram o resultado.",
      delta,
      currentAverage,
      previousAverage,
      hasComparison: true,
    };
  }

  return {
    tone: "neutral",
    title: "Margem estável",
    description:
      "A margem ficou próxima do mesmo patamar recente. O ganho agora depende de melhorar eficiência ou elevar a receita líquida disponível.",
    delta,
    currentAverage,
    previousAverage,
    hasComparison: true,
  };
}

function buildAnalysis(
  total: FinancialReportSummary,
  months: MonthlyDreEntry[],
  expenseBreakdown: MonthlyExpenseBreakdown[],
): FinancialReportAnalysis {
  const orderedMonths = [...months].sort((left, right) => left.monthKey.localeCompare(right.monthKey));
  const contributionSortedDesc = [...orderedMonths].sort(
    (left, right) => right.metrics.contributionAfterMedia - left.metrics.contributionAfterMedia,
  );
  const contributionSortedAsc = [...orderedMonths].sort(
    (left, right) => left.metrics.contributionAfterMedia - right.metrics.contributionAfterMedia,
  );
  const topExpense = [...expenseBreakdown].sort((left, right) => right.total - left.total)[0] ?? null;
  const revenueBase = total.rld;

  return {
    bestContributionMonth: mapMonthHighlight(contributionSortedDesc[0] ?? null),
    worstContributionMonth: mapMonthHighlight(contributionSortedAsc[0] ?? null),
    latestMonth: mapMonthHighlight(orderedMonths.at(-1) ?? null),
    topExpenseCategory: topExpense
      ? {
          categoryId: topExpense.categoryId,
          categoryName: topExpense.categoryName,
          total: topExpense.total,
        }
      : null,
    shares: {
      cmvShare: revenueBase > 0 ? total.cmvTotal / revenueBase : 0,
      mediaShare: revenueBase > 0 ? total.mediaSpend / revenueBase : 0,
      expenseShare: revenueBase > 0 ? total.fixedExpensesTotal / revenueBase : 0,
      variableCostShare: revenueBase > 0 ? (total.cmvTotal + total.mediaSpend) / revenueBase : 0,
    },
    momentum: buildMomentum(orderedMonths),
  };
}

function mapMonthHighlightPayload(source: unknown): FinancialReportMonthHighlight | null {
  if (!source || typeof source !== "object") {
    return null;
  }

  const payload = source as Partial<FinancialReportMonthHighlight>;
  return {
    monthKey: toStringValue(payload.monthKey),
    label: toStringValue(payload.label),
    contributionAfterMedia: toNumber(payload.contributionAfterMedia),
    netResult: toNumber(payload.netResult),
    rld: toNumber(payload.rld),
    fixedExpensesTotal: toNumber(payload.fixedExpensesTotal),
    contributionMargin: toNumber(payload.contributionMargin),
    operatingMargin: toNumber(payload.operatingMargin),
  };
}

function mapTopExpenseCategory(source: unknown): FinancialReportTopExpenseCategory | null {
  if (!source || typeof source !== "object") {
    return null;
  }

  const payload = source as Partial<FinancialReportTopExpenseCategory>;
  return {
    categoryId: toStringValue(payload.categoryId),
    categoryName: toStringValue(payload.categoryName, "Sem categoria"),
    total: toNumber(payload.total),
  };
}

function mapAnalysis(
  source: unknown,
  total: FinancialReportSummary,
  months: MonthlyDreEntry[],
  expenseBreakdown: MonthlyExpenseBreakdown[],
): FinancialReportAnalysis {
  if (!source || typeof source !== "object") {
    return buildAnalysis(total, months, expenseBreakdown);
  }

  const payload = source as Partial<FinancialReportAnalysis> & {
    shares?: Partial<FinancialReportAnalysis["shares"]>;
    momentum?: Partial<FinancialReportMomentum>;
  };

  return {
    bestContributionMonth: mapMonthHighlightPayload(payload.bestContributionMonth),
    worstContributionMonth: mapMonthHighlightPayload(payload.worstContributionMonth),
    latestMonth: mapMonthHighlightPayload(payload.latestMonth),
    topExpenseCategory: mapTopExpenseCategory(payload.topExpenseCategory),
    shares: {
      cmvShare: toNumber(payload.shares?.cmvShare),
      mediaShare: toNumber(payload.shares?.mediaShare),
      expenseShare: toNumber(payload.shares?.expenseShare),
      variableCostShare: toNumber(payload.shares?.variableCostShare),
    },
    momentum: {
      tone:
        payload.momentum?.tone === "positive" || payload.momentum?.tone === "warning"
          ? payload.momentum.tone
          : "neutral",
      title: toStringValue(payload.momentum?.title, EMPTY_ANALYSIS.momentum.title),
      description: toStringValue(
        payload.momentum?.description,
        EMPTY_ANALYSIS.momentum.description,
      ),
      delta: toNumber(payload.momentum?.delta),
      currentAverage: toNumber(payload.momentum?.currentAverage),
      previousAverage: toNumber(payload.momentum?.previousAverage),
      hasComparison: toBoolean(payload.momentum?.hasComparison),
    },
  };
}

export function normalizeFinancialReportPayload(source: unknown): AnnualDreReport {
  const payload = (source ?? {}) as {
    summary?: unknown;
    total?: unknown;
    months?: unknown[];
    expenseBreakdown?: unknown[];
    analysis?: unknown;
  };

  const total = mapSummary(payload.total ?? payload.summary);
  const months = Array.isArray(payload.months) ? payload.months.map(mapMonthEntry) : [];
  const expenseBreakdown = Array.isArray(payload.expenseBreakdown)
    ? payload.expenseBreakdown.map(mapExpenseBreakdown)
    : [];

  return {
    months,
    total,
    expenseBreakdown,
    analysis: mapAnalysis(payload.analysis, total, months, expenseBreakdown),
  };
}
