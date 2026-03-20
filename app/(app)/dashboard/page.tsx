"use client";

import { EmptyState } from "@/components/EmptyState";
import { MetricCard } from "@/components/MetricCard";
import { useBrandOps } from "@/components/BrandOpsProvider";
import {
  currencyFormatter,
  formatLongDateTime,
  integerFormatter,
  percentFormatter,
} from "@/lib/brandops/format";
import { computeBrandMetrics } from "@/lib/brandops/metrics";

export default function DashboardPage() {
  const { activeBrand, brands } = useBrandOps();

  if (!activeBrand) {
    return (
      <EmptyState
        title="Nenhuma marca em foco"
        description="Importe os CSVs da operação para abrir a leitura da marca e começar a acompanhar os números."
      />
    );
  }

  const metrics = computeBrandMetrics(activeBrand);
  const importedKinds = Object.values(activeBrand.files);

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 rounded-3xl border border-outline bg-surface-container p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-secondary">
              Resumo da marca
            </p>
            <h1 className="mt-2 text-3xl font-bold text-on-surface">
              {activeBrand.name}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-on-surface-variant">
              Aqui você acompanha os números que sustentam a operação: receita,
              mídia, comissões, descontos e CMV.
            </p>
          </div>

          <div className="rounded-2xl border border-outline bg-surface-container-high px-4 py-3 text-sm text-on-surface-variant">
            Última atualização: {formatLongDateTime(activeBrand.updatedAt)}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
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
            help="Baseado nos custos unitários lançados na tela de CMV"
          />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-outline bg-surface-container p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-on-surface">
                Leitura da operação
              </h2>
              <p className="mt-1 text-sm text-on-surface-variant">
                Os indicadores abaixo ajudam a entender receita, custo e resultado.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-outline bg-background p-4">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-on-surface-variant">
                Receita bruta
              </p>
              <p className="mt-2 text-2xl font-bold text-on-surface">
                {currencyFormatter.format(metrics.grossRevenue)}
              </p>
            </div>
            <div className="rounded-2xl border border-outline bg-background p-4">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-on-surface-variant">
                Descontos
              </p>
              <p className="mt-2 text-2xl font-bold text-on-surface">
                {currencyFormatter.format(metrics.discounts)}
              </p>
            </div>
            <div className="rounded-2xl border border-outline bg-background p-4">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-on-surface-variant">
                Comissões
              </p>
              <p className="mt-2 text-2xl font-bold text-on-surface">
                {currencyFormatter.format(metrics.commissionTotal)}
              </p>
            </div>
            <div className="rounded-2xl border border-outline bg-background p-4">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-on-surface-variant">
                Unidades vendidas
              </p>
              <p className="mt-2 text-2xl font-bold text-on-surface">
                {integerFormatter.format(metrics.unitsSold)}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-outline bg-surface-container p-6">
          <h2 className="text-xl font-semibold text-on-surface">
            Arquivos carregados
          </h2>
          <div className="mt-5 space-y-3">
            {importedKinds.length ? (
              importedKinds.map((file) => (
                <div
                  key={file.kind}
                  className="rounded-2xl border border-outline bg-background p-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-on-surface">
                        {file.fileName}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.2em] text-on-surface-variant">
                        {file.kind.replaceAll("_", " ")}
                      </p>
                    </div>
                    <div className="text-right text-sm text-on-surface-variant">
                      <p>{integerFormatter.format(file.rowCount)} linhas</p>
                      <p>{formatLongDateTime(file.importedAt)}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-on-surface-variant">
                Ainda não houve importação nesta marca.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-outline bg-surface-container p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-on-surface">
              Marcas acessíveis
            </h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              Marcas que este usuário pode abrir neste ambiente.
            </p>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left">
            <thead className="text-xs uppercase tracking-[0.2em] text-on-surface-variant">
              <tr>
                <th className="pb-3">Marca</th>
                <th className="pb-3 text-right">Criada em</th>
                <th className="pb-3 text-right">Atualizada em</th>
                <th className="pb-3 text-right">Situação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline">
              {brands.map((brand) => {
                return (
                  <tr key={brand.id}>
                    <td className="py-4 font-semibold text-on-surface">{brand.name}</td>
                    <td className="py-4 text-right text-on-surface-variant">
                      {formatLongDateTime(brand.created_at)}
                    </td>
                    <td className="py-4 text-right text-on-surface-variant">
                      {formatLongDateTime(brand.updated_at)}
                    </td>
                    <td className="py-4 text-right text-on-surface">
                      {brand.id === activeBrand.id ? "Em foco" : "Disponível"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
