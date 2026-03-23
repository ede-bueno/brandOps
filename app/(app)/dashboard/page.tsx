"use client";

import { EmptyState } from "@/components/EmptyState";
import { MetricCard } from "@/components/MetricCard";
import { useBrandOps } from "@/components/BrandOpsProvider";
import { PageHeader, SectionHeading, SurfaceCard } from "@/components/ui-shell";
import { TrendingUp } from "lucide-react";
import {
  currencyFormatter,
  integerFormatter,
  percentFormatter,
} from "@/lib/brandops/format";
import { computeBrandMetrics } from "@/lib/brandops/metrics";

export default function DashboardPage() {
  const { activeBrand, brands, filteredBrand, selectedPeriodLabel } = useBrandOps();

  if (!activeBrand || !filteredBrand) {
    return (
      <EmptyState
        title="Nenhuma marca em foco"
        description="Importe os CSVs da operação para abrir a leitura da marca e começar a acompanhar os números."
      />
    );
  }

  const metrics = computeBrandMetrics(filteredBrand);

  return (
    <div className="relative isolate overflow-hidden space-y-6">
      {/* Background patterns */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-20 right-[-6rem] h-96 w-96 rounded-full bg-secondary/10 blur-[100px]" />
        <div className="absolute left-[-10rem] top-40 h-80 w-80 rounded-full bg-primary/5 blur-[120px]" />
      </div>

      <PageHeader
        eyebrow="Resumo executivo"
        title={activeBrand.name}
        description="Leitura consolidada da operação no período selecionado, separando a visão comercial da INK da análise financeira gerencial do BrandOps."
        badge={
          <div className="flex items-center gap-2 bg-secondary/10 text-secondary px-3 py-1 rounded-full border border-secondary/20">
            <TrendingUp size={12} />
            <span className="text-[10px] font-bold uppercase tracking-wider">{selectedPeriodLabel}</span>
          </div>
        }
        actions={
          <div className="flex items-center gap-3">
             {/* Removido o metadado técnico 'Sincronizado' conforme pedido */}
          </div>
        }

      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Vendas"
          value={integerFormatter.format(metrics.paidOrderCount)}
          help="Pedidos pagos no período"
          accent="positive"
        />
        <MetricCard
          label="Ticket Médio"
          value={currencyFormatter.format(metrics.averageTicket)}
          help="Faturado / vendas"
        />
        <MetricCard
          label="Itens Vendidos"
          value={integerFormatter.format(metrics.unitsSold)}
          help={metrics.hasItemDetailCoverage ? "Peças conciliadas da base" : "Volume informado no pedido"}
        />
        <MetricCard
          label="Itens por venda"
          value={metrics.itemsPerOrder.toFixed(1)}
          help="Média de peças por pedido"
        />
        <MetricCard
          label="Faturado"
          value={currencyFormatter.format(metrics.netRevenue)}
          help="Total faturado exportado pela INK"
          accent="secondary"
        />
        <MetricCard
          label="Lucro INK"
          value={currencyFormatter.format(metrics.inkProfit)}
          help="Comissão exportada pela INK"
          accent="positive"
        />
        <MetricCard
          label="Lucro Médio"
          value={currencyFormatter.format(metrics.averageInkProfit)}
          help="Lucro INK / vendas"
        />
        <MetricCard
          label={metrics.couponDiscounts > 0 ? "Desconto Cupom" : "Descontos"}
          value={currencyFormatter.format(metrics.couponDiscounts > 0 ? metrics.couponDiscounts : metrics.discounts)}
          help={
            metrics.couponDiscounts > 0
              ? "Somente pedidos com cupom identificado"
              : "Desconto total exportado pela INK"
          }
        />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Investimento Mídia"
          value={currencyFormatter.format(metrics.mediaSpend)}
          help={`ROAS ${metrics.grossRoas.toFixed(2)}x`}
        />
        <MetricCard
          label="CMV Aplicado"
          value={currencyFormatter.format(metrics.cmvTotal)}
          help={metrics.hasItemDetailCoverage ? "Custo histórico por item" : "Aguardando conciliação de itens"}
        />
        <MetricCard
          label="Margem após mídia"
          value={currencyFormatter.format(metrics.contributionAfterMedia)}
          help={`Margem ${percentFormatter.format(metrics.contributionMargin)}`}
          accent={metrics.contributionAfterMedia >= 0 ? "positive" : "warning"}
        />
        <MetricCard
          label="Ponto de Equilíbrio"
          value={currencyFormatter.format(metrics.breakEvenPoint)}
          help="Venda necessária para cobrir despesas"
          accent="secondary"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <SurfaceCard className="xl:col-span-2 p-6 overflow-hidden relative">
          <SectionHeading
            title="Eficiência Operacional"
            description="Leitura do faturamento, descontos, lucro exportado pela INK e volume conciliado da base."
          />
          
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Preço de Tabela", value: metrics.grossRevenue, sub: "Itens antes de desconto" },
              { label: "Descontos", value: metrics.discounts, sub: "Desconto total exportado", color: "text-tertiary" },
              { label: "Lucro INK", value: metrics.inkProfit, sub: "Comissão exportada pela plataforma", color: "text-secondary" },
              { label: "Itens Vendidos", value: metrics.unitsSold, sub: "Volume total", isCurrency: false },
            ].map((item) => (
              <div key={item.label} className="p-5 rounded-3xl bg-surface-container/30 border border-outline hover:bg-surface-container/50 transition-all group">
                <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                  {item.label}
                </p>
                <p className={`mt-3 text-2xl font-bold tracking-tight text-on-surface ${item.color ?? ""}`}>
                  {item.isCurrency === false ? integerFormatter.format(item.value) : currencyFormatter.format(item.value)}
                </p>
                <p className="mt-1 text-[10px] font-medium text-on-surface-variant opacity-50 uppercase tracking-tighter">
                  {item.sub}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-8 p-6 rounded-[2.5rem] bg-background border border-outline shadow-inner">
             <div className="flex items-center justify-between mb-6">
                <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-on-surface-variant">Análise de Margem</h4>
                <span className="px-3 py-1 rounded-full bg-secondary/10 text-secondary text-[10px] font-bold tracking-widest">REALTIME</span>
             </div>
             <div className="flex h-3 w-full rounded-full bg-surface-container overflow-hidden">
                <div className="h-full bg-secondary" style={{ width: `${metrics.contributionMargin * 100}%` }} />
                <div className="h-full bg-primary/40" style={{ width: `${(1 - metrics.contributionMargin) * 100}%` }} />
             </div>
             <div className="mt-4 flex justify-between text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                <span>Margem de Contribuição ({percentFormatter.format(metrics.contributionMargin)})</span>
                <span className="text-on-surface">Custo Variável ({(1 - metrics.contributionMargin).toFixed(2)}%)</span>
             </div>
          </div>
        </SurfaceCard>

        <SurfaceCard className="p-6">
          <SectionHeading
            title="Marcas do Grupo"
            description="Ambientes disponíveis para monitoramento."
          />
          <div className="mt-6 space-y-2">
            {brands.map((brand) => {
              const isActive = brand.id === activeBrand.id;
              return (
                <div 
                  key={brand.id}
                  className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                    isActive 
                      ? "border-secondary/40 bg-secondary/5 shadow-sm" 
                      : "border-outline bg-background/50 opacity-80 hover:opacity-100"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 flex items-center justify-center rounded-xl font-bold text-xs ${
                      isActive ? "bg-secondary text-on-secondary" : "bg-surface-container text-on-surface-variant"
                    }`}>
                      {brand.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-on-surface">{brand.name}</p>
                      <p className="text-[10px] font-medium text-on-surface-variant">ID: {brand.id.split("-")[0]}</p>
                    </div>
                  </div>
                  {isActive && (
                    <div className="h-2 w-2 rounded-full bg-secondary animate-pulse shadow-[0_0_8px_var(--color-secondary)]" />
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-8 p-5 rounded-[2rem] bg-surface-container/50 border border-outline border-dashed text-center">
             <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-on-surface-variant mb-2">Power Bi Link</p>
             <button className="text-xs font-bold text-secondary hover:underline transition-all">
                Abrir Relatório Completo →
             </button>
          </div>
        </SurfaceCard>
      </section>
    </div>
  );
}
