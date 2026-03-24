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
import { Download, Lightbulb, PackageSearch, TrendingDown, TrendingUp } from "lucide-react";
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
    });
  });

  return groups;
}

function buildSuggestions(insights: ProductInsightRow[]) {
  const validated = insights.filter((item) => item.classification === "validated").slice(0, 8);
  const opportunity = insights.filter((item) => item.classification === "opportunity").slice(0, 8);
  const lowTraffic = insights.filter((item) => item.classification === "low_traffic").slice(0, 8);

  return [
    {
      title: "Produtos validados",
      subtitle: "Escalar em catálogo e mídia",
      items: validated,
      className: "border-emerald-200 bg-emerald-50/70",
    },
    {
      title: "Alto potencial",
      subtitle: "Bom sinal, mas ainda pedem visibilidade",
      items: opportunity,
      className: "border-violet-200 bg-violet-50/70",
    },
    {
      title: "Teste de mercado",
      subtitle: "Ainda precisam de mais tráfego para decisão",
      items: lowTraffic,
      className: "border-amber-200 bg-amber-50/70",
    },
  ];
}

function exportInsightsCsv(insights: ProductInsightRow[]) {
  const header = [
    "ids_item",
    "estampa",
    "tipo_produto",
    "classificacao",
    "views",
    "add_to_cart",
    "checkouts",
    "compras",
    "quantidade",
    "receita",
    "tx_adicao",
    "tx_conversao",
    "views_periodo_anterior",
    "tx_adicao_periodo_anterior",
    "crescimento_views",
    "delta_tx_adicao",
  ];

  const lines = insights.map((item) => [
    item.itemIds.join("|"),
    item.stampName,
    item.productType,
    classificationMeta[item.classification].label,
    item.views,
    item.addToCarts,
    item.checkouts,
    item.purchases,
    item.quantity,
    item.revenue.toFixed(2).replace(".", ","),
    (item.addToCartRate * 100).toFixed(2).replace(".", ","),
    (item.conversionRate * 100).toFixed(2).replace(".", ","),
    item.previousViews,
    (item.previousAddToCartRate * 100).toFixed(2).replace(".", ","),
    (item.viewGrowth * 100).toFixed(2).replace(".", ","),
    (item.addToCartRateDelta * 100).toFixed(2).replace(".", ","),
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
  const { activeBrand, filteredBrand, selectedPeriodLabel } = useBrandOps();
  const [selectedInsightKey, setSelectedInsightKey] = useState<string>("");

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
  const suggestionBlocks = useMemo(() => buildSuggestions(insights), [insights]);

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
        accumulator.purchases += item.purchases;
        accumulator.revenue += item.revenue;
        return accumulator;
      },
      { views: 0, addToCarts: 0, purchases: 0, revenue: 0 },
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
        title="Insights de Produtos"
        description="Leitura de estampas com base no comportamento do GA4: visualização, adição ao carrinho, checkout, compra e sinais de evolução frente à janela anterior."
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
          label="Estampas monitoradas"
          value={integerFormatter.format(insights.length)}
          help="Quantidade de grupos únicos por estampa e tipo de peça no período."
          accent={insights.length > 0 ? "positive" : "default"}
        />
        <MetricCard
          label="Views de itens"
          value={integerFormatter.format(totals.views)}
          help="Visualizações de item registradas pelo GA4."
        />
        <MetricCard
          label="Add to cart"
          value={integerFormatter.format(totals.addToCarts)}
          help="Eventos de adição ao carrinho nas páginas de produto."
        />
        <MetricCard
          label="Compras"
          value={integerFormatter.format(totals.purchases)}
          help="Compras atribuídas ao item pelo GA4."
        />
        <MetricCard
          label="Receita"
          value={currencyFormatter.format(totals.revenue)}
          help="Receita de item registrada pelo GA4 no período."
          accent={totals.revenue > 0 ? "positive" : "default"}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <SurfaceCard>
          <SectionHeading
            title="Matriz de estampa"
            description="Cada ponto cruza visualizações e taxa de adição ao carrinho. Isso ajuda a separar o que já está validado do que ainda precisa de exposição ou revisão."
            aside={`${integerFormatter.format(insights.length)} itens classificados`}
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
                  formatter={(value, name) =>
                    name === "y"
                      ? `${Number(value ?? 0).toFixed(1)}%`
                      : integerFormatter.format(Number(value ?? 0))
                  }
                  labelFormatter={() => ""}
                  contentStyle={{
                    borderRadius: 16,
                    border: "1px solid var(--color-outline)",
                    backgroundColor: "var(--color-surface)",
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
            title="Insights acionáveis"
            description="Leitura rápida do que escalar, do que testar e do que revisar visualmente."
          />
          <div className="mt-5 space-y-4">
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
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-on-surface-variant">
                    {meta.bullets.map((bullet) => (
                      <li key={bullet} className="flex items-start gap-2">
                        <span className="mt-[7px] inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-outline" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              ),
            )}
          </div>
        </SurfaceCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <SurfaceCard>
          <SectionHeading
            title="Tendências de visualizações"
            description="Comparação contra a janela anterior para destacar quais estampas estão ganhando ou perdendo atenção."
          />
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-emerald-700" />
                <h3 className="text-base font-semibold text-emerald-950">Ganhando destaque</h3>
              </div>
              <div className="mt-4 space-y-3">
                {gaining.map((item) => (
                  <div key={item.key} className="flex items-start justify-between gap-4 text-sm">
                    <div>
                      <p className="font-medium text-on-surface">{item.stampName}</p>
                      <p className="text-xs text-on-surface-variant">{item.productType}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-on-surface">{integerFormatter.format(item.views)} views</p>
                      <p className="text-xs text-emerald-700">
                        {percentFormatter.format(item.viewGrowth)} views
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4">
              <div className="flex items-center gap-2">
                <TrendingDown size={16} className="text-rose-700" />
                <h3 className="text-base font-semibold text-rose-950">Perdendo destaque</h3>
              </div>
              <div className="mt-4 space-y-3">
                {losing.map((item) => (
                  <div key={item.key} className="flex items-start justify-between gap-4 text-sm">
                    <div>
                      <p className="font-medium text-on-surface">{item.stampName}</p>
                      <p className="text-xs text-on-surface-variant">{item.productType}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-on-surface">{integerFormatter.format(item.views)} views</p>
                      <p className="text-xs text-rose-700">
                        {percentFormatter.format(item.viewGrowth)} views
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <SectionHeading
            title="Sugestão de conjuntos de produtos"
            description="Agrupamentos práticos para mídia, catálogo e testes de vitrine."
            aside="Leitura sugerida para Meta Ads e catálogo"
          />
          <div className="mt-5 grid gap-4 xl:grid-cols-3">
            {suggestionBlocks.map((block) => (
              <article key={block.title} className={`rounded-2xl border p-4 ${block.className}`}>
                <div className="flex items-center gap-2">
                  <Lightbulb size={16} className="text-on-surface" />
                  <div>
                    <h3 className="text-base font-semibold text-on-surface">{block.title}</h3>
                    <p className="text-xs text-on-surface-variant">{block.subtitle}</p>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  {block.items.length ? (
                    block.items.map((item) => (
                      <div key={item.key} className="rounded-xl bg-white/70 px-3 py-2 text-sm font-medium text-on-surface shadow-sm">
                        {item.stampName}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-on-surface-variant">
                      Ainda sem itens suficientes nesta faixa.
                    </p>
                  )}
                </div>
              </article>
            ))}
          </div>
        </SurfaceCard>
      </section>

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
            description="Resumo rápido da estampa selecionada para tomada de decisão."
          />
          {selectedInsight ? (
            <div className="mt-5 space-y-4">
              <div className="rounded-2xl border border-outline bg-surface-container-low p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-lg font-semibold text-on-surface">{selectedInsight.stampName}</span>
                  <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${classificationMeta[selectedInsight.classification].chipClass}`}>
                    {classificationMeta[selectedInsight.classification].label}
                  </span>
                </div>
                <p className="mt-1 text-sm text-on-surface-variant">{selectedInsight.productType}</p>
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
                  <p className="text-xs uppercase tracking-wide text-on-surface-variant">Compras</p>
                  <p className="mt-1 text-xl font-semibold text-on-surface">{integerFormatter.format(selectedInsight.purchases)}</p>
                </div>
                <div className="panel-muted p-3">
                  <p className="text-xs uppercase tracking-wide text-on-surface-variant">Receita</p>
                  <p className="mt-1 text-xl font-semibold text-on-surface">{currencyFormatter.format(selectedInsight.revenue)}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-outline bg-surface-container-low p-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-on-surface">
                  <PackageSearch size={16} />
                  Leituras recomendadas
                </h3>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-on-surface-variant">
                  {classificationMeta[selectedInsight.classification].bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-2">
                      <span className="mt-[7px] inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-outline" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}
        </SurfaceCard>
      </section>

      <SurfaceCard className="p-0 overflow-hidden">
        <div className="border-b border-outline p-5">
          <SectionHeading
            title="Análise detalhada de produtos"
            description="Tabela completa das estampas com métricas de comportamento, venda e classificação da matriz."
            aside={`${integerFormatter.format(insights.length)} grupos analisados`}
          />
        </div>
        <div className="brandops-table-container rounded-none border-0">
          <table className="brandops-table min-w-[1120px] w-full">
            <thead>
              <tr>
                <th>IDs</th>
                <th>Nome</th>
                <th>Classificação</th>
                <th className="text-right">Views</th>
                <th className="text-right">Carrinho</th>
                <th className="text-right">Checkouts</th>
                <th className="text-right">Compras</th>
                <th className="text-right">Receita</th>
                <th className="text-right">Tx. Adição</th>
                <th className="text-right">Tx. Conversão</th>
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
                    <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${classificationMeta[item.classification].chipClass}`}>
                      {classificationMeta[item.classification].label}
                    </span>
                  </td>
                  <td className="text-right">{integerFormatter.format(item.views)}</td>
                  <td className="text-right">{integerFormatter.format(item.addToCarts)}</td>
                  <td className="text-right">{integerFormatter.format(item.checkouts)}</td>
                  <td className="text-right">{integerFormatter.format(item.purchases)}</td>
                  <td className="text-right">{currencyFormatter.format(item.revenue)}</td>
                  <td className="text-right text-emerald-700">{percentFormatter.format(item.addToCartRate)}</td>
                  <td className="text-right text-primary">{percentFormatter.format(item.conversionRate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SurfaceCard>
    </div>
  );
}
