"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download, TrendingDown, TrendingUp } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { MetricCard } from "@/components/MetricCard";
import { useBrandOps } from "@/components/BrandOpsProvider";
import { PageHeader, SectionHeading, SurfaceCard } from "@/components/ui-shell";
import {
  currencyFormatter,
  formatCompactDate,
  integerFormatter,
  percentFormatter,
} from "@/lib/brandops/format";
import { buildProductInsights } from "@/lib/brandops/metrics";
import type {
  BrandDataset,
  ProductDecisionAction,
  ProductInsightClassification,
  ProductInsightRow,
} from "@/lib/brandops/types";

const classificationMeta: Record<
  ProductInsightClassification,
  {
    label: string;
    color: string;
    chipClass: string;
    bullets: string[];
  }
> = {
  validated: {
    label: "Validados",
    color: "#16a34a",
    chipClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    bullets: [
      "Garanta estoque visual e destaque a estampa nas vitrines e coleções.",
      "Teste aumento de investimento com públicos parecidos.",
      "Use reviews e provas sociais para acelerar conversão.",
    ],
  },
  opportunity: {
    label: "Oportunidades",
    color: "#7c3aed",
    chipClass: "bg-violet-50 text-violet-700 border-violet-200",
    bullets: [
      "Dê mais visibilidade em campanhas, home e coleções.",
      "Teste a estampa em mais tipos de peça para ganhar amplitude.",
      "Agrupe com estamparia validada em campanhas de catálogo.",
    ],
  },
  low_traffic: {
    label: "Pouco tráfego",
    color: "#f59e0b",
    chipClass: "bg-amber-50 text-amber-700 border-amber-200",
    bullets: [
      "Acompanhe antes de tomar decisão definitiva sobre a estampa.",
      "Aumente a exposição mínima para validar interesse real.",
      "Priorize 200-300 visualizações antes de descartar.",
    ],
  },
  review: {
    label: "Revisar",
    color: "#ef4444",
    chipClass: "bg-rose-50 text-rose-700 border-rose-200",
    bullets: [
      "Reveja mockup, legibilidade e enquadramento da arte.",
      "Teste outra peça, outra cor base ou outro recorte de thumb.",
      "Evite escalar tráfego até corrigir a fricção visual.",
    ],
  },
};

const decisionMeta: Record<
  ProductDecisionAction,
  {
    label: string;
    description: string;
    chipClass: string;
    sectionClass: string;
  }
> = {
  scale_now: {
    label: "Escalar agora",
    description: "Sinal forte de intenção e validação. Merece ganhar distribuição.",
    chipClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    sectionClass: "border-emerald-200 bg-emerald-50/70",
  },
  boost_traffic: {
    label: "Dar mais tráfego",
    description: "A estampa é promissora, mas ainda precisa de volume para fechar a leitura.",
    chipClass: "bg-sky-50 text-sky-700 border-sky-200",
    sectionClass: "border-sky-200 bg-sky-50/70",
  },
  review_listing: {
    label: "Revisar vitrine",
    description: "Recebe atenção, mas não converte o suficiente. O gargalo parece estar na apresentação.",
    chipClass: "bg-rose-50 text-rose-700 border-rose-200",
    sectionClass: "border-rose-200 bg-rose-50/70",
  },
  watch: {
    label: "Observar",
    description: "Sem amostra ou sinal forte o bastante. Ainda não é hora de escalar nem descartar.",
    chipClass: "bg-slate-50 text-slate-700 border-slate-200",
    sectionClass: "border-slate-200 bg-slate-50/80",
  },
};

function startOfDay(date: Date) {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function buildPreviousWindowRows(
  brand: BrandDataset,
  currentRows: BrandDataset["ga4ItemDailyPerformance"],
) {
  if (!currentRows.length) {
    return [];
  }

  const dates = currentRows
    .map((row) => startOfDay(new Date(`${row.date}T00:00:00`)))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((left, right) => left.getTime() - right.getTime());

  const start = dates[0];
  const end = dates[dates.length - 1];
  const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
  const previousEnd = new Date(start);
  previousEnd.setDate(previousEnd.getDate() - 1);
  const previousStart = new Date(previousEnd);
  previousStart.setDate(previousStart.getDate() - (days - 1));

  const startKey = toDateKey(previousStart);
  const endKey = toDateKey(previousEnd);
  return brand.ga4ItemDailyPerformance.filter(
    (row) => row.date >= startKey && row.date <= endKey,
  );
}

function buildProductTrendSeries(
  rows: BrandDataset["ga4ItemDailyPerformance"],
  insight: ProductInsightRow | null,
) {
  if (!insight) {
    return [];
  }

  const itemIds = new Set(insight.itemIds);
  const byDate = new Map<
    string,
    {
      date: string;
      views: number;
      addToCarts: number;
      addToCartRate: number;
    }
  >();

  rows.forEach((row) => {
    if (!itemIds.has(row.itemId)) {
      return;
    }

    const current = byDate.get(row.date) ?? {
      date: row.date,
      views: 0,
      addToCarts: 0,
      addToCartRate: 0,
    };

    current.views += row.itemViews;
    current.addToCarts += row.addToCarts;
    byDate.set(row.date, current);
  });

  return [...byDate.values()]
    .map((row) => ({
      ...row,
      addToCartRate: row.views ? (row.addToCarts / row.views) * 100 : 0,
    }))
    .sort((left, right) => left.date.localeCompare(right.date));
}

function buildScatterData(insights: ProductInsightRow[]) {
  const groups: Record<ProductInsightClassification, Array<Record<string, number | string>>> = {
    validated: [],
    opportunity: [],
    low_traffic: [],
    review: [],
  };

  insights.forEach((item) => {
    groups[item.classification].push({
      x: item.views,
      y: item.addToCartRate * 100,
      z: Math.max(item.revenue, 1),
      label: item.stampName,
      decision: item.decisionTitle,
    });
  });

  return groups;
}

function exportInsightsCsv(insights: ProductInsightRow[]) {
  const header = [
    "ids_item",
    "estampa",
    "tipo_produto",
    "classificacao",
    "decisao",
    "confianca",
    "views",
    "add_to_cart",
    "checkouts",
    "quantidade_ga4",
    "vendas_reais_ink",
    "receita_ga4",
    "receita_real_ink",
    "tx_adicao",
    "tx_checkout",
    "tx_compra",
    "views_periodo_anterior",
    "tx_adicao_periodo_anterior",
    "crescimento_views",
    "delta_tx_adicao",
    "acao_sugerida",
    "racional",
  ];

  const lines = insights.map((item) => [
    item.itemIds.join("|"),
    item.stampName,
    item.productType,
    classificationMeta[item.classification].label,
    decisionMeta[item.decision].label,
    item.decisionConfidence,
    item.views,
    item.addToCarts,
    item.checkouts,
    item.quantity,
    item.realUnitsSold,
    item.revenue.toFixed(2).replace(".", ","),
    item.realGrossRevenue.toFixed(2).replace(".", ","),
    (item.addToCartRate * 100).toFixed(2).replace(".", ","),
    (item.checkoutRate * 100).toFixed(2).replace(".", ","),
    (item.purchaseRate * 100).toFixed(2).replace(".", ","),
    item.previousViews,
    (item.previousAddToCartRate * 100).toFixed(2).replace(".", ","),
    (item.viewGrowth * 100).toFixed(2).replace(".", ","),
    (item.addToCartRateDelta * 100).toFixed(2).replace(".", ","),
    item.recommendedAction,
    item.rationale.join(" | "),
  ]);

  const csv = [header, ...lines]
    .map((line) =>
      line
        .map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`)
        .join(";"),
    )
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "brandops-insights-produtos.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export default function ProductInsightsPage() {
  const { activeBrand, filteredBrand, selectedPeriodLabel, isBrandHydrating } = useBrandOps();
  const [selectedInsightKey, setSelectedInsightKey] = useState<string>("");
  const [activeView, setActiveView] = useState<"overview" | "trend" | "detail">("overview");

  const currentRows = useMemo(
    () => filteredBrand?.ga4ItemDailyPerformance ?? [],
    [filteredBrand],
  );
  const previousRows = useMemo(
    () => (activeBrand ? buildPreviousWindowRows(activeBrand, currentRows) : []),
    [activeBrand, currentRows],
  );
  const insights = useMemo(
    () => (filteredBrand ? buildProductInsights(filteredBrand, previousRows) : []),
    [filteredBrand, previousRows],
  );
  const resolvedInsightKey =
    selectedInsightKey && insights.some((item) => item.key === selectedInsightKey)
      ? selectedInsightKey
      : insights[0]?.key ?? "";
  const selectedInsight = insights.find((item) => item.key === resolvedInsightKey) ?? insights[0] ?? null;
  const trendSeries = useMemo(
    () => buildProductTrendSeries(currentRows, selectedInsight),
    [currentRows, selectedInsight],
  );
  const scatterData = useMemo(() => buildScatterData(insights), [insights]);
  const highlightList = useMemo(() => insights.slice(0, 8), [insights]);

  const decisionGroups = useMemo(
    () => ({
      scale_now: insights.filter((item) => item.decision === "scale_now"),
      boost_traffic: insights.filter((item) => item.decision === "boost_traffic"),
      review_listing: insights.filter((item) => item.decision === "review_listing"),
      watch: insights.filter((item) => item.decision === "watch"),
    }),
    [insights],
  );

  const insightCounts = useMemo(() => {
    return {
      validated: insights.filter((item) => item.classification === "validated").length,
      opportunity: insights.filter((item) => item.classification === "opportunity").length,
      low_traffic: insights.filter((item) => item.classification === "low_traffic").length,
      review: insights.filter((item) => item.classification === "review").length,
    };
  }, [insights]);

  const totals = useMemo(() => {
    return insights.reduce(
      (accumulator, item) => {
        accumulator.views += item.views;
        accumulator.addToCarts += item.addToCarts;
        accumulator.realUnitsSold += item.realUnitsSold;
        accumulator.realRevenue += item.realGrossRevenue;
        return accumulator;
      },
      { views: 0, addToCarts: 0, realUnitsSold: 0, realRevenue: 0 },
    );
  }, [insights]);

  const gaining = useMemo(
    () =>
      insights
        .filter((item) => item.viewGrowth > 0 || item.addToCartRateDelta > 0)
        .sort((left, right) => right.viewGrowth - left.viewGrowth || right.addToCartRateDelta - left.addToCartRateDelta)
        .slice(0, 6),
    [insights],
  );

  const losing = useMemo(
    () =>
      insights
        .filter((item) => item.previousViews > 0)
        .sort((left, right) => left.viewGrowth - right.viewGrowth || left.addToCartRateDelta - right.addToCartRateDelta)
        .slice(0, 6),
    [insights],
  );

  if (activeBrand && filteredBrand && isBrandHydrating && !currentRows.length) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Inteligência de produto"
          title="Decisão por Estampa"
          description={`Carregando os sinais de navegação e intenção de compra da loja ${activeBrand.name}.`}
          badge={`Período analisado: ${selectedPeriodLabel}`}
        />
        <div className="space-y-6 animate-pulse">
          <div className="grid gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 rounded-2xl bg-surface-container" />
            ))}
          </div>
          <div className="h-[360px] rounded-3xl bg-surface-container" />
          <div className="h-[420px] rounded-3xl bg-surface-container" />
        </div>
      </div>
    );
  }

  if (!activeBrand || !filteredBrand || !currentRows.length) {
    return (
      <EmptyState
        title="Ainda não há inteligência de produtos"
        description="Sincronize o GA4 para começar a analisar estampas, intenção de compra e sinais de tração por produto."
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Inteligência de produto"
        title="Decisão por Estampa"
        description="Use o GA4 para entender quais estampas merecem ganhar visibilidade, quais pedem revisão e quais ainda estão sem amostra suficiente."
        badge={`Período analisado: ${selectedPeriodLabel}`}
        actions={
          <button
            type="button"
            onClick={() => exportInsightsCsv(insights)}
            className="brandops-button brandops-button-secondary"
          >
            <Download size={14} />
            Exportar CSV
          </button>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          label="Escalar agora"
          value={integerFormatter.format(decisionGroups.scale_now.length)}
          help="Estampas com sinal forte de intenção e amostra suficiente para ganhar distribuição."
          accent={decisionGroups.scale_now.length > 0 ? "positive" : "default"}
        />
        <MetricCard
          label="Dar mais tráfego"
          value={integerFormatter.format(decisionGroups.boost_traffic.length)}
          help="Estampas promissoras, mas ainda precisando de visibilidade."
        />
        <MetricCard
          label="Revisar vitrine"
          value={integerFormatter.format(decisionGroups.review_listing.length)}
          help="Itens com atenção suficiente, mas resposta abaixo do esperado."
        />
        <MetricCard
          label="Sem amostra"
          value={integerFormatter.format(decisionGroups.watch.length)}
          help="Itens ainda sem base suficiente para decisão definitiva."
        />
        <MetricCard
          label="Venda real INK"
          value={integerFormatter.format(totals.realUnitsSold)}
          help="Peças com venda real conciliada no período."
          accent={totals.realUnitsSold > 0 ? "positive" : "default"}
        />
      </section>

      <SurfaceCard>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <SectionHeading
            title="Navegação da análise"
            description="A leitura agora separa ação, tendência e detalhamento para reduzir ruído e facilitar decisão."
          />
          <div className="brandops-tabs overflow-x-auto">
            <button
              type="button"
              data-active={activeView === "overview"}
              onClick={() => setActiveView("overview")}
              className="brandops-tab"
            >
              Decisão
            </button>
            <button
              type="button"
              data-active={activeView === "trend"}
              onClick={() => setActiveView("trend")}
              className="brandops-tab"
            >
              Tendência
            </button>
            <button
              type="button"
              data-active={activeView === "detail"}
              onClick={() => setActiveView("detail")}
              className="brandops-tab"
            >
              Detalhamento
            </button>
          </div>
        </div>
      </SurfaceCard>

      {activeView === "overview" ? (
        <>
          <section className="grid gap-4 xl:grid-cols-4">
            {(Object.entries(decisionMeta) as Array<
              [ProductDecisionAction, (typeof decisionMeta)[ProductDecisionAction]]
            >).map(([decisionKey, meta]) => {
              const items = decisionGroups[decisionKey].slice(0, 4);

              return (
                <SurfaceCard key={decisionKey} className={`border ${meta.sectionClass}`}>
                  <SectionHeading
                    title={meta.label}
                    description={meta.description}
                    aside={`${integerFormatter.format(decisionGroups[decisionKey].length)} itens`}
                  />
                  <div className="mt-4 space-y-3">
                    {items.length ? (
                      items.map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => setSelectedInsightKey(item.key)}
                          className="w-full rounded-2xl border border-white/70 bg-white/80 px-3 py-3 text-left shadow-sm transition-colors hover:border-secondary/30"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-on-surface">{item.stampName}</p>
                              <p className="mt-1 text-xs text-on-surface-variant">{item.productType}</p>
                            </div>
                            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${meta.chipClass}`}>
                              {item.decisionConfidence}
                            </span>
                          </div>
                          <p className="mt-3 text-sm leading-6 text-on-surface-variant">
                            {item.decisionSummary}
                          </p>
                        </button>
                      ))
                    ) : (
                      <p className="text-sm text-on-surface-variant">
                        Nenhuma estampa nesta faixa no período.
                      </p>
                    )}
                  </div>
                </SurfaceCard>
              );
            })}
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <SurfaceCard>
              <SectionHeading
                title="Radar das estampas"
                description="Mapa visual para entender quais grupos estão convertendo interesse em intenção de compra."
                aside={`${integerFormatter.format(insights.length)} grupos monitorados`}
              />
              <div className="mt-4 flex flex-wrap gap-3 text-xs text-on-surface-variant">
                {Object.entries(classificationMeta).map(([key, meta]) => (
                  <div key={key} className="inline-flex items-center gap-2">
                    <span
                      className="inline-flex h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: meta.color }}
                      aria-hidden="true"
                    />
                    <span>{meta.label}</span>
                  </div>
                ))}
              </div>
              <div className="mt-5 h-[340px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 12, right: 18, bottom: 12, left: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-outline)" />
                    <XAxis
                      type="number"
                      dataKey="x"
                      name="Visualizações"
                      stroke="var(--color-on-surface-variant)"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      type="number"
                      dataKey="y"
                      name="Tx. adição"
                      unit="%"
                      stroke="var(--color-on-surface-variant)"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      cursor={{ strokeDasharray: "3 3" }}
                      content={({ active, payload }) => {
                        const point = payload?.[0]?.payload as
                          | { label?: string; x?: number; y?: number; decision?: string }
                          | undefined;
                        if (!active || !point) return null;
                        return (
                          <div className="rounded-2xl border border-outline bg-surface px-3 py-2 shadow-sm">
                            <p className="text-sm font-semibold text-on-surface">{point.label}</p>
                            <p className="mt-1 text-xs text-on-surface-variant">
                              {integerFormatter.format(Number(point.x ?? 0))} views •{" "}
                              {Number(point.y ?? 0).toFixed(1)}% add to cart
                            </p>
                            <p className="mt-1 text-xs font-medium text-secondary">
                              {point.decision}
                            </p>
                          </div>
                        );
                      }}
                    />
                    {Object.entries(classificationMeta).map(([classification, meta]) => (
                      <Scatter
                        key={classification}
                        name={meta.label}
                        data={scatterData[classification as ProductInsightClassification]}
                        fill={meta.color}
                      />
                    ))}
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </SurfaceCard>

            <SurfaceCard>
              <SectionHeading
                title="Estampa selecionada"
                description="Resumo operacional da leitura e da ação sugerida para a estampa em foco."
              />
              {selectedInsight ? (
                <div className="mt-5 space-y-4">
                  <div className="rounded-2xl border border-outline bg-surface-container-low p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-lg font-semibold text-on-surface">{selectedInsight.stampName}</span>
                      <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${decisionMeta[selectedInsight.decision].chipClass}`}>
                        {selectedInsight.decisionTitle}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-on-surface-variant">{selectedInsight.productType}</p>
                    <p className="mt-3 text-sm leading-6 text-on-surface-variant">{selectedInsight.decisionSummary}</p>
                    <div className="mt-3 rounded-2xl border border-secondary/20 bg-secondary/5 px-3 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-secondary">Ação sugerida</p>
                      <p className="mt-2 text-sm leading-6 text-on-surface">{selectedInsight.recommendedAction}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="panel-muted p-3">
                      <p className="text-xs uppercase tracking-wide text-on-surface-variant">Views</p>
                      <p className="mt-1 text-xl font-semibold text-on-surface">{integerFormatter.format(selectedInsight.views)}</p>
                    </div>
                    <div className="panel-muted p-3">
                      <p className="text-xs uppercase tracking-wide text-on-surface-variant">Tx. adição</p>
                      <p className="mt-1 text-xl font-semibold text-on-surface">{percentFormatter.format(selectedInsight.addToCartRate)}</p>
                    </div>
                    <div className="panel-muted p-3">
                      <p className="text-xs uppercase tracking-wide text-on-surface-variant">Checkout rate</p>
                      <p className="mt-1 text-xl font-semibold text-on-surface">{percentFormatter.format(selectedInsight.checkoutRate)}</p>
                    </div>
                    <div className="panel-muted p-3">
                      <p className="text-xs uppercase tracking-wide text-on-surface-variant">Venda real INK</p>
                      <p className="mt-1 text-xl font-semibold text-on-surface">{integerFormatter.format(selectedInsight.realUnitsSold)}</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-outline bg-surface-container-low p-4">
                    <h3 className="text-sm font-semibold text-on-surface">Por que esta recomendação apareceu</h3>
                    <ul className="mt-3 space-y-2 text-sm leading-6 text-on-surface-variant">
                      {selectedInsight.rationale.map((bullet) => (
                        <li key={bullet} className="flex items-start gap-2">
                          <span className="mt-[7px] inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-outline" />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <p className="mt-5 text-sm text-on-surface-variant">Selecione uma estampa para ver a leitura detalhada.</p>
              )}
            </SurfaceCard>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <SurfaceCard>
              <SectionHeading
                title="Leitura dos sinais"
                description="A matriz abaixo ajuda a entender maturidade de interesse, validação e risco visual."
              />
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {(Object.entries(classificationMeta) as Array<[ProductInsightClassification, (typeof classificationMeta)[ProductInsightClassification]]>).map(
                  ([key, meta]) => (
                    <article key={key} className="rounded-2xl border border-outline bg-surface-container-low p-4">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-flex h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: meta.color }}
                          aria-hidden="true"
                        />
                        <h3 className="text-base font-semibold text-on-surface">
                          {meta.label} ({integerFormatter.format(insightCounts[key])})
                        </h3>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-on-surface-variant">
                        {key === "validated"
                          ? "Já existe boa combinação de interesse, carrinho e confirmação de venda."
                          : key === "opportunity"
                            ? "Há sinal comercial, mas a estampa ainda depende de distribuição ou teste adicional."
                            : key === "low_traffic"
                              ? "Ainda faltam views para concluir se vale escalar ou cortar."
                              : "Recebe atenção, mas a apresentação ainda não convence o suficiente."}
                      </p>
                    </article>
                  ),
                )}
              </div>
            </SurfaceCard>

            <SurfaceCard>
              <SectionHeading
                title="Estampas em foco"
                description="Lista curta das estampas mais relevantes do período para decisão rápida."
                aside="Selecione uma para aprofundar"
              />
              <div className="mt-5 space-y-3">
                {highlightList.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setSelectedInsightKey(item.key)}
                    className={`w-full rounded-2xl border p-3 text-left transition-colors ${
                      resolvedInsightKey === item.key
                        ? "border-secondary/40 bg-secondary/5"
                        : "border-outline bg-surface-container-low hover:border-secondary/25"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-on-surface">{item.stampName}</p>
                        <p className="mt-1 text-xs text-on-surface-variant">{item.productType}</p>
                      </div>
                      <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${decisionMeta[item.decision].chipClass}`}>
                        {item.decisionTitle}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-4 gap-2 text-xs text-on-surface-variant">
                      <div>
                        <p>Views</p>
                        <p className="mt-1 font-semibold text-on-surface">{integerFormatter.format(item.views)}</p>
                      </div>
                      <div>
                        <p>Tx. carrinho</p>
                        <p className="mt-1 font-semibold text-on-surface">{percentFormatter.format(item.addToCartRate)}</p>
                      </div>
                      <div>
                        <p>Venda real</p>
                        <p className="mt-1 font-semibold text-on-surface">{integerFormatter.format(item.realUnitsSold)}</p>
                      </div>
                      <div>
                        <p>Receita</p>
                        <p className="mt-1 font-semibold text-on-surface">{currencyFormatter.format(item.realGrossRevenue || item.revenue)}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </SurfaceCard>
          </section>
        </>
      ) : null}

      {activeView === "trend" ? (
      <>
      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <SurfaceCard>
          <SectionHeading
            title="Interesse e intenção de compra"
            description="Acompanhe por dia como a estampa escolhida performa em visualizações e taxa de adição ao carrinho."
            aside={
              <select
                value={resolvedInsightKey}
                onChange={(event) => setSelectedInsightKey(event.target.value)}
                className="brandops-input min-w-[240px] px-3 py-2"
                aria-label="Selecionar estampa"
              >
                {insights.map((item) => (
                  <option key={item.key} value={item.key}>
                    {item.stampName} • {item.productType}
                  </option>
                ))}
              </select>
            }
          />
          <div className="mt-5 h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-outline)" vertical={false} />
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
                    name === "addToCartRate"
                      ? `${Number(value ?? 0).toFixed(1)}%`
                      : integerFormatter.format(Number(value ?? 0))
                  }
                  labelFormatter={(label) => formatCompactDate(String(label ?? ""))}
                  contentStyle={{
                    borderRadius: 16,
                    border: "1px solid var(--color-outline)",
                    backgroundColor: "var(--color-surface)",
                  }}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="views"
                  stroke="var(--color-secondary)"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="addToCartRate"
                  stroke="var(--color-primary)"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SurfaceCard>

            <SurfaceCard>
              <SectionHeading
                title="Foco do período"
                description="Resumo executivo da leitura, do sinal comercial e da ação sugerida."
              />
          {selectedInsight ? (
            <div className="mt-5 space-y-4">
              <div className="rounded-2xl border border-outline bg-surface-container-low p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-lg font-semibold text-on-surface">{selectedInsight.stampName}</span>
                  <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${decisionMeta[selectedInsight.decision].chipClass}`}>
                    {selectedInsight.decisionTitle}
                  </span>
                </div>
                <p className="mt-1 text-sm text-on-surface-variant">{selectedInsight.productType}</p>
                <p className="mt-3 text-sm leading-6 text-on-surface-variant">{selectedInsight.decisionSummary}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="panel-muted p-3">
                  <p className="text-xs uppercase tracking-wide text-on-surface-variant">Views</p>
                  <p className="mt-1 text-xl font-semibold text-on-surface">{integerFormatter.format(selectedInsight.views)}</p>
                </div>
                <div className="panel-muted p-3">
                  <p className="text-xs uppercase tracking-wide text-on-surface-variant">Tx. adição</p>
                  <p className="mt-1 text-xl font-semibold text-on-surface">{percentFormatter.format(selectedInsight.addToCartRate)}</p>
                </div>
                <div className="panel-muted p-3">
                  <p className="text-xs uppercase tracking-wide text-on-surface-variant">Checkout rate</p>
                  <p className="mt-1 text-xl font-semibold text-on-surface">{percentFormatter.format(selectedInsight.checkoutRate)}</p>
                </div>
                <div className="panel-muted p-3">
                  <p className="text-xs uppercase tracking-wide text-on-surface-variant">Venda real INK</p>
                  <p className="mt-1 text-xl font-semibold text-on-surface">{integerFormatter.format(selectedInsight.realUnitsSold)}</p>
                </div>
              </div>

                  <div className="rounded-2xl border border-secondary/20 bg-secondary/5 p-4">
                    <h3 className="text-sm font-semibold text-on-surface">Ação sugerida</h3>
                    <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                      {selectedInsight.recommendedAction}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-outline bg-surface-container-low p-4">
                    <h3 className="text-sm font-semibold text-on-surface">Racional da recomendação</h3>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-on-surface-variant">
                  {selectedInsight.rationale.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-2">
                      <span className="mt-[7px] inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-outline" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                    </ul>
                  </div>

                  <div className="grid gap-3 xl:grid-cols-2">
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
                      <div className="flex items-center gap-2">
                        <TrendingUp size={16} className="text-emerald-700" />
                        <h3 className="text-sm font-semibold text-emerald-950">Ganhando destaque</h3>
                      </div>
                      <div className="mt-3 space-y-2">
                        {gaining.slice(0, 4).map((item) => (
                          <div key={item.key} className="flex items-start justify-between gap-3 text-xs">
                            <div className="min-w-0">
                              <p className="truncate font-medium text-on-surface">{item.stampName}</p>
                              <p className="text-on-surface-variant">{item.productType}</p>
                            </div>
                            <p className="shrink-0 font-semibold text-emerald-700">
                              {percentFormatter.format(item.viewGrowth)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4">
                      <div className="flex items-center gap-2">
                        <TrendingDown size={16} className="text-rose-700" />
                        <h3 className="text-sm font-semibold text-rose-950">Perdendo destaque</h3>
                      </div>
                      <div className="mt-3 space-y-2">
                        {losing.slice(0, 4).map((item) => (
                          <div key={item.key} className="flex items-start justify-between gap-3 text-xs">
                            <div className="min-w-0">
                              <p className="truncate font-medium text-on-surface">{item.stampName}</p>
                              <p className="text-on-surface-variant">{item.productType}</p>
                            </div>
                            <p className="shrink-0 font-semibold text-rose-700">
                              {percentFormatter.format(item.viewGrowth)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </SurfaceCard>
      </section>

      </>
      ) : null}

      {activeView === "detail" ? (
      <SurfaceCard className="p-0 overflow-hidden">
        <div className="border-b border-outline p-5">
          <SectionHeading
            title="Análise detalhada de produtos"
            description="Tabela completa para auditoria rápida do sinal do GA4 versus venda real conciliada na INK."
            aside={`${integerFormatter.format(insights.length)} grupos analisados`}
          />
        </div>
        <div className="brandops-table-container rounded-none border-0">
          <table className="brandops-table min-w-[1400px] w-full">
            <thead>
              <tr>
                <th>IDs</th>
                <th>Nome</th>
                <th>Decisão</th>
                <th className="text-right">Views</th>
                <th className="text-right">Carrinho</th>
                <th className="text-right">Checkouts</th>
                <th className="text-right">Qtd. GA4</th>
                <th className="text-right">Venda real</th>
                <th className="text-right">Receita GA4</th>
                <th className="text-right">Receita INK</th>
                <th className="text-right">Tx. Adição</th>
                <th className="text-right">Tx. Checkout</th>
                <th className="text-right">Tx. Compra</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {insights.map((item) => (
                <tr key={item.key}>
                  <td className="text-xs text-on-surface-variant">
                    {item.itemIds.slice(0, 2).join(", ")}
                    {item.itemIds.length > 2 ? ` +${item.itemIds.length - 2}` : ""}
                  </td>
                  <td>
                    <div>
                      <p className="font-semibold text-on-surface">{item.stampName}</p>
                      <p className="text-xs text-on-surface-variant">{item.productType}</p>
                    </div>
                  </td>
                  <td>
                    <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${decisionMeta[item.decision].chipClass}`}>
                      {item.decisionTitle}
                    </span>
                  </td>
                  <td className="text-right">{integerFormatter.format(item.views)}</td>
                  <td className="text-right">{integerFormatter.format(item.addToCarts)}</td>
                  <td className="text-right">{integerFormatter.format(item.checkouts)}</td>
                  <td className="text-right">{integerFormatter.format(item.quantity)}</td>
                  <td className="text-right">{integerFormatter.format(item.realUnitsSold)}</td>
                  <td className="text-right">{currencyFormatter.format(item.revenue)}</td>
                  <td className="text-right">{currencyFormatter.format(item.realGrossRevenue)}</td>
                  <td className="text-right text-emerald-700">{percentFormatter.format(item.addToCartRate)}</td>
                  <td className="text-right text-sky-700">{percentFormatter.format(item.checkoutRate)}</td>
                  <td className="text-right text-primary">{percentFormatter.format(item.purchaseRate)}</td>
                  <td className="max-w-[280px] text-sm text-on-surface-variant">{item.recommendedAction}</td>
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
