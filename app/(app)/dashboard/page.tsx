"use client";

import { EmptyState } from "@/components/EmptyState";
import { MetricCard } from "@/components/MetricCard";
import { useBrandOps } from "@/components/BrandOpsProvider";
import { PageHeader, SectionHeading, SurfaceCard } from "@/components/ui-shell";
import {
  currencyFormatter,
  formatLongDateTime,
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
  const importedKinds = Object.values(activeBrand.files);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Resumo executivo"
        title={activeBrand.name}
        description={
          <>
            Visão consolidada da operação no período selecionado. Receita, mídia,
            CMV e contribuição ficam lado a lado para acelerar leitura e decisão.
          </>
        }
        badge={`Período analisado: ${selectedPeriodLabel}`}
        actions={
          <div className="panel-muted px-4 py-3 text-sm text-[var(--color-ink-soft)]">
            Última atualização: {formatLongDateTime(activeBrand.updatedAt)}
          </div>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Receita líquida"
          value={currencyFormatter.format(metrics.netRevenue)}
          help={`${integerFormatter.format(metrics.paidOrderCount)} pedidos pagos`}
          accent="positive"
        />
        <MetricCard
          label="Mídia"
          value={currencyFormatter.format(metrics.mediaSpend)}
          help={`ROAS bruto ${metrics.grossRoas.toFixed(2)}x`}
        />
        <MetricCard
          label="Resultado após mídia"
          value={currencyFormatter.format(metrics.contributionAfterMedia)}
          help={`Margem ${percentFormatter.format(metrics.contributionMargin)}`}
          accent={metrics.contributionAfterMedia >= 0 ? "positive" : "warning"}
        />
        <MetricCard
          label="CMV cadastrado"
          value={currencyFormatter.format(metrics.cmvTotal)}
          help="Baseado nos custos unitários e checkpoints salvos"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <SurfaceCard>
          <SectionHeading
            title="Leitura da operação"
            description="Indicadores que ajudam a entender receita, custo e resultado sem trocar de tela."
          />

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {[
              { label: "Receita bruta", value: currencyFormatter.format(metrics.grossRevenue) },
              { label: "Descontos", value: currencyFormatter.format(metrics.discounts) },
              { label: "Comissões", value: currencyFormatter.format(metrics.commissionTotal) },
              { label: "Unidades vendidas", value: integerFormatter.format(metrics.unitsSold) },
            ].map((item) => (
              <div key={item.label} className="panel-muted p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[var(--color-ink-muted)]">
                  {item.label}
                </p>
                <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[var(--color-ink-strong)]">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <SectionHeading
            title="Arquivos carregados"
            description="Histórico resumido dos blocos já importados para esta marca."
          />
          <div className="mt-5 space-y-3">
            {importedKinds.length ? (
              importedKinds.map((file) => (
                <article key={file.kind} className="panel-muted p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-[var(--color-ink-strong)]">
                        {file.fileName}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.2em] text-[var(--color-ink-muted)]">
                        {file.kind.replaceAll("_", " ")}
                      </p>
                    </div>
                    <div className="text-right text-sm text-[var(--color-ink-soft)]">
                      <p>{integerFormatter.format(file.rowCount)} linhas</p>
                      <p>{formatLongDateTime(file.importedAt)}</p>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <p className="text-sm text-[var(--color-ink-soft)]">
                Ainda não houve importação nesta marca.
              </p>
            )}
          </div>
        </SurfaceCard>
      </section>

      <SurfaceCard>
        <SectionHeading
          title="Marcas acessíveis"
          description="Marcas que este usuário pode abrir neste ambiente."
        />
        <div className="mt-6 overflow-x-auto rounded-[22px] border border-outline/50">
          <table className="brandops-table-compact w-full text-left text-sm border-separate border-spacing-0">
            <thead>
              <tr>
                <th>Marca</th>
                <th className="text-right">Criada em</th>
                <th className="text-right">Atualizada em</th>
                <th className="text-right">Situação</th>
              </tr>
            </thead>
            <tbody>
              {brands.map((brand) => (
                <tr key={brand.id}>
                  <td>
                    <span className="font-semibold text-[var(--color-ink-strong)]">{brand.name}</span>
                  </td>
                  <td className="text-right text-[var(--color-ink-soft)]">
                    {formatLongDateTime(brand.created_at)}
                  </td>
                  <td className="text-right text-[var(--color-ink-soft)]">
                    {formatLongDateTime(brand.updated_at)}
                  </td>
                  <td className="text-right">
                    <span className="inline-flex rounded-full border border-white/8 bg-white/5 px-3 py-1 text-xs font-semibold text-[var(--color-ink-strong)]">
                      {brand.id === activeBrand.id ? "Em foco" : "Disponível"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SurfaceCard>
    </div>
  );
}
