"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EmptyState } from "@/components/EmptyState";
import { useBrandOps } from "@/components/BrandOpsProvider";
import { PageHeader, SectionHeading, SurfaceCard } from "@/components/ui-shell";
import { currencyFormatter, percentFormatter } from "@/lib/brandops/format";
import { buildAnnualDreReport } from "@/lib/brandops/metrics";
import { cn } from "@/lib/utils";


export default function DrePage() {
  const { activeBrand, filteredBrand, selectedPeriodLabel } = useBrandOps();

  if (!activeBrand || !filteredBrand) {
    return (
      <EmptyState
        title="Nenhum dado para o DRE"
        description="Importe vendas, mídia e despesas para visualizar o Demonstrativo de Resultados."
      />
    );
  }

  const report = buildAnnualDreReport(filteredBrand);

  const rowStyles = {
    header: "bg-surface-variant/30 font-bold text-on-surface uppercase tracking-wider text-[10px]",
    metric: "text-on-surface font-medium",
    subMetric: "text-on-surface-variant text-sm pl-6",
    total: "font-bold text-on-surface border-t border-outline/30",
    positive: "text-[var(--color-positive)]",
    negative: "text-[var(--color-warning)]",
    neutral: "text-on-surface-variant",
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Relatório gerencial"
        title="DRE Anual"
        description="Visão matricial de performance financeira. Consolidação de receitas, custos diretos, mídia e despesas fixas para chegar ao resultado líquido."
        badge={`Período: ${selectedPeriodLabel}`}
      />

      <SurfaceCard className="p-6">

        <SectionHeading 
          title="Evolução de Resultado" 
          description="Receita Líquida (RLD) vs CMV vs Resultado Líquido Final ao longo dos meses." 
        />
        <div className="h-[300px] mt-6">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={report.months.map(m => ({ 
              name: m.label, 
              rld: m.metrics.rld, 
              cmv: m.metrics.cmvTotal,
              result: m.metrics.netResult
            }))}>
              <defs>
                <linearGradient id="colorRld" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorResult" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-secondary)" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="var(--color-secondary)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-outline)" vertical={false} opacity={0.2} />
              <XAxis 
                dataKey="name" 
                stroke="var(--color-on-surface-variant)" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
              />
              <YAxis 
                stroke="var(--color-on-surface-variant)" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false}
                tickFormatter={(v) => `R$${Math.round(v/1000)}k`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--color-surface)', 
                  borderRadius: '12px', 
                  border: '1px solid var(--color-outline)',
                  fontSize: '11px',
                  boxShadow: '0 10px 30px -10px rgba(0,0,0,0.2)'
                }} 
              />
              <Area 
                type="monotone" 
                dataKey="rld" 
                name="Receita (RLD)"
                stroke="var(--color-primary)" 
                fillOpacity={1} 
                fill="url(#colorRld)" 
                strokeWidth={2}
              />
              <Area 
                type="monotone" 
                dataKey="result" 
                name="Result. Líquido"
                stroke="var(--color-secondary)" 
                fillOpacity={1} 
                fill="url(#colorResult)" 
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </SurfaceCard>

      <SurfaceCard className="overflow-hidden p-0">
        <div className="p-6 border-b border-outline/10">
          <SectionHeading 
            title="Demonstrativo de Resultados (DRE)" 
            description="Visão contábil detalhada por competência (mês de faturamento)." 
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className={rowStyles.header}>
                <th className="sticky left-0 z-10 bg-surface p-4 min-w-[240px] border-r border-outline/10">Indicador</th>
                {report.months.map((m) => (
                  <th key={m.monthKey} className="p-4 text-center min-w-[120px]">{m.label}</th>
                ))}
                <th className="p-4 text-center min-w-[140px] bg-surface-variant/20">Acumulado</th>
              </tr>

            </thead>
            <tbody className="divide-y divide-outline/10">
              {/* RECEITA */}
              <tr>
                <td className={cn("p-4 sticky left-0 z-10 bg-surface border-r border-outline/10", rowStyles.metric)}>1. Receita Operacional Bruta (ROB)</td>
                {report.months.map((m) => (
                  <td key={m.monthKey} className="p-4 text-right">{currencyFormatter.format(m.metrics.rob)}</td>
                ))}
                <td className="p-4 text-right font-bold bg-surface-variant/10">{currencyFormatter.format(report.total.rob)}</td>
              </tr>
              <tr>
                <td className={cn("p-4 sticky left-0 z-10 bg-surface border-r border-outline/10", rowStyles.subMetric)}>(-) Descontos</td>
                {report.months.map((m) => (
                  <td key={m.monthKey} className="p-4 text-right text-on-surface-variant">{currencyFormatter.format(m.metrics.discounts)}</td>
                ))}
                <td className="p-4 text-right text-on-surface-variant bg-surface-variant/10">{currencyFormatter.format(report.total.discounts)}</td>
              </tr>
              <tr className="bg-surface-variant/5">
                <td className={cn("p-4 sticky left-0 z-10 bg-surface border-r border-outline/10", rowStyles.metric)}>2. Receita Líquida Disponível (RLD)</td>
                {report.months.map((m) => (
                  <td key={m.monthKey} className="p-4 text-right font-semibold">{currencyFormatter.format(m.metrics.rld)}</td>
                ))}
                <td className="p-4 text-right font-bold bg-surface-variant/20">{currencyFormatter.format(report.total.rld)}</td>
              </tr>

              {/* VARIÁVEIS */}
              <tr>
                <td className={cn("p-4 sticky left-0 z-10 bg-surface border-r border-outline/10", rowStyles.subMetric)}>(-) CMV (Custo de Mercadoria)</td>
                {report.months.map((m) => (
                  <td key={m.monthKey} className="p-4 text-right text-on-surface-variant">{currencyFormatter.format(m.metrics.cmvTotal)}</td>
                ))}
                <td className="p-4 text-right text-on-surface-variant bg-surface-variant/10">{currencyFormatter.format(report.total.cmvTotal)}</td>
              </tr>
              <tr>
                <td className={cn("p-4 sticky left-0 z-10 bg-surface border-r border-outline/10", rowStyles.subMetric)}>(-) Mídia (Ads)</td>
                {report.months.map((m) => (
                  <td key={m.monthKey} className="p-4 text-right text-on-surface-variant">{currencyFormatter.format(m.metrics.mediaSpend)}</td>
                ))}
                <td className="p-4 text-right text-on-surface-variant bg-surface-variant/10">{currencyFormatter.format(report.total.mediaSpend)}</td>
              </tr>

              {/* MARGEM DE CONTRIBUIÇÃO */}
              <tr className="bg-surface-variant/10">
                <td className={cn("p-4 sticky left-0 z-10 bg-surface border-r border-outline/20 shadow-sm", rowStyles.metric)}>3. Margem de Contribuição</td>
                {report.months.map((m) => (
                  <td key={m.monthKey} className={cn("p-4 text-right font-bold", m.metrics.contributionAfterMedia >= 0 ? rowStyles.positive : rowStyles.negative)}>
                    {currencyFormatter.format(m.metrics.contributionAfterMedia)}
                  </td>
                ))}
                <td className={cn("p-4 text-right font-bold bg-surface-variant/30", report.total.contributionAfterMedia >= 0 ? rowStyles.positive : rowStyles.negative)}>
                  {currencyFormatter.format(report.total.contributionAfterMedia)}
                </td>
              </tr>
              <tr>
                <td className={cn("p-4 sticky left-0 z-10 bg-surface border-r border-outline/10", rowStyles.subMetric)}>(%) Margem</td>
                {report.months.map((m) => (
                  <td key={m.monthKey} className="p-4 text-right text-xs text-on-surface-variant italic">
                    {percentFormatter.format(m.metrics.contributionMargin)}
                  </td>
                ))}
                <td className="p-4 text-right text-xs text-on-surface-variant italic bg-surface-variant/10">
                  {percentFormatter.format(report.total.contributionMargin)}
                </td>
              </tr>

              {/* DESPESAS FIXAS */}
              <tr>
                <td className={cn("p-4 sticky left-0 z-10 bg-surface border-r border-outline/10", rowStyles.metric)}>4. Despesas Fixas (Centro de Custo)</td>
                {report.months.map((m) => (
                  <td key={m.monthKey} className="p-4 text-right text-[var(--color-warning)]">{currencyFormatter.format(m.metrics.fixedExpensesTotal)}</td>
                ))}
                <td className="p-4 text-right font-bold text-[var(--color-warning)] bg-surface-variant/10">{currencyFormatter.format(report.total.fixedExpensesTotal)}</td>
              </tr>

              {/* BREAKDOWN FIXAS */}
              {report.expenseBreakdown.map((cat) => (
                <tr key={cat.categoryId}>
                  <td className={cn("p-4 sticky left-0 z-10 bg-surface border-r border-outline/10", rowStyles.subMetric)}>{cat.categoryName}</td>
                  {report.months.map((m) => (
                    <td key={m.monthKey} className="p-4 text-right text-xs text-on-surface-variant">
                      {currencyFormatter.format(cat.valuesByMonth[m.monthKey] ?? 0)}
                    </td>
                  ))}
                  <td className="p-4 text-right text-xs text-on-surface-variant bg-surface-variant/5">{currencyFormatter.format(cat.total)}</td>
                </tr>
              ))}

              {/* RESULTADO LÍQUIDO */}
              <tr className="bg-primary/5">
                <td className={cn("p-4 sticky left-0 z-10 bg-primary/10 border-r border-outline/10", rowStyles.metric, "text-base")}>RESULTADO LÍQUIDO FINAL</td>
                {report.months.map((m) => (
                  <td key={m.monthKey} className={cn("p-4 text-right text-lg font-bold", m.metrics.netResult >= 0 ? rowStyles.positive : rowStyles.negative)}>
                    {currencyFormatter.format(m.metrics.netResult)}
                  </td>
                ))}
                <td className={cn("p-4 text-right text-lg font-black bg-primary/20", report.total.netResult >= 0 ? rowStyles.positive : rowStyles.negative)}>
                  {currencyFormatter.format(report.total.netResult)}
                </td>
              </tr>

            </tbody>
          </table>
        </div>
      </SurfaceCard>

      <div className="grid gap-4 md:grid-cols-2">
        <SurfaceCard>
          <h3 className="text-lg font-semibold text-on-surface">Ponto de Equilíbrio</h3>
          <p className="mt-1 text-sm text-on-surface-variant">
            Quanto a marca precisa vender (RLD) para pagar as despesas fixas mantendo a margem atual.
          </p>
          <div className="mt-6 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-on-surface">
              {currencyFormatter.format(report.total.contributionMargin > 0 
                ? report.total.fixedExpensesTotal / report.total.contributionMargin 
                : 0)}
            </span>
            <span className="text-sm text-on-surface-variant">em Receita Líquida (RLD)</span>
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <h3 className="text-lg font-semibold text-on-surface">Eficiência de Mídia (MER)</h3>
          <p className="mt-1 text-sm text-on-surface-variant">
            Representatividade do investimento em anúncios sobre a receita líquida total.
          </p>
          <div className="mt-6 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-on-surface">
              {percentFormatter.format(report.total.rld > 0 ? report.total.mediaSpend / report.total.rld : 0)}
            </span>
            <span className="text-sm text-on-surface-variant">de investimento sobre RLD</span>
          </div>
        </SurfaceCard>
      </div>
    </div>
  );
}
