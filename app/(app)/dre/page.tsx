"use client";

import { EmptyState } from "@/components/EmptyState";
import { useBrandOps } from "@/components/BrandOpsProvider";
import { currencyFormatter, percentFormatter } from "@/lib/brandops/format";
import { computeBrandMetrics } from "@/lib/brandops/metrics";

function DreRow({
  label,
  value,
  percentage,
  highlight = false,
}: {
  label: string;
  value: number;
  percentage: number;
  highlight?: boolean;
}) {
  return (
    <tr className={highlight ? "bg-surface-container-high" : "border-t border-outline"}>
      <td className="px-6 py-4 font-medium text-on-surface">{label}</td>
      <td className="px-6 py-4 text-right text-on-surface">
        {currencyFormatter.format(value)}
      </td>
      <td className="px-6 py-4 text-right text-on-surface-variant">
        {percentFormatter.format(percentage)}
      </td>
    </tr>
  );
}

export default function DrePage() {
  const { activeBrand } = useBrandOps();

  if (!activeBrand || !activeBrand.paidOrders.length) {
    return (
      <EmptyState
        title="Ainda não há dados suficientes para o DRE"
        description="Importe Lista de Pedidos.csv e Lista de Itens.csv. Para refinar o resultado, complete também o CMV por produto."
      />
    );
  }

  const metrics = computeBrandMetrics(activeBrand);
  const grossMargin = metrics.grossRevenue - metrics.discounts;
  const netBase = metrics.netRevenue || 1;

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-3xl font-bold text-on-surface">DRE</h1>
        <p className="mt-2 text-sm leading-7 text-on-surface-variant">
          Demonstrativo resumido com base nos arquivos importados e nos custos já
          cadastrados.
        </p>
      </section>

      <section className="rounded-3xl border border-outline bg-surface-container p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-secondary">
              Resultado do período
            </p>
            <h2 className="mt-2 text-3xl font-bold text-on-surface">
              {currencyFormatter.format(metrics.operatingResult)}
            </h2>
            <p className="mt-2 text-sm text-on-surface-variant">
              Resultado após mídia, comissões e CMV lançado no sistema.
            </p>
          </div>
          <div className="rounded-2xl border border-outline bg-background px-5 py-4 text-sm text-on-surface-variant">
            Margem operacional:{" "}
            <span className="font-semibold text-on-surface">
              {percentFormatter.format(metrics.netRevenue ? metrics.operatingResult / metrics.netRevenue : 0)}
            </span>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-outline">
          <table className="w-full text-left text-sm">
            <tbody>
              <DreRow
                label="1. Receita Bruta"
                value={metrics.grossRevenue}
                percentage={metrics.grossRevenue / netBase}
                highlight
              />
              <DreRow
                label="(-) Descontos"
                value={-metrics.discounts}
                percentage={-metrics.discounts / netBase}
              />
              <DreRow
                label="2. Receita Líquida"
                value={metrics.netRevenue}
                percentage={1}
                highlight
              />
              <DreRow
                label="(-) Comissões / Taxas"
                value={-metrics.commissionTotal}
                percentage={-metrics.commissionTotal / netBase}
              />
              <DreRow
                label="(-) Investimento em Mídia"
                value={-metrics.mediaSpend}
                percentage={-metrics.mediaSpend / netBase}
              />
              <DreRow
                label="3. Resultado após mídia"
                value={metrics.contributionAfterMedia}
                percentage={metrics.contributionAfterMedia / netBase}
                highlight
              />
              <DreRow
                label="(-) CMV cadastrado"
                value={-metrics.cmvTotal}
                percentage={-metrics.cmvTotal / netBase}
              />
              <DreRow
                label="4. Resultado Operacional"
                value={metrics.operatingResult}
                percentage={metrics.operatingResult / netBase}
                highlight
              />
            </tbody>
          </table>
        </div>

        <div className="mt-5 rounded-2xl border border-outline bg-background p-4 text-sm text-on-surface-variant">
          Receita líquida considerada: {currencyFormatter.format(metrics.netRevenue)}.
          Receita bruta itemizada: {currencyFormatter.format(grossMargin + metrics.discounts)}.
          Se houver produto sem CMV cadastrado, este resultado ainda estará acima do
          real.
        </div>
      </section>
    </div>
  );
}
