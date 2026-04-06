import "server-only";

import {
  createPartFromFunctionResponse,
  FunctionCallingConfigMode,
  GoogleGenAI,
} from "@google/genai";
import { ATLAS_ANALYST_SKILLS, resolveAtlasAnalystSkill } from "./skills";
import {
  ATLAS_ANALYST_FUNCTION_DECLARATIONS,
  executeAtlasAnalystTool,
  isAtlasAnalystToolName,
  loadReportSnapshots,
  reportIdToToolName,
  type AtlasAnalystToolName,
} from "./runtime-tools";
import type {
  AtlasAnalystExecutionInput,
  AtlasAnalystHistoryItem,
  AtlasAnalystReportId,
  AtlasAnalystResponse,
  AtlasBrandLearningFinding,
  AtlasBrandLearningSnapshot,
  AtlasContextEntry,
} from "./types";

const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const MAX_TOOL_ROUNDS = 4;

export const ATLAS_ANALYST_DEFAULT_MODEL = DEFAULT_MODEL;

const ATLAS_ANALYST_RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    confidence: {
      type: "string",
      enum: ["low", "medium", "high"],
      description: "Nivel de confianca da resposta com base no contexto fornecido.",
    },
    summary: {
      type: "string",
      description: "Resumo executivo curto em portugues pt-BR.",
    },
    answer: {
      type: "string",
      description: "Resposta principal, objetiva e operacional, em portugues pt-BR.",
    },
    evidence: {
      type: "array",
      description: "Fatos que sustentam a leitura.",
      items: {
        type: "string",
      },
      minItems: 1,
      maxItems: 6,
    },
    actions: {
      type: "array",
      description: "Acoes praticas e priorizadas para o operador executar.",
      items: {
        type: "string",
      },
      minItems: 1,
      maxItems: 5,
    },
    risks: {
      type: "array",
      description: "Riscos ou cuidados que podem invalidar parte da leitura.",
      items: {
        type: "string",
      },
      minItems: 0,
      maxItems: 4,
    },
    followUps: {
      type: "array",
      description: "Perguntas ou proximos cortes analiticos que aprofundam a decisao.",
      items: {
        type: "string",
      },
      minItems: 0,
      maxItems: 3,
    },
  },
  required: ["confidence", "summary", "answer", "evidence", "actions", "risks", "followUps"],
} as const;

function normalizeText(value?: string | null) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function asString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function asEnum<T extends string>(value: unknown, options: readonly T[], fallback: T) {
  return typeof value === "string" && options.includes(value as T) ? (value as T) : fallback;
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

function dedupeStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
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

function readBoolean(
  source: Record<string, unknown> | null | undefined,
  key: string,
) {
  const value = source?.[key];
  return typeof value === "boolean" ? value : null;
}

function roundMetric(value: number | null, digits = 2) {
  if (value === null || !Number.isFinite(value)) {
    return null;
  }

  return Number(value.toFixed(digits));
}

function buildExecutiveDecisionFrame(
  snapshots: Record<string, unknown>,
  warnings: string[],
) {
  const financial = asRecord(snapshots.financial);
  const financialTotal = readRecord(financial, "total");
  const financialAnalysis = readRecord(financial, "analysis");
  const financialMomentum = readRecord(financialAnalysis, "momentum");

  const media = asRecord(snapshots.media);
  const mediaSummary = readRecord(media, "summary");
  const mediaAnalysis = readRecord(media, "analysis");
  const mediaPlaybookCounts = readRecord(media, "playbookCounts");

  const traffic = asRecord(snapshots.traffic);
  const trafficSummary = readRecord(traffic, "summary");
  const trafficAnalysis = readRecord(traffic, "analysis");

  const productInsights = asRecord(snapshots.productInsights);
  const productOverview = readRecord(productInsights, "overview");
  const productHero = readRecord(productInsights, "hero");
  const productHeroRow = readRecord(productHero, "row");
  const productAnalysis = readRecord(productInsights, "analysis");

  const catalog = asRecord(snapshots.catalog);
  const catalogSummary = readRecord(catalog, "summary");
  const catalogAnalysis = readRecord(catalog, "analysis");
  const catalogMeta = readRecord(catalog, "meta");

  const sanitization = asRecord(snapshots.sanitization);
  const sanitizationMeta = readRecord(sanitization, "meta");

  const netResult = readNumber(financialTotal, "netResult");
  const contributionMargin = readNumber(financialTotal, "contributionMargin");
  const rld = readNumber(financialTotal, "rld");
  const breakEvenDisplay = readNumber(financialTotal, "breakEvenDisplay");
  const breakEvenReliable = readBoolean(financialTotal, "breakEvenReliable");
  const attributedRoas = readNumber(mediaSummary, "attributedRoas");
  const mediaSpend = readNumber(mediaSummary, "spend");
  const purchaseRate = readNumber(trafficSummary, "purchaseRate");
  const checkoutRate = readNumber(trafficSummary, "checkoutRate");
  const revenuePerSession = readNumber(trafficSummary, "revenuePerSession");
  const totalRealUnitsSold = readNumber(productOverview, "totalRealUnitsSold");
  const totalProducts = readNumber(catalogSummary, "totalProducts");
  const productsWithGallery = readNumber(catalogSummary, "productsWithGallery");
  const pendingSanitization = readNumber(sanitizationMeta, "pendingCount");
  const financialMomentumTone = readString(financialMomentum, "tone");
  const topExpenseCategory = readRecord(financialAnalysis, "topExpenseCategory");
  const topExpenseCategoryName = readString(topExpenseCategory, "categoryName");
  const mediaTopRisk = readString(mediaAnalysis, "topRisk");
  const trafficTopRisk = readString(trafficAnalysis, "topRisk");
  const productTopRisk = readString(productAnalysis, "topRisk");
  const catalogTopRisk = readString(catalogAnalysis, "topRisk");
  const frictionSignal = readString(traffic, "frictionSignal");
  const productHeroDecision = readString(productHeroRow, "decision");
  const productHeroTitle = readString(productHeroRow, "decisionTitle");
  const productHeroName = readString(productHeroRow, "stampName");
  const catalogSourceMode = readString(catalogMeta, "sourceMode");
  const metaCatalogReady = readBoolean(catalogMeta, "metaCatalogReady");
  const mediaScaleCount = readNumber(mediaPlaybookCounts, "scale");
  const mediaReviewCount = readNumber(mediaPlaybookCounts, "review");
  const contradictions: string[] = [];
  const dominantSignals: string[] = [];
  const recommendedLenses: string[] = [];

  if (netResult !== null) {
    dominantSignals.push(
      netResult >= 0
        ? `Resultado do período positivo em ${roundMetric(netResult)}.`
        : `Resultado do período negativo em ${roundMetric(netResult)}.`,
    );
  }

  if (contributionMargin !== null) {
    dominantSignals.push(
      `Margem de contribuição em ${roundMetric(contributionMargin * 100, 1)}%.`,
    );
  }

  if (breakEvenReliable && breakEvenDisplay !== null && rld !== null) {
    dominantSignals.push(
      rld >= breakEvenDisplay
        ? `A operação ficou acima do break-even calculado (${roundMetric(breakEvenDisplay)}).`
        : `A operação ficou abaixo do break-even calculado (${roundMetric(breakEvenDisplay)}).`,
    );
  }

  if (financialMomentumTone === "warning") {
    contradictions.push("A tendência financeira recente aponta deterioração de margem ou resultado.");
  }

  if (
    netResult !== null &&
    netResult < 0 &&
    attributedRoas !== null &&
    attributedRoas >= 2
  ) {
    contradictions.push(
      "A mídia mostra ROAS atribuído razoável, mas isso não está se convertendo em resultado financeiro real.",
    );
    recommendedLenses.push("reconciliação entre atribuição de mídia, margem e mix vendido");
  }

  if (purchaseRate !== null && purchaseRate < 0.01) {
    contradictions.push("O funil está convertendo pouco para compra no período analisado.");
    recommendedLenses.push("fricção de funil e oferta");
  }

  if (checkoutRate !== null && checkoutRate < 0.25) {
    recommendedLenses.push("passagem de carrinho para checkout");
  }

  if (mediaReviewCount !== null && mediaScaleCount !== null && mediaReviewCount > mediaScaleCount) {
    contradictions.push("Há mais campanhas pedindo revisão do que campanhas prontas para escala.");
    recommendedLenses.push("qualidade de mídia e priorização de verba");
  }

  if (
    totalProducts !== null &&
    totalProducts > 0 &&
    productsWithGallery !== null &&
    productsWithGallery / totalProducts < 0.5
  ) {
    contradictions.push("A cobertura visual do catálogo ainda está baixa para uma parte relevante do portfólio.");
    recommendedLenses.push("vitrine, mockup e cobertura de catálogo");
  }

  if (pendingSanitization !== null && pendingSanitization > 0) {
    contradictions.push(`Existem ${pendingSanitization} pendências de saneamento em aberto que podem distorcer leituras.`);
    recommendedLenses.push("qualidade do dado antes de escalar decisão");
  }

  if (productHeroName && productHeroTitle) {
    dominantSignals.push(`Produto/estampa hero atual: ${productHeroName} (${productHeroTitle}).`);
  }

  if (topExpenseCategoryName) {
    dominantSignals.push(`Maior pressão de despesa operacional: ${topExpenseCategoryName}.`);
  }

  const primaryConstraint =
    pendingSanitization && pendingSanitization > 0
      ? "data_quality"
      : netResult !== null && netResult < 0
        ? "profitability"
        : contributionMargin !== null && contributionMargin < 0.15
          ? "margin_pressure"
          : purchaseRate !== null && purchaseRate < 0.01
            ? "funnel_conversion"
            : mediaReviewCount !== null &&
                mediaScaleCount !== null &&
                mediaReviewCount > mediaScaleCount
              ? "media_quality"
              : totalProducts !== null &&
                  totalProducts > 0 &&
                  productsWithGallery !== null &&
                  productsWithGallery / totalProducts < 0.5
                ? "catalog_coverage"
                : "growth_execution";

  return {
    primaryConstraint,
    dominantSignals: dedupeStrings(dominantSignals).slice(0, 6),
    contradictions: dedupeStrings(contradictions).slice(0, 5),
    recommendedLenses: dedupeStrings(
      [
        ...recommendedLenses,
        mediaTopRisk,
        trafficTopRisk,
        productTopRisk,
        catalogTopRisk,
        frictionSignal,
      ].filter((value): value is string => Boolean(value)),
    ).slice(0, 6),
    profitability: {
      netResult: roundMetric(netResult),
      contributionMarginPercent:
        contributionMargin === null ? null : roundMetric(contributionMargin * 100, 1),
      rld: roundMetric(rld),
      breakEvenDisplay: roundMetric(breakEvenDisplay),
      breakEvenReliable: breakEvenReliable ?? false,
      momentumTone: financialMomentumTone ?? "neutral",
    },
    acquisition: {
      spend: roundMetric(mediaSpend),
      attributedRoas: roundMetric(attributedRoas),
      scaleCandidates: roundMetric(mediaScaleCount, 0),
      reviewCandidates: roundMetric(mediaReviewCount, 0),
    },
    funnel: {
      purchaseRatePercent: purchaseRate === null ? null : roundMetric(purchaseRate * 100, 2),
      checkoutRatePercent: checkoutRate === null ? null : roundMetric(checkoutRate * 100, 2),
      revenuePerSession: roundMetric(revenuePerSession),
    },
    assortment: {
      totalRealUnitsSold: roundMetric(totalRealUnitsSold, 0),
      heroDecision: productHeroDecision,
      heroLabel: productHeroName,
    },
    catalog: {
      totalProducts: roundMetric(totalProducts, 0),
      productsWithGallery: roundMetric(productsWithGallery, 0),
      sourceMode: catalogSourceMode,
      metaCatalogReady: metaCatalogReady ?? false,
    },
    dataQuality: {
      pendingSanitization: roundMetric(pendingSanitization, 0),
      warnings,
    },
  };
}

function shouldIncludeReport(
  reportId: AtlasAnalystReportId,
  question: string,
  pageContext?: string | null,
) {
  const normalizedQuestion = normalizeText(question);
  const normalizedPage = normalizeText(pageContext);

  if (reportId === "financial") {
    return true;
  }

  if (reportId === "media") {
    return (
      normalizedPage.includes("/media") ||
      ["meta", "campanha", "anuncio", "anúncio", "roas", "cpa", "ctr", "criativo", "verba"].some((term) =>
        normalizedQuestion.includes(normalizeText(term)),
      )
    );
  }

  if (reportId === "traffic") {
    return (
      normalizedPage.includes("/traffic") ||
      ["ga4", "trafego", "tráfego", "funil", "landing", "checkout", "sessao", "sessão"].some((term) =>
        normalizedQuestion.includes(normalizeText(term)),
      )
    );
  }

  if (reportId === "product-insights") {
    return (
      normalizedPage.includes("/product-insights") ||
      normalizedPage.includes("/feed") ||
      normalizedPage.includes("/cmv") ||
      ["estampa", "produto", "catalogo", "catálogo", "pod", "mockup", "vitrine"].some((term) =>
        normalizedQuestion.includes(normalizeText(term)),
      )
    );
  }

  if (reportId === "sales") {
    return (
      normalizedPage.includes("/sales") ||
      normalizedPage.includes("/dashboard") ||
      ["venda", "ticket", "desconto", "pedido", "receita", "produto vencedor"].some((term) =>
        normalizedQuestion.includes(normalizeText(term)),
      )
    );
  }

  if (reportId === "catalog") {
    return (
      normalizedPage.includes("/feed") ||
      normalizedPage.includes("/product-insights") ||
      ["catalogo", "catálogo", "feed", "colecao", "coleção", "vitrine", "galeria"].some((term) =>
        normalizedQuestion.includes(normalizeText(term)),
      )
    );
  }

  return (
    normalizedPage.includes("/sanitization") ||
    normalizedPage.includes("/media") ||
    ["anomalia", "saneamento", "qualidade", "duplicado", "inconsistencia", "inconsistência"].some((term) =>
      normalizedQuestion.includes(normalizeText(term)),
    )
  );
}

function buildReportPlan(input: AtlasAnalystExecutionInput) {
  const skill = resolveAtlasAnalystSkill(input);
  const selectedReports = skill.reportPlan.filter((reportId, index, reports) => {
    if (reportId === "financial") {
      return true;
    }

    if (reports.length <= 2) {
      return true;
    }

    return shouldIncludeReport(reportId, input.question, input.pageContext);
  });

  return {
    skill,
    reportPlan: Array.from(
      new Set<AtlasAnalystReportId>(
        selectedReports.length ? selectedReports : (["financial"] as AtlasAnalystReportId[]),
      ),
    ),
  };
}

function buildMemoryContext(memory: AtlasAnalystHistoryItem[] = []) {
  return memory.slice(0, 4).map((entry) => ({
    generatedAt: entry.generatedAt,
    skillLabel: entry.skillLabel,
    question: entry.question,
    summary: entry.summary,
    answer: entry.answer,
    feedbackVote: entry.feedbackVote,
  }));
}

function buildCuratedContext(entries: AtlasContextEntry[] = []) {
  return entries.slice(0, 8).map((entry) => ({
    id: entry.id,
    entryType: entry.entryType,
    title: entry.title,
    summary: entry.summary,
    details: entry.details,
    source: entry.source,
    importance: entry.importance,
    eventDate: entry.eventDate,
    tags: entry.tags,
  }));
}

function buildBrandLearningContext(
  snapshot?: AtlasBrandLearningSnapshot | null,
  findings: AtlasBrandLearningFinding[] = [],
) {
  if (!snapshot) {
    return null;
  }

  const groupedFindings = {
    priorities: findings
      .filter((finding) => finding.group === "priority")
      .map((finding) => finding.label)
      .slice(0, 5),
    opportunities: findings
      .filter((finding) => finding.group === "opportunity")
      .map((finding) => finding.label)
      .slice(0, 4),
    risks: findings
      .filter((finding) => finding.group === "risk" || finding.group === "error")
      .map((finding) => finding.label)
      .slice(0, 5),
    evidence: findings
      .filter((finding) => finding.group === "evidence")
      .map((finding) => finding.label)
      .slice(0, 5),
    gaps: findings
      .filter((finding) => finding.group === "gap")
      .map((finding) => finding.label)
      .slice(0, 4),
    watch: findings
      .filter((finding) => finding.group === "watch" || finding.group === "trigger")
      .map((finding) => finding.label)
      .slice(0, 5),
  };

  return {
    generatedAt: snapshot.generatedAt,
    scopeLabel: snapshot.scopeLabel,
    periodFrom: snapshot.periodFrom ?? null,
    periodTo: snapshot.periodTo ?? null,
    confidence: snapshot.confidence,
    summary: snapshot.summary,
    businessProfile: snapshot.businessProfile,
    nicheProfile: snapshot.nicheProfile,
    performanceBaseline: snapshot.performanceBaseline,
    priorityStack: snapshot.priorityStack.slice(0, 5),
    operationalRisks: snapshot.operationalRisks.slice(0, 4),
    recurringErrors: snapshot.recurringErrors.slice(0, 4),
    growthOpportunities: snapshot.growthOpportunities.slice(0, 4),
    businessSignals: snapshot.businessSignals.slice(0, 5),
    seasonalityPatterns: snapshot.seasonalityPatterns.slice(0, 4),
    campaignPatterns: snapshot.campaignPatterns.slice(0, 4),
    catalogPatterns: snapshot.catalogPatterns.slice(0, 4),
    dataGaps: snapshot.dataGaps.slice(0, 3),
    watchItems: snapshot.watchItems.slice(0, 4),
    nextMilestones: snapshot.nextMilestones.slice(0, 4),
    relearnTriggers: snapshot.relearnTriggers.slice(0, 4),
    groupedFindings,
  };
}

function buildToolPlanningPrompt(
  input: AtlasAnalystExecutionInput,
  preferredToolNames: AtlasAnalystToolName[],
  memoryContext: Array<Record<string, unknown>>,
  curatedContext: Array<Record<string, unknown>>,
  learningContext: Record<string, unknown> | null,
  operatorGuidance?: string | null,
) {
  const periodText =
    input.from && input.to
      ? `${input.from} até ${input.to}`
      : input.periodLabel ?? "todo o período disponível";

  return [
    "Consulta do operador Atlas:",
    `- Marca: ${input.brandLabel ?? input.brandId}`,
    `- Periodo: ${periodText}`,
    `- Tela atual: ${input.pageContext ?? "nao informada"}`,
    `- Pergunta: ${input.question.trim()}`,
    `- Tools preferenciais para este caso: ${preferredToolNames.join(", ")}`,
    memoryContext.length
      ? `- Memoria recente do analyst: ${JSON.stringify(memoryContext, null, 2)}`
      : "- Memoria recente do analyst: sem historico relevante ainda.",
    curatedContext.length
      ? `- Contexto curado da marca: ${JSON.stringify(curatedContext, null, 2)}`
      : "- Contexto curado da marca: sem entradas recentes registradas.",
    learningContext
      ? `- Aprendizado consolidado da marca: ${JSON.stringify(learningContext, null, 2)}`
      : "- Aprendizado consolidado da marca: sem snapshot aprendido ainda.",
    operatorGuidance?.trim()
      ? `- Guia operacional da marca para o Atlas: ${operatorGuidance.trim()}`
      : "- Guia operacional da marca para o Atlas: sem orientação estruturada registrada.",
    "",
    "Antes da resposta final, consulte as ferramentas internas do Atlas para montar a base factual.",
    "Chame apenas uma ferramenta por vez.",
  ].join("\n");
}

function buildToolSystemInstruction(skillId: keyof typeof ATLAS_ANALYST_SKILLS) {
  const skill = ATLAS_ANALYST_SKILLS[skillId];
  return [
    skill.systemPrompt,
    "Voce esta em modo de investigacao factual do Atlas.",
    "Regras imutaveis:",
    "- Antes da resposta final, consulte ferramentas internas do Atlas.",
    "- Chame apenas ferramentas internas disponiveis.",
    "- Chame somente uma ferramenta por vez.",
    "- Evite repetir a mesma ferramenta sem necessidade.",
    "- Priorize o relatorio financeiro sempre que a leitura envolver margem, resultado ou rentabilidade.",
    "- Meta e GA4 nao substituem a verdade financeira do backend.",
  ].join("\n");
}

function buildFinalSynthesisPrompt(
  input: AtlasAnalystExecutionInput,
  snapshots: Record<string, unknown>,
  warnings: string[],
  memoryContext: Array<Record<string, unknown>>,
  curatedContext: Array<Record<string, unknown>>,
  learningContext: Record<string, unknown> | null,
  usedReports: AtlasAnalystReportId[],
  decisionFrame: Record<string, unknown>,
  operatorGuidance?: string | null,
) {
  const periodText =
    input.from && input.to
      ? `${input.from} até ${input.to}`
      : input.periodLabel ?? "todo o período disponível";

  return [
    "Agora gere a resposta final para o operador do Atlas.",
    "Use somente os fatos presentes nas tools consultadas e no contexto abaixo.",
    "",
    "Contexto da consulta:",
    `- Marca: ${input.brandLabel ?? input.brandId}`,
    `- Periodo: ${periodText}`,
    `- Tela atual: ${input.pageContext ?? "nao informada"}`,
    `- Pergunta do operador: ${input.question.trim()}`,
    warnings.length ? `- Avisos de dados: ${warnings.join(" ")}` : "- Avisos de dados: nenhum aviso relevante.",
    usedReports.length ? `- Relatorios consultados: ${usedReports.join(", ")}` : "- Relatorios consultados: nenhum relatorio consultado.",
    memoryContext.length
      ? `- Memoria recente: ${JSON.stringify(memoryContext, null, 2)}`
      : "- Memoria recente: sem historico relevante.",
    curatedContext.length
      ? `- Contexto curado da marca: ${JSON.stringify(curatedContext, null, 2)}`
      : "- Contexto curado da marca: sem entradas recentes registradas.",
    learningContext
      ? `- Aprendizado consolidado da marca: ${JSON.stringify(learningContext, null, 2)}`
      : "- Aprendizado consolidado da marca: sem snapshot aprendido ainda.",
    operatorGuidance?.trim()
      ? `- Guia operacional da marca: ${operatorGuidance.trim()}`
      : "- Guia operacional da marca: sem orientação estruturada registrada.",
    "",
    "Frame executivo consolidado pelo backend:",
    JSON.stringify(decisionFrame, null, 2),
    "",
    "Base factual consolidada em JSON:",
    JSON.stringify(snapshots, null, 2),
    "",
    "Instrucoes finais:",
    "- Responda em portugues pt-BR.",
    "- Seja direto, operacional e realista.",
    "- Aponte primeiro o driver dominante antes de listar acoes secundarias.",
    "- Trate o frame executivo do backend como trilho inicial da leitura. So contradiga esse frame se a base factual em JSON mostrar claramente o contrario.",
    "- Diferencie sintoma, restricao principal e acao recomendada.",
    "- Se houver contradicao entre crescimento e rentabilidade, explicite essa tensao.",
    "- Nao invente metricas nem causas.",
    "- Se houver dado insuficiente, reduza a confianca e aponte a lacuna.",
  ].join("\n");
}

function buildFinalSystemInstruction(skillId: keyof typeof ATLAS_ANALYST_SKILLS) {
  const skill = ATLAS_ANALYST_SKILLS[skillId];
  return [
    skill.systemPrompt,
    "Voce esta em modo de sintese executiva do Atlas.",
    "O backend do Atlas e a fonte de verdade dos calculos.",
    "Para leitura financeira, trate o relatorio financeiro como verdade de receita, contribuicao, despesas e resultado.",
    "Dados da Meta representam atribuicao de midia e nao substituem a verdade financeira do Atlas.",
    "Dados do GA4 representam comportamento de funil e nao substituem a verdade financeira do Atlas.",
    "Em print on demand, diferencie falta de trafego, friccao de vitrine, validacao de estampa e pressao de margem.",
    "Sua resposta deve separar claramente: restricao principal, evidencias e proxima decisao operacional.",
  ].join("\n");
}

function shouldStopToolLoop(
  round: number,
  reportPlan: AtlasAnalystReportId[],
  usedReports: AtlasAnalystReportId[],
) {
  if (!usedReports.length) {
    return false;
  }

  if (reportPlan.length === 1) {
    return usedReports.length >= 1;
  }

  if (usedReports.includes("financial") && usedReports.some((reportId) => reportId !== "financial")) {
    return true;
  }

  return round >= 1 && usedReports.length >= Math.min(3, reportPlan.length);
}

async function collectToolDrivenContext(
  ai: GoogleGenAI,
  request: Request,
  input: AtlasAnalystExecutionInput,
  model: string,
  skillId: keyof typeof ATLAS_ANALYST_SKILLS,
  reportPlan: AtlasAnalystReportId[],
  memoryContext: Array<Record<string, unknown>>,
  curatedContext: Array<Record<string, unknown>>,
  learningContext: Record<string, unknown> | null,
  operatorGuidance?: string | null,
) {
  const preferredToolNames = reportPlan.map(reportIdToToolName);
  const contents: Array<{ role: "user" | "model"; parts: Array<Record<string, unknown>> }> = [
    {
      role: "user",
      parts: [
        {
          text: buildToolPlanningPrompt(
            input,
            preferredToolNames,
            memoryContext,
            curatedContext,
            learningContext,
            operatorGuidance,
          ),
        },
      ],
    },
  ];

  const warnings: string[] = [];
  const usedReports: AtlasAnalystReportId[] = [];
  const snapshots: Record<string, unknown> = {};
  const usedToolNames: AtlasAnalystToolName[] = [];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
    const allowedFunctionNames =
      round === 0
        ? preferredToolNames
        : dedupeStrings(
            [
              ...preferredToolNames,
              ...ATLAS_ANALYST_FUNCTION_DECLARATIONS.map((definition) => String(definition.name ?? "")),
            ].filter((toolName) => !usedToolNames.includes(toolName as AtlasAnalystToolName)),
          );

    if (!allowedFunctionNames.length) {
      break;
    }

    const response = await ai.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction: buildToolSystemInstruction(skillId),
        temperature: 0.1,
        tools: [{ functionDeclarations: ATLAS_ANALYST_FUNCTION_DECLARATIONS }],
        toolConfig: {
          functionCallingConfig: {
            mode: FunctionCallingConfigMode.ANY,
            allowedFunctionNames,
          },
        },
      },
    });

    const candidateContent = response.candidates?.[0]?.content;
    const functionCalls = response.functionCalls ?? [];

    if (candidateContent?.parts?.length) {
      contents.push({
        role: "model",
        parts: candidateContent.parts as Array<Record<string, unknown>>,
      });
    } else if (functionCalls.length) {
      contents.push({
        role: "model",
        parts: functionCalls.map((call) => ({
          functionCall: {
            id: call.id,
            name: call.name,
            args: call.args,
          },
        })),
      });
    }

    if (!functionCalls.length) {
      break;
    }

    const functionResponses = await Promise.all(
      functionCalls.map(async (call) => {
        const callId = call.id || `${call.name || "atlas_tool"}-${round}`;
        const toolName = String(call.name ?? "");

        if (!isAtlasAnalystToolName(toolName)) {
          const message = `Tool inválida solicitada pelo modelo: ${toolName || "desconhecida"}.`;
          warnings.push(message);
          return createPartFromFunctionResponse(callId, toolName || "invalid_tool", {
            error: message,
          }) as unknown as Record<string, unknown>;
        }

        try {
          const result = await executeAtlasAnalystTool(request, input, toolName);
          snapshots[result.snapshotKey] = result.output;
          usedReports.push(result.reportId);
          usedToolNames.push(toolName);

          return createPartFromFunctionResponse(callId, toolName, {
            output: result.output,
          }) as unknown as Record<string, unknown>;
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Falha desconhecida ao executar a tool.";
          warnings.push(`Falha ao executar ${toolName}: ${message}`);
          return createPartFromFunctionResponse(callId, toolName, {
            error: message,
          }) as unknown as Record<string, unknown>;
        }
      }),
    );

    contents.push({
      role: "user",
      parts: functionResponses,
    });

    if (shouldStopToolLoop(round, reportPlan, usedReports)) {
      break;
    }
  }

  return {
    contents,
    warnings: dedupeStrings(warnings),
    usedReports: Array.from(new Set(usedReports)),
    snapshots,
  };
}

export async function runAtlasAnalyst(
  request: Request,
  input: AtlasAnalystExecutionInput,
  options?: {
    apiKey?: string;
    model?: string;
    temperature?: number;
    recentRuns?: AtlasAnalystHistoryItem[];
    brandContext?: AtlasContextEntry[];
    brandLearningSnapshot?: AtlasBrandLearningSnapshot | null;
    brandLearningFindings?: AtlasBrandLearningFinding[];
    operatorGuidance?: string | null;
  },
): Promise<AtlasAnalystResponse> {
  const apiKey = options?.apiKey?.trim();
  if (!apiKey) {
    throw new Error("Nenhuma credencial Gemini disponível para executar o Atlas Analyst.");
  }

  const model = options?.model?.trim() || DEFAULT_MODEL;
  const synthesisTemperature =
    typeof options?.temperature === "number" && Number.isFinite(options.temperature)
      ? Math.max(0, Math.min(1, options.temperature))
      : 0.25;
  const { skill, reportPlan } = buildReportPlan(input);
  const memoryContext = buildMemoryContext(options?.recentRuns ?? []);
  const curatedContext = buildCuratedContext(options?.brandContext ?? []);
  const learningContext = buildBrandLearningContext(
    options?.brandLearningSnapshot ?? null,
    options?.brandLearningFindings ?? [],
  );

  const ai = new GoogleGenAI({
    apiKey,
  });

  const toolContext = await collectToolDrivenContext(
    ai,
    request,
    input,
    model,
    skill.id,
    reportPlan,
    memoryContext,
    curatedContext,
    learningContext,
    options?.operatorGuidance ?? null,
  );

  let snapshots = { ...toolContext.snapshots };
  let warnings = [...toolContext.warnings];
  let usedReports = [...toolContext.usedReports];

  const fallbackPlan = reportPlan.filter((reportId) => !usedReports.includes(reportId));
  const shouldLoadFallback =
    !usedReports.length || !usedReports.includes("financial") || usedReports.length < Math.min(2, reportPlan.length);

  if (shouldLoadFallback && fallbackPlan.length) {
    const fallback = await loadReportSnapshots(request, input, fallbackPlan);
    snapshots = {
      ...fallback.snapshots,
      ...snapshots,
    };
    warnings = dedupeStrings([...warnings, ...fallback.warnings]);
    usedReports = Array.from(new Set([...fallback.usedReports, ...usedReports]));
  }

  if (!usedReports.length) {
    throw new Error("Nenhum relatório conseguiu ser carregado para formar o contexto do Atlas Analyst.");
  }

  const decisionFrame = buildExecutiveDecisionFrame(snapshots, warnings);

  const finalResponse = await ai.models.generateContent({
    model,
    contents: [
      ...toolContext.contents,
      {
        role: "user",
        parts: [
          {
            text: buildFinalSynthesisPrompt(
              input,
              snapshots,
              warnings,
              memoryContext,
              curatedContext,
              learningContext,
              usedReports,
              decisionFrame,
              options?.operatorGuidance ?? null,
            ),
          },
        ],
      },
    ],
    config: {
      systemInstruction: buildFinalSystemInstruction(skill.id),
      temperature: synthesisTemperature,
      responseMimeType: "application/json",
      responseJsonSchema: ATLAS_ANALYST_RESPONSE_SCHEMA,
    },
  });

  const payload = JSON.parse(finalResponse.text || "{}") as Record<string, unknown>;

  return {
    runId: null,
    skillId: skill.id,
    skillLabel: skill.label,
    confidence: asEnum(payload.confidence, ["low", "medium", "high"], "medium"),
    summary: asString(
      payload.summary,
      "O Atlas Analyst conseguiu montar o contexto, mas nao recebeu um resumo valido do modelo.",
    ),
    answer: asString(
      payload.answer,
      "O Atlas Analyst conseguiu montar o contexto, mas nao recebeu uma resposta valida do modelo.",
    ),
    evidence: asStringArray(payload.evidence, 6),
    actions: asStringArray(payload.actions, 5),
    risks: asStringArray(payload.risks, 4),
    followUps: asStringArray(payload.followUps, 3),
    warnings,
    usedReports,
    generatedAt: new Date().toISOString(),
    periodLabel: input.periodLabel ?? null,
    feedbackVote: null,
  };
}
