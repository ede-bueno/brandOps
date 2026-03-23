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
import { useState } from "react";

export default function SalesPage() {
  const { activeBrand, filteredBrand, selectedPeriodLabel } = useBrandOps();
  const [activeTab, setActiveTab] = useState<"geral" | "produtos">("geral");

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
    <div className="space-y-4">
      <PageHeader
        eyebrow="Leitura comercial"
        title="Vendas"
        description="Pedidos pagos, itens vendidos e produtos que mais puxam receita no período selecionado."
        badge={`Período analisado: ${selectedPeriodLabel}`}
      />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <MetricCard 
          label="Receita líquida" 
          value={currencyFormatter.format(metrics.rld)} 
          accent="positive" 
          help="Valor final após descontos"
        />
        <MetricCard 
          label="Pedidos pagos" 
          value={integerFormatter.format(metrics.paidOrderCount)} 
        />
        <MetricCard 
          label="Itens vendidos" 
          value={integerFormatter.format(metrics.unitsSold)} 
          help="Total de peças (cabeçalho)"
        />
        <MetricCard 
          label="Ticket médio" 
          value={currencyFormatter.format(metrics.averageTicket)} 
          help="Faturamento / Pedidos"
        />
        <MetricCard 
          label="Peças / Pedido" 
          value={metrics.itemsPerOrder.toFixed(2)} 
          help="Média de itens (IPT)"
        />
        <MetricCard 
          label="Receita / Peça" 
          value={currencyFormatter.format(metrics.revenuePerUnit)} 
          help="Ticket médio por item"
        />
      </section>

      <div className="flex gap-2 p-1 bg-surface-container rounded-xl w-fit">
        <button
          onClick={() => setActiveTab("geral")}
          className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
            activeTab === "geral" ? "bg-background text-primary shadow-sm" : "text-on-surface-variant hover:text-on-surface"
          }`}
        >
          Gráfico Geral
        </button>
        <button
          onClick={() => setActiveTab("produtos")}
          className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
            activeTab === "produtos" ? "bg-background text-primary shadow-sm" : "text-on-surface-variant hover:text-on-surface"
          }`}
        >
          Análise de Produtos
        </button>
      </div>

      {activeTab === "geral" && (
        <SurfaceCard className="p-6">
          <SectionHeading
            title="Receita diária"
            description="Acompanhe a cadência de vendas e identifique variações no período."
          />
          <div className="mt-6 h-[500px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailySales}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(157,176,197,0.12)" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatCompactDate} 
                  stroke="#6d8095" 
                  tickLine={false} 
                  axisLine={false}
                  tick={{ fontSize: 10, fontWeight: 500 }}
                />
                <YAxis 
                  stroke="#6d8095" 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(value) => `R$ ${Math.round(value / 1000)}k`}
                  tick={{ fontSize: 10, fontWeight: 500 }}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(215, 249, 120, 0.05)' }}
                  formatter={(value) => currencyFormatter.format(Number(value ?? 0))}
                  labelFormatter={(label) => formatCompactDate(String(label ?? ""))}
                  contentStyle={{
                    borderRadius: 20,
                    border: "1px solid rgba(171, 201, 229, 0.14)",
                    backgroundColor: "rgba(11, 20, 29, 0.9)",
                    backdropFilter: "blur(12px)",
                    color: "#f3f7fb",
                    boxShadow: "0 10px 30px -10px rgba(0,0,0,0.5)"
                  }}
                />
                <Bar dataKey="revenue" fill="#d7f978" radius={[10, 10, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SurfaceCard>
      )}

      {activeTab === "produtos" && (
        <SurfaceCard className="p-6">
          <SectionHeading
            title="Análise Detalhada de Produtos"
            description="Ranking de performance por SKU, considerando volume e faturamento absoluto."
          />
          <div className="mt-8 overflow-x-auto">
            <table className="w-full text-left border-separate border-spacing-y-2">
              <thead>
                <tr className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/60">
                  <th className="pb-4 pl-4 text-left">Produto / SKU</th>
                  <th className="pb-4 text-center">Volume</th>
                  <th className="pb-4 text-right">Faturamento Bruto</th>
                  <th className="pb-4 text-right pr-4">Participação</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((product) => {
                  const share = (product.grossRevenue / (metrics.grossRevenue || 1)) * 100;
                  return (
                    <tr key={product.productKey} className="group h-14 bg-surface-container/20 hover:bg-surface-container/40 transition-all">
                      <td className="rounded-l-2xl pl-4">
                        <p className="text-sm font-bold text-on-surface group-hover:text-secondary transition-colors truncate max-w-[400px]">
                          {product.productName}
                        </p>
                      </td>
                      <td className="text-center font-bold text-sm text-on-surface-variant">
                        {integerFormatter.format(product.quantity)}
                      </td>
                      <td className="text-right font-black text-sm text-on-surface">
                        {currencyFormatter.format(product.grossRevenue)}
                      </td>
                      <td className="rounded-r-2xl pr-4 text-right">
                        <div className="flex items-center justify-end gap-3 text-[11px] font-bold text-secondary">
                          <div className="w-16 h-1.5 rounded-full bg-surface-container overflow-hidden hidden sm:block">
                            <div className="h-full bg-secondary" style={{ width: `${share}%` }} />
                          </div>
                          {share.toFixed(1)}%
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </SurfaceCard>
      )}

    </div>
  );
}

