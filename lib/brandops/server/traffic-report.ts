import "server-only";

import type {
  TrafficBreakdownRow,
  TrafficHighlights,
  TrafficReport,
  TrafficReportHighlight,
  TrafficSignal,
  TrafficSignals,
  TrafficSummaryMetrics,
} from "@/lib/brandops/types";

const EMPTY_SIGNAL: TrafficSignal = {
  tone: "neutral",
  title: "Amostra insuficiente",
  description: "Ainda não há volume suficiente para uma leitura confiável deste indicador.",
};

const EMPTY_HIGHLIGHTS: TrafficHighlights = {
  topSource: null,
  topCampaign: null,
  topLanding: null,
  topRevenueLanding: null,
};

const EMPTY_SIGNALS: TrafficSignals = {
  revenuePerSession: EMPTY_SIGNAL,
  sessionToCartRate: EMPTY_SIGNAL,
  checkoutRate: EMPTY_SIGNAL,
  purchaseRate: EMPTY_SIGNAL,
};

const EMPTY_REPORT: TrafficReport = {
  summary: {
    sessions: 0,
    totalUsers: 0,
    pageViews: 0,
    addToCarts: 0,
    beginCheckouts: 0,
    purchases: 0,
    purchaseRevenue: 0,
    sessionToCartRate: 0,
    checkoutRate: 0,
    purchaseRate: 0,
    revenuePerSession: 0,
  },
  dailySeries: [],
  sources: [],
  campaigns: [],
  landingPages: [],
  story: "Ainda não há sessões suficientes no período para formar uma leitura gerencial do tráfego.",
  frictionSignal:
    "Assim que houver tráfego, o sistema passa a comparar intenção, checkout e compra para localizar atritos do funil.",
  highlights: EMPTY_HIGHLIGHTS,
  signals: EMPTY_SIGNALS,
  playbook: {
    scale: {
      title: "Escalar",
      description: "Canais e páginas com melhor sinal de receita e compra por sessão.",
      count: 0,
      items: [],
    },
    review: {
      title: "Revisar",
      description: "Entradas com tráfego, mas com conversão pressionada.",
      count: 0,
      items: [],
    },
    monitor: {
      title: "Monitorar",
      description: "Entradas ainda sem base forte para decisão definitiva.",
      count: 0,
      items: [],
    },
  },
  analysis: {
    narrativeTitle: "Amostra insuficiente",
    narrativeBody: "Ainda não há sessões suficientes no período para formar uma leitura gerencial do tráfego.",
    nextActions: [],
    topOpportunity: null,
    topRisk: null,
  },
  meta: {
    generatedAt: "",
    from: null,
    to: null,
    hasData: false,
  },
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const percentFormatter = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function toNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toStringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function toBoolean(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }

  return Boolean(value);
}

function mapSummary(source: unknown): TrafficSummaryMetrics {
  const payload = (source ?? {}) as Partial<TrafficSummaryMetrics>;

  return {
    sessions: toNumber(payload.sessions),
    totalUsers: toNumber(payload.totalUsers),
    pageViews: toNumber(payload.pageViews),
    addToCarts: toNumber(payload.addToCarts),
    beginCheckouts: toNumber(payload.beginCheckouts),
    purchases: toNumber(payload.purchases),
    purchaseRevenue: toNumber(payload.purchaseRevenue),
    sessionToCartRate: toNumber(payload.sessionToCartRate),
    checkoutRate: toNumber(payload.checkoutRate),
    purchaseRate: toNumber(payload.purchaseRate),
    revenuePerSession: toNumber(payload.revenuePerSession),
  };
}

function classifyTrafficRow(row: TrafficBreakdownRow) {
  if (row.sessions >= 40 && row.revenuePerSession >= 2 && row.purchaseRate >= 0.01) {
    return "scale" as const;
  }

  if (row.sessions >= 40 && (row.purchaseRate < 0.004 || row.revenuePerSession < 1)) {
    return "review" as const;
  }

  return "monitor" as const;
}

function buildPlaybook(
  sources: TrafficBreakdownRow[],
  campaigns: TrafficBreakdownRow[],
  landingPages: TrafficBreakdownRow[],
) {
  const candidateRows = [...landingPages, ...campaigns, ...sources];
  const scaleItems = candidateRows.filter((row) => classifyTrafficRow(row) === "scale").slice(0, 6);
  const reviewItems = candidateRows.filter((row) => classifyTrafficRow(row) === "review").slice(0, 6);
  const monitorItems = candidateRows.filter((row) => classifyTrafficRow(row) === "monitor").slice(0, 6);

  return {
    scale: {
      title: "Escalar",
      description: "Entradas com boa relação entre volume, compra e receita por sessão.",
      count: candidateRows.filter((row) => classifyTrafficRow(row) === "scale").length,
      items: scaleItems,
    },
    review: {
      title: "Revisar",
      description: "Entradas com tráfego relevante, mas conversão ou monetização abaixo do esperado.",
      count: candidateRows.filter((row) => classifyTrafficRow(row) === "review").length,
      items: reviewItems,
    },
    monitor: {
      title: "Monitorar",
      description: "Entradas ainda em observação, com amostra insuficiente para decisão forte.",
      count: candidateRows.filter((row) => classifyTrafficRow(row) === "monitor").length,
      items: monitorItems,
    },
  };
}

function buildAnalysis(
  summary: TrafficSummaryMetrics,
  highlights: TrafficHighlights,
  playbook: TrafficReport["playbook"],
) {
  if (summary.sessions <= 0) {
    return EMPTY_REPORT.analysis;
  }

  const nextActions: string[] = [];
  if (highlights.topRevenueLanding) {
    nextActions.push(`Usar a landing ${highlights.topRevenueLanding.label} como referência para replicar padrão de conversão.`);
  }
  if (highlights.topSource) {
    nextActions.push(`Aprofundar a origem ${highlights.topSource.label} para entender o que sustenta a melhor qualidade de tráfego.`);
  }
  if (playbook.review.items[0]) {
    nextActions.push(`Revisar a entrada ${playbook.review.items[0].label} porque ela já recebe tráfego, mas ainda monetiza pouco.`);
  }
  if (!nextActions.length) {
    nextActions.push("Aguardar mais volume para formar leitura conclusiva da jornada.");
  }

  if (summary.purchaseRate >= 0.01 && summary.revenuePerSession >= 2) {
    return {
      narrativeTitle: "Tráfego com qualidade para expansão seletiva",
      narrativeBody:
        "O recorte mostra um fluxo com aderência suficiente entre sessão, compra e monetização. O melhor próximo passo é encontrar quais entradas sustentam esse padrão para amplificar o que já funciona.",
      nextActions,
      topOpportunity: highlights.topRevenueLanding?.label ?? highlights.topSource?.label ?? null,
      topRisk: playbook.review.items[0]?.label ?? null,
    };
  }

  if (summary.sessionToCartRate >= 0.04 && summary.purchaseRate < 0.008) {
    return {
      narrativeTitle: "Existe intenção, mas o funil final ainda perde força",
      narrativeBody:
        "O topo do funil gera interesse, mas a passagem para compra ainda não acompanha. Vale revisar landing pages, checkout e aderência entre origem, promessa e oferta.",
      nextActions,
      topOpportunity: highlights.topSource?.label ?? null,
      topRisk: highlights.topLanding?.label ?? null,
    };
  }

  return {
    narrativeTitle: "Tráfego em fase de consolidação",
    narrativeBody:
      "Ainda não há conforto estatístico forte para escalar ou cortar grandes frentes. O foco deve ser ganhar clareza sobre quais entradas trazem intenção real e quais só geram volume.",
    nextActions,
    topOpportunity: highlights.topSource?.label ?? null,
    topRisk: playbook.review.items[0]?.label ?? null,
  };
}

function mapBreakdownRow(source: unknown): TrafficBreakdownRow {
  const payload = (source ?? {}) as Partial<TrafficBreakdownRow>;

  return {
    key: toStringValue(payload.key),
    label: toStringValue(payload.label, "Sem identificação"),
    sessions: toNumber(payload.sessions),
    totalUsers: toNumber(payload.totalUsers),
    pageViews: toNumber(payload.pageViews),
    addToCarts: toNumber(payload.addToCarts),
    beginCheckouts: toNumber(payload.beginCheckouts),
    purchases: toNumber(payload.purchases),
    purchaseRevenue: toNumber(payload.purchaseRevenue),
    purchaseRate: toNumber(payload.purchaseRate),
    revenuePerSession: toNumber(payload.revenuePerSession),
  };
}

function mapHighlight(source: unknown): TrafficReportHighlight | null {
  if (!source || typeof source !== "object") {
    return null;
  }

  const payload = source as Partial<TrafficReportHighlight>;
  return {
    key: toStringValue(payload.key),
    label: toStringValue(payload.label, "Sem identificação"),
    sessions: toNumber(payload.sessions),
    purchases: toNumber(payload.purchases),
    purchaseRevenue: toNumber(payload.purchaseRevenue),
    purchaseRate: toNumber(payload.purchaseRate),
    revenuePerSession: toNumber(payload.revenuePerSession),
    summary:
      payload.summary === null || typeof payload.summary === "string"
        ? payload.summary ?? null
        : null,
  };
}

function resolveSignal(
  metric: number,
  rules: {
    positive: number;
    warning: number;
    positiveTitle: string;
    warningTitle: string;
    positiveDescription: string;
    warningDescription: string;
    neutralDescription: string;
  },
): TrafficSignal {
  if (metric >= rules.positive) {
    return {
      tone: "positive",
      title: rules.positiveTitle,
      description: rules.positiveDescription,
    };
  }

  if (metric > 0 && metric < rules.warning) {
    return {
      tone: "warning",
      title: rules.warningTitle,
      description: rules.warningDescription,
    };
  }

  return {
    tone: "neutral",
    title: "Em observação",
    description: rules.neutralDescription,
  };
}

function buildHighlights(
  sources: TrafficBreakdownRow[],
  campaigns: TrafficBreakdownRow[],
  landingPages: TrafficBreakdownRow[],
): TrafficHighlights {
  const toHighlight = (row: TrafficBreakdownRow | null, summary: string | null): TrafficReportHighlight | null =>
    row
      ? {
          key: row.key,
          label: row.label,
          sessions: row.sessions,
          purchases: row.purchases,
          purchaseRevenue: row.purchaseRevenue,
          purchaseRate: row.purchaseRate,
          revenuePerSession: row.revenuePerSession,
          summary,
        }
      : null;

  const topRevenueLanding = [...landingPages].sort(
    (left, right) => right.revenuePerSession - left.revenuePerSession,
  )[0] ?? null;

  return {
    topSource: toHighlight(
      sources[0] ?? null,
      sources[0]
        ? `${sources[0].sessions} sessões e ${currencyFormatter.format(sources[0].purchaseRevenue)} de receita no período.`
        : null,
    ),
    topCampaign: toHighlight(
      campaigns[0] ?? null,
      campaigns[0]
        ? `${campaigns[0].sessions} sessões e ${currencyFormatter.format(campaigns[0].purchaseRevenue)} de receita GA4.`
        : null,
    ),
    topLanding: toHighlight(
      landingPages[0] ?? null,
      landingPages[0]
        ? `${landingPages[0].sessions} sessões e ${percentFormatter.format(landingPages[0].purchaseRate)} de taxa de compra.`
        : null,
    ),
    topRevenueLanding: toHighlight(
      topRevenueLanding,
      topRevenueLanding
        ? `${currencyFormatter.format(topRevenueLanding.purchaseRevenue)} de receita e ${currencyFormatter.format(topRevenueLanding.revenuePerSession)} por sessão.`
        : null,
    ),
  };
}

function buildSignals(summary: TrafficSummaryMetrics): TrafficSignals {
  if (summary.sessions <= 0) {
    return EMPTY_SIGNALS;
  }

  return {
    revenuePerSession: resolveSignal(summary.revenuePerSession, {
      positive: 2,
      warning: 1,
      positiveTitle: "Receita por sessão saudável",
      warningTitle: "Receita por sessão pressionada",
      positiveDescription:
        "O tráfego está convertendo em valor por visita acima do piso saudável da operação.",
      warningDescription:
        "O tráfego gera alguma receita, mas ainda abaixo do patamar desejável para ganhar escala.",
      neutralDescription:
        "O indicador ainda precisa de mais volume ou melhor eficiência para formar leitura conclusiva.",
    }),
    sessionToCartRate: resolveSignal(summary.sessionToCartRate, {
      positive: 0.05,
      warning: 0.035,
      positiveTitle: "Boa intenção de compra",
      warningTitle: "Entrada com pouca aderência",
      positiveDescription:
        "As sessões estão chegando com aderência suficiente para virar carrinho.",
      warningDescription:
        "O topo do funil ainda entrega pouco interesse. Vale revisar qualidade do tráfego e da vitrine.",
      neutralDescription:
        "A taxa está em observação e ainda pede mais amostra para leitura segura.",
    }),
    checkoutRate: resolveSignal(summary.checkoutRate, {
      positive: 0.4,
      warning: 0.25,
      positiveTitle: "Checkout consistente",
      warningTitle: "Atrito entre carrinho e checkout",
      positiveDescription:
        "Quem adiciona ao carrinho segue para checkout em ritmo coerente.",
      warningDescription:
        "Existe fricção entre carrinho e checkout. Vale revisar preço, PDP e clareza da oferta.",
      neutralDescription:
        "A taxa segue estável, mas ainda sem sinal forte o bastante para diagnóstico definitivo.",
    }),
    purchaseRate: resolveSignal(summary.purchaseRate, {
      positive: 0.01,
      warning: 0.006,
      positiveTitle: "Compra final em zona saudável",
      warningTitle: "Compra final abaixo do esperado",
      positiveDescription:
        "O funil está conseguindo transformar sessões em compra em um patamar saudável.",
      warningDescription:
        "A jornada final ainda não converte o suficiente. Revise checkout, confiança e aderência entre mídia e landing.",
      neutralDescription:
        "A compra por sessão ainda está em observação para o volume atual.",
    }),
  };
}

function mapSignals(source: unknown, summary: TrafficSummaryMetrics): TrafficSignals {
  if (!source || typeof source !== "object") {
    return buildSignals(summary);
  }

  const payload = source as Partial<TrafficSignals>;
  const mapSignal = (signal: Partial<TrafficSignal> | undefined): TrafficSignal => ({
    tone:
      signal?.tone === "positive" || signal?.tone === "warning" || signal?.tone === "neutral"
        ? signal.tone
        : "neutral",
    title: toStringValue(signal?.title, EMPTY_SIGNAL.title),
    description: toStringValue(signal?.description, EMPTY_SIGNAL.description),
  });

  return {
    revenuePerSession: mapSignal(payload.revenuePerSession),
    sessionToCartRate: mapSignal(payload.sessionToCartRate),
    checkoutRate: mapSignal(payload.checkoutRate),
    purchaseRate: mapSignal(payload.purchaseRate),
  };
}

export function normalizeTrafficReportPayload(source: unknown): TrafficReport {
  const payload = (source ?? {}) as Partial<TrafficReport> & {
    highlights?: Partial<TrafficHighlights>;
    signals?: Partial<TrafficSignals>;
    meta?: Partial<TrafficReport["meta"]>;
  };

  const summary = mapSummary(payload.summary);
  const dailySeries = Array.isArray(payload.dailySeries)
    ? payload.dailySeries.map((row) => ({
        date: toStringValue((row as { date?: unknown }).date),
        sessions: toNumber((row as { sessions?: unknown }).sessions),
        totalUsers: toNumber((row as { totalUsers?: unknown }).totalUsers),
        addToCarts: toNumber((row as { addToCarts?: unknown }).addToCarts),
        beginCheckouts: toNumber((row as { beginCheckouts?: unknown }).beginCheckouts),
        purchases: toNumber((row as { purchases?: unknown }).purchases),
        purchaseRevenue: toNumber((row as { purchaseRevenue?: unknown }).purchaseRevenue),
        sessionToCartRate: toNumber((row as { sessionToCartRate?: unknown }).sessionToCartRate),
        checkoutRate: toNumber((row as { checkoutRate?: unknown }).checkoutRate),
        purchaseRate: toNumber((row as { purchaseRate?: unknown }).purchaseRate),
        revenuePerSession: toNumber((row as { revenuePerSession?: unknown }).revenuePerSession),
      }))
    : [];
  const sources = Array.isArray(payload.sources) ? payload.sources.map(mapBreakdownRow) : [];
  const campaigns = Array.isArray(payload.campaigns) ? payload.campaigns.map(mapBreakdownRow) : [];
  const landingPages = Array.isArray(payload.landingPages)
    ? payload.landingPages.map(mapBreakdownRow)
    : [];

  const derivedHighlights = buildHighlights(sources, campaigns, landingPages);
  const highlights = {
    topSource: mapHighlight(payload.highlights?.topSource) ?? derivedHighlights.topSource,
    topCampaign:
      mapHighlight(payload.highlights?.topCampaign) ?? derivedHighlights.topCampaign,
    topLanding: mapHighlight(payload.highlights?.topLanding) ?? derivedHighlights.topLanding,
    topRevenueLanding:
      mapHighlight(payload.highlights?.topRevenueLanding) ??
      derivedHighlights.topRevenueLanding,
  };
  const playbook =
    payload.playbook && typeof payload.playbook === "object" && !Array.isArray(payload.playbook)
      ? (payload.playbook as TrafficReport["playbook"])
      : buildPlaybook(sources, campaigns, landingPages);
  const analysis =
    payload.analysis && typeof payload.analysis === "object" && !Array.isArray(payload.analysis)
      ? (payload.analysis as TrafficReport["analysis"])
      : buildAnalysis(summary, highlights, playbook);

  return {
    ...EMPTY_REPORT,
    summary,
    dailySeries,
    sources,
    campaigns,
    landingPages,
    story: toStringValue(payload.story, EMPTY_REPORT.story),
    frictionSignal: toStringValue(payload.frictionSignal, EMPTY_REPORT.frictionSignal),
    highlights,
    signals: mapSignals(payload.signals, summary),
    playbook,
    analysis,
    meta: {
      generatedAt: toStringValue(payload.meta?.generatedAt, new Date().toISOString()),
      from:
        payload.meta?.from === null || payload.meta?.from === undefined
          ? null
          : toStringValue(payload.meta.from),
      to:
        payload.meta?.to === null || payload.meta?.to === undefined
          ? null
          : toStringValue(payload.meta.to),
      hasData:
        payload.meta?.hasData === undefined
          ? summary.sessions > 0 || summary.purchaseRevenue > 0 || dailySeries.length > 0
          : toBoolean(payload.meta.hasData),
    },
  };
}
