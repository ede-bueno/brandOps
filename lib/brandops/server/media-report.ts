import "server-only";

import type {
  MediaAdAction,
  MediaAdReportRow,
  MediaCampaignAction,
  MediaCampaignReportRow,
  MediaReport,
  MediaReportDailyPoint,
  MediaSignal,
  MediaSignals,
  MediaReportSummary,
} from "@/lib/brandops/types";

type MediaDataSource = "api" | "manual_csv";

type RawMediaRow = {
  id: string;
  report_start: string | null;
  date: string | null;
  campaign_id?: string | null;
  campaign_name: string | null;
  adset_id?: string | null;
  adset_name: string | null;
  ad_id?: string | null;
  ad_name: string | null;
  creative_id?: string | null;
  creative_name?: string | null;
  delivery: string | null;
  reach: number | null;
  impressions: number | null;
  clicks_all: number | null;
  link_clicks: number | null;
  spend: number | null;
  purchases: number | null;
  conversion_value: number | null;
  is_ignored: boolean | null;
};

type EffectiveMediaRow = {
  id: string;
  metricDate: string;
  campaignId: string | null;
  campaignName: string;
  adsetId: string | null;
  adsetName: string;
  adId: string | null;
  adName: string;
  creativeId: string | null;
  creativeName: string | null;
  dataSource: MediaDataSource;
  mergeKey: string;
  reach: number;
  impressions: number;
  clicksAll: number;
  linkClicks: number;
  spend: number;
  purchases: number;
  purchaseValue: number;
};

const EMPTY_MEDIA_REPORT: MediaReport = {
  summary: {
    spend: 0,
    purchaseValue: 0,
    purchases: 0,
    reach: 0,
    impressions: 0,
    clicksAll: 0,
    linkClicks: 0,
    attributedRoas: 0,
    ctrAll: 0,
    ctrLink: 0,
    cpc: 0,
    cpa: 0,
  },
  dailySeries: [],
  campaigns: [],
  ads: {
    rows: [],
    highlights: {
      bestScale: null,
      creativeReview: null,
      audienceReview: null,
      pauseCandidate: null,
    },
    playbook: {
      scale: [],
      creativeReview: [],
      audienceReview: [],
      pause: [],
      maintain: [],
    },
    analysis: {
      narrativeTitle: "Amostra insuficiente",
      narrativeBody: "Ainda não há massa suficiente para priorizar anúncios e criativos com segurança.",
      nextActions: [],
      topScale: null,
      topCreativeReview: null,
      topAudienceReview: null,
      topPause: null,
    },
  },
  commandRoom: {
    bestScale: null,
    priorityReview: null,
    narrative: "Ainda não há investimento suficiente no período para formar uma leitura gerencial da mídia.",
    bestScaleSummary: null,
    priorityReviewSummary: null,
  },
  highlights: {
    topCampaignBySpend: null,
  },
  signals: {
    attributedRoas: {
      tone: "neutral",
      title: "Amostra insuficiente",
      description: "Ainda não há investimento suficiente no período para leitura confiável.",
    },
    ctrAll: {
      tone: "neutral",
      title: "Amostra insuficiente",
      description: "Ainda não há impressões suficientes para leitura confiável do CTR.",
    },
    ctrLink: {
      tone: "neutral",
      title: "Amostra insuficiente",
      description: "Ainda não há impressões suficientes para leitura confiável do CTR link.",
    },
    cpc: {
      tone: "neutral",
      title: "Amostra insuficiente",
      description: "Ainda não há cliques suficientes para leitura confiável do CPC.",
    },
    cpa: {
      tone: "neutral",
      title: "Amostra insuficiente",
      description: "Ainda não há compras suficientes para leitura confiável do CPA.",
    },
  },
  playbook: {
    scale: {
      title: "Escalar",
      description: "Campanhas com espaço para ganhar verba no recorte.",
      count: 0,
      items: [],
    },
    review: {
      title: "Revisar",
      description: "Campanhas que pedem correção antes de escalar.",
      count: 0,
      items: [],
    },
    monitor: {
      title: "Monitorar",
      description: "Campanhas ainda sem sinal forte para decisão definitiva.",
      count: 0,
      items: [],
    },
  },
  analysis: {
    narrativeTitle: "Amostra insuficiente",
    narrativeBody: "Ainda não há investimento suficiente no período para formar uma leitura gerencial da mídia.",
    nextActions: [],
    topRisk: null,
    topOpportunity: null,
  },
  meta: {
    generatedAt: "",
    from: null,
    to: null,
    mode: "manual_csv",
    manualFallback: false,
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

function mapSummary(source: unknown): MediaReportSummary {
  const payload = (source ?? {}) as Partial<MediaReportSummary>;

  return {
    spend: toNumber(payload.spend),
    purchaseValue: toNumber(payload.purchaseValue),
    purchases: toNumber(payload.purchases),
    reach: toNumber(payload.reach),
    impressions: toNumber(payload.impressions),
    clicksAll: toNumber(payload.clicksAll),
    linkClicks: toNumber(payload.linkClicks),
    attributedRoas: toNumber(payload.attributedRoas),
    ctrAll: toNumber(payload.ctrAll),
    ctrLink: toNumber(payload.ctrLink),
    cpc: toNumber(payload.cpc),
    cpa: toNumber(payload.cpa),
  };
}

function buildPlaybook(campaigns: MediaCampaignReportRow[]) {
  const scaleItems = campaigns.filter((row) => row.action === "scale").slice(0, 6);
  const reviewItems = campaigns.filter((row) => row.action === "review").slice(0, 6);
  const monitorItems = campaigns.filter((row) => row.action === "monitor").slice(0, 6);

  return {
    scale: {
      title: "Escalar",
      description: "Campanhas com retorno e aderência suficientes para receber mais verba com controle.",
      count: campaigns.filter((row) => row.action === "scale").length,
      items: scaleItems,
    },
    review: {
      title: "Revisar",
      description: "Campanhas que estão pressionando o resultado e pedem ajuste de criativo, público ou oferta.",
      count: campaigns.filter((row) => row.action === "review").length,
      items: reviewItems,
    },
    monitor: {
      title: "Monitorar",
      description: "Campanhas ainda em observação, sem sinal forte o bastante para escalar ou cortar.",
      count: campaigns.filter((row) => row.action === "monitor").length,
      items: monitorItems,
    },
  };
}

function buildAnalysis(
  summary: MediaReportSummary,
  _campaigns: MediaCampaignReportRow[],
  bestScale: MediaCampaignReportRow | null,
  priorityReview: MediaCampaignReportRow | null,
) {
  if (summary.spend <= 0) {
    return EMPTY_MEDIA_REPORT.analysis;
  }

  const nextActions: string[] = [];

  if (bestScale) {
    nextActions.push(`Escalar com cuidado a campanha ${bestScale.campaignName} enquanto o ROAS atribuído se mantiver saudável.`);
  }

  if (priorityReview) {
    nextActions.push(`Revisar criativo, CTA e segmentação da campanha ${priorityReview.campaignName} antes de ampliar orçamento.`);
  }

  if (summary.ctrLink < 0.008) {
    nextActions.push("Reforçar promessa criativa e CTA, porque o clique no link ainda está abaixo do piso saudável.");
  }

  if (summary.cpa > 0 && summary.cpa > 120) {
    nextActions.push("Segurar expansão até reduzir o CPA atribuído para uma zona mais confortável.");
  }

  if (!nextActions.length) {
    nextActions.push("Manter observação da distribuição atual e reavaliar após nova janela de tráfego.");
  }

  if (summary.attributedRoas >= 1.5) {
    return {
      narrativeTitle: "Aquisição pronta para pressão controlada",
      narrativeBody:
        "O recorte mostra retorno atribuído saudável e campanhas com base suficiente para crescimento seletivo. A prioridade é aumentar verba só onde já existe aderência de clique e retorno.",
      nextActions,
      topRisk: priorityReview
        ? `A campanha ${priorityReview.campaignName} ainda concentra o principal risco de eficiência.`
        : null,
      topOpportunity: bestScale
        ? `A campanha ${bestScale.campaignName} é a melhor candidata a ganho de verba no momento.`
        : null,
    };
  }

  if (summary.attributedRoas >= 1) {
    return {
      narrativeTitle: "Aquisição em zona de atenção",
      narrativeBody:
        "Há sinal de retorno, mas ainda sem conforto para escalar a conta inteira. O momento pede discriminar melhor quais campanhas sustentam o resultado e quais drenam verba.",
      nextActions,
      topRisk: priorityReview
        ? `A campanha ${priorityReview.campaignName} puxa a revisão prioritária do período.`
        : null,
      topOpportunity: bestScale
        ? `A campanha ${bestScale.campaignName} concentra a melhor oportunidade de aumento controlado.`
        : null,
    };
  }

  return {
    narrativeTitle: "Aquisição pressionada",
    narrativeBody:
      "O retorno atribuído ainda não sustenta expansão. A decisão mais segura é cortar ruído, revisar campanhas mais caras e recuperar eficiência antes de colocar mais verba.",
    nextActions,
    topRisk: priorityReview
      ? `A campanha ${priorityReview.campaignName} aparece como maior risco operacional no recorte.`
      : null,
    topOpportunity: bestScale
      ? `Mesmo com a conta pressionada, ${bestScale.campaignName} ainda é a melhor base para novos testes.`
      : null,
  };
}

function mapDailySeries(source: unknown): MediaReportDailyPoint[] {
  if (!Array.isArray(source)) {
    return [];
  }

  return source.map((item) => {
    const payload = (item ?? {}) as Partial<MediaReportDailyPoint>;
    return {
      date: typeof payload.date === "string" ? payload.date : "",
      spend: toNumber(payload.spend),
      purchaseValue: toNumber(payload.purchaseValue),
      purchases: toNumber(payload.purchases),
      reach: toNumber(payload.reach),
      impressions: toNumber(payload.impressions),
      clicksAll: toNumber(payload.clicksAll),
      linkClicks: toNumber(payload.linkClicks),
      attributedRoas: toNumber(payload.attributedRoas),
      ctrAll: toNumber(payload.ctrAll),
      ctrLink: toNumber(payload.ctrLink),
      cpc: toNumber(payload.cpc),
      cpa: toNumber(payload.cpa),
    };
  });
}

function mapCampaigns(source: unknown): MediaCampaignReportRow[] {
  if (!Array.isArray(source)) {
    return [];
  }

  return source.map((item) => {
    const payload = (item ?? {}) as Partial<MediaCampaignReportRow>;
    const action =
      payload.action === "scale" || payload.action === "review" ? payload.action : "monitor";

    return {
      campaignName:
        typeof payload.campaignName === "string" && payload.campaignName.trim()
          ? payload.campaignName
          : "Campanha sem nome",
      spend: toNumber(payload.spend),
      purchaseValue: toNumber(payload.purchaseValue),
      purchases: toNumber(payload.purchases),
      reach: toNumber(payload.reach),
      impressions: toNumber(payload.impressions),
      clicksAll: toNumber(payload.clicksAll),
      linkClicks: toNumber(payload.linkClicks),
      roas: toNumber(payload.roas),
      ctrAll: toNumber(payload.ctrAll),
      ctrLink: toNumber(payload.ctrLink),
      cpc: toNumber(payload.cpc),
      cpa: toNumber(payload.cpa),
      action,
      summary:
        typeof payload.summary === "string" && payload.summary.trim()
          ? payload.summary
          : EMPTY_MEDIA_REPORT.commandRoom.narrative,
    };
  });
}

function normalizeAdAction(action: unknown): MediaAdAction {
  switch (action) {
    case "scale_budget":
    case "review_creative":
    case "review_audience":
    case "pause":
      return action;
    default:
      return "maintain";
  }
}

function mapAds(source: unknown): MediaAdReportRow[] {
  if (!Array.isArray(source)) {
    return [];
  }

  return source.map((item) => {
    const payload = (item ?? {}) as Partial<MediaAdReportRow>;
    return {
      campaignId:
        payload.campaignId === null || typeof payload.campaignId === "string"
          ? payload.campaignId ?? null
          : null,
      campaignName:
        typeof payload.campaignName === "string" && payload.campaignName.trim()
          ? payload.campaignName
          : "Campanha sem nome",
      adsetId:
        payload.adsetId === null || typeof payload.adsetId === "string"
          ? payload.adsetId ?? null
          : null,
      adsetName:
        typeof payload.adsetName === "string" && payload.adsetName.trim()
          ? payload.adsetName
          : "Sem conjunto",
      adId:
        payload.adId === null || typeof payload.adId === "string" ? payload.adId ?? null : null,
      adName:
        typeof payload.adName === "string" && payload.adName.trim()
          ? payload.adName
          : "Sem anúncio",
      creativeId:
        payload.creativeId === null || typeof payload.creativeId === "string"
          ? payload.creativeId ?? null
          : null,
      creativeName:
        payload.creativeName === null || typeof payload.creativeName === "string"
          ? payload.creativeName ?? null
          : null,
      spend: toNumber(payload.spend),
      purchaseValue: toNumber(payload.purchaseValue),
      purchases: toNumber(payload.purchases),
      reach: toNumber(payload.reach),
      impressions: toNumber(payload.impressions),
      clicksAll: toNumber(payload.clicksAll),
      linkClicks: toNumber(payload.linkClicks),
      roas: toNumber(payload.roas),
      ctrAll: toNumber(payload.ctrAll),
      ctrLink: toNumber(payload.ctrLink),
      cpc: toNumber(payload.cpc),
      cpa: toNumber(payload.cpa),
      confidence: toNumber(payload.confidence),
      action: normalizeAdAction(payload.action),
      summary:
        typeof payload.summary === "string" && payload.summary.trim()
          ? payload.summary
          : "Sem leitura consolidada para este anúncio.",
      reasonCodes: Array.isArray(payload.reasonCodes)
        ? payload.reasonCodes.filter(
            (item): item is string => typeof item === "string" && item.trim().length > 0,
          )
        : [],
    };
  });
}

function mapAd(source: unknown): MediaAdReportRow | null {
  if (!source || typeof source !== "object") {
    return null;
  }

  return mapAds([source])[0] ?? null;
}

function mapCampaign(source: unknown): MediaCampaignReportRow | null {
  if (!source || typeof source !== "object") {
    return null;
  }

  return mapCampaigns([source])[0] ?? null;
}

function mapSignal(source: unknown, fallback: MediaSignal): MediaSignal {
  if (!source || typeof source !== "object") {
    return fallback;
  }

  const payload = source as Partial<MediaSignal>;
  return {
    tone:
      payload.tone === "positive" || payload.tone === "warning" || payload.tone === "neutral"
        ? payload.tone
        : fallback.tone,
    title: typeof payload.title === "string" && payload.title.trim() ? payload.title : fallback.title,
    description:
      typeof payload.description === "string" && payload.description.trim()
        ? payload.description
        : fallback.description,
  };
}

function deriveSignals(summary: MediaReportSummary): MediaSignals {
  if (summary.spend <= 0 && summary.impressions <= 0) {
    return EMPTY_MEDIA_REPORT.signals;
  }

  return {
    attributedRoas: resolveSignal(summary.attributedRoas, {
      positive: 1,
      warning: 0.8,
      positiveTitle: "ROAS em zona saudável",
      warningTitle: "ROAS pressionado",
      positiveDescription: "A receita atribuída já cobre o investimento com folga mínima para operar.",
      warningDescription: "O retorno atribuído ainda está abaixo do patamar desejável antes de escalar verba.",
      neutralDescription: "O ROAS ainda está em observação para o volume investido.",
    }),
    ctrAll: resolveSignal(summary.ctrAll, {
      positive: 0.02,
      warning: 0.012,
      positiveTitle: "CTR geral saudável",
      warningTitle: "CTR geral fraco",
      positiveDescription: "A campanha está gerando clique total em ritmo coerente com a entrega.",
      warningDescription: "O criativo ou a segmentação podem não estar despertando interesse suficiente.",
      neutralDescription: "O CTR geral segue em observação no volume atual.",
    }),
    ctrLink: resolveSignal(summary.ctrLink, {
      positive: 0.01,
      warning: 0.006,
      positiveTitle: "CTR link saudável",
      warningTitle: "CTR link pressionado",
      positiveDescription: "Os anúncios estão levando clique qualificado para o destino em ritmo consistente.",
      warningDescription: "A promessa criativa ou o CTA podem estar fracos para gerar clique no link.",
      neutralDescription: "O CTR link ainda está em observação para o volume atual.",
    }),
    cpc: resolveSignal(summary.cpc, {
      positive: 1.5,
      warning: 2.2,
      direction: "lower",
      positiveTitle: "CPC controlado",
      warningTitle: "CPC elevado",
      positiveDescription: "O custo por clique está controlado para o padrão atual da conta.",
      warningDescription: "O clique está caro demais para o retorno atual. Vale revisar criativo e público.",
      neutralDescription: "O CPC ainda não aponta pressão forte no recorte atual.",
    }),
    cpa: resolveSignal(summary.cpa, {
      positive: 80,
      warning: 120,
      direction: "lower",
      positiveTitle: "CPA controlado",
      warningTitle: "CPA elevado",
      positiveDescription: "O custo por compra atribuída está em uma zona saudável para a leitura da conta.",
      warningDescription: "A compra atribuída está saindo cara demais para sustentar escala com conforto.",
      neutralDescription: "O CPA segue em observação no volume atual.",
    }),
  };
}

function mapSignals(source: unknown, summary: MediaReportSummary): MediaSignals {
  if (!source || typeof source !== "object") {
    return deriveSignals(summary);
  }

  const payload = source as Partial<MediaSignals>;
  return {
    attributedRoas: mapSignal(payload.attributedRoas, EMPTY_MEDIA_REPORT.signals.attributedRoas),
    ctrAll: mapSignal(payload.ctrAll, EMPTY_MEDIA_REPORT.signals.ctrAll),
    ctrLink: mapSignal(payload.ctrLink, EMPTY_MEDIA_REPORT.signals.ctrLink),
    cpc: mapSignal(payload.cpc, EMPTY_MEDIA_REPORT.signals.cpc),
    cpa: mapSignal(payload.cpa, EMPTY_MEDIA_REPORT.signals.cpa),
  };
}

function mapPlaybook(source: unknown, campaigns: MediaCampaignReportRow[]): MediaReport["playbook"] {
  const payload =
    source && typeof source === "object" && !Array.isArray(source)
      ? (source as Partial<MediaReport["playbook"]>)
      : {};

  const pickGroup = (
    group: Partial<MediaReport["playbook"]["scale"]> | undefined,
    fallback: MediaReport["playbook"]["scale"],
  ) => ({
    title: typeof group?.title === "string" && group.title.trim() ? group.title : fallback.title,
    description:
      typeof group?.description === "string" && group.description.trim()
        ? group.description
        : fallback.description,
    count: typeof group?.count === "number" ? group.count : fallback.count,
    items: Array.isArray(group?.items) ? mapCampaigns(group?.items) : fallback.items,
  });

  const fallback = buildPlaybook(campaigns);
  return {
    scale: pickGroup(payload.scale, fallback.scale),
    review: pickGroup(payload.review, fallback.review),
    monitor: pickGroup(payload.monitor, fallback.monitor),
  };
}

function mapAnalysis(source: unknown, fallback: MediaReport["analysis"]): MediaReport["analysis"] {
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    return fallback;
  }

  const payload = source as Partial<MediaReport["analysis"]>;
  return {
    narrativeTitle:
      typeof payload.narrativeTitle === "string" && payload.narrativeTitle.trim()
        ? payload.narrativeTitle
        : fallback.narrativeTitle,
    narrativeBody:
      typeof payload.narrativeBody === "string" && payload.narrativeBody.trim()
        ? payload.narrativeBody
        : fallback.narrativeBody,
    nextActions: Array.isArray(payload.nextActions)
      ? payload.nextActions.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      : fallback.nextActions,
    topRisk:
      payload.topRisk === null || typeof payload.topRisk === "string" ? payload.topRisk : fallback.topRisk,
    topOpportunity:
      payload.topOpportunity === null || typeof payload.topOpportunity === "string"
        ? payload.topOpportunity
        : fallback.topOpportunity,
  };
}

export function normalizeMediaReportPayload(source: unknown): MediaReport {
  const payload = (source ?? {}) as Partial<MediaReport>;
  const summary = mapSummary(payload.summary);
  const campaigns = mapCampaigns(payload.campaigns);
  const playbook = mapPlaybook(payload.playbook, campaigns);
  const analysis = mapAnalysis(
    payload.analysis,
    buildAnalysis(
      summary,
      campaigns,
      mapCampaign(payload.commandRoom?.bestScale),
      mapCampaign(payload.commandRoom?.priorityReview),
    ),
  );

  return {
    summary,
    dailySeries: mapDailySeries(payload.dailySeries),
    campaigns,
    ads: {
      rows: mapAds(payload.ads?.rows),
      highlights: {
        bestScale: mapAd(payload.ads?.highlights?.bestScale),
        creativeReview: mapAd(payload.ads?.highlights?.creativeReview),
        audienceReview: mapAd(payload.ads?.highlights?.audienceReview),
        pauseCandidate: mapAd(payload.ads?.highlights?.pauseCandidate),
      },
      playbook: {
        scale: mapAds(payload.ads?.playbook?.scale),
        creativeReview: mapAds(payload.ads?.playbook?.creativeReview),
        audienceReview: mapAds(payload.ads?.playbook?.audienceReview),
        pause: mapAds(payload.ads?.playbook?.pause),
        maintain: mapAds(payload.ads?.playbook?.maintain),
      },
      analysis: {
        narrativeTitle:
          typeof payload.ads?.analysis?.narrativeTitle === "string" &&
          payload.ads.analysis.narrativeTitle.trim()
            ? payload.ads.analysis.narrativeTitle
            : EMPTY_MEDIA_REPORT.ads.analysis.narrativeTitle,
        narrativeBody:
          typeof payload.ads?.analysis?.narrativeBody === "string" &&
          payload.ads.analysis.narrativeBody.trim()
            ? payload.ads.analysis.narrativeBody
            : EMPTY_MEDIA_REPORT.ads.analysis.narrativeBody,
        nextActions: Array.isArray(payload.ads?.analysis?.nextActions)
          ? payload.ads.analysis.nextActions.filter(
              (item): item is string => typeof item === "string" && item.trim().length > 0,
            )
          : EMPTY_MEDIA_REPORT.ads.analysis.nextActions,
        topScale:
          payload.ads?.analysis?.topScale === null ||
          typeof payload.ads?.analysis?.topScale === "string"
            ? payload.ads.analysis.topScale ?? null
            : null,
        topCreativeReview:
          payload.ads?.analysis?.topCreativeReview === null ||
          typeof payload.ads?.analysis?.topCreativeReview === "string"
            ? payload.ads.analysis.topCreativeReview ?? null
            : null,
        topAudienceReview:
          payload.ads?.analysis?.topAudienceReview === null ||
          typeof payload.ads?.analysis?.topAudienceReview === "string"
            ? payload.ads.analysis.topAudienceReview ?? null
            : null,
        topPause:
          payload.ads?.analysis?.topPause === null ||
          typeof payload.ads?.analysis?.topPause === "string"
            ? payload.ads.analysis.topPause ?? null
            : null,
      },
    },
    commandRoom: {
      bestScale: mapCampaign(payload.commandRoom?.bestScale),
      priorityReview: mapCampaign(payload.commandRoom?.priorityReview),
      narrative:
        typeof payload.commandRoom?.narrative === "string" &&
        payload.commandRoom.narrative.trim()
          ? payload.commandRoom.narrative
          : EMPTY_MEDIA_REPORT.commandRoom.narrative,
      bestScaleSummary:
        payload.commandRoom?.bestScaleSummary === null ||
        typeof payload.commandRoom?.bestScaleSummary === "string"
          ? payload.commandRoom.bestScaleSummary ?? null
          : null,
      priorityReviewSummary:
        payload.commandRoom?.priorityReviewSummary === null ||
        typeof payload.commandRoom?.priorityReviewSummary === "string"
          ? payload.commandRoom.priorityReviewSummary ?? null
          : null,
    },
    highlights: {
      topCampaignBySpend: mapCampaign(payload.highlights?.topCampaignBySpend) ?? campaigns[0] ?? null,
    },
    signals: mapSignals(payload.signals, summary),
    playbook,
    analysis,
    meta: {
      generatedAt:
        typeof payload.meta?.generatedAt === "string" ? payload.meta.generatedAt : new Date().toISOString(),
      from:
        payload.meta?.from === undefined || payload.meta?.from === null
          ? null
          : String(payload.meta.from),
      to:
        payload.meta?.to === undefined || payload.meta?.to === null
          ? null
          : String(payload.meta.to),
      mode:
        typeof payload.meta?.mode === "string" && payload.meta.mode.trim()
          ? payload.meta.mode
          : "manual_csv",
      manualFallback: Boolean(payload.meta?.manualFallback),
      hasData:
        payload.meta?.hasData === undefined
          ? campaigns.length > 0 || mapDailySeries(payload.dailySeries).length > 0
          : Boolean(payload.meta.hasData),
    },
  };
}

function toNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toDataSource(delivery: string | null): MediaDataSource {
  return delivery?.trim().toLowerCase() === "api" ? "api" : "manual_csv";
}

function toMetricDate(row: RawMediaRow) {
  return row.report_start ?? row.date;
}

function toEffectiveRows(rows: RawMediaRow[], mode: string, manualFallback: boolean) {
  const normalized = rows
    .filter((row) => !row.is_ignored)
    .map<EffectiveMediaRow | null>((row) => {
      const metricDate = toMetricDate(row);
      if (!metricDate) {
        return null;
      }

      const campaignName = row.campaign_name?.trim() || "Campanha sem nome";
      const adsetName = row.adset_name?.trim() || "Sem conjunto";
      const adName = row.ad_name?.trim() || "Sem anúncio";
      const dataSource = toDataSource(row.delivery);

      return {
        id: row.id,
        metricDate,
        campaignId: row.campaign_id?.trim() || null,
        campaignName,
        adsetId: row.adset_id?.trim() || null,
        adsetName,
        adId: row.ad_id?.trim() || null,
        adName,
        creativeId: row.creative_id?.trim() || null,
        creativeName: row.creative_name?.trim() || null,
        dataSource,
        mergeKey: [
          metricDate,
          row.campaign_id?.trim() || campaignName,
          row.adset_id?.trim() || adsetName,
          row.ad_id?.trim() || adName,
          row.creative_id?.trim() || row.creative_name?.trim() || "",
        ].join("::"),
        reach: toNumber(row.reach),
        impressions: toNumber(row.impressions),
        clicksAll: toNumber(row.clicks_all),
        linkClicks: toNumber(row.link_clicks),
        spend: toNumber(row.spend),
        purchases: toNumber(row.purchases),
        purchaseValue: toNumber(row.conversion_value),
      };
    })
    .filter((row): row is EffectiveMediaRow => row !== null);

  if (mode === "disabled") {
    return [];
  }

  if (mode !== "api") {
    return normalized.filter((row) => row.dataSource === "manual_csv");
  }

  const apiRows = normalized.filter((row) => row.dataSource === "api");
  if (!manualFallback) {
    return apiRows;
  }

  const apiMergeKeys = new Set(apiRows.map((row) => row.mergeKey));
  const fallbackRows = normalized.filter((row) => {
    if (row.dataSource !== "manual_csv") {
      return false;
    }

    if (!apiRows.length) {
      return true;
    }

    return !apiMergeKeys.has(row.mergeKey);
  });

  return [...apiRows, ...fallbackRows];
}

function buildSummary(rows: EffectiveMediaRow[]): MediaReportSummary {
  const totals = rows.reduce(
    (accumulator, row) => {
      accumulator.spend += row.spend;
      accumulator.purchaseValue += row.purchaseValue;
      accumulator.purchases += row.purchases;
      accumulator.reach += row.reach;
      accumulator.impressions += row.impressions;
      accumulator.clicksAll += row.clicksAll;
      accumulator.linkClicks += row.linkClicks;
      return accumulator;
    },
    {
      spend: 0,
      purchaseValue: 0,
      purchases: 0,
      reach: 0,
      impressions: 0,
      clicksAll: 0,
      linkClicks: 0,
    },
  );

  return {
    ...totals,
    attributedRoas: totals.spend > 0 ? totals.purchaseValue / totals.spend : 0,
    ctrAll: totals.impressions > 0 ? totals.clicksAll / totals.impressions : 0,
    ctrLink: totals.impressions > 0 ? totals.linkClicks / totals.impressions : 0,
    cpc: totals.linkClicks > 0 ? totals.spend / totals.linkClicks : 0,
    cpa: totals.purchases > 0 ? totals.spend / totals.purchases : 0,
  };
}

function buildDailySeries(rows: EffectiveMediaRow[]): MediaReportDailyPoint[] {
  const byDate = new Map<string, MediaReportDailyPoint>();

  rows.forEach((row) => {
    const current = byDate.get(row.metricDate) ?? {
      date: row.metricDate,
      spend: 0,
      purchaseValue: 0,
      purchases: 0,
      reach: 0,
      impressions: 0,
      clicksAll: 0,
      linkClicks: 0,
      attributedRoas: 0,
      ctrAll: 0,
      ctrLink: 0,
      cpc: 0,
      cpa: 0,
    };

    current.spend += row.spend;
    current.purchaseValue += row.purchaseValue;
    current.purchases += row.purchases;
    current.reach += row.reach;
    current.impressions += row.impressions;
    current.clicksAll += row.clicksAll;
    current.linkClicks += row.linkClicks;
    byDate.set(row.metricDate, current);
  });

  return [...byDate.values()]
    .sort((left, right) => left.date.localeCompare(right.date))
    .map((row) => ({
      ...row,
      attributedRoas: row.spend > 0 ? row.purchaseValue / row.spend : 0,
      ctrAll: row.impressions > 0 ? row.clicksAll / row.impressions : 0,
      ctrLink: row.impressions > 0 ? row.linkClicks / row.impressions : 0,
      cpc: row.linkClicks > 0 ? row.spend / row.linkClicks : 0,
      cpa: row.purchases > 0 ? row.spend / row.purchases : 0,
    }));
}

function resolveCampaignAction(row: Omit<MediaCampaignReportRow, "action" | "summary">): MediaCampaignAction {
  if (row.spend >= 150 && row.roas >= 1.6 && row.ctrAll >= 0.025) {
    return "scale";
  }

  if (row.spend >= 150 && (row.roas < 1 || (row.purchases === 0 && row.clicksAll >= 40))) {
    return "review";
  }

  return "monitor";
}

function resolveCampaignSummary(row: MediaCampaignReportRow) {
  if (row.action === "scale") {
    return "Há retorno e aderência suficientes para considerar aumento gradual de verba.";
  }

  if (row.action === "review") {
    return "A campanha está consumindo verba sem retorno proporcional. Vale revisar criativo, público ou distribuição.";
  }

  return "O desempenho está em observação. Ainda vale acompanhar antes de mexer na verba.";
}

function resolveSignal(
  value: number,
  rules: {
    positive: number;
    warning: number;
    direction?: "higher" | "lower";
    positiveTitle: string;
    warningTitle: string;
    positiveDescription: string;
    warningDescription: string;
    neutralDescription: string;
  },
): MediaSignal {
  const direction = rules.direction ?? "higher";
  const isPositive =
    direction === "higher" ? value >= rules.positive : value > 0 && value <= rules.positive;
  const isWarning =
    direction === "higher" ? value > 0 && value < rules.warning : value > rules.warning;

  if (isPositive) {
    return {
      tone: "positive",
      title: rules.positiveTitle,
      description: rules.positiveDescription,
    };
  }

  if (isWarning) {
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

function buildSignals(summary: MediaReportSummary): MediaSignals {
  if (summary.spend <= 0 && summary.impressions <= 0) {
    return EMPTY_MEDIA_REPORT.signals;
  }

  return {
    attributedRoas: resolveSignal(summary.attributedRoas, {
      positive: 1,
      warning: 0.8,
      positiveTitle: "ROAS em zona saudável",
      warningTitle: "ROAS pressionado",
      positiveDescription: "A receita atribuída já cobre o investimento com folga mínima para operar.",
      warningDescription: "O retorno atribuído ainda está abaixo do patamar desejável antes de escalar verba.",
      neutralDescription: "O ROAS ainda está em observação para o volume investido.",
    }),
    ctrAll: resolveSignal(summary.ctrAll, {
      positive: 0.02,
      warning: 0.012,
      positiveTitle: "CTR geral saudável",
      warningTitle: "CTR geral fraco",
      positiveDescription: "A campanha está gerando clique total em ritmo coerente com a entrega.",
      warningDescription: "O criativo ou a segmentação podem não estar despertando interesse suficiente.",
      neutralDescription: "O CTR geral segue em observação no volume atual.",
    }),
    ctrLink: resolveSignal(summary.ctrLink, {
      positive: 0.01,
      warning: 0.006,
      positiveTitle: "CTR link saudável",
      warningTitle: "CTR link pressionado",
      positiveDescription: "Os anúncios estão levando clique qualificado para o destino em ritmo consistente.",
      warningDescription: "A promessa criativa ou o CTA podem estar fracos para gerar clique no link.",
      neutralDescription: "O CTR link ainda está em observação para o volume atual.",
    }),
    cpc: resolveSignal(summary.cpc, {
      positive: 1.5,
      warning: 2.2,
      direction: "lower",
      positiveTitle: "CPC controlado",
      warningTitle: "CPC elevado",
      positiveDescription: "O custo por clique está controlado para o padrão atual da conta.",
      warningDescription: "O clique está caro demais para o retorno atual. Vale revisar criativo e público.",
      neutralDescription: "O CPC ainda não aponta pressão forte no recorte atual.",
    }),
    cpa: resolveSignal(summary.cpa, {
      positive: 80,
      warning: 120,
      direction: "lower",
      positiveTitle: "CPA controlado",
      warningTitle: "CPA elevado",
      positiveDescription: "O custo por compra atribuída está em uma zona saudável para a leitura da conta.",
      warningDescription: "A compra atribuída está saindo cara demais para sustentar escala com conforto.",
      neutralDescription: "O CPA segue em observação no volume atual.",
    }),
  };
}

function buildCampaigns(rows: EffectiveMediaRow[]): MediaCampaignReportRow[] {
  const byCampaign = new Map<string, Omit<MediaCampaignReportRow, "action" | "summary">>();

  rows.forEach((row) => {
    const current = byCampaign.get(row.campaignName) ?? {
      campaignName: row.campaignName,
      spend: 0,
      purchaseValue: 0,
      purchases: 0,
      reach: 0,
      impressions: 0,
      clicksAll: 0,
      linkClicks: 0,
      roas: 0,
      ctrAll: 0,
      ctrLink: 0,
      cpc: 0,
      cpa: 0,
    };

    current.spend += row.spend;
    current.purchaseValue += row.purchaseValue;
    current.purchases += row.purchases;
    current.reach += row.reach;
    current.impressions += row.impressions;
    current.clicksAll += row.clicksAll;
    current.linkClicks += row.linkClicks;
    byCampaign.set(row.campaignName, current);
  });

  return [...byCampaign.values()]
    .map((row) => {
      const enriched = {
        ...row,
        roas: row.spend > 0 ? row.purchaseValue / row.spend : 0,
        ctrAll: row.impressions > 0 ? row.clicksAll / row.impressions : 0,
        ctrLink: row.impressions > 0 ? row.linkClicks / row.impressions : 0,
        cpc: row.linkClicks > 0 ? row.spend / row.linkClicks : 0,
        cpa: row.purchases > 0 ? row.spend / row.purchases : 0,
      };
      const action = resolveCampaignAction(enriched);
      return {
        ...enriched,
        action,
        summary: resolveCampaignSummary({ ...enriched, action, summary: "" }),
      };
    })
    .sort((left, right) => {
      if (right.spend !== left.spend) {
        return right.spend - left.spend;
      }

      return left.campaignName.localeCompare(right.campaignName);
    });
}

function buildAdConfidence(
  row: Omit<
    MediaAdReportRow,
    "action" | "summary" | "confidence" | "reasonCodes" | "creativeId" | "creativeName"
  >,
) {
  let score = 0;
  if (row.spend >= 80) score += 0.25;
  if (row.impressions >= 4000) score += 0.2;
  if (row.linkClicks >= 20) score += 0.25;
  if (row.purchases >= 2) score += 0.3;
  return Math.min(1, score);
}

function resolveAdDecision(
  row: Omit<
    MediaAdReportRow,
    "action" | "summary" | "confidence" | "reasonCodes" | "creativeId" | "creativeName"
  >,
): { action: MediaAdAction; reasonCodes: string[]; summary: string; confidence: number } {
  const confidence = buildAdConfidence(row);
  const reasonCodes: string[] = [];

  if (row.roas >= 1.7 && row.ctrLink >= 0.009 && row.purchases >= 2 && row.spend >= 80) {
    reasonCodes.push("roas_forte", "cta_funcionando", "compra_confirmada");
    return {
      action: "scale_budget",
      confidence,
      reasonCodes,
      summary: "O anúncio já combina retorno, clique qualificado e compra suficiente para receber mais verba com controle.",
    };
  }

  if (row.spend >= 160 && row.purchases === 0 && row.linkClicks >= 35) {
    reasonCodes.push("sem_compra_com_volume", "consumo_sem_retorno");
    return {
      action: "pause",
      confidence,
      reasonCodes,
      summary: "O anúncio já consumiu verba e clique demais sem compra atribuída. Vale pausar até revisar a proposta.",
    };
  }

  if (row.spend >= 90 && row.ctrLink < 0.006) {
    reasonCodes.push("ctr_link_baixo", "criativo_ou_cta_fraco");
    return {
      action: "review_creative",
      confidence,
      reasonCodes,
      summary: "O anúncio está entregando, mas ainda gera pouco clique qualificado. O criativo e o CTA pedem revisão.",
    };
  }

  if (row.spend >= 90 && row.ctrLink >= 0.006 && row.roas < 1) {
    reasonCodes.push("clique_sem_retorno", "publico_ou_oferta_pressionados");
    return {
      action: "review_audience",
      confidence,
      reasonCodes,
      summary: "O anúncio chama clique, mas o retorno não acompanha. Vale revisar público, promessa e destino.",
    };
  }

  reasonCodes.push("amostra_em_observacao");
  return {
    action: "maintain",
    confidence,
    reasonCodes,
    summary: "O anúncio ainda está em observação. Mantenha a distribuição e reavalie com a próxima janela.",
  };
}

function buildAds(rows: EffectiveMediaRow[]): MediaReport["ads"] {
  const byAd = new Map<
    string,
    Omit<
      MediaAdReportRow,
      "action" | "summary" | "confidence" | "reasonCodes" | "creativeId" | "creativeName"
    > & {
      creativeId: string | null;
      creativeName: string | null;
    }
  >();

  rows.forEach((row) => {
    const key = [
      row.campaignId || row.campaignName,
      row.adsetId || row.adsetName,
      row.adId || row.adName,
      row.creativeId || row.creativeName || "",
    ].join("::");
    const current = byAd.get(key) ?? {
      campaignId: row.campaignId,
      campaignName: row.campaignName,
      adsetId: row.adsetId,
      adsetName: row.adsetName,
      adId: row.adId,
      adName: row.adName,
      creativeId: row.creativeId,
      creativeName: row.creativeName,
      spend: 0,
      purchaseValue: 0,
      purchases: 0,
      reach: 0,
      impressions: 0,
      clicksAll: 0,
      linkClicks: 0,
      roas: 0,
      ctrAll: 0,
      ctrLink: 0,
      cpc: 0,
      cpa: 0,
    };

    current.creativeId = current.creativeId ?? row.creativeId ?? null;
    current.creativeName = current.creativeName ?? row.creativeName ?? null;
    current.spend += row.spend;
    current.purchaseValue += row.purchaseValue;
    current.purchases += row.purchases;
    current.reach += row.reach;
    current.impressions += row.impressions;
    current.clicksAll += row.clicksAll;
    current.linkClicks += row.linkClicks;
    byAd.set(key, current);
  });

  const rowsWithDecision = [...byAd.values()]
    .map((row) => {
      const normalized = {
        ...row,
        roas: row.spend > 0 ? row.purchaseValue / row.spend : 0,
        ctrAll: row.impressions > 0 ? row.clicksAll / row.impressions : 0,
        ctrLink: row.impressions > 0 ? row.linkClicks / row.impressions : 0,
        cpc: row.linkClicks > 0 ? row.spend / row.linkClicks : 0,
        cpa: row.purchases > 0 ? row.spend / row.purchases : 0,
      };
      const decision = resolveAdDecision(normalized);
      return {
        ...normalized,
        creativeId: normalized.creativeId ?? null,
        creativeName: normalized.creativeName ?? null,
        ...decision,
      } satisfies MediaAdReportRow;
    })
    .sort((left, right) => {
      if (right.spend !== left.spend) return right.spend - left.spend;
      return left.adName.localeCompare(right.adName);
    });

  const byAction = (action: MediaAdAction) => rowsWithDecision.filter((row) => row.action === action);
  const bestScale =
    [...byAction("scale_budget")].sort((left, right) => right.roas - left.roas || right.spend - left.spend)[0] ??
    null;
  const creativeReview =
    [...byAction("review_creative")].sort((left, right) => right.spend - left.spend || left.ctrLink - right.ctrLink)[0] ??
    null;
  const audienceReview =
    [...byAction("review_audience")].sort((left, right) => right.spend - left.spend || left.roas - right.roas)[0] ??
    null;
  const pauseCandidate =
    [...byAction("pause")].sort((left, right) => right.spend - left.spend || left.roas - right.roas)[0] ??
    null;

  const nextActions: string[] = [];
  if (bestScale) nextActions.push(`Ampliar verba com controle no anúncio ${bestScale.adName}.`);
  if (creativeReview) nextActions.push(`Revisar criativo e CTA do anúncio ${creativeReview.adName}.`);
  if (audienceReview) nextActions.push(`Revisar público e promessa do anúncio ${audienceReview.adName}.`);
  if (pauseCandidate) nextActions.push(`Segurar o anúncio ${pauseCandidate.adName} até corrigir a eficiência.`);

  const narrativeTitle =
    bestScale || creativeReview || audienceReview || pauseCandidate
      ? "Leitura operacional de anúncios"
      : EMPTY_MEDIA_REPORT.ads.analysis.narrativeTitle;
  const narrativeBody =
    bestScale || creativeReview || audienceReview || pauseCandidate
      ? "A decisão por anúncio já permite separar com mais clareza o que merece verba, revisão criativa, ajuste de público ou pausa."
      : EMPTY_MEDIA_REPORT.ads.analysis.narrativeBody;

  return {
    rows: rowsWithDecision,
    highlights: {
      bestScale,
      creativeReview,
      audienceReview,
      pauseCandidate,
    },
    playbook: {
      scale: byAction("scale_budget").slice(0, 8),
      creativeReview: byAction("review_creative").slice(0, 8),
      audienceReview: byAction("review_audience").slice(0, 8),
      pause: byAction("pause").slice(0, 8),
      maintain: byAction("maintain").slice(0, 8),
    },
    analysis: {
      narrativeTitle,
      narrativeBody,
      nextActions,
      topScale: bestScale ? `Escalar ${bestScale.adName}` : null,
      topCreativeReview: creativeReview ? `Revisar criativo de ${creativeReview.adName}` : null,
      topAudienceReview: audienceReview ? `Revisar público de ${audienceReview.adName}` : null,
      topPause: pauseCandidate ? `Pausar ${pauseCandidate.adName}` : null,
    },
  };
}

export function buildMediaReport(
  rows: RawMediaRow[],
  options?: {
    mode?: string | null;
    manualFallback?: boolean | null;
    from?: string | null;
    to?: string | null;
  },
): MediaReport {
  const scopedRows = rows.filter((row) => {
    const metricDate = toMetricDate(row);
    if (!metricDate) {
      return false;
    }

    if (options?.from && metricDate < options.from) {
      return false;
    }

    if (options?.to && metricDate > options.to) {
      return false;
    }

    return true;
  });

  const effectiveRows = toEffectiveRows(
    scopedRows,
    options?.mode ?? "manual_csv",
    options?.manualFallback ?? false,
  );

  const summary = buildSummary(effectiveRows);
  const campaigns = buildCampaigns(effectiveRows);
  const bestScale =
    [...campaigns]
      .filter((row) => row.spend > 0)
      .sort((left, right) => {
        if (right.roas !== left.roas) {
          return right.roas - left.roas;
        }
        if (right.spend !== left.spend) {
          return right.spend - left.spend;
        }
        return left.campaignName.localeCompare(right.campaignName);
      })[0] ?? null;
  const priorityReview =
    campaigns
      .filter((row) => row.action === "review")
      .sort((left, right) => {
        if (right.spend !== left.spend) {
          return right.spend - left.spend;
        }
        return left.campaignName.localeCompare(right.campaignName);
      })[0] ?? null;

  const narrative =
    summary.spend <= 0
      ? EMPTY_MEDIA_REPORT.commandRoom.narrative
      : summary.attributedRoas >= 1.5
        ? "A mídia já mostra retorno atribuído saudável. O foco deve ser encontrar as campanhas que sustentam esse padrão para escalar com cuidado."
        : summary.attributedRoas >= 1
          ? "O período está em zona de atenção. Há sinal de retorno, mas ainda não de forma confortável para subir verba sem revisar eficiência."
          : "O retorno atribuído ainda está pressionado. Antes de aumentar investimento, a prioridade deve ser corrigir as campanhas que consomem mais verba e devolvem menos.";
  const playbook = buildPlaybook(campaigns);
  const analysis = buildAnalysis(summary, campaigns, bestScale, priorityReview);
  const ads = buildAds(effectiveRows);

  return {
    summary,
    dailySeries: buildDailySeries(effectiveRows),
    campaigns,
    ads,
    commandRoom: {
      bestScale,
      priorityReview,
      narrative,
      bestScaleSummary: bestScale
        ? `${bestScale.roas.toFixed(2)}x de ROAS com ${percentFormatter.format(bestScale.ctrAll)} de CTR. É a candidata mais clara para aumento gradual de verba.`
        : "Ainda não há dados suficientes para recomendar escala.",
      priorityReviewSummary: priorityReview
        ? `${currencyFormatter.format(priorityReview.spend)} investidos com ${priorityReview.roas.toFixed(2)}x de ROAS. Vale revisar criativo, público ou destino antes de seguir distribuindo verba.`
        : "Nenhuma campanha relevante apareceu com sinal forte de revisão nesta janela.",
    },
    highlights: {
      topCampaignBySpend: campaigns[0] ?? null,
    },
    signals: buildSignals(summary),
    playbook,
    analysis,
    meta: {
      generatedAt: new Date().toISOString(),
      from: options?.from ?? null,
      to: options?.to ?? null,
      mode: options?.mode ?? "manual_csv",
      manualFallback: Boolean(options?.manualFallback),
      hasData: effectiveRows.length > 0,
    },
  };
}
