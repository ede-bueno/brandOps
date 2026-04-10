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
} from "@/components/analytics/AnalyticsPrimitives";
import { EmptyState } from "@/components/EmptyState";
import { useBrandOps } from "@/components/BrandOpsProvider";
import {
  OperationalMetric,
  OperationalMetricStrip,
  PageHeader,
  SectionHeading,
  StackItem,
  SurfaceCard,
  WorkspaceRailSection,
  WorkspaceSplitLayout,
  WorkspaceTabs,
} from "@/components/ui-shell";
import { fetchTrafficReport } from "@/lib/brandops/database";
import { currencyFormatter, formatCompactDate, integerFormatter, percentFormatter } from "@/lib/brandops/format";
import { APP_ROUTES } from "@/lib/brandops/routes";
import type { TrafficBreakdownRow, TrafficReport, TrafficSignal } from "@/lib/brandops/types";

type TrafficView = "home" | "executive" | "channels" | "detail";

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
    revenuePerSession: { tone: "neutral", title: "Amostra insuficiente", description: "Falta volume suficiente para uma leitura confiável." },
    sessionToCartRate: { tone: "neutral", title: "Amostra insuficiente", description: "Falta volume suficiente para uma leitura confiável." },
    checkoutRate: { tone: "neutral", title: "Amostra insuficiente", description: "Falta volume suficiente para uma leitura confiável." },
    purchaseRate: { tone: "neutral", title: "Amostra insuficiente", description: "Falta volume suficiente para uma leitura confiável." },
  },
  playbook: {
    scale: { title: "Escalar", description: "Entradas com boa relação entre volume, compra e receita por sessão.", count: 0, items: [] },
    review: { title: "Revisar", description: "Entradas com tráfego relevante, mas conversão ou monetização abaixo do esperado.", count: 0, items: [] },
    monitor: { title: "Monitorar", description: "Entradas ainda em observação, com volume baixo para decisão mais firme.", count: 0, items: [] },
  },
  analysis: {
    narrativeTitle: "Amostra insuficiente",
    narrativeBody: "Ainda não há sessões suficientes no período para decidir com segurança onde aumentar, revisar ou redistribuir o tráfego.",
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
  if (max <= 0 || value <= 0) return "0%";
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
                      <div className="h-1.5 rounded-full bg-primary" style={{ width: barWidth(row.sessions, maxSessions) }} />
                    </div>
                  </div>
                </td>
                <td className="text-right font-semibold text-on-surface">{integerFormatter.format(row.sessions)}</td>
                <td className="text-right">{percentFormatter.format(row.purchaseRate)}</td>
                <td className="text-right">{currencyFormatter.format(row.revenuePerSession)}</td>
                <td className="text-right">
                  <div className="atlas-component-stack-tight">
                    <p className="font-semibold text-on-surface">{currencyFormatter.format(row.purchaseRevenue)}</p>
                    <div className="flex justify-end">
                      <div className="h-1.5 w-20 rounded-full bg-surface-container">
                        <div className="h-1.5 rounded-full bg-tertiary" style={{ width: barWidth(row.purchaseRevenue, maxRevenue) }} />
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
        {items.length ? items.map((item) => (
          <article key={`${title}-${item.key}`} className="panel-muted p-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-on-surface">{item.label}</p>
                <p className="mt-1 text-sm text-on-surface-variant">{integerFormatter.format(item.sessions)} sessões</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-on-surface">{currencyFormatter.format(item.purchaseRevenue)}</p>
                <p className="mt-1 text-[11px] leading-5 text-on-surface-variant">{percentFormatter.format(item.purchaseRate)}</p>
              </div>
            </div>
          </article>
        )) : (
          <div className="panel-muted p-3.5 text-sm text-on-surface-variant">
            O Atlas ainda não encontrou entradas suficientes nesta zona do playbook.
          </div>
        )}
      </div>
    </SurfaceCard>
  );
}

export default function TrafficPage() {
  const [view, setView] = useState<TrafficView>("home");
  const [report, setReport] = useState<TrafficReport>(EMPTY_TRAFFIC_REPORT);
  const [isReportLoading, setIsReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const { activeBrand, activeBrandId, brands, periodRange, selectedPeriodLabel, isLoading } = useBrandOps();

  const selectedBrandName = activeBrand?.name ?? brands.find((brand) => brand.id === activeBrandId)?.name ?? "Loja";

  useEffect(() => {
    if (!activeBrandId) {
      setReport(EMPTY_TRAFFIC_REPORT);
      setReportError(null);
      setIsReportLoading(false);
      return;
    }

    let cancelled = false;
    const currentBrandId = activeBrandId;
    async function loadReport() {
      setIsReportLoading(true);
      setReportError(null);
      try {
        const nextReport = await fetchTrafficReport(
          currentBrandId,
          periodRange?.start ?? null,
          periodRange?.end ?? null,
        );
        if (!cancelled) setReport(nextReport);
      } catch (error) {
        if (!cancelled) {
          setReport(EMPTY_TRAFFIC_REPORT);
          setReportError(error instanceof Error ? error.message : "Não foi possível consolidar o relatório de tráfego.");
        }
      } finally {
        if (!cancelled) setIsReportLoading(false);
      }
    }
    void loadReport();
    return () => {
      cancelled = true;
    };
  }, [activeBrandId, periodRange?.end, periodRange?.start]);

  const metrics = report.summary;
  const signals = report.signals;
  const analysis = report.analysis;
  const playbook = report.playbook;
  const topSource = report.highlights.topSource;
  const topCampaign = report.highlights.topCampaign;
  const topLanding = report.highlights.topLanding;
  const topRevenueLanding = report.highlights.topRevenueLanding;
  const primaryAction = analysis.nextActions[0] ?? null;

  const isBrandLoading = Boolean(activeBrandId) && (isLoading || isReportLoading || !activeBrand);

  if (isBrandLoading) {
    return (
      <div className="atlas-page-stack">
        <PageHeader eyebrow="Aquisição" title="Tráfego Digital" description={`Carregando os dados de tráfego da loja ${selectedBrandName}.`} />
        <div className="atlas-page-stack animate-pulse">
          <div className="grid gap-4 md:grid-cols-4">{[...Array(4)].map((_, i) => <div key={i} className="h-24 rounded-xl bg-surface-container" />)}</div>
          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]"><div className="h-[340px] rounded-2xl bg-surface-container" /><div className="h-[340px] rounded-2xl bg-surface-container" /></div>
        </div>
      </div>
    );
  }

  if (!activeBrandId && !activeBrand) {
    return (
      <EmptyState
        title="Nenhuma marca selecionada"
        description="Escolha uma marca para visualizar os dados de tráfego."
        ctaHref={null}
        ctaLabel={null}
      />
    );
  }
  if (!activeBrand) {
    return (
      <EmptyState
        title={reportError ? "Relatório de tráfego indisponível" : "Dados da loja indisponíveis"}
        description={reportError ?? "Não foi possível consolidar o relatório de tráfego da loja selecionada."}
        ctaHref={APP_ROUTES.integrations}
        ctaLabel="Revisar integrações"
        variant="error"
      />
    );
  }
  if (!metrics.sessions && !metrics.purchaseRevenue && !report.dailySeries.length) {
    return (
      <EmptyState
        title="Ainda não há dados de tráfego"
        description="Sincronize o GA4 em Integrações para acompanhar sessões, funil e receita por canal."
        ctaHref={APP_ROUTES.integrations}
        ctaLabel="Abrir integrações"
      />
    );
  }

  return (
    <div className="atlas-page-stack-compact">
      <PageHeader
        eyebrow="Aquisição"
        title="Tráfego Digital"
        description="Sessões, conversão e entradas que sustentam o recorte atual."
        actions={
          <div className="flex min-w-0 flex-wrap items-center gap-2.5">
            <WorkspaceTabs
              items={[
                { key: "traffic-home", label: "Home", active: view === "home", onClick: () => setView("home") },
                { key: "traffic-executive", label: "Executivo", active: view === "executive", onClick: () => setView("executive") },
                { key: "traffic-channels", label: "Canais", active: view === "channels", onClick: () => setView("channels") },
                { key: "traffic-detail", label: "Detalhe", active: view === "detail", onClick: () => setView("detail") },
              ]}
            />
            <Link href={APP_ROUTES.integrations} prefetch={false} className="brandops-button brandops-button-ghost">Ir para integrações</Link>
            <span className="atlas-inline-metric">{selectedBrandName}</span>
            <span className="atlas-inline-metric">{selectedPeriodLabel}</span>
          </div>
        }
      />

      <OperationalMetricStrip>
        <OperationalMetric
          label="Sessões"
          value={integerFormatter.format(metrics.sessions)}
          helper="Sessões totais registradas pelo GA4."
          tone="info"
        />
        <OperationalMetric
          label="Usuários"
          value={integerFormatter.format(metrics.totalUsers)}
          helper="Usuários únicos no recorte."
        />
        <OperationalMetric
          label="Receita GA4"
          value={currencyFormatter.format(metrics.purchaseRevenue)}
          helper="Receita de compra atribuída no GA4."
          tone={metrics.purchaseRevenue > 0 ? "positive" : "default"}
        />
        <OperationalMetric
          label="Receita por sessão"
          value={currencyFormatter.format(metrics.revenuePerSession)}
          helper={signals.revenuePerSession.description}
          tone={signalAccent(signals.revenuePerSession)}
        />
      </OperationalMetricStrip>

      {(view === "home" || view === "executive") && (
        <>
          <WorkspaceSplitLayout
            layout="wide-rail"
            main={
              <SurfaceCard>
                <SectionHeading
                  title={view === "home" ? "Curva do recorte" : "Tráfego x receita por dia"}
                  description={
                    view === "home"
                      ? "Sessões e receita por dia para localizar pressão, concentração e resposta do funil."
                      : "Curva principal para confirmar volume, monetização e pressão diária."
                  }
                />
                <div className="mt-5 h-[300px] min-w-0 xl:h-[360px]">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={240}>
                    <AreaChart data={report.dailySeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-outline-variant)" vertical={false} />
                      <XAxis dataKey="date" tickFormatter={formatCompactDate} stroke="var(--color-on-surface-variant)" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                      <YAxis yAxisId="left" stroke="var(--color-on-surface-variant)" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                      <YAxis yAxisId="right" orientation="right" stroke="var(--color-on-surface-variant)" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                      <Tooltip
                        formatter={(value, name) => name === "purchaseRevenue" ? [currencyFormatter.format(Number(value ?? 0)), "Receita GA4"] : [integerFormatter.format(Number(value ?? 0)), "Sessões"]}
                        labelFormatter={(label) => formatCompactDate(String(label ?? ""))}
                        contentStyle={{ borderRadius: 14, border: "1px solid var(--color-outline)", backgroundColor: "var(--color-surface)" }}
                      />
                      <Area yAxisId="left" type="monotone" dataKey="sessions" stroke="var(--color-secondary)" fill="var(--color-secondary-container)" fillOpacity={0.35} strokeWidth={2} />
                      <Area yAxisId="right" type="monotone" dataKey="purchaseRevenue" stroke="var(--color-primary)" fill="var(--color-primary-container)" fillOpacity={0.18} strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </SurfaceCard>
            }
            rail={
              <>
                <WorkspaceRailSection
                  title={view === "home" ? "Sinal dominante" : "Leitura lateral"}
                  description="Canal, campanha e landing que ajudam a decidir o próximo clique."
                >
                  <StackItem tone="positive" title={topSource?.label ?? "Sem canal dominante"} description={topSource?.summary ?? "Ainda não há um canal com massa suficiente para liderar a decisão."} />
                  <StackItem tone="default" title={topCampaign?.label ?? "Sem campanha em foco"} description={topCampaign?.summary ?? "Abra Canais para localizar a campanha que mais sustenta volume e compra."} />
                  <StackItem tone="info" title={topLanding?.label ?? "Sem landing líder"} description={topLanding?.summary ?? "Ainda não há página de entrada com destaque suficiente no recorte."} />
                </WorkspaceRailSection>
                <WorkspaceRailSection
                  title="Pressão do funil"
                  description="Taxas curtas para confirmar atrito antes de aprofundar."
                >
                  <OperationalMetricStrip baseColumns={1} desktopColumns={1}>
                    <OperationalMetric label="Sessão → carrinho" value={percentFormatter.format(metrics.sessionToCartRate)} helper={signals.sessionToCartRate.description} tone={signalAccent(signals.sessionToCartRate)} size="compact" />
                    <OperationalMetric label="Carrinho → checkout" value={percentFormatter.format(metrics.checkoutRate)} helper={signals.checkoutRate.description} tone={signalAccent(signals.checkoutRate)} size="compact" />
                    <OperationalMetric label="Sessão → compra" value={percentFormatter.format(metrics.purchaseRate)} helper={signals.purchaseRate.description} tone={signalAccent(signals.purchaseRate)} size="compact" />
                  </OperationalMetricStrip>
                </WorkspaceRailSection>
              </>
            }
          />

          <WorkspaceSplitLayout
            layout="wide-rail"
            main={
              <SurfaceCard>
                <SectionHeading
                  title={analysis.narrativeTitle || "Direção do funil"}
                  description="Leitura principal do recorte para decidir o próximo clique."
                />
                <div className="mt-5 atlas-component-stack">
                  <div className="atlas-component-stack-tight">
                    <h2 className="font-headline text-[clamp(1.45rem,2.4vw,2.1rem)] font-semibold tracking-tight text-on-surface">
                      {analysis.topOpportunity ?? "O funil ainda precisa de confirmação antes de escalar"}
                    </h2>
                    <p className="text-sm leading-6 text-on-surface-variant">{analysis.narrativeBody}</p>
                    <p className="text-sm font-semibold text-on-surface">
                      {primaryAction ?? report.frictionSignal}
                    </p>
                  </div>
                  {view === "executive" && analysis.nextActions.length ? (
                    <div className="grid gap-3 md:grid-cols-3">
                      {analysis.nextActions.slice(0, 3).map((action) => (
                        <article key={action} className="panel-muted p-3.5 text-sm leading-6 text-on-surface-variant">
                          {action}
                        </article>
                      ))}
                    </div>
                  ) : null}
                </div>
              </SurfaceCard>
            }
            rail={
              <>
                <WorkspaceRailSection
                  title="O que mais converte"
                  description="Entrada com melhor monetização por sessão."
                >
                  <p className="font-semibold text-on-surface">{topRevenueLanding?.label ?? "Sem página líder"}</p>
                  <p className="atlas-analytics-copy">{topRevenueLanding?.summary ?? "Ainda não há uma landing dominante em receita por sessão."}</p>
                </WorkspaceRailSection>
                {view === "home" ? (
                  <WorkspaceRailSection
                    title="Próximo foco"
                    description="Direção curta para abrir canais ou detalhamento."
                  >
                    <StackItem
                      tone="positive"
                      title={topCampaign?.label ?? "Sem campanha em foco"}
                      description={topCampaign?.summary ?? "Abra Canais para localizar a campanha que mais sustenta volume e compra."}
                    />
                  </WorkspaceRailSection>
                ) : null}
              </>
            }
          />
        </>
      )}

      {view === "executive" && (
        <>
          <section className="grid items-start gap-4 xl:grid-cols-3">
            <PlaybookColumn {...playbook.scale} />
            <PlaybookColumn {...playbook.review} />
            <PlaybookColumn {...playbook.monitor} />
          </section>
        </>
      )}

      {view === "channels" && (
        <section className="grid items-start gap-4">
          <BreakdownTable title="Source / Medium" description="Canais em largura total para leitura operacional de sessão, compra e receita." rows={report.sources} labelName="Canal" />
          <BreakdownTable title="Campanhas" description="Campanhas com melhor participação de sessões e receita no período." rows={report.campaigns} labelName="Campanha" />
          <BreakdownTable title="Landing pages" description="Páginas de entrada que mais puxaram sessões e compra." rows={report.landingPages} labelName="Landing page" />
        </section>
      )}

      {view === "detail" && (
        <section className="grid items-start gap-4">
          <SurfaceCard>
            <SectionHeading title="Conversão diária" description="Receita por sessão e taxa de compra ao longo da janela analisada." />
            <div className="mt-5 h-[360px] min-w-0 xl:h-[420px]">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={280}>
                <ComposedChart data={report.dailySeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-outline-variant)" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={formatCompactDate} stroke="var(--color-on-surface-variant)" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="left" stroke="var(--color-on-surface-variant)" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" stroke="var(--color-on-surface-variant)" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value, name) => name === "purchaseRate" ? [percentFormatter.format(Number(value ?? 0)), "Sessão → compra"] : [currencyFormatter.format(Number(value ?? 0)), "Receita / sessão"]}
                    labelFormatter={(label) => formatCompactDate(String(label ?? ""))}
                    contentStyle={{ borderRadius: 14, border: "1px solid var(--color-outline)", backgroundColor: "var(--color-surface)" }}
                  />
                  <Area yAxisId="left" type="monotone" dataKey="revenuePerSession" stroke="var(--color-primary)" fill="var(--color-primary-container)" fillOpacity={0.25} strokeWidth={2} />
                  <Line yAxisId="right" type="monotone" dataKey="purchaseRate" stroke="var(--color-secondary)" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </SurfaceCard>

          <section className="grid items-start gap-4 xl:grid-cols-[minmax(0,0.66fr)_minmax(0,0.34fr)]">
            <SurfaceCard>
              <SectionHeading title="Receita por sessão" description="Valor médio que cada sessão deixa na janela analisada." />
              <div className="mt-5">
                <p className="font-headline text-[clamp(1.8rem,4vw,2.4rem)] font-semibold text-on-surface">{currencyFormatter.format(metrics.revenuePerSession)}</p>
              </div>
            </SurfaceCard>
            <SurfaceCard>
              <SectionHeading title="Página mais valiosa" description="Landing page com melhor entrega de receita no período." />
              <div className="mt-5 atlas-component-stack-tight">
                <p className="break-words font-semibold text-on-surface">{topRevenueLanding?.label ?? "Sem página líder"}</p>
                <p className="text-sm leading-6 text-on-surface-variant">{topRevenueLanding?.summary ?? "Sem leitura suficiente para destacar uma página."}</p>
              </div>
            </SurfaceCard>
          </section>
        </section>
      )}
    </div>
  );
}
