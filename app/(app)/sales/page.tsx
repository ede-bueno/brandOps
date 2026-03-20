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
import { currencyFormatter, formatCompactDate, integerFormatter } from "@/lib/brandops/format";
import { buildDailySalesSeries, buildTopProducts, computeBrandMetrics } from "@/lib/brandops/metrics";

export default function SalesPage() {
  const { activeBrand } = useBrandOps();

  if (!activeBrand || !activeBrand.paidOrders.length) {
    return (
      <EmptyState
        title="Ainda não há vendas carregadas"
        description="Importe Lista de Pedidos.csv e Lista de Itens.csv para abrir a leitura comercial da marca."
      />
    );
  }

  const metrics = computeBrandMetrics(activeBrand);
  const dailySales = buildDailySalesSeries(activeBrand);
  const topProducts = buildTopProducts(activeBrand);

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-3xl font-bold text-on-surface">Vendas</h1>
        <p className="mt-2 text-sm leading-7 text-on-surface-variant">
          Acompanhe pedidos pagos, itens vendidos e os produtos que mais puxam a
          receita da marca.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Receita líquida"
          value={currencyFormatter.format(metrics.netRevenue)}
        />
        <MetricCard
          label="Pedidos pagos"
          value={integerFormatter.format(metrics.paidOrderCount)}
        />
        <MetricCard
          label="Itens vendidos"
          value={integerFormatter.format(metrics.unitsSold)}
        />
        <MetricCard
          label="Ticket médio"
          value={currencyFormatter.format(metrics.averageTicket)}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-outline bg-surface-container p-6">
          <h2 className="text-xl font-semibold text-on-surface">
            Receita diária
          </h2>
          <div className="mt-6 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailySales}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(107,122,153,0.12)" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatCompactDate}
                  stroke="#6b7a99"
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#6b7a99"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `R$ ${Math.round(value / 1000)}k`}
                />
                <Tooltip
                  formatter={(value) =>
                    currencyFormatter.format(Number(value ?? 0))
                  }
                  labelFormatter={(label) => formatCompactDate(String(label ?? ""))}
                  contentStyle={{
                    borderRadius: 16,
                    border: "1px solid #23293c",
                    backgroundColor: "#0c1324",
                    color: "#bcc7de",
                  }}
                />
                <Bar dataKey="revenue" fill="#4edea3" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-3xl border border-outline bg-surface-container p-6">
          <h2 className="text-xl font-semibold text-on-surface">
            Produtos com maior receita
          </h2>
          <div className="mt-5 space-y-3">
            {topProducts.slice(0, 8).map((product) => (
              <div
                key={product.productKey}
                className="rounded-2xl border border-outline bg-background p-4"
              >
                <p className="font-semibold text-on-surface">{product.productName}</p>
                <div className="mt-2 flex items-center justify-between text-sm text-on-surface-variant">
                  <span>{integerFormatter.format(product.quantity)} unidade(s)</span>
                  <span>{currencyFormatter.format(product.grossRevenue)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
