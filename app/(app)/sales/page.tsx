"use client";

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
  const { activeBrand, filteredBrand, selectedPeriodLabel } = useBrandOps();

  if (!activeBrand || !filteredBrand || !filteredBrand.paidOrders.length) {
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
        description="Pedidos pagos, itens vendidos e produtos que mais puxam receita no período selecionado."
        badge={`Período analisado: ${selectedPeriodLabel}`}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Receita líquida" value={currencyFormatter.format(metrics.netRevenue)} accent="positive" />
        <MetricCard label="Pedidos pagos" value={integerFormatter.format(metrics.paidOrderCount)} />
        <MetricCard label="Itens vendidos" value={integerFormatter.format(metrics.unitsSold)} />
        <MetricCard label="Ticket médio" value={currencyFormatter.format(metrics.averageTicket)} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <SurfaceCard>
          <SectionHeading
            title="Receita diária"
            description="Acompanhe a cadência de vendas e identifique variações no período."
          />
          <div className="mt-6 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailySales}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(157,176,197,0.12)" />
                <XAxis dataKey="date" tickFormatter={formatCompactDate} stroke="#6d8095" tickLine={false} axisLine={false} />
                <YAxis stroke="#6d8095" tickLine={false} axisLine={false} tickFormatter={(value) => `R$ ${Math.round(value / 1000)}k`} />
                <Tooltip
                  formatter={(value) => currencyFormatter.format(Number(value ?? 0))}
                  labelFormatter={(label) => formatCompactDate(String(label ?? ""))}
                  contentStyle={{
                    borderRadius: 18,
                    border: "1px solid rgba(171, 201, 229, 0.14)",
                    backgroundColor: "#0b141d",
                    color: "#f3f7fb",
                  }}
                />
                <Bar dataKey="revenue" fill="#d7f978" radius={[12, 12, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <SectionHeading
            title="Produtos com maior receita"
            description="Itens que puxam faturamento e merecem atenção na operação."
          />
          <div className="mt-5 space-y-3">
            {topProducts.slice(0, 8).map((product) => (
              <article key={product.productKey} className="panel-muted p-4">
                <p className="font-semibold text-on-surface">{product.productName}</p>
                <div className="mt-2 flex items-center justify-between text-sm text-on-surface-variant">
                  <span>{integerFormatter.format(product.quantity)} unidade(s)</span>
                  <span>{currencyFormatter.format(product.grossRevenue)}</span>
                </div>
              </article>
            ))}
          </div>
        </SurfaceCard>
      </section>
    </div>
  );
}
