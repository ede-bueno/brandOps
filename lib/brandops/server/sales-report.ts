import "server-only";

import type {
  DailySalesPoint,
  SalesDetailReport,
  TopProductPerformance,
} from "@/lib/brandops/types";

type RawSalesDetailReport = {
  dailySeries?: DailySalesPoint[] | null;
  topProducts?: TopProductPerformance[] | null;
};

type SalesSummarySnapshot = {
  paidOrderCount?: number | null;
  grossRevenue?: number | null;
  discounts?: number | null;
  unitsSold?: number | null;
};

function toNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeDailySeries(source: unknown): DailySalesPoint[] {
  if (!Array.isArray(source)) {
    return [];
  }

  return source.map((row) => {
    const payload = (row ?? {}) as Partial<DailySalesPoint>;
    return {
      date: typeof payload.date === "string" ? payload.date : "",
      revenue: toNumber(payload.revenue),
      orders: toNumber(payload.orders),
      items: toNumber(payload.items),
    };
  });
}

function normalizeTopProducts(source: unknown): TopProductPerformance[] {
  if (!Array.isArray(source)) {
    return [];
  }

  return source.map((row) => {
    const payload = (row ?? {}) as Partial<TopProductPerformance>;
    return {
      productKey: typeof payload.productKey === "string" ? payload.productKey : "",
      productName: typeof payload.productName === "string" ? payload.productName : "Produto sem nome",
      quantity: toNumber(payload.quantity),
      grossRevenue: toNumber(payload.grossRevenue),
    };
  });
}

function classifyProduct(
  product: TopProductPerformance,
  totalRevenue: number,
  topRevenue: number,
) {
  const revenueShare = totalRevenue > 0 ? product.grossRevenue / totalRevenue : 0;
  const relativeToLeader = topRevenue > 0 ? product.grossRevenue / topRevenue : 0;

  if (product.quantity >= 3 && revenueShare >= 0.12) {
    return "protect" as const;
  }

  if (product.quantity >= 2 && relativeToLeader >= 0.45) {
    return "grow" as const;
  }

  return "review" as const;
}

function buildPlaybook(topProducts: TopProductPerformance[]): SalesDetailReport["playbook"] {
  const totalRevenue = topProducts.reduce((sum, product) => sum + product.grossRevenue, 0);
  const topRevenue = topProducts[0]?.grossRevenue ?? 0;
  const protect = topProducts.filter((product) => classifyProduct(product, totalRevenue, topRevenue) === "protect");
  const grow = topProducts.filter((product) => classifyProduct(product, totalRevenue, topRevenue) === "grow");
  const review = topProducts.filter((product) => classifyProduct(product, totalRevenue, topRevenue) === "review");

  return {
    protect: {
      title: "Proteger vencedores",
      description: "Produtos que já sustentam receita e merecem cobertura, estoque visual e atenção contínua.",
      count: protect.length,
      items: protect.slice(0, 6),
    },
    grow: {
      title: "Expandir mix",
      description: "Produtos com boa tração relativa e espaço para ganhar mais distribuição no recorte.",
      count: grow.length,
      items: grow.slice(0, 6),
    },
    review: {
      title: "Revisar vitrine",
      description: "Produtos ainda sem massa suficiente para segurar destaque ou que ficaram para trás no ranking.",
      count: review.length,
      items: review.slice(0, 6),
    },
  };
}

function buildAnalysis(
  dailySeries: DailySalesPoint[],
  topProducts: TopProductPerformance[],
  highlights: SalesDetailReport["highlights"],
  playbook: SalesDetailReport["playbook"],
): SalesDetailReport["analysis"] {
  if (!dailySeries.length && !topProducts.length) {
    return {
      narrativeTitle: "Leitura comercial ainda vazia",
      narrativeBody: "Ainda não há dados suficientes no recorte para montar a leitura operacional de vendas.",
      nextActions: [],
      topOpportunity: null,
      topRisk: null,
    };
  }

  const nextActions: string[] = [];

  if (highlights.topProduct) {
    nextActions.push(`Usar ${highlights.topProduct.productName} como referência de vitrine e distribuição no período.`);
  }

  if (playbook.grow.items[0]) {
    nextActions.push(`Dar mais espaço para ${playbook.grow.items[0].productName}, que aparece perto do núcleo vencedor.`);
  }

  if (playbook.review.items[0]) {
    nextActions.push(`Revisar exposição e oferta de ${playbook.review.items[0].productName} antes de ampliar o mix.`);
  }

  if (!nextActions.length) {
    nextActions.push("Acompanhar mais volume para separar claramente vencedores, apostas e itens em revisão.");
  }

  const bestDay = highlights.bestDay;
  const topProduct = highlights.topProduct;

  if ((topProduct?.grossRevenue ?? 0) > 0 && (bestDay?.revenue ?? 0) > 0) {
    return {
      narrativeTitle: "Comercial com núcleo vencedor identificado",
      narrativeBody:
        "O recorte já mostra quais produtos puxam faturamento e em quais dias a operação concentrou receita. O melhor uso desta visão é proteger vencedores e abrir espaço só para itens com tração relativa.",
      nextActions,
      topOpportunity: topProduct?.productName ?? null,
      topRisk: playbook.review.items[0]?.productName ?? null,
    };
  }

  return {
    narrativeTitle: "Comercial em consolidação",
    narrativeBody:
      "O período já começa a mostrar distribuição de receita, mas ainda pede observação para separar claramente os produtos que sustentam o faturamento daqueles que ainda dependem de teste e vitrine.",
    nextActions,
    topOpportunity: topProduct?.productName ?? null,
    topRisk: playbook.review.items[0]?.productName ?? null,
  };
}

export function buildSalesDetailReport(
  source: RawSalesDetailReport | null | undefined,
  from?: string | null,
  to?: string | null,
  summary?: SalesSummarySnapshot | null,
): SalesDetailReport {
  const dailySeries = normalizeDailySeries(source?.dailySeries);
  const topProducts = normalizeTopProducts(source?.topProducts);
  const bestDay = dailySeries.reduce<DailySalesPoint | null>((best, row) => {
    if (!best || row.revenue > best.revenue) {
      return row;
    }
    return best;
  }, null);
  const topProduct = topProducts[0] ?? null;
  const totalUnits = topProducts.reduce((sum, product) => sum + product.quantity, 0);
  const totalRevenue = topProducts.reduce((sum, product) => sum + product.grossRevenue, 0);
  const unitsSold = toNumber(summary?.unitsSold) || totalUnits;
  const grossRevenue = toNumber(summary?.grossRevenue) || totalRevenue;
  const paidOrderCount = toNumber(summary?.paidOrderCount);
  const discounts = toNumber(summary?.discounts);
  const playbook = buildPlaybook(topProducts);

  const report: SalesDetailReport = {
    dailySeries,
    topProducts,
    highlights: {
      bestDay,
      topProduct,
      revenuePerItem: unitsSold > 0 ? grossRevenue / unitsSold : 0,
      discountPerOrder: paidOrderCount > 0 ? discounts / paidOrderCount : 0,
    },
    playbook,
    analysis: buildAnalysis(
      dailySeries,
      topProducts,
      {
        bestDay,
        topProduct,
        revenuePerItem: unitsSold > 0 ? grossRevenue / unitsSold : 0,
        discountPerOrder: paidOrderCount > 0 ? discounts / paidOrderCount : 0,
      },
      playbook,
    ),
    meta: {
      generatedAt: new Date().toISOString(),
      from: from ?? null,
      to: to ?? null,
      hasData: dailySeries.length > 0 || topProducts.length > 0,
    },
  };

  return report;
}

export function normalizeSalesDetailReportPayload(
  source: RawSalesDetailReport | null | undefined,
  options?: {
    from?: string | null;
    to?: string | null;
    summary?: SalesSummarySnapshot | null;
  },
) {
  return buildSalesDetailReport(
    source,
    options?.from ?? null,
    options?.to ?? null,
    options?.summary ?? null,
  );
}
