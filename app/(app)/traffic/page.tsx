"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ComposedChart,
  Line,
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
import { PageHeader, SectionHeading, SurfaceCard, TaskWorkspaceIntro, WorkspaceTabs } from "@/components/ui-shell";
import { fetchTrafficReport } from "@/lib/brandops/database";
import { APP_ROUTES } from "@/lib/brandops/routes";
import {
  currencyFormatter,
  formatCompactDate,
  integerFormatter,
  percentFormatter,
} from "@/lib/brandops/format";
import type { TrafficBreakdownRow, TrafficReport, TrafficSignal } from "@/lib/brandops/types";

type TrafficView = "executive" | "channels" | "detail";

const EMPTY_TRAFFIC_REPORT: TrafficReport = {
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
  story: "Ainda não há sessões suficientes no período para localizar com confiança onde o tráfego está performando melhor.",
  frictionSignal: "Quando houver volume suficiente, o Atlas passa a apontar onde o funil perde força entre sessão, carrinho, checkout e compra.",
  highlights: {
    topSource: null,
    topCampaign: null,
    topLanding: null,
    topRevenueLanding: null,
  },
  signals: {
    revenuePerSession: {
      tone: "neutral",
      title: "Amostra insuficiente",
      description: "Falta volume suficiente para uma leitura confiável.",
    },
    sessionToCartRate: {
      tone: "neutral",
      title: "Amostra insuficiente",
      description: "Falta volume suficiente para uma leitura confiável.",
    },
    checkoutRate: {
      tone: "neutral",
      title: "Amostra insuficiente",
      description: "Falta volume suficiente para uma leitura confiável.",
    },
    purchaseRate: {
      tone: "neutral",
      title: "Amostra insuficiente",
      description: "Falta volume suficiente para uma leitura confiável.",
    },
  },
  playbook: {
    scale: {
      title: "Escalar",
      description: "Entradas com boa relação entre volume, compra e receita por sessão.",
      count: 0,
      items: [],
    },
    review: {
      title: "Revisar",
      description: "Entradas com tráfego relevante, mas conversão ou monetização abaixo do esperado.",
      count: 0,
      items: [],
    },
    monitor: {
      title: "Monitorar",
      description: "Entradas ainda em observação, com volume baixo para decisão mais firme.",
      count: 0,
      items: [],
    },
  },
  analysis: {
    narrativeTitle: "Amostra insuficiente",
    narrativeBody:
      "Ainda não há sessões suficientes no período para decidir com segurança onde aumentar, revisar ou redistribuir o tráfego.",
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

function signalAccent(signal: TrafficSignal): "default" | "positive" | "warning" {
  if (signal.tone === "positive") return "positive";
  if (signal.tone === "warning") return "warning";
  return "default";
}

function maxValue(rows: TrafficBreakdownRow[], selector: (row: TrafficBreakdownRow) => number) {
  return rows.reduce((max, row) => Math.max(max, selector(row)), 0);
}

function barWidth(value: number, max: number) {
  if (max <= 0 || value <= 0) {
    return "0%";
  }

  return `${Math.max(10, Math.min(100, (value / max) * 100))}%`;
}

function BreakdownTable({
  title,
  description,
  rows,
  labelName,
}: {
  title: string;
  description: string;
  rows: TrafficBreakdownRow[];
  labelName: string;
}) {
  const maxSessions = maxValue(rows, (row) => row.sessions);
  const maxRevenue = maxValue(rows, (row) => row.purchaseRevenue);

  return (
    <SurfaceCard className="p-0 overflow-hidden">
      <div className="border-b border-outline p-5">
        <SectionHeading title={title} description={description} />
      </div>
      <div className="brandops-table-container atlas-table-shell">
        <table className="brandops-table-compact w-full min-w-[860px]">
          <thead>
            <tr>
              <th>{labelName}</th>
              <th className="text-right">Sessões</th>
              <th className="text-right">Tx. compra</th>
              <th className="text-right">Receita / sessão</th>
              <th className="text-right">Receita</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <td className="max-w-[380px]">
                  <div className="atlas-component-stack-tight">
                    <p className="truncate font-semibold text-on-surface">{row.label}</p>
                    <div className="h-1.5 rounded-full bg-surface-container">
                      <div
                        className="h-1.5 rounded-full bg-primary"
                        style={{ width: barWidth(row.sessions, maxSessions) }}
                      />
                    </div>
                  </div>
                </td>
                <td className="text-right font-semibold text-on-surface">
                  <div className="atlas-component-stack-tight">
                    <p>{integerFormatter.format(row.sessions)}</p>
                    <div className="flex justify-end">
                      <div className="h-1.5 w-20 rounded-full bg-surface-container">
                        <div
                          className="h-1.5 rounded-full bg-secondary"
                          style={{ width: barWidth(row.sessions, maxSessions) }}
                        />
                      </div>
                    </div>
                  </div>
                </td>
                <td className="text-right">{percentFormatter.format(row.purchaseRate)}</td>
                <td className="text-right">{currencyFormatter.format(row.revenuePerSession)}</td>
                <td className="text-right">
                  <div className="atlas-component-stack-tight">
                    <p className="font-semibold text-on-surface">
                      {currencyFormatter.format(row.purchaseRevenue)}
                    </p>
                    <div className="flex justify-end">
                      <div className="h-1.5 w-20 rounded-full bg-surface-container">
                        <div
                          className="h-1.5 rounded-full bg-tertiary"
                          style={{ width: barWidth(row.purchaseRevenue, maxRevenue) }}
                        />
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SurfaceCard>
  );
}

function PlaybookColumn({
  title,
  description,
  count,
  items,
}: {
  title: string;
  description: string;
  count: number;
  items: TrafficBreakdownRow[];
}) {
  return (
    <SurfaceCard>
      <SectionHeading
        title={title}
        description={`${description} ${count ? `${count} entrada(s) classificadas.` : "Sem entradas classificadas por enquanto."}`}
      />
      <div className="mt-5 atlas-component-stack-tight">
        {items.length ? (
          items.map((item) => (
            <article key={`${title}-${item.key}`} className="panel-muted p-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-on-surface">{item.label}</p>
                  <p className="mt-1 text-sm text-on-surface-variant">
                    {integerFormatter.format(item.sessions)} sessões
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-on-surface">
                    {currencyFormatter.format(item.purchaseRevenue)}
                  </p>
                  <p className="mt-1 text-[11px] leading-5 text-on-surface-variant">
                    {percentFormatter.format(item.purchaseRate)}
                  </p>
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="panel-muted p-3.5 text-sm text-on-surface-variant">
            O Atlas ainda não encontrou entradas suficientes nesta zona do playbook.
          </div>
        )}
      </div>
    </SurfaceCard>
  );
}

export default function TrafficPage() {
  const [view, setView] = useState<TrafficView>("channels");
  const [executiveSection, setExecutiveSection] = useState<"command" | "playbook" | "highlights">("command");
  const [report, setReport] = useState<TrafficReport>(EMPTY_TRAFFIC_REPORT);
  const [isReportLoading, setIsReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const {
    activeBrand,
    activeBrandId,
    brands,
    periodRange,
    selectedPeriodLabel,
    isLoading,
  } = useBrandOps();

  const selectedBrandName =
    activeBrand?.name ??
    brands.find((brand) => brand.id === activeBrandId)?.name ??
    "Loja";

  useEffect(() => {
    if (!activeBrandId) {
      setReport(EMPTY_TRAFFIC_REPORT);
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
        const nextReport = await fetchTrafficReport(
          currentBrandId,
          periodRange?.start ?? null,
          periodRange?.end ?? null,
        );

        if (!cancelled) {
          setReport(nextReport);
        }
      } catch (error) {
        if (!cancelled) {
          setReport(EMPTY_TRAFFIC_REPORT);
          setReportError(
            error instanceof Error
              ? error.message
              : "Não foi possível consolidar o relatório de tráfego.",
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

  const metrics = report.summary;
  const sources = report.sources;
  const campaigns = report.campaigns;
  const landingPages = report.landingPages;
  const topSource = report.highlights.topSource;
  const topCampaign = report.highlights.topCampaign;
  const topLanding = report.highlights.topLanding;
  const topRevenueLanding = report.highlights.topRevenueLanding;
  const signals = report.signals;
  const trendData = report.dailySeries;
  const playbook = report.playbook;
  const analysis = report.analysis;
  const primaryAction = analysis.nextActions[0] ?? null;

  const isBrandLoading =
    Boolean(activeBrandId) && (isLoading || isReportLoading || !activeBrand);

  if (isBrandLoading) {
    return (
      <div className="atlas-page-stack">
        <PageHeader
          eyebrow="Analytics"
          title="Tráfego Digital"
          description={`Carregando os dados de tráfego da loja ${selectedBrandName}.`}
        />
        <div className="atlas-page-stack animate-pulse">
          <div className="grid gap-4 md:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-24 rounded-xl bg-surface-container" />
            ))}
          </div>
          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
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
        description="Escolha uma marca para visualizar os dados de tráfego."
      />
    );
  }

  if (!activeBrand) {
    return (
      <EmptyState
        title={reportError ? "Relatório de tráfego indisponível" : "Dados da loja indisponíveis"}
        description={
          reportError ?? "Não foi possível consolidar o relatório de tráfego da loja selecionada."
        }
      />
    );
  }

  if (!metrics.sessions && !metrics.purchaseRevenue && !report.dailySeries.length) {
    return (
      <EmptyState
        title="Ainda não há dados de tráfego"
        description="Sincronize o GA4 em Integrações para acompanhar sessões, funil e receita por canal."
      />
    );
  }

  return (
    <div className="atlas-page-stack-compact">
      <PageHeader
        eyebrow="Analytics"
        title="Console de tráfego"
        description="Canais, funil e entradas do recorte atual."
        actions={
          <div className="flex min-w-0 flex-wrap items-center gap-2.5">
            <WorkspaceTabs
              items={[
                {
                  key: "traffic-executive",
                  label: "Resumo do recorte",
                  active: view === "executive",
                  onClick: () => setView("executive"),
                },
                {
                  key: "traffic-channels",
                  label: "Canais",
                  active: view === "channels",
                  onClick: () => setView("channels"),
                },
                {
                  key: "traffic-detail",
                  label: "Detalhamento",
                  active: view === "detail",
                  onClick: () => setView("detail"),
                },
              ]}
            />
            <Link href={APP_ROUTES.integrations} prefetch={false} className="brandops-button brandops-button-ghost">
              Ir para integrações
            </Link>
            <span className="atlas-inline-metric">{selectedBrandName}</span>
            <span className="atlas-inline-metric">{selectedPeriodLabel}</span>
          </div>
        }
      />

      <TaskWorkspaceIntro
        title="Localizar o gargalo de canal, landing page ou campanha."
        description="Comece por canais ou detalhamento para validar onde o funil perde força e onde a receita por sessão ainda se sustenta."
        primaryAction={primaryAction ?? analysis.narrativeTitle}
        primaryDescription="Abra o resumo do recorte só quando precisar consolidar os principais números da análise."
        supportItems={[
          {
            label: "Maior oportunidade",
            value: analysis.topOpportunity ?? "Sem oportunidade dominante",
            description: "Ponto do tráfego com melhor sinal para reforço no recorte.",
            tone: "positive",
          },
          {
            label: "Maior risco",
            value: analysis.topRisk ?? "Sem risco dominante",
            description: "Canal, campanha ou landing que merece revisão antes de redistribuir investimento.",
            tone: "warning",
          },
          {
            label: "Modo inicial",
            value: "Canais",
            description: "A página passa a abrir na investigação por entrada; o resumo numérico fica em aba secundária.",
            tone: "default",
          },
        ]}
      />

      <section className="atlas-kpi-grid xl:grid-cols-4">
        <AnalyticsKpiCard
          label="Sessões"
          value={integerFormatter.format(metrics.sessions)}
          description="Sessões totais registradas pelo GA4 no período."
          tone="info"
        />
        <AnalyticsKpiCard
          label="Usuários"
          value={integerFormatter.format(metrics.totalUsers)}
          description="Usuários totais no período."
          tone="default"
        />
        <AnalyticsKpiCard
          label="Receita GA4"
          value={currencyFormatter.format(metrics.purchaseRevenue)}
          description="Receita registrada no GA4. Não substitui a venda real da INK."
          tone={metrics.purchaseRevenue > 0 ? "positive" : "default"}
        />
        <AnalyticsKpiCard
          label="Receita por sessão"
          value={currencyFormatter.format(metrics.revenuePerSession)}
          description={signals.revenuePerSession.description}
          tone={signalAccent(signals.revenuePerSession)}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.32fr)_minmax(0,0.84fr)_minmax(0,0.84fr)]">
        <AnalyticsCalloutCard
          eyebrow={analysis.narrativeTitle}
          title="Diagnóstico principal"
          description={analysis.narrativeBody}
          footer={report.frictionSignal}
        />
        <AnalyticsCalloutCard
          eyebrow="Maior oportunidade"
          title={analysis.topOpportunity ?? "Sem oportunidade dominante"}
          description={
            topSource?.summary
              ? topSource.summary
              : "Assim que houver amostra suficiente, o Atlas aponta a entrada mais promissora."
          }
          tone="positive"
          footer={topSource?.label ?? "Sem canal em destaque"}
        />
        <AnalyticsCalloutCard
          eyebrow="Revisar primeiro"
          title={analysis.topRisk ?? signals.purchaseRate.title}
          description={primaryAction ?? signals.purchaseRate.description}
          tone="warning"
          footer={topCampaign?.label ?? "Sem campanha em alerta"}
        />
      </section>

      <details className="atlas-disclosure">
        <summary className="atlas-disclosure-summary">
          Indicadores auxiliares do funil
          <span className="atlas-disclosure-chevron">abrir</span>
        </summary>
        <div className="atlas-disclosure-body">
          <section className="grid gap-3 sm:grid-cols-3">
            <AnalyticsKpiCard
              label="Sessão → carrinho"
              value={percentFormatter.format(metrics.sessionToCartRate)}
              description={signals.sessionToCartRate.description}
              tone={signalAccent(signals.sessionToCartRate)}
            />
            <AnalyticsKpiCard
              label="Carrinho → checkout"
              value={percentFormatter.format(metrics.checkoutRate)}
              description={signals.checkoutRate.description}
              tone={signalAccent(signals.checkoutRate)}
            />
            <AnalyticsKpiCard
              label="Sessão → compra"
              value={percentFormatter.format(metrics.purchaseRate)}
              description={signals.purchaseRate.description}
              tone={signalAccent(signals.purchaseRate)}
            />
          </section>
        </div>
      </details>

      {view === "executive" ? (
        <>
          <SurfaceCard>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <SectionHeading
                title="Modo executivo"
                description="Comando, ações e destaques do período."
              />
              <WorkspaceTabs
                items={[
                  {
                    key: "traffic-command",
                    label: "Comando",
                    active: executiveSection === "command",
                    onClick: () => setExecutiveSection("command"),
                  },
                  {
                    key: "traffic-actions",
                    label: "Ações",
                    active: executiveSection === "playbook",
                    onClick: () => setExecutiveSection("playbook"),
                  },
                  {
                    key: "traffic-highlights",
                    label: "Destaques",
                    active: executiveSection === "highlights",
                    onClick: () => setExecutiveSection("highlights"),
                  },
                ]}
              />
            </div>
          </SurfaceCard>

          {executiveSection === "command" ? (
          <section className="grid gap-5">
            <SurfaceCard>
              <SectionHeading
                title="Tráfego x receita por dia"
                description="Curva diária ampla para detectar quando a sessão sobe sem receita ou quando a monetização passa a se concentrar em poucos dias."
              />
              <div className="mt-5 h-[360px] min-w-0 xl:h-[420px]">
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
                      formatter={(value, name) => {
                        if (name === "purchaseRevenue") {
                          return [currencyFormatter.format(Number(value ?? 0)), "Receita GA4"];
                        }

                        return [integerFormatter.format(Number(value ?? 0)), "Sessões"];
                      }}
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
                      dataKey="sessions"
                      stroke="var(--color-secondary)"
                      fill="var(--color-secondary-container)"
                      fillOpacity={0.35}
                      strokeWidth={2}
                    />
                    <Area
                      yAxisId="right"
                      type="monotone"
                      dataKey="purchaseRevenue"
                      stroke="var(--color-primary)"
                      fill="var(--color-primary-container)"
                      fillOpacity={0.22}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </SurfaceCard>

            <SurfaceCard>
              <SectionHeading
                title="Sinais prioritários"
                description="Leitura curta e horizontal do que importa antes de qualquer aprofundamento."
              />
              <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.28fr)_minmax(0,0.86fr)_minmax(0,0.86fr)]">
                <article className="atlas-soft-subcard p-3.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-on-surface-variant">
                    Diagnóstico principal
                  </p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-on-surface">
                    {analysis.narrativeTitle}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                    {analysis.narrativeBody}
                  </p>
                </article>
                <article className="atlas-soft-subcard p-3.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-on-surface-variant">
                    Maior oportunidade
                  </p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-on-surface">
                    {topSource?.label ?? analysis.topOpportunity ?? "Sem oportunidade dominante"}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                    {topSource?.summary
                      ? topSource.summary
                      : "Assim que houver amostra suficiente, o Atlas aponta a entrada mais promissora."}
                  </p>
                </article>
                <article className="atlas-soft-subcard p-3.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-on-surface-variant">
                    Revisar primeiro
                  </p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-on-surface">
                    {topCampaign?.label ?? analysis.topRisk ?? signals.purchaseRate.title}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                    {signals.purchaseRate.description}
                  </p>
                </article>
              </div>
            </SurfaceCard>

            <SurfaceCard>
              <SectionHeading
                title="Próximos passos"
                description="Sequência operacional em largura total, sem esmagar o texto em colunas estreitas."
              />
              <div className="mt-5 grid gap-3">
                {analysis.nextActions.length ? (
                  analysis.nextActions.map((action) => (
                    <article
                      key={action}
                      className="rounded-xl border border-outline/78 bg-surface-container-low/72 px-4 py-3 text-sm leading-6 text-on-surface-variant"
                    >
                      {action}
                    </article>
                  ))
                ) : (
                  <article className="rounded-xl border border-outline/78 bg-surface-container-low/72 px-4 py-3 text-sm leading-6 text-on-surface-variant">
                    Ainda não há um próximo passo dominante para o recorte atual.
                  </article>
                )}
              </div>
            </SurfaceCard>

            <SurfaceCard>
              <SectionHeading
                title="Entradas em foco"
                description="Os pontos de entrada que mais merecem o próximo clique."
              />
              <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.16fr)_minmax(0,0.92fr)_minmax(0,0.92fr)]">
                <article className="atlas-soft-subcard p-3.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-on-surface-variant">
                    Source / Medium em foco
                  </p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-on-surface">
                    {topSource?.label ?? "Sem canal em foco"}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                    {topSource?.summary
                      ? topSource.summary
                      : "Sem leitura suficiente para destacar um canal."}
                  </p>
                </article>
                <article className="atlas-soft-subcard p-3.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-on-surface-variant">
                    Campanha em foco
                  </p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-on-surface">
                    {topCampaign?.label ?? "Sem campanha em foco"}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                    {topCampaign?.summary
                      ? topCampaign.summary
                      : "Sem leitura suficiente para destacar uma campanha."}
                  </p>
                </article>
                <article className="atlas-soft-subcard p-3.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-on-surface-variant">
                    Landing page em foco
                  </p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-on-surface">
                    {topLanding?.label ?? "Sem landing em foco"}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                    {topLanding?.summary
                      ? topLanding.summary
                      : "Sem leitura suficiente para destacar uma landing page."}
                  </p>
                </article>
              </div>
            </SurfaceCard>
          </section>
          ) : null}

          {executiveSection === "playbook" ? (
          <section className="grid gap-4 xl:grid-cols-3">
            <PlaybookColumn {...playbook.scale} />
            <PlaybookColumn {...playbook.review} />
            <PlaybookColumn {...playbook.monitor} />
          </section>
          ) : null}

          {executiveSection === "playbook" ? (
          <SurfaceCard>
            <SectionHeading
              title="Próximos passos"
              description="Plano de ação do Atlas para destravar leitura, qualidade e monetização do tráfego."
            />
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {analysis.nextActions.length ? (
                analysis.nextActions.map((action) => (
                  <article key={action} className="panel-muted p-3.5 text-sm leading-6 text-on-surface-variant">
                    {action}
                  </article>
                ))
              ) : (
                <article className="panel-muted p-3.5 text-sm leading-6 text-on-surface-variant md:col-span-3">
                  Ainda não há um próximo passo dominante para o recorte atual.
                </article>
              )}
            </div>
          </SurfaceCard>
          ) : null}

          {executiveSection === "highlights" ? (
          <section className="grid gap-4 xl:grid-cols-3">
            <SurfaceCard>
              <SectionHeading
                title="Source / Medium"
                description="Canal com melhor entrega de receita e sessões."
              />
              <div className="mt-5 atlas-component-stack-tight">
                <p className="font-semibold text-on-surface">{topSource?.label ?? "Sem canal"}</p>
                <p className="text-sm leading-6 text-on-surface-variant">
                  {topSource?.summary
                    ? topSource.summary
                    : "Sem leitura suficiente para destacar um canal."}
                </p>
              </div>
            </SurfaceCard>

            <SurfaceCard>
              <SectionHeading
                title="Campanha em foco"
                description="Campanha com melhor contribuição no recorte."
              />
      <div className="mt-5 atlas-component-stack-tight">
                <p className="font-semibold text-on-surface">{topCampaign?.label ?? "Sem campanha"}</p>
                <p className="text-sm leading-6 text-on-surface-variant">
                  {topCampaign?.summary
                    ? topCampaign.summary
                    : "Sem leitura suficiente para destacar uma campanha."}
                </p>
              </div>
            </SurfaceCard>

            <SurfaceCard>
              <SectionHeading
                title="Landing page líder"
                description="Página de entrada que mais converteu receita."
              />
              <div className="mt-5 atlas-component-stack-tight">
                <p className="font-semibold text-on-surface">{topLanding?.label ?? "Sem landing page"}</p>
                <p className="text-sm leading-6 text-on-surface-variant">
                  {topLanding?.summary
                    ? topLanding.summary
                    : "Sem leitura suficiente para destacar uma landing page."}
                </p>
              </div>
            </SurfaceCard>
          </section>
          ) : null}
        </>
      ) : null}

      {view === "channels" ? (
        <section className="grid gap-4">
          <BreakdownTable
            title="Source / Medium"
            description="Canais empilhados verticalmente para evitar rolagem lateral e facilitar leitura operacional."
            rows={sources}
            labelName="Canal"
          />
          <BreakdownTable
            title="Campanhas"
            description="Campanhas com melhor participação de sessões e receita no período."
            rows={campaigns}
            labelName="Campanha"
          />
          <BreakdownTable
            title="Landing pages"
            description="Páginas de entrada que mais puxaram sessões e compra."
            rows={landingPages}
            labelName="Landing page"
          />
        </section>
      ) : null}

      {view === "detail" ? (
        <section className="grid gap-4">
          <SurfaceCard>
            <SectionHeading
              title="Conversão diária"
              description="Compra por sessão e receita por sessão ao longo da janela selecionada."
            />
            <div className="mt-5 h-[360px] min-w-0 xl:h-[420px]">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={280}>
                <ComposedChart data={trendData}>
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
                      name === "purchaseRate"
                        ? [percentFormatter.format(Number(value ?? 0)), "Sessão → compra"]
                        : [currencyFormatter.format(Number(value ?? 0)), "Receita / sessão"]
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
                    dataKey="revenuePerSession"
                    stroke="var(--color-primary)"
                    fill="var(--color-primary-container)"
                    fillOpacity={0.25}
                    strokeWidth={2}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="purchaseRate"
                    stroke="var(--color-secondary)"
                    strokeWidth={2}
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </SurfaceCard>

          <section className="grid gap-4 xl:grid-cols-[minmax(0,0.66fr)_minmax(0,0.34fr)]">
            <SurfaceCard>
              <SectionHeading
                title="Receita por sessão"
                description="Valor médio que cada sessão deixa na janela analisada."
              />
              <div className="mt-5">
                <p className="font-headline text-[clamp(1.8rem,4vw,2.4rem)] font-semibold text-on-surface">
                  {currencyFormatter.format(metrics.revenuePerSession)}
                </p>
              </div>
            </SurfaceCard>

            <SurfaceCard>
              <SectionHeading
                title="Página mais valiosa"
                description="Landing page que mais converteu receita no período."
              />
              <div className="mt-5 atlas-component-stack-tight">
                <p className="break-words font-semibold text-on-surface">
                  {topRevenueLanding?.label ?? "Sem página líder"}
                </p>
                <p className="text-sm leading-6 text-on-surface-variant">
                  {topRevenueLanding?.summary
                    ? topRevenueLanding.summary
                    : "Sem leitura suficiente para destacar uma página."}
                </p>
              </div>
            </SurfaceCard>
          </section>
        </section>
      ) : null}
    </div>
  );
}
