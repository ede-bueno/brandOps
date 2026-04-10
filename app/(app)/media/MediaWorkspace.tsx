"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EmptyState } from "@/components/EmptyState";
import { useBrandOps } from "@/components/BrandOpsProvider";
import {
  OperationalMetric,
  OperationalMetricStrip,
  ModeEntryCard,
  PageHeader,
  SectionHeading,
  SurfaceCard,
  WorkspaceRailSection,
  WorkspaceSplitLayout,
  WorkspaceTabs,
} from "@/components/ui-shell";
import { fetchMediaReport } from "@/lib/brandops/database";
import {
  currencyFormatter,
  formatCompactDate,
  integerFormatter,
  percentFormatter,
} from "@/lib/brandops/format";
import { APP_ROUTES } from "@/lib/brandops/routes";
import type { MediaAdAction, MediaCampaignAction, MediaReport, MediaSignal } from "@/lib/brandops/types";

type MediaView = "home" | "executive" | "trend" | "campaigns" | "ads";

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
    narrative: "Ainda não há investimento suficiente no período para indicar escala ou revisão com confiança.",
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
      description: "Falta investimento suficiente no período para uma leitura confiável.",
    },
    ctrAll: {
      tone: "neutral",
      title: "Amostra insuficiente",
      description: "Faltam impressões suficientes para ler o CTR com confiança.",
    },
    ctrLink: {
      tone: "neutral",
      title: "Amostra insuficiente",
      description: "Faltam impressões suficientes para ler o CTR link com confiança.",
    },
    cpc: {
      tone: "neutral",
      title: "Amostra insuficiente",
      description: "Faltam cliques suficientes para ler o CPC com confiança.",
    },
    cpa: {
      tone: "neutral",
      title: "Amostra insuficiente",
      description: "Faltam compras suficientes para ler o CPA com confiança.",
    },
  },
  playbook: {
    scale: { title: "Escalar", description: "", count: 0, items: [] },
    review: { title: "Revisar", description: "", count: 0, items: [] },
    monitor: { title: "Monitorar", description: "", count: 0, items: [] },
  },
  analysis: {
    narrativeTitle: "Amostra insuficiente",
    narrativeBody: "Ainda não há sinais suficientes para decidir escala, revisão ou pausa com segurança.",
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

function signalAccent(signal: MediaSignal): "default" | "positive" | "warning" {
  if (signal.tone === "positive") return "positive";
  if (signal.tone === "warning") return "warning";
  return "default";
}

function actionLabel(action: MediaCampaignAction) {
  switch (action) {
    case "scale":
      return "Escalar";
    case "review":
      return "Revisar";
    default:
      return "Monitorar";
  }
}

function actionClassName(action: MediaCampaignAction) {
  switch (action) {
    case "scale":
      return "bg-primary-container/45 text-primary border-primary/20";
    case "review":
      return "bg-tertiary-container/45 text-tertiary border-tertiary/20";
    default:
      return "bg-surface-container-high text-on-surface-variant border-outline";
  }
}

function adActionLabel(action: MediaAdAction) {
  switch (action) {
    case "scale_budget":
      return "Escalar";
    case "review_creative":
      return "Criativo";
    case "review_audience":
      return "Público";
    case "pause":
      return "Pausar";
    default:
      return "Manter";
  }
}

function adActionClassName(action: MediaAdAction) {
  switch (action) {
    case "scale_budget":
      return "bg-primary-container/45 text-primary border-primary/20";
    case "review_creative":
      return "bg-tertiary-container/45 text-tertiary border-tertiary/20";
    case "review_audience":
      return "bg-secondary-container/45 text-secondary border-secondary/20";
    case "pause":
      return "bg-error-container/45 text-error border-error/20";
    default:
      return "bg-surface-container-high text-on-surface-variant border-outline";
  }
}

function adDisplayPrimary(row: MediaReport["ads"]["rows"][number]) {
  return row.adName;
}

function adDisplaySecondary(row: MediaReport["ads"]["rows"][number]) {
  if (!row.creativeName || row.creativeName.trim() === "" || row.creativeName === row.adName) {
    return null;
  }

  return `Criativo: ${row.creativeName}`;
}

function adReasonLabel(reasonCode: string) {
  switch (reasonCode) {
    case "roas_forte":
      return "ROAS forte";
    case "cta_funcionando":
      return "CTA responde";
    case "compra_confirmada":
      return "Compra confirmada";
    case "sem_compra_com_volume":
      return "Volume sem compra";
    case "consumo_sem_retorno":
      return "Consumo sem retorno";
    case "ctr_link_baixo":
      return "CTR link baixo";
    case "criativo_ou_cta_fraco":
      return "Criativo/CTA";
    case "clique_sem_retorno":
      return "Clique sem retorno";
    case "publico_ou_oferta_pressionados":
      return "Publico/oferta";
    case "amostra_em_observacao":
      return "Em observacao";
    default:
      return reasonCode.replace(/_/g, " ");
  }
}

function AdReasonChips({
  reasonCodes,
}: {
  reasonCodes: string[];
}) {
  if (!reasonCodes.length) {
    return null;
  }

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {reasonCodes.slice(0, 3).map((reasonCode) => (
        <span
          key={reasonCode}
          className="atlas-compact-badge bg-surface-container-high text-on-surface-variant border-outline"
        >
          {adReasonLabel(reasonCode)}
        </span>
      ))}
    </div>
  );
}

function MediaMiniMetric({
  label,
  value,
  helper,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  helper: ReactNode;
  tone?: "default" | "positive" | "warning" | "info";
}) {
  return (
    <article className="atlas-media-mini-card" data-tone={tone}>
      <span className="atlas-media-mini-label">{label}</span>
      <strong className="atlas-media-mini-value">{value}</strong>
      <span className="atlas-media-mini-help">{helper}</span>
    </article>
  );
}

export function MediaWorkspace({
  forcedMode,
}: {
  forcedMode?: MediaView;
}) {
  const searchParams = useSearchParams();
  const routeMode = searchParams?.get("mode") ?? null;
  const pageMode: MediaView =
    forcedMode ??
    (routeMode === "executive" || routeMode === "trend" || routeMode === "campaigns" || routeMode === "ads"
      ? routeMode
      : "home");
  const view = pageMode === "home" ? null : pageMode;
  const [report, setReport] = useState<MediaReport>(EMPTY_MEDIA_REPORT);
  const [isReportLoading, setIsReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const {
    activeBrand,
    activeBrandId,
    brands,
    periodRange,
    selectedPeriodLabel,
    isLoading: isDatasetLoading,
  } = useBrandOps();

  const selectedBrandName =
    activeBrand?.name ??
    brands.find((brand) => brand.id === activeBrandId)?.name ??
    "Loja";

  useEffect(() => {
    if (!activeBrandId) {
      setReport(EMPTY_MEDIA_REPORT);
      setReportError(null);
      setIsReportLoading(false);
      return;
    }

    const currentBrandId: string = activeBrandId;
    let cancelled = false;

    async function loadReport() {
      setIsReportLoading(true);
      setReportError(null);

      try {
        const nextReport = await fetchMediaReport(
          currentBrandId,
          periodRange?.start ?? null,
          periodRange?.end ?? null,
        );

        if (!cancelled) {
          setReport(nextReport);
        }
      } catch (error) {
        if (!cancelled) {
          setReport(EMPTY_MEDIA_REPORT);
          setReportError(
            error instanceof Error
              ? error.message
              : "Não foi possível consolidar o relatório de mídia.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsReportLoading(false);
        }
      }
    }

    void loadReport();
    return () => {
      cancelled = true;
    };
  }, [activeBrandId, periodRange?.end, periodRange?.start]);

  const summary = report.summary;
  const campaigns = report.campaigns;
  const bestScale = report.commandRoom.bestScale;
  const priorityReview = report.commandRoom.priorityReview;
  const topCampaignBySpend = report.highlights.topCampaignBySpend;
  const signals = report.signals;
  const trendData = report.dailySeries;
  const playbook = report.playbook;
  const analysis = report.analysis;
  const primaryAction = analysis.nextActions[0] ?? null;
  const pageTitle =
    pageMode === "home"
      ? "Mídia e performance"
      : pageMode === "executive"
        ? "Mídia · Visão executiva"
        : pageMode === "trend"
          ? "Mídia · Radar"
          : pageMode === "campaigns"
            ? "Mídia · Campanhas"
            : "Mídia · Anúncios";
  const pageDescription =
    pageMode === "home"
      ? "Leitura operacional do investimento, retorno e pressão do recorte."
      : pageMode === "executive"
        ? "Comando, prioridade e próximo movimento."
        : pageMode === "trend"
          ? "Curva diária e eficiência do gasto."
          : pageMode === "campaigns"
            ? "Tabela operacional por campanha."
            : "Decisão operacional por anúncio e criativo.";

  const isBrandLoading =
    Boolean(activeBrandId) && (isDatasetLoading || isReportLoading || !activeBrand);

  if (isBrandLoading) {
    return (
      <div className="atlas-page-stack">
        <PageHeader
          eyebrow="Aquisição"
          title="Performance Mídia"
          description={`Carregando os dados de mídia da loja ${selectedBrandName}.`}
        />
        <div className="atlas-page-stack animate-pulse">
          <div className="grid gap-4 md:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-24 rounded-xl bg-surface-container" />
            ))}
          </div>
          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="h-[340px] rounded-2xl bg-surface-container" />
            <div className="h-[340px] rounded-2xl bg-surface-container" />
          </div>
        </div>
      </div>
    );
  }

  if (!activeBrandId && !activeBrand) {
    return (
      <EmptyState
        title="Nenhuma marca selecionada"
        description="Escolha uma marca para visualizar o relatório de mídia."
        ctaHref={null}
        ctaLabel={null}
      />
    );
  }

  if (!activeBrand) {
    return (
      <EmptyState
        title={reportError ? "Relatório de mídia indisponível" : "Dados da loja indisponíveis"}
        description={
          reportError ?? "Não foi possível montar o relatório de mídia da loja selecionada."
        }
        ctaHref={APP_ROUTES.integrations}
        ctaLabel="Revisar integrações"
        variant="error"
      />
    );
  }

  if (!summary.spend && !summary.impressions && !summary.purchases) {
    return (
      <EmptyState
        title="Ainda não há mídia carregada"
        description="Sincronize a Meta ou importe o CSV para acompanhar investimento, retorno e pontos de atenção da aquisição."
        ctaHref={APP_ROUTES.integrations}
        ctaLabel="Abrir integrações"
      />
    );
  }

  return (
    <div className="atlas-page-stack-compact">
      <PageHeader
        eyebrow={pageMode === "home" ? "Aquisição" : "Mídia"}
        title={pageMode === "home" ? "Operação de mídia" : pageTitle}
        description={
          pageMode === "home"
            ? "Escala, revisão e eficiência do recorte atual."
            : pageDescription
        }
        actions={
          <div className="flex min-w-0 flex-wrap items-center gap-2.5">
            <WorkspaceTabs
              items={[
                { key: "media-home", label: "Home", href: APP_ROUTES.media, active: pageMode === "home" },
                {
                  key: "media-executive",
                  label: "Executivo",
                  href: APP_ROUTES.mediaExecutive,
                  active: pageMode === "executive",
                },
                {
                  key: "media-radar",
                  label: "Radar",
                  href: APP_ROUTES.mediaRadar,
                  active: pageMode === "trend",
                },
                {
                  key: "media-campaigns",
                  label: "Campanhas",
                  href: APP_ROUTES.mediaCampaigns,
                  active: pageMode === "campaigns",
                },
                {
                  key: "media-ads",
                  label: "Anúncios",
                  href: APP_ROUTES.mediaAds,
                  active: pageMode === "ads",
                },
              ]}
            />
            <span className="atlas-inline-metric">{selectedBrandName}</span>
            <span className="atlas-inline-metric">{selectedPeriodLabel}</span>
          </div>
        }
      />

      {pageMode === "home" ? (
        <>
          <OperationalMetricStrip desktopColumns={4}>
            <OperationalMetric
              label="Investimento"
              value={currencyFormatter.format(summary.spend)}
              helper="Gasto ativo da Meta."
            />
            <OperationalMetric
              label="Receita atribuída"
              value={currencyFormatter.format(summary.purchaseValue)}
              helper="Receita de compra atribuída pela plataforma."
              tone="positive"
            />
            <OperationalMetric
              label="Compras"
              value={integerFormatter.format(summary.purchases)}
              helper="Volume de compras atribuídas."
              tone="info"
            />
            <OperationalMetric
              label="ROAS"
              value={`${summary.attributedRoas.toFixed(2)}x`}
              helper={signals.attributedRoas.description}
              tone={signalAccent(signals.attributedRoas)}
            />
          </OperationalMetricStrip>

          <WorkspaceSplitLayout
            layout="wide-rail"
            main={
              <SurfaceCard>
                <SectionHeading
                  title="Direção do recorte"
                  description="Concentre a leitura no que merece escala, revisão ou ajuste agora."
                />
                <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(20rem,0.92fr)]">
                  <div className="atlas-component-stack-tight">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-on-surface-variant">
                      Direção dominante
                    </p>
                    <h2 className="font-headline text-[clamp(1.5rem,2.3vw,2.1rem)] font-semibold tracking-tight text-on-surface">
                      {bestScale ? `Escalar ${bestScale.campaignName}` : "Sem escala dominante agora"}
                    </h2>
                    <p className="text-sm leading-6 text-on-surface-variant">{analysis.narrativeBody}</p>
                    <p className="text-sm font-semibold text-on-surface">
                      {primaryAction ?? report.commandRoom.narrative}
                    </p>
                  </div>
                  <OperationalMetricStrip baseColumns={1} desktopColumns={2}>
                    <OperationalMetric
                      label="Escalar primeiro"
                      value={bestScale ? bestScale.campaignName : "Sem frente dominante"}
                      helper={
                        report.commandRoom.bestScaleSummary ??
                        "Ainda não há sinal forte o bastante para ampliar verba com segurança."
                      }
                      tone="positive"
                    />
                    <OperationalMetric
                      label="Revisar primeiro"
                      value={priorityReview ? priorityReview.campaignName : "Sem alerta crítico"}
                      helper={
                        report.commandRoom.priorityReviewSummary ??
                        "Nenhuma revisão dominante agora."
                      }
                      tone="warning"
                    />
                    <OperationalMetric
                      label="CTR geral"
                      value={percentFormatter.format(summary.ctrAll)}
                      helper={signals.ctrAll.description}
                      tone={signalAccent(signals.ctrAll)}
                      size="compact"
                    />
                    <OperationalMetric
                      label="CPA meta"
                      value={summary.purchases ? currencyFormatter.format(summary.cpa) : "-"}
                      helper={signals.cpa.description}
                      tone={signalAccent(signals.cpa)}
                      size="compact"
                    />
                  </OperationalMetricStrip>
                </div>
              </SurfaceCard>
            }
            rail={
              <WorkspaceRailSection
                title="Fila de decisão"
                description="Confirme rapidamente qual frente pede verba e qual frente pede revisão."
              >
                <OperationalMetricStrip baseColumns={1} desktopColumns={1}>
                  <OperationalMetric
                    label="Escalar agora"
                    value={bestScale ? bestScale.campaignName : "Sem frente dominante"}
                    helper={
                      report.commandRoom.bestScaleSummary ??
                      "Ainda não há campanha forte o bastante para ampliar verba com segurança."
                    }
                    tone="positive"
                  />
                  <OperationalMetric
                    label="Revisar agora"
                    value={priorityReview ? priorityReview.campaignName : "Sem alerta crítico"}
                    helper={
                      report.commandRoom.priorityReviewSummary ?? "Nenhuma revisão dominante agora."
                    }
                    tone="warning"
                  />
                </OperationalMetricStrip>
              </WorkspaceRailSection>
            }
          />

          <WorkspaceSplitLayout
            layout="wide-rail"
            main={
              <SurfaceCard>
                <SectionHeading
                  title="Campanha em foco"
                  description="Abra a frente dominante para detalhar verba, retorno e próximos movimentos."
                />
                <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(19rem,0.9fr)]">
                  <div className="atlas-component-stack-tight">
                    <h2 className="font-headline text-[clamp(1.4rem,2vw,1.9rem)] font-semibold tracking-tight text-on-surface">
                      {topCampaignBySpend?.campaignName ?? bestScale?.campaignName ?? "Sem campanha dominante"}
                    </h2>
                    <p className="text-sm leading-6 text-on-surface-variant">
                      {topCampaignBySpend?.summary ??
                        report.commandRoom.bestScaleSummary ??
                        "Ainda não há campanha dominante o bastante para guiar a próxima abertura."}
                    </p>
                  </div>
                  <OperationalMetricStrip baseColumns={1} desktopColumns={1}>
                    <OperationalMetric
                      label="Investimento"
                      value={
                        topCampaignBySpend
                          ? currencyFormatter.format(topCampaignBySpend.spend)
                          : currencyFormatter.format(summary.spend)
                      }
                      helper="Pressão financeira visível no recorte."
                      size="compact"
                    />
                    <OperationalMetric
                      label="Receita"
                      value={currencyFormatter.format(summary.purchaseValue)}
                      helper="Compra atribuída no recorte."
                      tone="positive"
                      size="compact"
                    />
                    <OperationalMetric
                      label="Leitura"
                      value={bestScale ? "Escalar" : priorityReview ? "Revisar" : "Monitorar"}
                      helper={primaryAction ?? report.commandRoom.narrative}
                      tone={bestScale ? "positive" : priorityReview ? "warning" : "info"}
                      size="compact"
                    />
                  </OperationalMetricStrip>
                </div>
              </SurfaceCard>
            }
            rail={
              <WorkspaceRailSection
                title="Sinais confirmatórios"
                description="Use esta rail para validar se a leitura dominante continua fazendo sentido."
              >
                <OperationalMetricStrip baseColumns={1} desktopColumns={1}>
                  <OperationalMetric
                    label="Receita atribuída"
                    value={currencyFormatter.format(summary.purchaseValue)}
                    helper="Compra atribuída pela plataforma no recorte."
                    tone="positive"
                  />
                  <OperationalMetric
                    label="Compras meta"
                    value={integerFormatter.format(summary.purchases)}
                    helper={`${integerFormatter.format(summary.linkClicks)} cliques de link no período.`}
                    tone="info"
                  />
                  <OperationalMetric
                    label="Estado do recorte"
                    value={bestScale ? "Pronto para pressão controlada" : "Em observação"}
                    helper={report.commandRoom.narrative}
                    tone={bestScale ? "positive" : "default"}
                  />
                </OperationalMetricStrip>
              </WorkspaceRailSection>
            }
          />
        </>
      ) : null}

      {view === "executive" ? (
        <>
          <OperationalMetricStrip>
            <OperationalMetric
              label="Investimento"
              value={currencyFormatter.format(summary.spend)}
              helper="Gasto da mídia no período ativo."
            />
            <OperationalMetric
              label="Receita atribuída"
              value={currencyFormatter.format(summary.purchaseValue)}
              helper="Compra atribuída pela Meta no recorte."
              tone="positive"
            />
            <OperationalMetric
              label="Compras"
              value={integerFormatter.format(summary.purchases)}
              helper="Volume de compras puxadas pela mídia."
              tone="info"
            />
            <OperationalMetric
              label="ROAS"
              value={`${summary.attributedRoas.toFixed(2)}x`}
              helper={signals.attributedRoas.description}
              tone={signalAccent(signals.attributedRoas)}
            />
          </OperationalMetricStrip>

          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(20rem,0.64fr)]">
            <SurfaceCard>
              <SectionHeading
                title="Investimento x retorno por dia"
                description="Curva diária para detectar quando o gasto sobe antes da receita ou quando o retorno começa a comprimir."
              />
              <div className="mt-5 h-[360px] min-w-0 xl:h-[400px]">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={280}>
                  <AreaChart data={trendData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-outline-variant)" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatCompactDate}
                      stroke="var(--color-on-surface-variant)"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis
                      yAxisId="left"
                      stroke="var(--color-on-surface-variant)"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip
                      formatter={(value, name) => [
                        currencyFormatter.format(Number(value ?? 0)),
                        name === "spend" ? "Investimento" : "Receita atribuída",
                      ]}
                      labelFormatter={(label) => formatCompactDate(String(label ?? ""))}
                      contentStyle={{
                        borderRadius: 14,
                        border: "1px solid var(--color-outline)",
                        backgroundColor: "var(--color-surface)",
                        boxShadow: "0 18px 44px rgba(15, 23, 42, 0.08)",
                      }}
                    />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="spend"
                      stroke="var(--color-tertiary)"
                      fill="var(--color-tertiary-container)"
                      fillOpacity={0.45}
                      strokeWidth={2}
                    />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="purchaseValue"
                      stroke="var(--color-primary)"
                      fill="var(--color-primary-container)"
                      fillOpacity={0.3}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </SurfaceCard>

            <SurfaceCard>
              <SectionHeading
                title="Sala de comando"
                description="Priorize verba, campanhas e criativos a partir dos principais sinais do período."
              />
              <div className="mt-5 grid gap-4">
                <article className="panel-muted p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-on-surface-variant">
                    {analysis.narrativeTitle}
                  </p>
                  <p className="mt-2 font-semibold text-on-surface">Leitura do período</p>
                  <p className="mt-2 text-sm leading-6 text-on-surface-variant">{analysis.narrativeBody}</p>
                  <p className="mt-2 text-[11px] leading-5 text-on-surface-variant">{report.commandRoom.narrative}</p>
                </article>
                <div className="grid gap-4 md:grid-cols-2">
                  <article className="panel-muted p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-on-surface-variant">Escalar agora</p>
                    <p className="mt-2 font-semibold text-on-surface">
                      {bestScale ? bestScale.campaignName : "Sem campanha elegível"}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                      {report.commandRoom.bestScaleSummary ??
                        "Ainda não há sinal forte o bastante para ampliar verba com segurança."}
                    </p>
                    <p className="mt-2 text-[11px] leading-5 text-on-surface-variant">
                      {bestScale
                        ? `${bestScale.roas.toFixed(2)}x ROAS · ${percentFormatter.format(bestScale.ctrAll)} CTR`
                        : "Aguardando campanha com sinal consistente."}
                    </p>
                  </article>
                  <article className="panel-muted p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-on-surface-variant">Revisar agora</p>
                    <p className="mt-2 font-semibold text-on-surface">
                      {priorityReview ? priorityReview.campaignName : "Sem alerta crítico"}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                      {report.commandRoom.priorityReviewSummary ??
                        "Nenhuma campanha relevante apareceu com sinal forte de revisão nesta janela."}
                    </p>
                    <p className="mt-2 text-[11px] leading-5 text-on-surface-variant">
                      {priorityReview
                        ? `${priorityReview.roas.toFixed(2)}x ROAS · ${percentFormatter.format(priorityReview.ctrAll)} CTR`
                        : "Sem campanha crítica no recorte."}
                    </p>
                  </article>
                </div>
                {analysis.nextActions.length ? (
                  <div className="atlas-soft-subcard p-3.5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
                      Próximos passos
                    </p>
                    <div className="mt-3 atlas-component-stack-tight">
                      {analysis.nextActions.map((item) => (
                        <div key={item} className="panel-muted px-4 py-3 text-sm leading-6 text-on-surface-variant">
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </SurfaceCard>
          </section>

          <section className="grid gap-4 xl:grid-cols-3">
            {[playbook.scale, playbook.review, playbook.monitor].map((group) => (
              <SurfaceCard key={group.title}>
                <SectionHeading title={group.title} description={group.description} />
                <div className="mt-4 flex items-center justify-between">
                  <span className="atlas-inline-metric">{group.count} campanha(s)</span>
                </div>
                <div className="mt-4 atlas-component-stack-tight">
                  {group.items.length ? (
                    group.items.map((campaign) => (
                      <div key={campaign.campaignName} className="panel-muted p-3.5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-on-surface">{campaign.campaignName}</p>
                            <p className="mt-1 text-[11px] leading-5 text-on-surface-variant">{campaign.summary}</p>
                          </div>
                          <span className={`atlas-compact-badge ${actionClassName(campaign.action)}`}>
                            {actionLabel(campaign.action)}
                          </span>
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] text-on-surface-variant">
                          <span>ROAS {campaign.roas.toFixed(2)}x</span>
                          <span>CTR {percentFormatter.format(campaign.ctrAll)}</span>
                          <span>CPA {campaign.purchases ? currencyFormatter.format(campaign.cpa) : "-"}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-on-surface-variant">Sem campanhas nesta faixa no recorte.</p>
                  )}
                </div>
              </SurfaceCard>
            ))}
          </section>

          <section className="grid gap-4 xl:grid-cols-[0.94fr_1.06fr]">
            <SurfaceCard>
              <SectionHeading
                title="Top sinais do período"
                description="Indicadores auxiliares para entender qualidade de tráfego e pressão de custo."
              />
              <div className="mt-5 grid gap-3">
                <article className="panel-muted p-3.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                    Campanha líder em verba
                  </p>
                  <div className="mt-2 flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-on-surface">
                        {topCampaignBySpend?.campaignName ?? "Sem campanha"}
                      </p>
                      <p className="mt-1 text-[11px] leading-5 text-on-surface-variant">
                        {topCampaignBySpend
                          ? topCampaignBySpend.summary
                          : "Sem dados suficientes"}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-on-surface">
                      {topCampaignBySpend ? currencyFormatter.format(topCampaignBySpend.spend) : "-"}
                    </p>
                  </div>
                </article>

                <article className="panel-muted p-3.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                    Alcance e entrega
                  </p>
                  <p className="mt-2 font-headline text-2xl font-semibold text-on-surface">
                    {integerFormatter.format(summary.reach)}
                  </p>
                  <p className="mt-1 text-[11px] leading-5 text-on-surface-variant">
                    {integerFormatter.format(summary.impressions)} impressões no período.
                  </p>
                </article>
              </div>
            </SurfaceCard>

            <SurfaceCard className="p-0 overflow-hidden">
              <div className="border-b border-outline p-5">
                <SectionHeading
                  title="Campanhas prioritárias"
                  description="Ranking com indicação de escala, monitoramento ou revisão."
                />
              </div>
              <div className="brandops-table-container atlas-table-shell">
                <table className="brandops-table-compact w-full min-w-[980px]">
                  <thead>
                    <tr>
                      <th>Campanha</th>
                      <th className="text-right">Ação</th>
                      <th className="text-right">Investimento</th>
                      <th className="text-right">CTR</th>
                      <th className="text-right">Compras</th>
                      <th className="text-right">CPA</th>
                      <th className="text-right">ROAS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.slice(0, 8).map((campaign) => (
                      <tr key={campaign.campaignName}>
                        <td className="max-w-[340px] truncate font-semibold text-on-surface">
                          {campaign.campaignName}
                        </td>
                        <td className="text-right">
                          <span className={`atlas-compact-badge ${actionClassName(campaign.action)}`}>
                            {actionLabel(campaign.action)}
                          </span>
                        </td>
                        <td className="text-right">{currencyFormatter.format(campaign.spend)}</td>
                        <td className="text-right">{percentFormatter.format(campaign.ctrAll)}</td>
                        <td className="text-right">{integerFormatter.format(campaign.purchases)}</td>
                        <td className="text-right">{campaign.purchases ? currencyFormatter.format(campaign.cpa) : "-"}</td>
                        <td className="text-right font-semibold text-on-surface">{campaign.roas.toFixed(2)}x</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SurfaceCard>
          </section>
        </>
      ) : null}

      {view === "trend" ? (
        <section className="grid gap-4">
          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.32fr)_minmax(20rem,0.68fr)]">
            <SurfaceCard>
              <SectionHeading
                title="Cadência do gasto"
                description="Acompanhe a subida ou queda do investimento ao longo dos dias."
              />
              <div className="mt-5 h-[340px] min-w-0 xl:h-[380px]">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={280}>
                  <BarChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-outline-variant)" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatCompactDate}
                      stroke="var(--color-on-surface-variant)"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis
                      stroke="var(--color-on-surface-variant)"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip
                      formatter={(value) => currencyFormatter.format(Number(value ?? 0))}
                      labelFormatter={(label) => formatCompactDate(String(label ?? ""))}
                      contentStyle={{
                        borderRadius: 14,
                        border: "1px solid var(--color-outline)",
                        backgroundColor: "var(--color-surface)",
                      }}
                    />
                    <Bar dataKey="spend" fill="var(--color-tertiary)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </SurfaceCard>

            <SurfaceCard className="atlas-media-rail-card">
              <SectionHeading
                title="Leitura da curva"
                description="Resumo curto para saber se o ganho de verba veio com retorno ou só com volume."
              />
              <div className="mt-5 atlas-component-stack-tight">
                <MediaMiniMetric
                  label="Investimento"
                  value={currencyFormatter.format(summary.spend)}
                  helper="Gasto acumulado no recorte visível."
                />
                <MediaMiniMetric
                  label="ROAS"
                  value={`${summary.attributedRoas.toFixed(2)}x`}
                  helper="Leitura média do retorno atribuído."
                  tone={signalAccent(signals.attributedRoas)}
                />
                <MediaMiniMetric
                  label="Compras"
                  value={integerFormatter.format(summary.purchases)}
                  helper="Compras puxadas pela mídia na janela ativa."
                  tone="info"
                />
                <div className="panel-muted p-3.5 text-sm leading-6 text-on-surface-variant">
                  {report.commandRoom.narrative}
                </div>
              </div>
            </SurfaceCard>
          </section>

          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.32fr)_minmax(20rem,0.68fr)]">
            <SurfaceCard>
              <SectionHeading
                title="Eficiência diária"
                description="ROAS atribuído e compras ajudam a entender se o ganho de investimento veio com eficiência."
              />
              <div className="mt-5 h-[340px] min-w-0 xl:h-[380px]">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={280}>
                  <AreaChart data={trendData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-outline-variant)" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatCompactDate}
                      stroke="var(--color-on-surface-variant)"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis
                      yAxisId="left"
                      stroke="var(--color-on-surface-variant)"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      stroke="var(--color-on-surface-variant)"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip
                      formatter={(value, name) =>
                        name === "attributedRoas"
                          ? [`${Number(value ?? 0).toFixed(2)}x`, "ROAS"]
                          : [integerFormatter.format(Number(value ?? 0)), "Compras"]
                      }
                      labelFormatter={(label) => formatCompactDate(String(label ?? ""))}
                      contentStyle={{
                        borderRadius: 14,
                        border: "1px solid var(--color-outline)",
                        backgroundColor: "var(--color-surface)",
                      }}
                    />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="attributedRoas"
                      stroke="var(--color-primary)"
                      fill="var(--color-primary-container)"
                      fillOpacity={0.35}
                      strokeWidth={2}
                    />
                    <Area
                      yAxisId="right"
                      type="monotone"
                      dataKey="purchases"
                      stroke="var(--color-secondary)"
                      fill="var(--color-secondary-container)"
                      fillOpacity={0.18}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </SurfaceCard>

            <SurfaceCard className="atlas-media-rail-card">
              <SectionHeading
                title="Leitura diária"
                description="Use a curva para localizar pressão, não só volume."
              />
              <div className="mt-5 atlas-component-stack-tight">
                <MediaMiniMetric
                  label="Escalar primeiro"
                  value={bestScale ? bestScale.campaignName : "Sem campanha elegível"}
                  helper={
                    report.commandRoom.bestScaleSummary ??
                    "Ainda não há campanha com sinal forte o bastante para ampliar verba com segurança."
                  }
                  tone="positive"
                />
                <MediaMiniMetric
                  label="Revisar primeiro"
                  value={priorityReview ? priorityReview.campaignName : "Sem alerta crítico"}
                  helper={
                    report.commandRoom.priorityReviewSummary ??
                    "Nenhuma campanha relevante apareceu com sinal forte de revisão."
                  }
                  tone="warning"
                />
              </div>
            </SurfaceCard>
          </section>
        </section>
      ) : null}

      {view === "campaigns" ? (
        <>
          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.18fr)_minmax(19rem,0.82fr)]">
            <SurfaceCard>
              <SectionHeading
                title="Panorama das campanhas"
                description="Resumo rápido para saber o tamanho da base e onde está a pressão principal."
              />
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <MediaMiniMetric
                  label="Campanhas avaliadas"
                  value={integerFormatter.format(campaigns.length)}
                  helper="Base consolidada no recorte."
                  tone="info"
                />
                <MediaMiniMetric
                  label="Escalar"
                  value={integerFormatter.format(playbook.scale.count)}
                  helper="Frentes com sinal para ampliação."
                  tone="positive"
                />
                <MediaMiniMetric
                  label="Revisar"
                  value={integerFormatter.format(playbook.review.count)}
                  helper="Campanhas que pedem correção."
                  tone="warning"
                />
              </div>
            </SurfaceCard>
            <SurfaceCard className="atlas-media-rail-card">
              <SectionHeading
                title="Prioridades de campanha"
                description="Use esta rail para decidir o que abrir primeiro na matriz."
              />
              <div className="mt-5 atlas-component-stack-tight">
                <MediaMiniMetric
                  label="Melhor frente"
                  value={bestScale ? bestScale.campaignName : "Sem frente dominante"}
                  helper={
                    report.commandRoom.bestScaleSummary ??
                    "Ainda não há campanha com sinal forte de ampliação."
                  }
                  tone="positive"
                />
                <MediaMiniMetric
                  label="Revisar primeiro"
                  value={priorityReview ? priorityReview.campaignName : "Sem revisão dominante"}
                  helper={
                    report.commandRoom.priorityReviewSummary ??
                    "Nenhuma campanha concentrou alerta suficiente para revisão prioritária."
                  }
                  tone="warning"
                />
                <ModeEntryCard
                  eyebrow="Anúncios"
                  title="Descer para ads e criativos"
                  description="Abra o nível de anúncio para revisar peça, público ou pausa."
                  href={APP_ROUTES.mediaAds}
                  actionLabel="Entrar"
                />
              </div>
            </SurfaceCard>
          </section>

          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(20rem,0.7fr)]">
            <SurfaceCard className="p-0 overflow-hidden">
              <div className="border-b border-outline p-5">
                <SectionHeading
                  title="Matriz de campanhas"
                  description="Tabela principal para decidir onde subir verba, monitorar ou revisar."
                />
              </div>
              <div className="brandops-table-container atlas-table-shell">
                <table className="brandops-table-compact min-w-[980px] w-full">
                  <thead>
                    <tr>
                      <th>Campanha</th>
                      <th>Ação</th>
                      <th className="text-right">Investimento</th>
                      <th className="text-right">Compras</th>
                      <th className="text-right">ROAS</th>
                      <th>Leitura</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.map((campaign) => (
                      <tr key={campaign.campaignName}>
                        <td className="max-w-[340px] whitespace-normal">
                          <div className="font-semibold text-on-surface">{campaign.campaignName}</div>
                          <div className="mt-1 text-[11px] leading-5 text-on-surface-variant">
                            CTR {percentFormatter.format(campaign.ctrAll)} · CPC {currencyFormatter.format(campaign.cpc)} · CPA {campaign.purchases ? currencyFormatter.format(campaign.cpa) : "-"}
                          </div>
                        </td>
                        <td>
                          <span className={`atlas-compact-badge ${actionClassName(campaign.action)}`}>
                            {actionLabel(campaign.action)}
                          </span>
                        </td>
                        <td className="text-right">{currencyFormatter.format(campaign.spend)}</td>
                        <td className="text-right">{integerFormatter.format(campaign.purchases)}</td>
                        <td className="text-right font-semibold text-on-surface">{campaign.roas.toFixed(2)}x</td>
                        <td className="max-w-[360px] whitespace-normal text-on-surface-variant">
                          {campaign.summary}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SurfaceCard>

            <SurfaceCard className="atlas-media-rail-card">
              <SectionHeading
                title="Filas da operação"
                description="Agrupamentos para decidir se a campanha pede escala, revisão ou monitoramento."
              />
              <div className="mt-5 atlas-component-stack-tight">
                {[playbook.scale, playbook.review, playbook.monitor].map((group) => (
                  <div key={group.title} className="panel-muted p-3.5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-on-surface-variant">
                        {group.title}
                      </p>
                      <span className="atlas-inline-metric">{group.count}</span>
                    </div>
                    <div className="mt-3 atlas-component-stack-tight">
                      {group.items.length ? (
                        group.items.slice(0, 3).map((campaign) => (
                          <div
                            key={campaign.campaignName}
                            className="border-t border-outline/60 pt-3 first:border-t-0 first:pt-0"
                          >
                            <p className="font-semibold text-on-surface">{campaign.campaignName}</p>
                            <p className="mt-1 text-[11px] leading-5 text-on-surface-variant">
                              {campaign.summary}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-[11px] leading-5 text-on-surface-variant">
                          Sem campanha nesta faixa.
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </SurfaceCard>
          </section>
        </>
      ) : null}

      {view === "ads" ? (
        <>
          <SurfaceCard>
            <SectionHeading
              title="Mesa de anúncios"
              description="Use esta abertura para decidir rapidamente o que escalar, revisar criativo, ajustar público ou pausar."
            />
            <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.06fr)_minmax(20rem,0.94fr)]">
              <div className="atlas-component-stack-tight">
                <article className="panel-muted p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-on-surface-variant">
                    Leitura dominante
                  </p>
                  <p className="mt-3 text-lg font-semibold text-on-surface">
                    {report.ads.highlights.bestScale?.adName ?? "Sem anúncio dominante para escalar"}
                  </p>
                  <p className="mt-2 atlas-analytics-copy">{report.ads.analysis.narrativeBody}</p>
                  <p className="mt-3 text-[11px] font-medium leading-5 text-on-surface-variant">
                    {report.ads.analysis.nextActions[0] ??
                      "Aguardando mais sinais para priorizar anúncios."}
                  </p>
                </article>
                <div className="grid gap-3 md:grid-cols-2">
                  <MediaMiniMetric
                    label="Ads avaliados"
                    value={integerFormatter.format(report.ads.rows.length)}
                    helper="Base consolidada no recorte."
                    tone="info"
                  />
                  <MediaMiniMetric
                    label="Escalar"
                    value={integerFormatter.format(report.ads.playbook.scale.length)}
                    helper="Anúncios com aderência para subir verba."
                    tone="positive"
                  />
                  <MediaMiniMetric
                    label="Criativo"
                    value={integerFormatter.format(report.ads.playbook.creativeReview.length)}
                    helper="Peças que pedem revisão visual ou de promessa."
                    tone="warning"
                  />
                  <MediaMiniMetric
                    label="Pausar"
                    value={integerFormatter.format(report.ads.playbook.pause.length)}
                    helper="Consumo sem resposta proporcional."
                    tone="warning"
                  />
                </div>
              </div>
              <div className="atlas-component-stack-tight">
                <MediaMiniMetric
                  label="Escalar agora"
                  value={report.ads.highlights.bestScale?.adName ?? "Sem anúncio pronto para escalar"}
                  helper={
                    report.ads.highlights.bestScale?.summary ??
                    "Ainda não há anúncio com retorno e volume suficientes para aumento de verba."
                  }
                  tone="positive"
                />
                <MediaMiniMetric
                  label="Revisar criativo"
                  value={report.ads.highlights.creativeReview?.adName ?? "Sem revisão criativa dominante"}
                  helper={
                    report.ads.highlights.creativeReview?.summary ??
                    "Nenhum anúncio está puxando revisão criativa prioritária neste corte."
                  }
                  tone="warning"
                />
                <MediaMiniMetric
                  label="Ajustar público"
                  value={report.ads.highlights.audienceReview?.adName ?? "Sem revisão de público dominante"}
                  helper={
                    report.ads.highlights.audienceReview?.summary ??
                    "Nenhum anúncio está puxando ajuste de público como principal ação agora."
                  }
                  tone="info"
                />
                <MediaMiniMetric
                  label="Pausar primeiro"
                  value={report.ads.highlights.pauseCandidate?.adName ?? "Sem pausa dominante"}
                  helper={
                    report.ads.highlights.pauseCandidate?.summary ??
                    "Nenhum anúncio concentrou verba suficiente sem resposta para pedir pausa imediata."
                  }
                  tone="warning"
                />
              </div>
            </div>
          </SurfaceCard>

          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.18fr)_minmax(22rem,0.82fr)]">
            <SurfaceCard className="p-0 overflow-hidden">
              <div className="border-b border-outline p-5">
                <SectionHeading
                  title="Matriz de anúncios"
                  description="Leitura operacional por anúncio para decidir escala, revisão criativa, ajuste de público ou pausa."
                />
              </div>
              <div className="brandops-table-container atlas-table-shell">
                <table className="brandops-table-compact min-w-[1280px] w-full">
                  <thead>
                    <tr>
                      <th>Campanha</th>
                      <th>Conjunto</th>
                      <th>Anúncio</th>
                      <th>Ação</th>
                      <th className="text-right">Investimento</th>
                      <th className="text-right">Compras</th>
                      <th className="text-right">ROAS</th>
                      <th>Leitura</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.ads.rows.map((row) => (
                      <tr key={`${row.campaignName}-${row.adsetName}-${row.adId ?? row.adName}`}>
                        <td className="max-w-[220px] truncate font-semibold text-on-surface">{row.campaignName}</td>
                        <td className="max-w-[220px] truncate">{row.adsetName}</td>
                        <td className="max-w-[280px] whitespace-normal">
                          <div className="font-semibold text-on-surface">{adDisplayPrimary(row)}</div>
                          {adDisplaySecondary(row) ? (
                            <div className="text-[11px] leading-5 text-on-surface-variant">{adDisplaySecondary(row)}</div>
                          ) : null}
                          <div className="mt-1 text-[11px] leading-5 text-on-surface-variant">
                            Confiança {Math.round(row.confidence * 100)}% · CTR link {percentFormatter.format(row.ctrLink)}
                          </div>
                        </td>
                        <td>
                          <span className={`atlas-compact-badge ${adActionClassName(row.action)}`}>
                            {adActionLabel(row.action)}
                          </span>
                        </td>
                        <td className="text-right">{currencyFormatter.format(row.spend)}</td>
                        <td className="text-right">{integerFormatter.format(row.purchases)}</td>
                        <td className="text-right font-semibold text-on-surface">{row.roas.toFixed(2)}x</td>
                        <td className="max-w-[320px] whitespace-normal text-on-surface-variant">
                          <div>{row.summary}</div>
                          <AdReasonChips reasonCodes={row.reasonCodes} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SurfaceCard>

            <SurfaceCard className="atlas-media-rail-card">
              <SectionHeading
                title="Filas do playbook"
                description="Agrupe a operação por escala, criativo, público e pausa sem esmagar a leitura."
              />
              <div className="mt-5 atlas-media-playbook-grid">
                {[
                  {
                    title: "Escalar",
                    description: "Melhores anúncios para aumento controlado de verba.",
                    rows: report.ads.playbook.scale,
                  },
                  {
                    title: "Criativo",
                    description: "Onde a promessa visual ou o CTA pedem revisão.",
                    rows: report.ads.playbook.creativeReview,
                  },
                  {
                    title: "Público",
                    description: "Anúncios que pedem ajuste de público ou distribuição.",
                    rows: report.ads.playbook.audienceReview,
                  },
                  {
                    title: "Pausa",
                    description: "Anúncios com consumo alto e retorno insuficiente.",
                    rows: report.ads.playbook.pause,
                  },
                ].map((group) => (
                  <div key={group.title} className="panel-muted p-3.5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-on-surface-variant">
                      {group.title}
                    </p>
                    <p className="mt-2 text-[11px] leading-5 text-on-surface-variant">{group.description}</p>
                    <div className="mt-3 atlas-component-stack-tight">
                      {group.rows.length ? (
                        group.rows.slice(0, 3).map((row) => (
                          <div
                            key={`${group.title}-${row.campaignName}-${row.adsetName}-${row.adId ?? row.adName}`}
                            className="atlas-media-playbook-item"
                          >
                            <div className="min-w-0">
                              <p className="font-semibold text-on-surface">{adDisplayPrimary(row)}</p>
                              {adDisplaySecondary(row) ? (
                                <p className="mt-1 text-[11px] leading-5 text-on-surface-variant">
                                  {adDisplaySecondary(row)}
                                </p>
                              ) : null}
                            <p className="mt-1 text-[11px] leading-5 text-on-surface-variant">{row.summary}</p>
                            <AdReasonChips reasonCodes={row.reasonCodes} />
                          </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-[11px] leading-5 text-on-surface-variant">
                          Sem item dominante nesta fila.
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </SurfaceCard>
          </section>
        </>
      ) : null}

    </div>
  );
}

export default function MediaPage() {
  return <MediaWorkspace />;
}


