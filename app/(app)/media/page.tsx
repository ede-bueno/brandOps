"use client";

import { useEffect, useState } from "react";
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
import {
  AnalyticsCalloutCard,
  AnalyticsKpiCard,
} from "@/components/analytics/AnalyticsPrimitives";
import { EmptyState } from "@/components/EmptyState";
import { useBrandOps } from "@/components/BrandOpsProvider";
import {
  ModeEntryCard,
  PageHeader,
  SectionHeading,
  StackItem,
  SurfaceCard,
  TaskWorkspaceIntro,
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
import type { MediaCampaignAction, MediaReport, MediaSignal } from "@/lib/brandops/types";

type MediaView = "home" | "executive" | "trend" | "campaigns";

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

export function MediaWorkspace({
  forcedMode,
}: {
  forcedMode?: MediaView;
}) {
  const searchParams = useSearchParams();
  const routeMode = searchParams?.get("mode") ?? null;
  const pageMode: MediaView =
    forcedMode ??
    (routeMode === "executive" || routeMode === "trend" || routeMode === "campaigns"
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
          : "Mídia · Campanhas";
  const pageDescription =
    pageMode === "home"
      ? "Escolha entre executivo, radar ou campanhas."
      : pageMode === "executive"
        ? "Comando, prioridade e próximo movimento."
        : pageMode === "trend"
          ? "Curva diária e eficiência do gasto."
          : "Tabela operacional por campanha.";

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
      />
    );
  }

  if (!summary.spend && !summary.impressions && !summary.purchases) {
    return (
      <EmptyState
        title="Ainda não há mídia carregada"
        description="Sincronize a Meta ou importe o CSV para acompanhar investimento, retorno e pontos de atenção da aquisição."
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
              ]}
            />
            <span className="atlas-inline-metric">{selectedBrandName}</span>
            <span className="atlas-inline-metric">{selectedPeriodLabel}</span>
          </div>
        }
      />

      {pageMode === "home" ? (
        <>
          <TaskWorkspaceIntro
            title="Escolher a trilha de leitura e localizar a campanha em foco."
            description="Use esta raiz para decidir se a próxima leitura deve ser síntese, curva diária ou tabela operacional."
            primaryAction={primaryAction ?? report.commandRoom.narrative}
            primaryDescription="Abra a visão executiva, o radar ou a tabela de campanhas conforme a pergunta que precisa responder."
            supportItems={[
              {
                label: "Campanha em foco",
                value: topCampaignBySpend?.campaignName ?? "Sem campanha dominante",
                description:
                  topCampaignBySpend?.summary ??
                  "Abra campanhas para localizar a peça com maior peso operacional.",
                tone: "default",
              },
              {
                label: "Escalar primeiro",
                value: bestScale ? bestScale.campaignName : "Sem campanha elegível",
                description:
                  report.commandRoom.bestScaleSummary ??
                  "Ainda não há sinal forte o bastante para ampliar verba com segurança.",
                tone: "positive",
              },
              {
                label: "Revisar primeiro",
                value: priorityReview ? priorityReview.campaignName : "Sem alerta crítico",
                description:
                  report.commandRoom.priorityReviewSummary ??
                  "Nenhuma revisão dominante agora.",
                tone: "warning",
              },
            ]}
          />

          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.42fr)_minmax(18rem,0.58fr)]">
            <SurfaceCard>
              <SectionHeading
                title="Escolha a leitura"
                description="Cada trilha responde a uma pergunta diferente do recorte."
                aside={<span className="atlas-inline-metric">Recorte ativo</span>}
              />
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <ModeEntryCard
                  eyebrow="Visão executiva"
                  title="Comando da mídia"
                  description="Escala, revisão e próximos movimentos do recorte."
                  href={APP_ROUTES.mediaExecutive}
                />
                <ModeEntryCard
                  eyebrow="Radar"
                  title="Curva e eficiência"
                  description="Curva diária, gasto, retorno e pressão no tempo."
                  href={APP_ROUTES.mediaRadar}
                />
                <ModeEntryCard
                  eyebrow="Campanhas"
                  title="Tabela operacional"
                  description="Leitura por campanha, prioridade e ação recomendada."
                  href={APP_ROUTES.mediaCampaigns}
                />
              </div>
            </SurfaceCard>
            <SurfaceCard>
              <SectionHeading
                title="Prioridade do recorte"
                description="Uma faixa curta para confirmar foco, risco e próximo passo operacional."
              />
              <div className="mt-4 grid gap-3">
                <StackItem
                  tone="default"
                  title={topCampaignBySpend ? `Foco em ${topCampaignBySpend.campaignName}` : "Sem campanha dominante"}
                  description={
                    topCampaignBySpend?.summary ??
                    "Abra campanhas para localizar a peça com maior peso operacional."
                  }
                  aside={
                    topCampaignBySpend
                      ? `${currencyFormatter.format(topCampaignBySpend.spend)} investidos`
                      : "Aguardando massa de mídia suficiente."
                  }
                />
                <StackItem
                  tone="info"
                  title="Próximo passo operacional"
                  description={report.commandRoom.narrative}
                  aside={bestScale ? `${bestScale.roas.toFixed(2)}x ROAS` : "Sem escala dominante"}
                />
              </div>
            </SurfaceCard>
          </section>
        </>
      ) : null}

      {pageMode === "home" ? (
      <>
        <details className="atlas-disclosure">
          <summary className="atlas-disclosure-summary">
            Indicadores auxiliares de mídia
            <span className="atlas-disclosure-chevron">abrir</span>
          </summary>
          <div className="atlas-disclosure-body">
            <section className="atlas-kpi-grid xl:grid-cols-4">
              <AnalyticsKpiCard
                label="CTR (todos)"
                value={percentFormatter.format(summary.ctrAll)}
                description={signals.ctrAll.description}
                tone={signalAccent(signals.ctrAll)}
              />
              <AnalyticsKpiCard
                label="CTR link"
                value={percentFormatter.format(summary.ctrLink)}
                description={signals.ctrLink.description}
                tone={signalAccent(signals.ctrLink)}
              />
              <AnalyticsKpiCard
                label="CPC"
                value={currencyFormatter.format(summary.cpc)}
                description={signals.cpc.description}
                tone={signalAccent(signals.cpc)}
              />
              <AnalyticsKpiCard
                label="CPA meta"
                value={summary.purchases ? currencyFormatter.format(summary.cpa) : "-"}
                description={signals.cpa.description}
                tone={signalAccent(signals.cpa)}
              />
            </section>
          </div>
        </details>
      </>
      ) : null}

      {view === "executive" ? (
        <>
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
                description="Leitura curta para decidir verba, prioridade e ajuste de criativo sem abrir a tabela inteira."
              />
              <div className="mt-5 grid gap-4">
                <AnalyticsCalloutCard
                  eyebrow={analysis.narrativeTitle}
                  title="Leitura do período"
                  description={analysis.narrativeBody}
                  footer={report.commandRoom.narrative}
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <AnalyticsCalloutCard
                    eyebrow="Escalar agora"
                    title={bestScale ? bestScale.campaignName : "Sem campanha elegível"}
                    description={
                      report.commandRoom.bestScaleSummary ??
                      "Ainda não há sinal forte o bastante para ampliar verba com segurança."
                    }
                    tone="positive"
                    footer={
                      bestScale
                        ? `${bestScale.roas.toFixed(2)}x ROAS · ${percentFormatter.format(bestScale.ctrAll)} CTR`
                        : "Aguardando campanha com sinal consistente."
                    }
                  />
                  <AnalyticsCalloutCard
                    eyebrow="Revisar agora"
                    title={priorityReview ? priorityReview.campaignName : "Sem alerta crítico"}
                    description={
                      report.commandRoom.priorityReviewSummary ??
                      "Nenhuma campanha relevante apareceu com sinal forte de revisão nesta janela."
                    }
                    tone="warning"
                    footer={
                      priorityReview
                        ? `${priorityReview.roas.toFixed(2)}x ROAS · ${percentFormatter.format(priorityReview.ctrAll)} CTR`
                        : "Sem campanha crítica no recorte."
                    }
                  />
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

          <section className="grid gap-4 xl:grid-cols-[minmax(0,0.76fr)_minmax(0,0.24fr)]">
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

            <SurfaceCard>
              <SectionHeading
                title="Leitura do período"
                description="Resumo rápido para saber se o ganho de verba veio com retorno ou só com volume."
              />
              <div className="mt-5 grid gap-3">
                <article className="panel-muted p-3.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                    ROAS atribuído médio
                  </p>
                  <p className="mt-2 font-headline text-[clamp(1.7rem,3vw,2.2rem)] font-semibold text-on-surface">
                    {summary.attributedRoas.toFixed(2)}x
                  </p>
                  <p className="mt-1 text-[11px] leading-5 text-on-surface-variant">
                    Receita atribuída dividida pelo investimento do período.
                  </p>
                </article>
                <article className="panel-muted p-3.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                    Compras atribuídas
                  </p>
                  <p className="mt-2 font-headline text-[clamp(1.7rem,3vw,2.2rem)] font-semibold text-on-surface">
                    {integerFormatter.format(summary.purchases)}
                  </p>
                  <p className="mt-1 text-[11px] leading-5 text-on-surface-variant">
                    Volume de compras puxado pelas campanhas da janela ativa.
                  </p>
                </article>
                <article className="panel-muted p-3.5 text-sm leading-6 text-on-surface-variant">
                  {report.commandRoom.narrative}
                </article>
              </div>
            </SurfaceCard>
          </section>
        </section>
      ) : null}

      {view === "campaigns" ? (
        <SurfaceCard className="p-0 overflow-hidden">
          <div className="border-b border-outline p-5">
            <SectionHeading
              title="Matriz de campanhas"
              description="Tabela completa para decidir onde subir verba, observar ou revisar."
            />
          </div>
          <div className="brandops-table-container atlas-table-shell">
            <table className="brandops-table-compact min-w-[1240px] w-full">
              <thead>
                <tr>
                  <th>Campanha</th>
                  <th>Ação</th>
                  <th className="text-right">Investimento</th>
                  <th className="text-right">Cliques</th>
                  <th className="text-right">CTR</th>
                  <th className="text-right">CPC</th>
                  <th className="text-right">Compras</th>
                  <th className="text-right">CPA</th>
                  <th className="text-right">Receita</th>
                  <th className="text-right">ROAS</th>
                  <th>Leitura</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((campaign) => (
                  <tr key={campaign.campaignName}>
                    <td className="max-w-[280px] truncate font-semibold text-on-surface">
                      {campaign.campaignName}
                    </td>
                    <td>
                      <span className={`atlas-compact-badge ${actionClassName(campaign.action)}`}>
                        {actionLabel(campaign.action)}
                      </span>
                    </td>
                    <td className="text-right">{currencyFormatter.format(campaign.spend)}</td>
                    <td className="text-right">{integerFormatter.format(campaign.clicksAll)}</td>
                    <td className="text-right">{percentFormatter.format(campaign.ctrAll)}</td>
                    <td className="text-right">{currencyFormatter.format(campaign.cpc)}</td>
                    <td className="text-right">{integerFormatter.format(campaign.purchases)}</td>
                    <td className="text-right">{campaign.purchases ? currencyFormatter.format(campaign.cpa) : "-"}</td>
                    <td className="text-right">{currencyFormatter.format(campaign.purchaseValue)}</td>
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
      ) : null}
    </div>
  );
}

export default function MediaPage() {
  return <MediaWorkspace />;
}
