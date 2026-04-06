import "server-only";

import { GoogleGenAI } from "@google/genai";
import { loadReportSnapshots } from "./runtime-tools";
import type {
  AtlasBrandLearningSnapshot,
  AtlasBrandLearningScope,
  AtlasContextEntry,
  AtlasAnalystExecutionInput,
} from "./types";

const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

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
): Promise<Omit<AtlasBrandLearningSnapshot, "id" | "runId" | "generatedAt">> {
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

  return {
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
  };
}
