"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
import { MetricCard } from "@/components/MetricCard";
import { useBrandOps } from "@/components/BrandOpsProvider";
import { PageHeader, SectionHeading, SurfaceCard } from "@/components/ui-shell";
import { fetchMediaReport } from "@/lib/brandops/database";
import {
  currencyFormatter,
  formatCompactDate,
  integerFormatter,
  percentFormatter,
} from "@/lib/brandops/format";
import type { MediaCampaignAction, MediaReport, MediaSignal } from "@/lib/brandops/types";

type MediaView = "executive" | "trend" | "campaigns";

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
    scale: { title: "Escalar", description: "", count: 0, items: [] },
    review: { title: "Revisar", description: "", count: 0, items: [] },
    monitor: { title: "Monitorar", description: "", count: 0, items: [] },
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

export default function MediaPage() {
  const [view, setView] = useState<MediaView>("executive");
  const [executiveSection, setExecutiveSection] = useState<"command" | "playbook" | "signals">("command");
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

  const isBrandLoading =
    Boolean(activeBrandId) && (isDatasetLoading || isReportLoading || !activeBrand);

  if (isBrandLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Aquisição"
          title="Performance Mídia"
          description={`Carregando os dados de mídia da loja ${selectedBrandName}.`}
          badge={`Período analisado: ${selectedPeriodLabel}`}
        />
        <div className="space-y-6 animate-pulse">
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
        description="Sincronize a Meta ou importe o CSV para acompanhar investimento, retorno e leitura gerencial da aquisição."
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Aquisição"
        title="Performance Mídia"
        description="Camada gerencial da Meta para decidir onde escalar, manter ou revisar verba e criativos no período ativo."
        badge={`Período analisado: ${selectedPeriodLabel}`}
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <div className="brandops-tabs">
              <button
                type="button"
                className="brandops-tab"
                data-active={view === "executive"}
                onClick={() => setView("executive")}
              >
                Visão executiva
              </button>
              <button
                type="button"
                className="brandops-tab"
                data-active={view === "trend"}
                onClick={() => setView("trend")}
              >
                Tendência
              </button>
              <button
                type="button"
                className="brandops-tab"
                data-active={view === "campaigns"}
                onClick={() => setView("campaigns")}
              >
                Campanhas
              </button>
            </div>
            <Link href="/integrations" className="brandops-button brandops-button-ghost">
              Ir para integrações
            </Link>
          </div>
        }
      />

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricCard
          label="Investimento"
          value={currencyFormatter.format(summary.spend)}
          help="Gasto ativo da Meta no período saneado."
        />
        <MetricCard
          label="Receita Meta atribuída"
          value={currencyFormatter.format(summary.purchaseValue)}
          accent="positive"
          help="Receita de compra atribuída pela Meta. Não substitui o faturado real da INK."
        />
        <MetricCard
          label="Compras Meta"
          value={integerFormatter.format(summary.purchases)}
          help="Volume de compras atribuídas pela plataforma."
        />
        <MetricCard
          label="ROAS atribuído"
          value={`${summary.attributedRoas.toFixed(2)}x`}
          help={signals.attributedRoas.description}
          accent={signalAccent(signals.attributedRoas)}
        />
      </section>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricCard
          label="CTR (todos)"
          value={percentFormatter.format(summary.ctrAll)}
          help={signals.ctrAll.description}
          accent={signalAccent(signals.ctrAll)}
        />
        <MetricCard
          label="CTR link"
          value={percentFormatter.format(summary.ctrLink)}
          help={signals.ctrLink.description}
          accent={signalAccent(signals.ctrLink)}
        />
        <MetricCard
          label="CPC"
          value={currencyFormatter.format(summary.cpc)}
          help={signals.cpc.description}
          accent={signalAccent(signals.cpc)}
        />
        <MetricCard
          label="CPA meta"
          value={summary.purchases ? currencyFormatter.format(summary.cpa) : "-"}
          help={signals.cpa.description}
          accent={signalAccent(signals.cpa)}
        />
      </section>

      {view === "executive" ? (
        <>
          <SurfaceCard>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <SectionHeading
                title="Modo executivo"
                description="Divida a operação entre sala de comando, playbook e sinais sem alongar a página."
              />
              <div className="brandops-subtabs">
                <button type="button" className="brandops-subtab" data-active={executiveSection === "command"} onClick={() => setExecutiveSection("command")}>Sala de comando</button>
                <button type="button" className="brandops-subtab" data-active={executiveSection === "playbook"} onClick={() => setExecutiveSection("playbook")}>Playbook</button>
                <button type="button" className="brandops-subtab" data-active={executiveSection === "signals"} onClick={() => setExecutiveSection("signals")}>Sinais</button>
              </div>
            </div>
          </SurfaceCard>

          {executiveSection === "command" ? (
          <section className="grid gap-6 xl:grid-cols-[1.18fr_0.82fr]">
            <SurfaceCard>
              <SectionHeading
                title="Investimento x retorno por dia"
                description="A curva mostra o ritmo de investimento diário e o quanto a Meta atribuiu de receita na mesma janela."
              />
              <div className="mt-5 h-[320px] min-w-0">
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
                description="Leitura rápida do que fazer agora com a verba e com as campanhas."
              />
              <div className="mt-5 grid gap-3">
                <article className="panel-muted p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                    {analysis.narrativeTitle}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                    {analysis.narrativeBody}
                  </p>
                </article>
                <article className="panel-muted p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                    Melhor sinal de escala
                  </p>
                  <p className="mt-2 font-semibold text-on-surface">
                    {bestScale ? bestScale.campaignName : "Sem campanha elegível"}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                    {report.commandRoom.bestScaleSummary ??
                      "Ainda não há dados suficientes para recomendar escala."}
                  </p>
                </article>

                <article className="panel-muted p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                    Principal ponto de revisão
                  </p>
                  <p className="mt-2 font-semibold text-on-surface">
                    {priorityReview ? priorityReview.campaignName : "Sem alerta crítico"}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                    {report.commandRoom.priorityReviewSummary ??
                      "Nenhuma campanha relevante apareceu com sinal forte de revisão nesta janela."}
                  </p>
                </article>

                <article className="panel-muted p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                    Leitura do período
                  </p>
                  <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                    {report.commandRoom.narrative}
                  </p>
                </article>
                {analysis.nextActions.length ? (
                  <article className="panel-muted p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                      Próximos passos
                    </p>
                    <div className="mt-3 space-y-2">
                      {analysis.nextActions.map((item) => (
                        <div key={item} className="rounded-xl border border-outline bg-surface px-3 py-2 text-sm text-on-surface-variant">
                          {item}
                        </div>
                      ))}
                    </div>
                  </article>
                ) : null}
              </div>
            </SurfaceCard>
          </section>
          ) : null}

          {executiveSection === "playbook" ? (
          <section className="grid gap-6 xl:grid-cols-3">
            {[playbook.scale, playbook.review, playbook.monitor].map((group) => (
              <SurfaceCard key={group.title}>
                <SectionHeading title={group.title} description={group.description} />
                <div className="mt-4 flex items-center justify-between">
                  <span className="status-chip">{group.count} campanha(s)</span>
                </div>
                <div className="mt-4 space-y-3">
                  {group.items.length ? (
                    group.items.map((campaign) => (
                      <div key={campaign.campaignName} className="panel-muted p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-on-surface">{campaign.campaignName}</p>
                            <p className="mt-1 text-xs text-on-surface-variant">{campaign.summary}</p>
                          </div>
                          <span className={`inline-flex items-center rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-wider ${actionClassName(campaign.action)}`}>
                            {actionLabel(campaign.action)}
                          </span>
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-on-surface-variant">
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
          ) : null}

          {executiveSection === "signals" ? (
          <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <SurfaceCard>
              <SectionHeading
                title="Top sinais do período"
                description="Indicadores auxiliares para entender qualidade de tráfego e pressão de custo."
              />
              <div className="mt-5 grid gap-3">
                <article className="panel-muted p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                    Campanha líder em verba
                  </p>
                  <div className="mt-2 flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-on-surface">
                        {topCampaignBySpend?.campaignName ?? "Sem campanha"}
                      </p>
                      <p className="mt-1 text-xs text-on-surface-variant">
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

                <article className="panel-muted p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                    Alcance e entrega
                  </p>
                  <p className="mt-2 font-headline text-2xl font-semibold text-on-surface">
                    {integerFormatter.format(summary.reach)}
                  </p>
                  <p className="mt-1 text-xs text-on-surface-variant">
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
              <div className="brandops-table-container rounded-none border-0">
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
                          <span className={`inline-flex items-center rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-wider ${actionClassName(campaign.action)}`}>
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
          ) : null}
        </>
      ) : null}

      {view === "trend" ? (
        <section className="grid gap-6 xl:grid-cols-2">
          <SurfaceCard>
            <SectionHeading
              title="Cadência do gasto"
              description="Acompanhe a subida ou queda do investimento ao longo dos dias."
            />
            <div className="mt-5 h-[320px] min-w-0">
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

          <SurfaceCard>
            <SectionHeading
              title="Eficiência diária"
              description="ROAS atribuído e compras ajudam a entender se o ganho de investimento veio com eficiência."
            />
            <div className="mt-5 h-[320px] min-w-0">
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
          <div className="brandops-table-container rounded-none border-0">
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
                      <span className={`inline-flex items-center rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-wider ${actionClassName(campaign.action)}`}>
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
