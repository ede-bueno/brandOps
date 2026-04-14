import "server-only";

import { detectProductType, extractPrintName } from "@/lib/brandops/metrics";
import type {
  BrandDataset,
  OrderItem,
  ProductDecisionAction,
  ProductInsightClassification,
  ProductInsightClassificationSummary,
  ProductInsightDecisionSummary,
  ProductInsightOverview,
  ProductInsightRow,
  ProductInsightScatterSeries,
  ProductInsightSort,
  ProductInsightSortOption,
  ProductInsightTrendPoint,
  ProductInsightsFilters,
  ProductInsightsMeta,
  ProductInsightsReport,
  ProductInsightScatterPoint,
} from "@/lib/brandops/types";

export type ProductInsightsReportOptions = {
  from?: string | null;
  to?: string | null;
  decision?: ProductDecisionAction | "all" | null;
  classification?: ProductInsightClassification | "all" | null;
  productType?: string | "all" | null;
  sort?: ProductInsightSort | null;
};

const DECISION_PRIORITY: Record<ProductDecisionAction, number> = {
  scale_now: 0,
  boost_traffic: 1,
  review_listing: 2,
  watch: 3,
};

const DECISION_META: Record<
  ProductDecisionAction,
  Pick<ProductInsightDecisionSummary, "title" | "description">
> = {
  scale_now: {
    title: "Escalar agora",
    description: "Sinal forte de intenção e validação. Merece ganhar distribuição.",
  },
  boost_traffic: {
    title: "Dar mais tráfego",
    description: "A estampa é promissora, mas ainda precisa de volume para fechar a leitura.",
  },
  review_listing: {
    title: "Revisar vitrine",
    description:
      "Recebe atenção, mas não converte o suficiente. O gargalo parece estar na apresentação.",
  },
  watch: {
    title: "Observar",
    description: "Sem amostra forte o bastante. Ainda não é hora de escalar nem descartar.",
  },
};

const SORT_OPTIONS: ProductInsightSortOption[] = [
  { value: "priority", label: "Ordenar por prioridade" },
  { value: "views", label: "Ordenar por views" },
  { value: "addToCartRate", label: "Ordenar por tx. carrinho" },
  { value: "realUnitsSold", label: "Ordenar por unidades reais" },
  { value: "viewGrowth", label: "Ordenar por crescimento" },
];

const CLASSIFICATION_META: Record<
  ProductInsightClassification,
  Pick<ProductInsightClassificationSummary, "label" | "bullets">
> = {
  validated: {
    label: "Validados",
    bullets: [
      "Garanta estoque visual e destaque a estampa nas vitrines e coleções.",
      "Teste aumento de investimento com públicos parecidos.",
      "Use reviews e provas sociais para acelerar conversão.",
    ],
  },
  opportunity: {
    label: "Oportunidades",
    bullets: [
      "Dê mais visibilidade em campanhas, home e coleções.",
      "Teste a estampa em mais tipos de peça para ganhar amplitude.",
      "Agrupe com estamparia validada em campanhas de catálogo.",
    ],
  },
  low_traffic: {
    label: "Pouco tráfego",
    bullets: [
      "Acompanhe antes de tomar decisão definitiva sobre a estampa.",
      "Aumente a exposição mínima para validar interesse real.",
      "Priorize 200-300 visualizações antes de descartar.",
    ],
  },
  review: {
    label: "Revisar",
    bullets: [
      "Reveja mockup, legibilidade e enquadramento da arte.",
      "Teste outra peça, outra cor base ou outro recorte de thumb.",
      "Evite escalar tráfego até corrigir a fricção visual.",
    ],
  },
};

function buildHero(row: ProductInsightRow | null) {
  if (!row) {
    return {
      row: null,
      title: "Sem estampa em foco",
      description: "Ainda não há sinal suficiente no recorte para destacar uma estampa principal.",
      bullets: [],
    };
  }

  return {
    row,
    title: row.decisionTitle,
    description: row.decisionSummary,
    bullets: row.rationale.slice(0, 3),
  };
}

function buildPlaybook(rows: ProductInsightRow[]): ProductInsightsReport["playbook"] {
  return (Object.keys(DECISION_META) as ProductDecisionAction[]).map((decision) => ({
    decision,
    title: DECISION_META[decision].title,
    description: DECISION_META[decision].description,
    count: rows.filter((row) => row.decision === decision).length,
    items: rows.filter((row) => row.decision === decision).slice(0, 6),
  }));
}

function buildAnalysis(rows: ProductInsightRow[]): ProductInsightsReport["analysis"] {
  if (!rows.length) {
    return {
      narrativeTitle: "Sem dados suficientes",
      narrativeBody: "Ainda não há sinal suficiente para orientar decisões de estampa neste recorte.",
      nextActions: [],
      topOpportunity: null,
      topRisk: null,
    };
  }

  const topOpportunity =
    rows.find((row) => row.decision === "scale_now") ??
    rows.find((row) => row.decision === "boost_traffic") ??
    null;
  const topRisk =
    rows.find((row) => row.decision === "review_listing") ??
    null;

  const nextActions: string[] = [];
  if (topOpportunity) {
    nextActions.push(`Dar mais distribuição para ${topOpportunity.stampName}, priorizando criativos e posições já validadas.`);
  }
  if (topRisk) {
    nextActions.push(`Revisar vitrine e mockup de ${topRisk.stampName} antes de ampliar tráfego.`);
  }
  const lowTrafficCount = rows.filter((row) => row.classification === "low_traffic").length;
  if (lowTrafficCount > 0) {
    nextActions.push(`Existe ${lowTrafficCount} estampa(s) com pouco tráfego que ainda pedem amostra antes de decisão final.`);
  }
  if (!nextActions.length) {
    nextActions.push("Manter monitoramento do recorte e aguardar mais sinal antes de mexer em distribuição.");
  }

  const validatedCount = rows.filter((row) => row.classification === "validated").length;
  const reviewCount = rows.filter((row) => row.classification === "review").length;

  const narrativeTitle =
    validatedCount > reviewCount
      ? "O portfólio atual tem base para expansão seletiva"
      : reviewCount > 0
        ? "A leitura aponta fricção de vitrine em parte do portfólio"
        : "O portfólio ainda está consolidando sinal";

  const narrativeBody =
    validatedCount > reviewCount
      ? "O recorte atual mostra mais estampas prontas para ganhar visibilidade do que estampas pedindo correção. Vale priorizar distribuição onde já existe intenção validada."
      : reviewCount > 0
        ? "Há atenção suficiente em parte das estampas, mas a resposta de carrinho e compra ainda não acompanha. O melhor próximo passo é atacar apresentação antes de escalar tráfego."
        : "A maior parte das estampas ainda está em fase de amostragem. O foco deve ser ganhar visibilidade mínima para fechar diagnóstico.";

  return {
    narrativeTitle,
    narrativeBody,
    nextActions,
    topOpportunity: topOpportunity ? topOpportunity.stampName : null,
    topRisk: topRisk ? topRisk.stampName : null,
  };
}

function round(value: number, digits = 2) {
  return Number(value.toFixed(digits));
}

function normalizeText(value?: string | null) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function classifyProductInsight(
  views: number,
  addToCartRate: number,
  conversionRate: number,
): ProductInsightRow["classification"] {
  if (views >= 150 && addToCartRate >= 0.08 && conversionRate >= 0.015) {
    return "validated";
  }

  if ((views >= 50 && addToCartRate >= 0.05) || (views >= 20 && conversionRate >= 0.01)) {
    return "opportunity";
  }

  if (views < 50) {
    return "low_traffic";
  }

  return "review";
}

function aggregateProductInsights(rows: BrandDataset["ga4ItemDailyPerformance"]) {
  const byKey = new Map<
    string,
    {
      key: string;
      stampName: string;
      productType: string;
      itemIds: Set<string>;
      views: number;
      addToCarts: number;
      checkouts: number;
      purchases: number;
      quantity: number;
      revenue: number;
    }
  >();

  rows.forEach((row) => {
    const stampName = extractPrintName(
      row.itemName,
      `${row.itemBrand} ${row.itemCategory} ${row.itemId}`,
    );
    const productType =
      detectProductType(row.itemName, `${row.itemBrand} ${row.itemCategory}`) ?? "Sem tipo";
    const key = `${normalizeText(stampName)}::${normalizeText(productType)}`;
    const current = byKey.get(key) ?? {
      key,
      stampName,
      productType,
      itemIds: new Set<string>(),
      views: 0,
      addToCarts: 0,
      checkouts: 0,
      purchases: 0,
      quantity: 0,
      revenue: 0,
    };

    if (row.itemId?.trim()) {
      current.itemIds.add(row.itemId.trim());
    }

    current.views += row.itemViews;
    current.addToCarts += row.addToCarts;
    current.checkouts += row.checkouts;
    current.purchases += row.ecommercePurchases;
    current.quantity += row.itemPurchaseQuantity;
    current.revenue += row.itemRevenue;
    byKey.set(key, current);
  });

  return byKey;
}

function aggregateRealProductSignalsFromOrderItems(orderItems: OrderItem[]) {
  const byKey = new Map<
    string,
    {
      realUnitsSold: number;
      realGrossRevenue: number;
    }
  >();

  orderItems.forEach((item) => {
    const stampName = extractPrintName(
      item.productName,
      `${item.productSpecs ?? ""} ${item.sku ?? ""}`,
    );
    const productType =
      item.productType ??
      detectProductType(item.productName, `${item.productSpecs ?? ""} ${item.sku ?? ""}`) ??
      "Sem tipo";
    const key = `${normalizeText(stampName)}::${normalizeText(productType)}`;
    const current = byKey.get(key) ?? {
      realUnitsSold: 0,
      realGrossRevenue: 0,
    };

    current.realUnitsSold += item.quantity;
    current.realGrossRevenue += item.grossValue;
    byKey.set(key, current);
  });

  return byKey;
}

function getActiveOrderItemsFromRows(orderItems: OrderItem[]) {
  return orderItems.filter((item) => !item.isIgnored);
}

function resolveProductDecision(input: {
  views: number;
  addToCartRate: number;
  checkoutRate: number;
  purchaseRate: number;
  viewGrowth: number;
  addToCartRateDelta: number;
  revenue: number;
  realUnitsSold: number;
}) {
  const {
    views,
    addToCartRate,
    checkoutRate,
    purchaseRate,
    viewGrowth,
    addToCartRateDelta,
    revenue,
    realUnitsSold,
  } = input;

  const hasRealSales = realUnitsSold > 0 || revenue > 0;
  const hasComfortableSample = views >= 150;
  const hasModerateSample = views >= 60;

  if (
    hasComfortableSample &&
    addToCartRate >= 0.08 &&
    (checkoutRate >= 0.03 || purchaseRate >= 0.01 || hasRealSales)
  ) {
    return {
      decision: "scale_now" as const,
      confidence: hasRealSales && views >= 250 ? "high" as const : "medium" as const,
      title: "Escalar agora",
      summary:
        "A estampa já demonstra intenção de compra consistente e pode receber mais visibilidade.",
      action:
        "Aumente exposição em catálogo e mídia de forma controlada, priorizando criativos já aprovados.",
      rationale: [
        "Volume de views suficiente para leitura confiável",
        "Taxa de adição ao carrinho acima do piso de validação",
        hasRealSales
          ? "Sinal de venda real confirmado na operação"
          : "Sinal de checkout/compra acima da média mínima",
      ],
    };
  }

  if (
    (hasModerateSample && addToCartRate >= 0.05) ||
    (views >= 30 && addToCartRate >= 0.06 && (viewGrowth > 0 || addToCartRateDelta > 0))
  ) {
    return {
      decision: "boost_traffic" as const,
      confidence: hasModerateSample ? "medium" as const : "low" as const,
      title: "Dar mais tráfego",
      summary:
        "A estampa tem sinal promissor, mas ainda precisa de mais exposição para fechar diagnóstico.",
      action:
        "Ganhe visibilidade na home, coleções e campanhas de catálogo antes de decidir escalar forte.",
      rationale: [
        "Taxa de adição ao carrinho saudável para o volume atual",
        viewGrowth > 0 ? "Tendência recente de interesse em alta" : "Amostra ainda em consolidação",
        hasRealSales ? "Já existe venda real, mas ainda com pouca base" : "Ainda falta amostra para concluir",
      ],
    };
  }

  if ((hasComfortableSample && addToCartRate < 0.025) || (views >= 250 && purchaseRate === 0)) {
    return {
      decision: "review_listing" as const,
      confidence: "high" as const,
      title: "Revisar vitrine e criativo",
      summary:
        "Há atenção suficiente, mas a conversão não acompanha. O gargalo parece estar na apresentação.",
      action:
        "Revise mockup, thumb, peça base, enquadramento e aderência da oferta antes de investir mais tráfego.",
      rationale: [
        "Views altas sem resposta proporcional de carrinho",
        purchaseRate === 0
          ? "Nenhuma compra registrada na amostra relevante"
          : "Conversão abaixo do esperado para o tráfego recebido",
        "Melhor corrigir vitrine antes de ampliar distribuição",
      ],
    };
  }

  return {
    decision: "watch" as const,
    confidence: hasModerateSample ? "medium" as const : "low" as const,
    title: "Observar",
    summary: "O sinal atual ainda é inconclusivo para decidir escala ou corte.",
    action: "Mantenha monitoramento e reavalie após nova rodada de tráfego ou merchandising.",
    rationale: [
      hasModerateSample
        ? "Amostra existe, mas sem sinal forte o bastante"
        : "Base ainda pequena para conclusão definitiva",
      addToCartRateDelta > 0 ? "Há leve melhora recente no interesse" : "Sem mudança relevante na última janela",
      hasRealSales
        ? "Já houve venda real, mas o volume ainda é baixo"
        : "Ainda não há venda real confirmada para apoiar decisão",
    ],
  };
}

export function buildProductInsightsReportRows(
  currentRows: BrandDataset["ga4ItemDailyPerformance"],
  orderItems: OrderItem[],
  previousRows: BrandDataset["ga4ItemDailyPerformance"] = [],
): ProductInsightRow[] {
  const currentMap = aggregateProductInsights(currentRows);
  const previousMap = aggregateProductInsights(previousRows);
  const realSignals = aggregateRealProductSignalsFromOrderItems(
    getActiveOrderItemsFromRows(orderItems),
  );

  return [...currentMap.values()]
    .map((item) => {
      const previous = previousMap.get(item.key);
      const addToCartRate = item.views ? item.addToCarts / item.views : 0;
      const conversionRate = item.views ? item.quantity / item.views : 0;
      const checkoutRate = item.views ? item.checkouts / item.views : 0;
      const purchaseRate = item.views ? item.quantity / item.views : 0;
      const previousViews = previous?.views ?? 0;
      const previousAddToCartRate = previous?.views ? previous.addToCarts / previous.views : 0;
      const viewGrowth =
        previousViews > 0
          ? (item.views - previousViews) / previousViews
          : item.views > 0
            ? 1
            : 0;
      const addToCartRateDelta = addToCartRate - previousAddToCartRate;
      const realSignal = realSignals.get(item.key);
      const decision = resolveProductDecision({
        views: item.views,
        addToCartRate,
        checkoutRate,
        purchaseRate,
        viewGrowth,
        addToCartRateDelta,
        revenue: item.revenue,
        realUnitsSold: realSignal?.realUnitsSold ?? 0,
      });

      return {
        key: item.key,
        itemIds: [...item.itemIds].sort(),
        stampName: item.stampName,
        productType: item.productType,
        views: item.views,
        addToCarts: item.addToCarts,
        checkouts: item.checkouts,
        purchases: item.purchases,
        quantity: item.quantity,
        revenue: round(item.revenue),
        addToCartRate: round(addToCartRate, 4),
        conversionRate: round(conversionRate, 4),
        classification: classifyProductInsight(item.views, addToCartRate, conversionRate),
        decision: decision.decision,
        decisionConfidence: decision.confidence,
        decisionTitle: decision.title,
        decisionSummary: decision.summary,
        recommendedAction: decision.action,
        rationale: decision.rationale,
        previousViews,
        previousAddToCartRate: round(previousAddToCartRate, 4),
        viewGrowth: round(viewGrowth, 4),
        addToCartRateDelta: round(addToCartRateDelta, 4),
        checkoutRate: round(checkoutRate, 4),
        purchaseRate: round(purchaseRate, 4),
        realUnitsSold: realSignal?.realUnitsSold ?? 0,
        realGrossRevenue: round(realSignal?.realGrossRevenue ?? 0),
      };
    })
    .sort(
      (left, right) =>
        DECISION_PRIORITY[left.decision] - DECISION_PRIORITY[right.decision] ||
        right.views - left.views ||
        right.realGrossRevenue - left.realGrossRevenue ||
        right.revenue - left.revenue ||
        left.stampName.localeCompare(right.stampName),
    );
}

function applyFilters(
  rows: ProductInsightRow[],
  options: ProductInsightsReportOptions,
): ProductInsightRow[] {
  return rows.filter((row) => {
    if (options.decision && options.decision !== "all" && row.decision !== options.decision) {
      return false;
    }

    if (
      options.classification &&
      options.classification !== "all" &&
      row.classification !== options.classification
    ) {
      return false;
    }

    if (
      options.productType &&
      options.productType !== "all" &&
      row.productType !== options.productType
    ) {
      return false;
    }

    return true;
  });
}

function sortRows(rows: ProductInsightRow[], sort: ProductInsightSort): ProductInsightRow[] {
  const sorted = [...rows];
  sorted.sort((left, right) => {
    if (sort === "views") {
      return right.views - left.views || DECISION_PRIORITY[left.decision] - DECISION_PRIORITY[right.decision];
    }

    if (sort === "addToCartRate") {
      return right.addToCartRate - left.addToCartRate || right.views - left.views;
    }

    if (sort === "realUnitsSold") {
      return right.realUnitsSold - left.realUnitsSold || right.realGrossRevenue - left.realGrossRevenue;
    }

    if (sort === "viewGrowth") {
      return right.viewGrowth - left.viewGrowth || right.addToCartRateDelta - left.addToCartRateDelta;
    }

    return (
      DECISION_PRIORITY[left.decision] - DECISION_PRIORITY[right.decision] ||
      right.views - left.views ||
      right.realGrossRevenue - left.realGrossRevenue
    );
  });

  return sorted;
}

function buildOverview(rows: ProductInsightRow[]): ProductInsightOverview {
  const totals = rows.reduce(
    (accumulator, row) => {
      accumulator.totalViews += row.views;
      accumulator.totalAddToCarts += row.addToCarts;
      accumulator.totalRevenue += row.revenue;
      accumulator.totalRealUnitsSold += row.realUnitsSold;
      accumulator.totalRealGrossRevenue += row.realGrossRevenue;
      accumulator.averageAddToCartRate += row.addToCartRate;
      accumulator.averageCheckoutRate += row.checkoutRate;
      accumulator.averagePurchaseRate += row.purchaseRate;
      return accumulator;
    },
    {
      totalViews: 0,
      totalAddToCarts: 0,
      totalRevenue: 0,
      totalRealUnitsSold: 0,
      totalRealGrossRevenue: 0,
      averageAddToCartRate: 0,
      averageCheckoutRate: 0,
      averagePurchaseRate: 0,
    },
  );

  const divisor = rows.length || 1;

  return {
    totalRows: rows.length,
    totalViews: totals.totalViews,
    totalAddToCarts: totals.totalAddToCarts,
    totalRevenue: round(totals.totalRevenue),
    totalRealUnitsSold: totals.totalRealUnitsSold,
    totalRealGrossRevenue: round(totals.totalRealGrossRevenue),
    averageAddToCartRate: round(totals.averageAddToCartRate / divisor, 4),
    averageCheckoutRate: round(totals.averageCheckoutRate / divisor, 4),
    averagePurchaseRate: round(totals.averagePurchaseRate / divisor, 4),
  };
}

function buildDecisionSummaries(rows: ProductInsightRow[]): ProductInsightDecisionSummary[] {
  return (Object.keys(DECISION_META) as ProductDecisionAction[]).map((decision) => ({
    decision,
    title: DECISION_META[decision].title,
    description: DECISION_META[decision].description,
    count: rows.filter((row) => row.decision === decision).length,
    items: rows.filter((row) => row.decision === decision).slice(0, 4),
  }));
}

function buildClassificationSummaries(
  rows: ProductInsightRow[],
): ProductInsightClassificationSummary[] {
  return (Object.keys(CLASSIFICATION_META) as ProductInsightClassification[]).map(
    (classification) => ({
      classification,
      label: CLASSIFICATION_META[classification].label,
      count: rows.filter((row) => row.classification === classification).length,
      bullets: CLASSIFICATION_META[classification].bullets,
    }),
  );
}

function buildMomentum(rows: ProductInsightRow[]) {
  return {
    gaining: [...rows]
      .filter((row) => row.viewGrowth > 0 || row.addToCartRateDelta > 0)
      .sort(
        (left, right) =>
          right.viewGrowth - left.viewGrowth || right.addToCartRateDelta - left.addToCartRateDelta,
      )
      .slice(0, 6),
    losing: [...rows]
      .filter((row) => row.previousViews > 0)
      .sort(
        (left, right) =>
          left.viewGrowth - right.viewGrowth || left.addToCartRateDelta - right.addToCartRateDelta,
      )
      .slice(0, 6),
  };
}

function buildScatter(rows: ProductInsightRow[]): ProductInsightScatterPoint[] {
  return rows.map((row) => ({
    classification: row.classification,
    views: row.views,
    addToCartRate: row.addToCartRate * 100,
    revenue: Math.max(row.realGrossRevenue, row.revenue, 1),
    label: row.stampName,
    decisionTitle: row.decisionTitle,
  }));
}

function buildScatterSeries(rows: ProductInsightRow[]): ProductInsightScatterSeries[] {
  return (Object.keys(DECISION_META) as ProductDecisionAction[]).map((decision) => ({
    decision,
    title: DECISION_META[decision].title,
    points: buildScatter(rows.filter((row) => row.decision === decision)),
  }));
}

function buildFilters(
  allRows: ProductInsightRow[],
  options: ProductInsightsReportOptions,
): ProductInsightsFilters {
  return {
    decision: options.decision ?? "all",
    classification: options.classification ?? "all",
    productType: options.productType ?? "all",
    sort: options.sort ?? "priority",
    availableTypes: [...new Set(allRows.map((row) => row.productType).filter(Boolean))].sort(
      (left, right) => left.localeCompare(right),
    ),
    availableSorts: SORT_OPTIONS,
  };
}

export function buildProductInsightsReport(
  currentRows: BrandDataset["ga4ItemDailyPerformance"],
  orderItems: OrderItem[],
  previousRows: BrandDataset["ga4ItemDailyPerformance"] = [],
  options: ProductInsightsReportOptions = {},
): ProductInsightsReport {
  const allRows = buildProductInsightsReportRows(currentRows, orderItems, previousRows);
  const filteredRows = sortRows(applyFilters(allRows, options), options.sort ?? "priority");
  const heroRow = filteredRows[0] ?? null;
  const trendByKey = filteredRows.reduce<Record<string, ProductInsightTrendPoint[]>>(
    (accumulator, row) => {
      accumulator[row.key] = buildProductInsightTrendSeries(currentRows, row.itemIds);
      return accumulator;
    },
    {},
  );

  return {
    rows: filteredRows,
    trendByKey,
    overview: buildOverview(filteredRows),
    featured: filteredRows.slice(0, 8),
    watchlist: filteredRows.filter((row) => row.decision === "watch").slice(0, 6),
    decisions: buildDecisionSummaries(filteredRows),
    classifications: buildClassificationSummaries(filteredRows),
    momentum: buildMomentum(filteredRows),
    scatter: buildScatter(filteredRows),
    scatterSeries: buildScatterSeries(filteredRows),
    hero: buildHero(heroRow),
    playbook: buildPlaybook(filteredRows),
    analysis: buildAnalysis(filteredRows),
    filters: buildFilters(allRows, options),
    meta: {
      generatedAt: new Date().toISOString(),
      from: options.from ?? null,
      to: options.to ?? null,
      hasData: filteredRows.length > 0,
      heroKey: heroRow?.key ?? null,
    } satisfies ProductInsightsMeta,
  };
}

export function buildProductInsightTrendSeries(
  rows: BrandDataset["ga4ItemDailyPerformance"],
  itemIds: string[],
) {
  if (!itemIds.length) {
    return [];
  }

  const itemIdSet = new Set(itemIds.map((value) => value.trim()).filter(Boolean));
  const byDate = new Map<
    string,
    {
      date: string;
      views: number;
      addToCarts: number;
      addToCartRate: number;
    }
  >();

  rows.forEach((row) => {
    if (!itemIdSet.has(row.itemId.trim())) {
      return;
    }

    const current = byDate.get(row.date) ?? {
      date: row.date,
      views: 0,
      addToCarts: 0,
      addToCartRate: 0,
    };

    current.views += row.itemViews;
    current.addToCarts += row.addToCarts;
    byDate.set(row.date, current);
  });

  return [...byDate.values()]
    .map((row) => ({
      ...row,
      addToCartRate: row.views ? (row.addToCarts / row.views) * 100 : 0,
    }))
    .sort((left, right) => left.date.localeCompare(right.date));
}
