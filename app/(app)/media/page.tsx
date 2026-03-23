"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
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
import { buildCampaignPerformance, buildDailyMediaSeries, computeBrandMetrics, getActiveMediaRows } from "@/lib/brandops/metrics";
import { MediaRow } from "@/lib/brandops/types";
import { useState } from "react";


export default function MediaPage() {
  const { activeBrand, filteredBrand, selectedPeriodLabel } = useBrandOps();
  const [activeTab, setActiveTab] = useState<"geral" | "campanhas">("geral");

  if (!activeBrand || !filteredBrand || !filteredBrand.media.length) {
    return (
      <EmptyState
        title="Ainda não há mídia carregada"
        description="Importe o Meta Export.csv para analisar investimento, receita atribuída e desempenho por campanha."
      />
    );
  }

  const metrics = computeBrandMetrics(filteredBrand);
  const dailyMedia = buildDailyMediaSeries(filteredBrand);
  const campaigns = buildCampaignPerformance(filteredBrand);
  const activeMedia = getActiveMediaRows(filteredBrand);
  const totalPurchases = activeMedia.reduce((sum: number, row: MediaRow) => sum + row.purchases, 0);
  const totalClicks = activeMedia.reduce((sum: number, row: MediaRow) => sum + (row.linkClicks || 0), 0);
  const attributedRevenue = activeMedia.reduce((sum: number, row: MediaRow) => sum + row.purchaseValue, 0);

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Aquisição"
        title="Mídia"
        description="Veja investimento, receita atribuída e desempenho das campanhas da Meta no período."
        badge={`Período analisado: ${selectedPeriodLabel}`}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Investimento" value={currencyFormatter.format(metrics.mediaSpend)} />
        <MetricCard label="Receita atribuída" value={currencyFormatter.format(attributedRevenue)} accent="positive" />
        <MetricCard label="Compras atribuídas" value={integerFormatter.format(totalPurchases)} />
        <MetricCard label="Cliques no link" value={integerFormatter.format(totalClicks)} />
      </section>

      <div className="flex gap-2 p-1 bg-surface-container rounded-xl w-fit">
        <button
          onClick={() => setActiveTab("geral")}
          className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
            activeTab === "geral" ? "bg-background text-primary shadow-sm" : "text-on-surface-variant hover:text-on-surface"
          }`}
        >
          Performance Geral
        </button>
        <button
          onClick={() => setActiveTab("campanhas")}
          className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
            activeTab === "campanhas" ? "bg-background text-primary shadow-sm" : "text-on-surface-variant hover:text-on-surface"
          }`}
        >
          Análise de Campanhas
        </button>
      </div>

      {activeTab === "geral" && (
        <SurfaceCard className="p-6">
          <SectionHeading
            title="Investimento x receita por dia"
            description="Compare gasto e retorno atribuído com visão diária para otimização de verba."
          />
          <div className="mt-6 h-[500px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyMedia}>
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
                  cursor={{ fill: 'rgba(255, 142, 110, 0.05)' }}
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
                <Legend iconType="circle" wrapperStyle={{ paddingTop: 20, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }} />
                <Bar dataKey="spend" name="Investimento" fill="#ff8e6e" radius={[8, 8, 0, 0]} barSize={20} />
                <Bar dataKey="purchaseValue" name="Receita atribuída" fill="#8be1ff" radius={[8, 8, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SurfaceCard>
      )}

      {activeTab === "campanhas" && (
        <SurfaceCard className="p-6">
          <SectionHeading
            title="Performance por Campanha"
            description="Ranking de eficiência baseado em ROAS e volume de investimento."
          />
          <div className="mt-8 overflow-x-auto">
             <table className="w-full text-left border-separate border-spacing-y-2">
                <thead>
                   <tr className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/60">
                      <th className="pb-4 pl-4">Campanha</th>
                      <th className="pb-4 text-center">Inv.</th>
                      <th className="pb-4 text-center">ROAS</th>
                      <th className="pb-4 text-right pr-4">Receita Atribuída</th>
                   </tr>
                </thead>
                <tbody>
                   {campaigns.map((campaign) => (
                      <tr key={campaign.campaignName} className="group h-14 bg-surface-container/20 hover:bg-surface-container/40 transition-all">
                         <td className="rounded-l-2xl pl-4">
                            <p className="text-sm font-bold text-on-surface uppercase tracking-tight truncate max-w-[450px]">
                               {campaign.campaignName}
                            </p>
                         </td>
                         <td className="text-center font-bold text-sm text-on-surface-variant">
                            {currencyFormatter.format(campaign.spend)}
                         </td>
                         <td className="text-center">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest ${
                               campaign.roas > 2.5 ? 'bg-secondary/20 text-secondary' : 'bg-surface-container-highest text-on-surface-variant'
                            }`}>
                               {campaign.roas.toFixed(2)}X
                            </span>
                         </td>
                         <td className="rounded-r-2xl text-right pr-4 font-black text-sm text-on-surface">
                            {currencyFormatter.format(campaign.purchaseValue)}
                         </td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </div>
        </SurfaceCard>
      )}

    </div>
  );
}

