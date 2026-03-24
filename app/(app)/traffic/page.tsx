"use client";

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
import {
  currencyFormatter,
  formatCompactDate,
  integerFormatter,
  percentFormatter,
} from "@/lib/brandops/format";
import {
  buildTrafficByCampaign,
  buildTrafficByLandingPage,
  buildTrafficBySourceMedium,
  buildTrafficTimeSeries,
  computeTrafficMetrics,
} from "@/lib/brandops/metrics";

export default function TrafficPage() {
  const { activeBrand, filteredBrand, selectedPeriodLabel } = useBrandOps();

  if (!activeBrand || !filteredBrand || !filteredBrand.ga4DailyPerformance.length) {
    return (
      <EmptyState
        title="Ainda não há dados de tráfego"
        description="Sincronize o GA4 na tela de Integrações para começar a acompanhar sessões, funil e receita por canal."
      />
    );
  }

  const metrics = computeTrafficMetrics(filteredBrand);
  const timeSeries = buildTrafficTimeSeries(filteredBrand);
  const sources = buildTrafficBySourceMedium(filteredBrand).slice(0, 10);
  const campaigns = buildTrafficByCampaign(filteredBrand).slice(0, 10);
  const landingPages = buildTrafficByLandingPage(filteredBrand).slice(0, 10);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Analytics"
        title="Tráfego"
        description="Visão do GA4 para acompanhar aquisição, comportamento e conversão da loja no período selecionado."
        badge={`Período analisado: ${selectedPeriodLabel}`}
        actions={
          <Link href="/integrations" className="brandops-button brandops-button-ghost">
            Ir para integrações
          </Link>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Sessões"
          value={integerFormatter.format(metrics.sessions)}
          help="Sessões totais registradas pelo GA4 no período."
        />
        <MetricCard
          label="Usuários"
          value={integerFormatter.format(metrics.totalUsers)}
          help="Usuários totais do GA4 no período."
        />
        <MetricCard
          label="Pageviews"
          value={integerFormatter.format(metrics.pageViews)}
          help="Visualizações de página consolidadas."
        />
        <MetricCard
          label="Receita GA4"
          value={currencyFormatter.format(metrics.purchaseRevenue)}
          help="Receita de ecommerce registrada no GA4."
          accent={metrics.purchaseRevenue > 0 ? "positive" : "default"}
        />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Add to cart"
          value={integerFormatter.format(metrics.addToCarts)}
          help="Evento de adição ao carrinho no GA4."
        />
        <MetricCard
          label="Begin checkout"
          value={integerFormatter.format(metrics.beginCheckouts)}
          help="Evento de início de checkout no GA4."
        />
        <MetricCard
          label="Purchases"
          value={integerFormatter.format(metrics.purchases)}
          help="Compras registradas pelo GA4."
        />
        <MetricCard
          label="Receita por sessão"
          value={currencyFormatter.format(metrics.revenuePerSession)}
          help="Receita GA4 dividida por sessões."
          accent={metrics.revenuePerSession > 0 ? "positive" : "default"}
        />
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          label="Sessão → carrinho"
          value={percentFormatter.format(metrics.sessionToCartRate)}
          help="Add to cart sobre sessões."
          accent={metrics.sessionToCartRate >= 0.05 ? "positive" : "default"}
        />
        <MetricCard
          label="Carrinho → checkout"
          value={percentFormatter.format(metrics.checkoutRate)}
          help="Begin checkout sobre add to cart."
          accent={metrics.checkoutRate >= 0.4 ? "positive" : "default"}
        />
        <MetricCard
          label="Sessão → compra"
          value={percentFormatter.format(metrics.purchaseRate)}
          help="Compras sobre sessões."
          accent={metrics.purchaseRate >= 0.01 ? "positive" : "default"}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <SurfaceCard>
          <SectionHeading
            title="Tendência diária"
            description="Evolução das sessões e da receita de ecommerce no período."
          />
          <div className="mt-5 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeSeries}>
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
                    name === "purchaseRevenue"
                      ? currencyFormatter.format(Number(value ?? 0))
                      : integerFormatter.format(Number(value ?? 0))
                  }
                  labelFormatter={(label) => formatCompactDate(String(label ?? ""))}
                  contentStyle={{
                    borderRadius: 16,
                    border: "1px solid var(--color-outline)",
                    backgroundColor: "var(--color-surface)",
                  }}
                />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="sessions"
                  stroke="var(--color-secondary)"
                  fill="var(--color-secondary-container)"
                  fillOpacity={0.6}
                  strokeWidth={2}
                />
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="purchaseRevenue"
                  stroke="var(--color-primary)"
                  fill="var(--color-primary-container)"
                  fillOpacity={0.35}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <SectionHeading
            title="Funil do período"
            description="Leitura rápida da conversão entre sessão, carrinho, checkout e compra."
          />
          <div className="mt-5 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  { stage: "Sessões", value: metrics.sessions },
                  { stage: "Carrinho", value: metrics.addToCarts },
                  { stage: "Checkout", value: metrics.beginCheckouts },
                  { stage: "Compras", value: metrics.purchases },
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-outline)" vertical={false} />
                <XAxis
                  dataKey="stage"
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
                  formatter={(value) => integerFormatter.format(Number(value ?? 0))}
                  contentStyle={{
                    borderRadius: 16,
                    border: "1px solid var(--color-outline)",
                    backgroundColor: "var(--color-surface)",
                  }}
                />
                <Bar dataKey="value" fill="var(--color-tertiary)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SurfaceCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <SurfaceCard className="p-0 overflow-hidden">
          <div className="border-b border-outline p-5">
            <SectionHeading
              title="Source / Medium"
              description="Canais que mais trazem sessões e receita."
            />
          </div>
          <div className="brandops-table-container rounded-none border-0">
            <table className="brandops-table-compact min-w-[620px] w-full">
              <thead>
                <tr>
                  <th>Canal</th>
                  <th className="text-right">Sessões</th>
                  <th className="text-right">Compras</th>
                  <th className="text-right">Receita</th>
                </tr>
              </thead>
              <tbody>
                {sources.map((row) => (
                  <tr key={row.key}>
                    <td className="max-w-[220px] truncate font-semibold text-on-surface">{row.label}</td>
                    <td className="text-right">{integerFormatter.format(row.sessions)}</td>
                    <td className="text-right">{integerFormatter.format(row.purchases)}</td>
                    <td className="text-right">{currencyFormatter.format(row.purchaseRevenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SurfaceCard>

        <SurfaceCard className="p-0 overflow-hidden">
          <div className="border-b border-outline p-5">
            <SectionHeading
              title="Campanhas"
              description="Top campanhas pelo GA4."
            />
          </div>
          <div className="brandops-table-container rounded-none border-0">
            <table className="brandops-table-compact min-w-[620px] w-full">
              <thead>
                <tr>
                  <th>Campanha</th>
                  <th className="text-right">Sessões</th>
                  <th className="text-right">Compras</th>
                  <th className="text-right">Receita</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((row) => (
                  <tr key={row.key}>
                    <td className="max-w-[220px] truncate font-semibold text-on-surface">{row.label}</td>
                    <td className="text-right">{integerFormatter.format(row.sessions)}</td>
                    <td className="text-right">{integerFormatter.format(row.purchases)}</td>
                    <td className="text-right">{currencyFormatter.format(row.purchaseRevenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SurfaceCard>

        <SurfaceCard className="p-0 overflow-hidden">
          <div className="border-b border-outline p-5">
            <SectionHeading
              title="Landing pages"
              description="Páginas de entrada com mais tráfego e conversão."
            />
          </div>
          <div className="brandops-table-container rounded-none border-0">
            <table className="brandops-table-compact min-w-[620px] w-full">
              <thead>
                <tr>
                  <th>Página</th>
                  <th className="text-right">Sessões</th>
                  <th className="text-right">Compras</th>
                  <th className="text-right">Receita</th>
                </tr>
              </thead>
              <tbody>
                {landingPages.map((row) => (
                  <tr key={row.key}>
                    <td className="max-w-[220px] truncate font-semibold text-on-surface">{row.label}</td>
                    <td className="text-right">{integerFormatter.format(row.sessions)}</td>
                    <td className="text-right">{integerFormatter.format(row.purchases)}</td>
                    <td className="text-right">{currencyFormatter.format(row.purchaseRevenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SurfaceCard>
      </section>
    </div>
  );
}
