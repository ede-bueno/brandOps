"use client";

import Link from "next/link";
import {
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
import { currencyFormatter, formatCompactDate, integerFormatter } from "@/lib/brandops/format";
import { buildDailySalesSeries, buildTopProducts, computeBrandMetrics } from "@/lib/brandops/metrics";

export default function SalesPage() {
  const { 
    activeBrand, 
    activeBrandId,
    brands,
    filteredBrand, 
    selectedPeriodLabel, 
    isLoading: isDatasetLoading,
    isMetricsLoading,
  } = useBrandOps();
  const selectedBrandName =
    activeBrand?.name ??
    brands.find((brand) => brand.id === activeBrandId)?.name ??
    "Loja";
  const isBrandLoading =
    Boolean(activeBrandId) && (isDatasetLoading || isMetricsLoading || !activeBrand || !filteredBrand);

  if (isBrandLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Leitura comercial"
          title="Vendas"
          description={`Carregando dados comerciais da loja ${selectedBrandName}.`}
          badge={`Período analisado: ${selectedPeriodLabel}`}
        />
        <div className="space-y-6 animate-pulse">
          <div className="grid gap-4 md:grid-cols-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-24 bg-surface-container rounded-2xl" />
            ))}
          </div>
          <div className="h-[400px] bg-surface-container rounded-3xl" />
        </div>
      </div>
    );
  }

  if (!activeBrandId && !activeBrand) {
    return (
      <EmptyState
        title="Nenhuma marca selecionada"
        description="Escolha uma marca para visualizar o relatório de vendas."
      />
    );
  }

  if (!activeBrand || !filteredBrand) {
    return (
      <EmptyState
        title="Dados da loja indisponíveis"
        description="Não foi possível montar o relatório comercial da loja selecionada."
      />
    );
  }

  if (!filteredBrand.paidOrders.length) {
    return (
      <EmptyState
        title="Ainda não há vendas carregadas"
        description="Importe Lista de Pedidos.csv e Lista de Itens.csv para abrir a leitura comercial da marca."
      />
    );
  }

  const metrics = computeBrandMetrics(filteredBrand);
  const dailySales = buildDailySalesSeries(filteredBrand);
  const topProducts = buildTopProducts(filteredBrand);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Leitura comercial"
        title="Vendas"
        description="Foco na camada comercial da INK: pedidos pagos, itens vendidos, faturado, descontos e mix de produtos."
        badge={`Período analisado: ${selectedPeriodLabel}`}
        actions={
          <Link href="/help#dashboard" className="brandops-button brandops-button-ghost">
            Entender cálculos
          </Link>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <MetricCard label="Pedidos pagos" value={integerFormatter.format(metrics.paidOrderCount)} />
        <MetricCard label="Itens vendidos" value={integerFormatter.format(metrics.unitsSold)} />
        <MetricCard label="Faturado" value={currencyFormatter.format(metrics.grossRevenue)} />
        <MetricCard label="Descontos" value={currencyFormatter.format(metrics.discounts)} />
        <MetricCard label="Comissão INK" value={currencyFormatter.format(metrics.inkProfit)} />
        <MetricCard label="Ticket médio" value={currencyFormatter.format(metrics.averageTicket)} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <SurfaceCard>
          <SectionHeading
            title="Cadência diária"
            description="Faturado por dia para enxergar ritmo de venda e picos do período."
          />
          <div className="mt-5 h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailySales}>
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
                  stroke="var(--color-on-surface-variant)"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  formatter={(value) => currencyFormatter.format(Number(value ?? 0))}
                  labelFormatter={(label) => formatCompactDate(String(label ?? ""))}
                  contentStyle={{
                    borderRadius: 16,
                    border: "1px solid var(--color-outline)",
                    backgroundColor: "var(--color-surface)",
                  }}
                />
                <Bar dataKey="revenue" fill="var(--color-secondary)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SurfaceCard>

        <SurfaceCard className="p-0 overflow-hidden">
          <div className="border-b border-outline p-5">
            <SectionHeading
              title="Produtos que puxaram faturamento"
              description="Ranking por faturamento bruto e volume de peças."
            />
          </div>
          <div className="brandops-table-container rounded-none border-0">
            <table className="brandops-table-compact min-w-[560px] w-full">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th className="text-right">Peças</th>
                  <th className="text-right">Faturado</th>
                  <th className="text-right">Participação</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((product) => {
                  const share = metrics.grossRevenue > 0
                    ? product.grossRevenue / metrics.grossRevenue
                    : 0;
                  return (
                    <tr key={product.productKey}>
                      <td className="max-w-[320px] truncate font-semibold text-on-surface">
                        {product.productName}
                      </td>
                      <td className="text-right">{integerFormatter.format(product.quantity)}</td>
                      <td className="text-right font-semibold text-on-surface">
                        {currencyFormatter.format(product.grossRevenue)}
                      </td>
                      <td className="text-right">{(share * 100).toFixed(1)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </SurfaceCard>
      </section>
    </div>
  );
}
