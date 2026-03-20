"use client";

import { useMemo, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { useBrandOps } from "@/components/BrandOpsProvider";
import { currencyFormatter, integerFormatter } from "@/lib/brandops/format";
import { buildCmvCandidates } from "@/lib/brandops/metrics";

export default function CmvPage() {
  const { activeBrand, saveCmvEntry } = useBrandOps();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const savedDrafts = useMemo(() => {
    const nextDrafts: Record<string, string> = {};
    activeBrand?.cmvEntries.forEach((entry) => {
      nextDrafts[entry.productId] = String(entry.unitCost).replace(".", ",");
    });
    return nextDrafts;
  }, [activeBrand]);

  if (!activeBrand || !activeBrand.salesLines.length) {
    return (
      <EmptyState
        title="Ainda não há produtos para cadastrar CMV"
        description="Importe o arquivo Pedidos Pagos.csv para carregar a base de produtos vendidos por ID."
      />
    );
  }

  const products = buildCmvCandidates(activeBrand);

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-3xl font-bold text-on-surface">CMV</h1>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-on-surface-variant">
          Cadastre o custo unitário por produto para aproximar o resultado
          operacional. Nesta primeira versão, o BrandOps considera o custo vigente
          atual para todo o histórico importado.
        </p>
      </section>

      <div className="rounded-3xl border border-outline bg-surface-container p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.2em] text-on-surface-variant">
              <tr>
                <th className="pb-3">Produto</th>
                <th className="pb-3 text-right">Qtde vendida</th>
                <th className="pb-3 text-right">Receita bruta</th>
                <th className="pb-3 text-right">CMV unitário</th>
                <th className="pb-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline">
              {products.map((product) => (
                <tr key={product.productId}>
                  <td className="py-4">
                    <p className="font-semibold text-on-surface">{product.productName}</p>
                    <p className="mt-1 text-on-surface-variant">{product.productId}</p>
                  </td>
                  <td className="py-4 text-right text-on-surface-variant">
                    {integerFormatter.format(product.quantity)}
                  </td>
                  <td className="py-4 text-right text-on-surface">
                    {currencyFormatter.format(product.revenue)}
                  </td>
                  <td className="py-4 text-right">
                    <input
                      value={drafts[product.productId] ?? savedDrafts[product.productId] ?? ""}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [product.productId]: event.target.value,
                        }))
                      }
                      placeholder="0,00"
                      className="w-28 rounded-xl border border-outline bg-background px-3 py-2 text-right text-on-surface outline-none"
                    />
                  </td>
                  <td className="py-4 text-right">
                    <button
                      onClick={() => {
                        const raw = (drafts[product.productId] ?? "").trim();
                        const unitCost = Number(raw.replace(/\./g, "").replace(",", "."));
                        if (!Number.isFinite(unitCost)) {
                          return;
                        }
                        saveCmvEntry(
                          activeBrand.id,
                          product.productId,
                          product.productName,
                          unitCost,
                        );
                      }}
                      className="rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-on-secondary"
                    >
                      Salvar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
