import "server-only";

import { GoogleGenAI } from "@google/genai";
import { ATLAS_GEMINI_DEFAULT_MODEL } from "./model-policy";
import { loadReportSnapshots } from "./runtime-tools";
import type {
  AtlasBrandLearningSnapshot,
  AtlasBrandLearningEvidenceDraft,
  AtlasBrandLearningGenerationResult,
  AtlasBrandLearningScope,
  AtlasContextEntry,
  AtlasAnalystExecutionInput,
} from "./types";

const DEFAULT_MODEL =
  process.env.GEMINI_LEARNING_MODEL ||
  process.env.GEMINI_MODEL ||
  ATLAS_GEMINI_DEFAULT_MODEL;

const LEARNING_RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    confidence: {
      type: "string",
      enum: ["low", "medium", "high"],
    },
    summary: {
      type: "string",
    },
    businessProfile: {
      type: "string",
    },
    nicheProfile: {
      type: "string",
    },
    performanceBaseline: {
      type: "string",
    },
    operationalRisks: {
      type: "array",
      items: { type: "string" },
      minItems: 0,
      maxItems: 5,
    },
    recurringErrors: {
      type: "array",
      items: { type: "string" },
      minItems: 0,
      maxItems: 5,
    },
    growthOpportunities: {
      type: "array",
      items: { type: "string" },
      minItems: 1,
      maxItems: 5,
    },
    evidenceSources: {
      type: "array",
      items: { type: "string" },
      minItems: 1,
      maxItems: 6,
    },
    dataGaps: {
      type: "array",
      items: { type: "string" },
      minItems: 0,
      maxItems: 4,
    },
    businessSignals: {
      type: "array",
      items: { type: "string" },
      minItems: 1,
      maxItems: 6,
    },
    seasonalityPatterns: {
      type: "array",
      items: { type: "string" },
      minItems: 0,
      maxItems: 4,
    },
    campaignPatterns: {
      type: "array",
      items: { type: "string" },
      minItems: 0,
      maxItems: 5,
    },
    catalogPatterns: {
      type: "array",
      items: { type: "string" },
      minItems: 0,
      maxItems: 5,
    },
    priorityStack: {
      type: "array",
      items: { type: "string" },
      minItems: 1,
      maxItems: 5,
    },
    nextMilestones: {
      type: "array",
      items: { type: "string" },
      minItems: 1,
      maxItems: 4,
    },
    watchItems: {
      type: "array",
      items: { type: "string" },
      minItems: 0,
      maxItems: 4,
    },
    relearnTriggers: {
      type: "array",
      items: { type: "string" },
      minItems: 1,
      maxItems: 4,
    },
  },
  required: [
    "confidence",
    "summary",
    "businessProfile",
    "nicheProfile",
    "performanceBaseline",
    "operationalRisks",
    "recurringErrors",
    "growthOpportunities",
    "evidenceSources",
    "dataGaps",
    "businessSignals",
    "seasonalityPatterns",
    "campaignPatterns",
    "catalogPatterns",
    "priorityStack",
    "nextMilestones",
    "watchItems",
    "relearnTriggers",
  ],
} as const;

function asString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function asStringArray(value: unknown, limit: number) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, limit);
}

function buildCuratedContext(entries: AtlasContextEntry[]) {
  return entries.slice(0, 12).map((entry) => ({
    entryType: entry.entryType,
    title: entry.title,
    summary: entry.summary,
    details: entry.details,
    importance: entry.importance,
    eventDate: entry.eventDate,
    tags: entry.tags,
  }));
}

function formatIsoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function shiftDays(base: Date, days: number) {
  const next = new Date(base);
  next.setUTCDate(next.getUTCDate() - days);
  return next;
}

function resolveLearningScope(
  scope: AtlasBrandLearningScope | null | undefined,
  analysisWindowDays?: number | null,
) {
  const safeScope = scope ?? "all";
  const today = new Date();
  const todayLabel = formatIsoDate(today);
  const normalizedWindow =
    typeof analysisWindowDays === "number" && Number.isFinite(analysisWindowDays)
      ? Math.max(7, Math.min(120, Math.round(analysisWindowDays)))
      : 30;

  if (safeScope === "analysis_window") {
    return {
      scopeKey: safeScope,
      scopeLabel: `Janela estratégica (${normalizedWindow} dias)`,
      periodLabel: `Últimos ${normalizedWindow} dias`,
      from: formatIsoDate(shiftDays(today, normalizedWindow - 1)),
      to: todayLabel,
    };
  }

  if (safeScope === "30d") {
    return {
      scopeKey: safeScope,
      scopeLabel: "Últimos 30 dias",
      periodLabel: "Últimos 30 dias",
      from: formatIsoDate(shiftDays(today, 29)),
      to: todayLabel,
    };
  }

  if (safeScope === "90d") {
    return {
      scopeKey: safeScope,
      scopeLabel: "Últimos 90 dias",
      periodLabel: "Últimos 90 dias",
      from: formatIsoDate(shiftDays(today, 89)),
      to: todayLabel,
    };
  }

  if (safeScope === "180d") {
    return {
      scopeKey: safeScope,
      scopeLabel: "Últimos 180 dias",
      periodLabel: "Últimos 180 dias",
      from: formatIsoDate(shiftDays(today, 179)),
      to: todayLabel,
    };
  }

  return {
    scopeKey: "all" as const,
    scopeLabel: "Todo histórico disponível",
    periodLabel: `Do início da base até ${todayLabel}`,
    from: null,
    to: null,
  };
}

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readRecord(
  source: Record<string, unknown> | null | undefined,
  key: string,
) {
  return asRecord(source?.[key]);
}

function readNumber(
  source: Record<string, unknown> | null | undefined,
  key: string,
) {
  const value = source?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readString(
  source: Record<string, unknown> | null | undefined,
  key: string,
) {
  const value = source?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function roundMetric(value: number | null, digits = 2) {
  if (value === null || !Number.isFinite(value)) {
    return null;
  }

  return Number(value.toFixed(digits));
}

function formatCurrency(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return null;
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number | null, digits = 1) {
  if (value === null || !Number.isFinite(value)) {
    return null;
  }

  return `${value.toFixed(digits)}%`;
}

function formatCount(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return null;
  }

  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 0,
  }).format(value);
}

function buildLearningFrame(
  snapshots: Record<string, unknown>,
  warnings: string[],
) {
  const financial = asRecord(snapshots.financial);
  const financialTotal = readRecord(financial, "total");
  const financialAnalysis = readRecord(financial, "analysis");
  const financialMomentum = readRecord(financialAnalysis, "momentum");
  const recentMonths = Array.isArray(financial?.recentMonths)
    ? financial.recentMonths
    : [];

  const media = asRecord(snapshots.media);
  const mediaSummary = readRecord(media, "summary");
  const mediaPlaybookCounts = readRecord(media, "playbookCounts");

  const traffic = asRecord(snapshots.traffic);
  const trafficSummary = readRecord(traffic, "summary");
  const trafficHighlights = readRecord(traffic, "highlights");

  const productInsights = asRecord(snapshots.productInsights);
  const productOverview = readRecord(productInsights, "overview");
  const productHero = readRecord(productInsights, "hero");
  const productHeroRow = readRecord(productHero, "row");

  const catalog = asRecord(snapshots.catalog);
  const catalogSummary = readRecord(catalog, "summary");
  const catalogMeta = readRecord(catalog, "meta");

  const sanitization = asRecord(snapshots.sanitization);
  const sanitizationMeta = readRecord(sanitization, "meta");

  return {
    profitability: {
      netResult: roundMetric(readNumber(financialTotal, "netResult")),
      contributionMarginPercent: roundMetric(
        (readNumber(financialTotal, "contributionMargin") ?? 0) * 100,
        1,
      ),
      rld: roundMetric(readNumber(financialTotal, "rld")),
      mediaSpend: roundMetric(readNumber(financialTotal, "mediaSpend")),
      momentumTone: readString(financialMomentum, "tone"),
      topExpenseCategory: readString(
        readRecord(financialAnalysis, "topExpenseCategory"),
        "categoryName",
      ),
      activeMonthCount: roundMetric(readNumber(financialTotal, "activeMonthCount"), 0),
      recentMonths,
    },
    acquisition: {
      spend: roundMetric(readNumber(mediaSummary, "spend")),
      attributedRoas: roundMetric(readNumber(mediaSummary, "attributedRoas")),
      cpa: roundMetric(readNumber(mediaSummary, "cpa")),
      reviewCount: roundMetric(readNumber(mediaPlaybookCounts, "review"), 0),
      scaleCount: roundMetric(readNumber(mediaPlaybookCounts, "scale"), 0),
    },
    funnel: {
      sessions: roundMetric(readNumber(trafficSummary, "sessions"), 0),
      purchaseRatePercent: roundMetric(
        (readNumber(trafficSummary, "purchaseRate") ?? 0) * 100,
        2,
      ),
      checkoutRatePercent: roundMetric(
        (readNumber(trafficSummary, "checkoutRate") ?? 0) * 100,
        2,
      ),
      revenuePerSession: roundMetric(readNumber(trafficSummary, "revenuePerSession")),
      topLanding: readString(readRecord(trafficHighlights, "topLanding"), "label"),
    },
    assortment: {
      totalViews: roundMetric(readNumber(productOverview, "totalViews"), 0),
      totalRealUnitsSold: roundMetric(readNumber(productOverview, "totalRealUnitsSold"), 0),
      totalRealGrossRevenue: roundMetric(
        readNumber(productOverview, "totalRealGrossRevenue"),
      ),
      heroProduct: readString(productHeroRow, "stampName"),
      heroDecision: readString(productHeroRow, "decisionTitle"),
    },
    catalog: {
      totalProducts: roundMetric(readNumber(catalogSummary, "totalProducts"), 0),
      soldProducts: roundMetric(readNumber(catalogSummary, "soldProducts"), 0),
      productsWithGallery: roundMetric(
        readNumber(catalogSummary, "productsWithGallery"),
        0,
      ),
      sourceMode: readString(catalogMeta, "sourceMode"),
      metaCatalogReady: catalogMeta?.metaCatalogReady ?? null,
    },
    dataQuality: {
      pendingSanitization: roundMetric(readNumber(sanitizationMeta, "pendingCount"), 0),
      warnings,
    },
  };
}

function buildLearningEvidence(options: {
  snapshots: Record<string, unknown>;
  warnings: string[];
  learningFrame: Record<string, unknown>;
  contextEntries: AtlasContextEntry[];
  snapshot: Omit<AtlasBrandLearningSnapshot, "id" | "runId" | "generatedAt">;
}) {
  const evidences: AtlasBrandLearningEvidenceDraft[] = [];
  const pushEvidence = (
    evidence: Omit<AtlasBrandLearningEvidenceDraft, "position">,
  ) => {
    evidences.push({
      ...evidence,
      position: evidences.length,
    });
  };

  const frame = options.learningFrame;
  const profitability = readRecord(frame, "profitability");
  const acquisition = readRecord(frame, "acquisition");
  const funnel = readRecord(frame, "funnel");
  const assortment = readRecord(frame, "assortment");
  const catalog = readRecord(frame, "catalog");
  const dataQuality = readRecord(frame, "dataQuality");

  const netResult = readNumber(profitability, "netResult");
  const contributionMarginPercent = readNumber(profitability, "contributionMarginPercent");
  const topExpenseCategory = readString(profitability, "topExpenseCategory");
  const attributedRoas = readNumber(acquisition, "attributedRoas");
  const mediaSpend = readNumber(acquisition, "spend");
  const purchaseRatePercent = readNumber(funnel, "purchaseRatePercent");
  const checkoutRatePercent = readNumber(funnel, "checkoutRatePercent");
  const revenuePerSession = readNumber(funnel, "revenuePerSession");
  const heroProduct = readString(assortment, "heroProduct");
  const heroDecision = readString(assortment, "heroDecision");
  const totalProducts = readNumber(catalog, "totalProducts");
  const productsWithGallery = readNumber(catalog, "productsWithGallery");
  const pendingSanitization = readNumber(dataQuality, "pendingSanitization");

  if (netResult !== null) {
    pushEvidence({
      kind: netResult >= 0 ? "metric" : "constraint",
      source: "financial",
      title: netResult >= 0 ? "Resultado operacional positivo" : "Resultado operacional negativo",
      summary:
        netResult >= 0
          ? "A base financeira mostra que a operação fechou o recorte no azul."
          : "A base financeira mostra perda operacional no recorte analisado.",
      metricLabel: "Resultado",
      metricValue: netResult,
      metricDisplay: formatCurrency(netResult),
      sourceKey: "financial.total.netResult",
      payload: {
        confidence: options.snapshot.confidence,
      },
    });
  }

  if (contributionMarginPercent !== null) {
    pushEvidence({
      kind: contributionMarginPercent >= 20 ? "metric" : "risk",
      source: "financial",
      title: "Margem de contribuição consolidada",
      summary:
        contributionMarginPercent >= 20
          ? "A contribuição ainda sustenta espaço para operar e ajustar o negócio."
          : "A contribuição está curta e tende a reduzir a folga para absorver mídia e despesas.",
      metricLabel: "Margem de contribuição",
      metricValue: contributionMarginPercent,
      metricDisplay: formatPercent(contributionMarginPercent),
      sourceKey: "financial.total.contributionMargin",
      payload: {
        topExpenseCategory,
      },
    });
  }

  if (topExpenseCategory) {
    pushEvidence({
      kind: "constraint",
      source: "financial",
      title: "Maior pressão de despesa",
      summary: `A categoria ${topExpenseCategory} aparece como pressão dominante entre as despesas operacionais.`,
      metricLabel: "Categoria crítica",
      metricValue: null,
      metricDisplay: topExpenseCategory,
      sourceKey: "financial.analysis.topExpenseCategory",
      payload: {},
    });
  }

  if (mediaSpend !== null || attributedRoas !== null) {
    pushEvidence({
      kind:
        attributedRoas !== null && attributedRoas >= 2
          ? "opportunity"
          : "risk",
      source: "media",
      title: "Tração de mídia observada",
      summary:
        attributedRoas !== null && attributedRoas >= 2
          ? "A aquisição mostra potencial de escala, mas precisa ser reconciliada com margem e resultado."
          : "A mídia ainda não mostra retorno robusto o bastante para escalar com conforto.",
      metricLabel: "ROAS atribuído",
      metricValue: attributedRoas,
      metricDisplay:
        attributedRoas !== null && Number.isFinite(attributedRoas)
          ? `${attributedRoas.toFixed(2)}x`
          : formatCurrency(mediaSpend),
      sourceKey: "media.summary.attributedRoas",
      payload: {
        spend: mediaSpend,
        spendDisplay: formatCurrency(mediaSpend),
      },
    });
  }

  if (purchaseRatePercent !== null || checkoutRatePercent !== null) {
    pushEvidence({
      kind:
        purchaseRatePercent !== null && purchaseRatePercent >= 1
          ? "traffic"
          : "constraint",
      source: "traffic",
      title: "Conversão do funil",
      summary:
        purchaseRatePercent !== null && purchaseRatePercent >= 1
          ? "O funil mostra capacidade de monetização relevante dentro do tráfego atual."
          : "O funil ainda converte pouco e pode estar travando monetização antes da compra.",
      metricLabel: "Taxa de compra",
      metricValue: purchaseRatePercent,
      metricDisplay: formatPercent(purchaseRatePercent, 2),
      sourceKey: "traffic.summary.purchaseRate",
      payload: {
        checkoutRatePercent,
        checkoutRateDisplay: formatPercent(checkoutRatePercent, 2),
        revenuePerSession,
        revenuePerSessionDisplay: formatCurrency(revenuePerSession),
      },
    });
  }

  if (heroProduct || heroDecision) {
    pushEvidence({
      kind: "pattern",
      source: "product-insights",
      title: "Produto ou estampa em destaque",
      summary:
        heroDecision && heroProduct
          ? `${heroProduct} aparece como destaque do ciclo com leitura de ${heroDecision}.`
          : heroProduct
            ? `${heroProduct} aparece como destaque do ciclo atual.`
            : "O Atlas encontrou um item hero relevante no mix analisado.",
      metricLabel: "Hero",
      metricValue: null,
      metricDisplay: heroProduct ?? heroDecision,
      sourceKey: "product-insights.hero.row",
      payload: {
        decision: heroDecision,
      },
    });
  }

  if (totalProducts !== null || productsWithGallery !== null) {
    const coverage =
      totalProducts && productsWithGallery !== null && totalProducts > 0
        ? (productsWithGallery / totalProducts) * 100
        : null;

    pushEvidence({
      kind:
        coverage !== null && coverage >= 60
          ? "catalog"
          : "risk",
      source: "catalog",
      title: "Cobertura de catálogo",
      summary:
        coverage !== null && coverage >= 60
          ? "A cobertura visual do catálogo já sustenta melhor leitura e escala comercial."
          : "Ainda existe espaço relevante para ampliar galeria e cobertura visual do portfólio.",
      metricLabel: "Produtos com galeria",
      metricValue: coverage,
      metricDisplay:
        coverage !== null
          ? `${formatCount(productsWithGallery)}/${formatCount(totalProducts)}`
          : formatCount(totalProducts),
      sourceKey: "catalog.summary.productsWithGallery",
      payload: {
        totalProducts,
        productsWithGallery,
        coveragePercent: coverage,
      },
    });
  }

  if (pendingSanitization !== null) {
    pushEvidence({
      kind: pendingSanitization > 0 ? "quality" : "metric",
      source: "sanitization",
      title:
        pendingSanitization > 0
          ? "Pendências de saneamento em aberto"
          : "Base saneada no recorte atual",
      summary:
        pendingSanitization > 0
          ? "Ainda existem pendências capazes de distorcer parte da leitura do Atlas."
          : "Não há pendências de saneamento abertas afetando este snapshot.",
      metricLabel: "Pendências",
      metricValue: pendingSanitization,
      metricDisplay: formatCount(pendingSanitization),
      sourceKey: "sanitization.meta.pendingCount",
      payload: {
        warnings: options.warnings,
      },
    });
  }

  const latestContext = options.contextEntries
    .filter((entry) => entry.summary.trim() || entry.title.trim())
    .sort((left, right) => {
      const rightTime = Date.parse(right.eventDate ?? right.updatedAt ?? right.createdAt);
      const leftTime = Date.parse(left.eventDate ?? left.updatedAt ?? left.createdAt);
      return rightTime - leftTime;
    })[0];

  if (latestContext) {
    pushEvidence({
      kind: "context",
      source: "context",
      title: latestContext.title,
      summary: latestContext.summary,
      metricLabel: "Fonte",
      metricValue: null,
      metricDisplay: latestContext.source,
      sourceKey: latestContext.id,
      payload: {
        entryType: latestContext.entryType,
        eventDate: latestContext.eventDate,
        importance: latestContext.importance,
        tags: latestContext.tags,
      },
    });
  }

  if (!evidences.length) {
    pushEvidence({
      kind: "quality",
      source: "learning_frame",
      title: "Base aprendida com pouca evidência",
      summary:
        "O Atlas consolidou o snapshot, mas a base factual disponível ainda é curta para sustentar uma trilha mais rica de evidências.",
      metricLabel: null,
      metricValue: null,
      metricDisplay: null,
      sourceKey: "learning_frame",
      payload: {
        warnings: options.warnings,
        evidenceSources: options.snapshot.evidenceSources,
      },
    });
  }

  return evidences.slice(0, 8);
}

function buildLearningPrompt({
  brandLabel,
  scopeLabel,
  snapshots,
  warnings,
  curatedContext,
  learningFrame,
  previousSnapshot,
}: {
  brandLabel: string;
  scopeLabel: string;
  snapshots: Record<string, unknown>;
  warnings: string[];
  curatedContext: Array<Record<string, unknown>>;
  learningFrame: Record<string, unknown>;
  previousSnapshot?: AtlasBrandLearningSnapshot | null;
}) {
  return [
    "Você está executando o modo de aprendizagem do negócio no Atlas IA.",
    `Marca: ${brandLabel}`,
    `Escopo: ${scopeLabel}.`,
    warnings.length
      ? `Avisos de dados: ${warnings.join(" ")}`
      : "Avisos de dados: nenhum aviso relevante.",
    curatedContext.length
      ? `Memória operacional registrada: ${JSON.stringify(curatedContext, null, 2)}`
      : "Memória operacional registrada: sem entradas relevantes ainda.",
    previousSnapshot
      ? `Snapshot aprendido anterior da marca: ${JSON.stringify(
          {
            generatedAt: previousSnapshot.generatedAt,
            summary: previousSnapshot.summary,
            priorityStack: previousSnapshot.priorityStack,
            growthOpportunities: previousSnapshot.growthOpportunities,
            operationalRisks: previousSnapshot.operationalRisks,
            watchItems: previousSnapshot.watchItems,
            nextMilestones: previousSnapshot.nextMilestones,
          },
          null,
          2,
        )}`
      : "Snapshot aprendido anterior da marca: esta é a primeira leitura consolidada.",
    `Frame executivo consolidado pelo backend: ${JSON.stringify(learningFrame, null, 2)}`,
    "Relatórios históricos consolidados em JSON:",
    JSON.stringify(snapshots, null, 2),
    "",
    "Objetivo:",
    "- entender o nicho real do negócio",
    "- consolidar baseline de performance",
    "- registrar sinais estruturais do negócio",
    "- apontar sazonalidade e padrões recorrentes",
    "- detectar erros operacionais recorrentes",
    "- mapear oportunidades com aderência ao histórico da marca",
    "- sugerir próximos marcos para a operação e gatilhos claros de reaprendizagem",
    "",
    "Regras:",
    "- responda em português pt-BR",
    "- use apenas fatos observáveis nos relatórios e no contexto curado",
    "- não invente tese estrutural quando a base estiver fraca",
    "- diferencie gargalo operacional, gargalo comercial e gargalo de aquisição",
    "- se houver contradição entre crescimento e rentabilidade, explicite isso",
    "- use o snapshot anterior apenas como memória; corrija-o sem hesitar se a base factual atual mostrar mudança real",
    "- escreva com utilidade máxima: pouco texto, alta clareza e linguagem executiva",
    "- trate evidenceSources como trilhas curtas de base usada, não como explicação longa",
  ].join("\n");
}

export async function generateAtlasBusinessLearning(
  request: Request,
  brandId: string,
  options: {
    brandLabel: string;
    apiKey: string;
    model?: string | null;
    temperature?: number | null;
    contextEntries?: AtlasContextEntry[];
    previousSnapshot?: AtlasBrandLearningSnapshot | null;
    scope?: AtlasBrandLearningScope;
    analysisWindowDays?: number | null;
  },
): Promise<AtlasBrandLearningGenerationResult> {
  const learningScope = resolveLearningScope(
    options.scope,
    options.analysisWindowDays ?? null,
  );
  const ai = new GoogleGenAI({
    apiKey: options.apiKey,
  });

  const executionInput: AtlasAnalystExecutionInput = {
    brandId,
    question: "Mapeie o nicho, a performance, os riscos e as oportunidades estruturais desta marca.",
    skill: "executive_operator",
    pageContext: "/settings",
    periodLabel: learningScope.periodLabel,
    brandLabel: options.brandLabel,
    from: learningScope.from,
    to: learningScope.to,
  };

  const reportPlan = [
    "financial",
    "media",
    "traffic",
    "product-insights",
    "sales",
    "catalog",
    "sanitization",
  ] as const;

  const reportContext = await loadReportSnapshots(request, executionInput, [...reportPlan]);
  const curatedContext = buildCuratedContext(options.contextEntries ?? []);
  const learningFrame = buildLearningFrame(
    reportContext.snapshots,
    reportContext.warnings,
  );

  const response = await ai.models.generateContent({
    model: options.model?.trim() || DEFAULT_MODEL,
    contents: [
      {
        role: "user",
        parts: [
          {
            text: buildLearningPrompt({
              brandLabel: options.brandLabel,
              scopeLabel: learningScope.scopeLabel,
              snapshots: reportContext.snapshots,
              warnings: reportContext.warnings,
              curatedContext,
              learningFrame,
              previousSnapshot: options.previousSnapshot ?? null,
            }),
          },
        ],
      },
    ],
    config: {
      systemInstruction: [
        "Você é o Atlas Business Learning.",
        "Atue como analista sênior de e-commerce, marketing, vendas e print on demand.",
        "Seu papel é construir entendimento de negócio, não responder uma pergunta pontual.",
        "Trate o backend do Atlas como fonte de verdade dos números.",
        "Entregue síntese curta, rastreável e orientada a decisão.",
      ].join(" "),
      temperature:
        typeof options.temperature === "number" && Number.isFinite(options.temperature)
          ? Math.max(0, Math.min(1, options.temperature))
          : 0.2,
      responseMimeType: "application/json",
      responseJsonSchema: LEARNING_RESPONSE_SCHEMA,
    },
  });

  const payload = JSON.parse(response.text || "{}") as Record<string, unknown>;

  const snapshot = {
    brandId,
    scopeLabel: learningScope.scopeLabel,
    scopeKey: learningScope.scopeKey,
    periodFrom: learningScope.from,
    periodTo: learningScope.to,
    confidence:
      payload.confidence === "low" || payload.confidence === "medium" || payload.confidence === "high"
        ? payload.confidence
        : "medium",
    summary: asString(
      payload.summary,
      "O Atlas consolidou o histórico da marca, mas não conseguiu resumir o entendimento final.",
    ),
    businessProfile: asString(
      payload.businessProfile,
      "O histórico ainda não foi suficiente para consolidar um perfil de negócio robusto.",
    ),
    nicheProfile: asString(
      payload.nicheProfile,
      "O nicho da marca ainda precisa de mais evidência histórica para ser consolidado.",
    ),
    performanceBaseline: asString(
      payload.performanceBaseline,
      "O baseline de performance ainda não pôde ser consolidado com segurança.",
    ),
    operationalRisks: asStringArray(payload.operationalRisks, 5),
    recurringErrors: asStringArray(payload.recurringErrors, 5),
    growthOpportunities: asStringArray(payload.growthOpportunities, 5),
    evidenceSources: asStringArray(payload.evidenceSources, 6),
    dataGaps: asStringArray(payload.dataGaps, 4),
    businessSignals: asStringArray(payload.businessSignals, 6),
    seasonalityPatterns: asStringArray(payload.seasonalityPatterns, 4),
    campaignPatterns: asStringArray(payload.campaignPatterns, 5),
    catalogPatterns: asStringArray(payload.catalogPatterns, 5),
    priorityStack: asStringArray(payload.priorityStack, 5),
    nextMilestones: asStringArray(payload.nextMilestones, 4),
    watchItems: asStringArray(payload.watchItems, 4),
    relearnTriggers: asStringArray(payload.relearnTriggers, 4),
  } satisfies Omit<AtlasBrandLearningSnapshot, "id" | "runId" | "generatedAt">;

  const evidences = buildLearningEvidence({
    snapshots: reportContext.snapshots,
    warnings: reportContext.warnings,
    learningFrame,
    contextEntries: options.contextEntries ?? [],
    snapshot,
  });

  return {
    snapshot,
    evidences,
  };
}
