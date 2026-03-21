"use client";

import { useMemo, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { useBrandOps } from "@/components/BrandOpsProvider";
import { PageHeader, SectionHeading, SurfaceCard } from "@/components/ui-shell";
import { currencyFormatter, formatLongDateTime, integerFormatter } from "@/lib/brandops/format";
import { buildCmvCandidates, buildCmvTypeCandidates } from "@/lib/brandops/metrics";

export default function CmvPage() {
  const {
    activeBrand,
    filteredBrand,
    saveCmvRule,
    applyCmvCheckpoint,
    selectedPeriodLabel,
  } = useBrandOps();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [checkpointNote, setCheckpointNote] = useState("");
  const [isApplyingCheckpoint, setIsApplyingCheckpoint] = useState(false);

  const productDrafts = useMemo(() => {
    const nextDrafts: Record<string, string> = {};
    activeBrand?.cmvEntries
      .filter((entry) => entry.matchType === "PRODUCT")
      .forEach((entry) => {
        nextDrafts[entry.matchValue] = String(entry.unitCost).replace(".", ",");
      });
    return nextDrafts;
  }, [activeBrand]);

  const typeDrafts = useMemo(() => {
    const nextDrafts: Record<string, string> = {};
    activeBrand?.cmvEntries
      .filter((entry) => entry.matchType === "TYPE")
      .forEach((entry) => {
        nextDrafts[entry.matchValue] = String(entry.unitCost).replace(".", ",");
      });
    return nextDrafts;
  }, [activeBrand]);

  if (!activeBrand || !filteredBrand || !filteredBrand.orderItems.length) {
    return (
      <EmptyState
        title="Ainda não há itens para CMV"
        description="Importe Lista de Itens.csv e, se quiser acelerar o processo, também a base Controle Financeiro - Oh, My Dog! - CMV_Produtos.csv."
      />
    );
  }

  const productCandidates = buildCmvCandidates(filteredBrand).slice(0, 20);
  const typeCandidates = buildCmvTypeCandidates(filteredBrand);
  const latestCheckpoint = activeBrand.cmvCheckpoints[0] ?? null;

  const parseCurrencyDraft = (value: string) =>
    Number(value.trim().replace(/\./g, "").replace(",", "."));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Custo da mercadoria"
        title="CMV"
        description="Cadastre o custo por tipo de peça e crie overrides por produto quando necessário. O cálculo usa checkpoint para preservar o histórico das vendas já importadas."
        badge={`Período analisado: ${selectedPeriodLabel}`}
      />

      <section className="grid gap-6 xl:grid-cols-[0.72fr_1.28fr]">
        <SurfaceCard>
          <SectionHeading
            title="Checkpoint do CMV"
            description="Sempre que o custo mudar, aplique um novo checkpoint para congelar o CMV nas vendas já importadas."
          />

          <textarea
            value={checkpointNote}
            onChange={(event) => setCheckpointNote(event.target.value)}
            placeholder="Ex.: atualização de tabela INK março/2026"
            className="brandops-input mt-5 min-h-28 w-full p-3 rounded-xl"
          />

          <button
            onClick={async () => {
              setIsApplyingCheckpoint(true);
              try {
                await applyCmvCheckpoint(activeBrand.id, checkpointNote);
                setCheckpointNote("");
              } finally {
                setIsApplyingCheckpoint(false);
              }
            }}
            className="brandops-button brandops-button-primary mt-4 w-full"
          >
            {isApplyingCheckpoint ? "Aplicando..." : "Aplicar checkpoint agora"}
          </button>

          <div className="panel-muted mt-5 p-4 text-sm text-[var(--color-ink-soft)]">
            {latestCheckpoint ? (
              <>
                <p className="font-semibold text-[var(--color-ink-strong)]">Último checkpoint</p>
                <p className="mt-2">{formatLongDateTime(latestCheckpoint.createdAt)}</p>
                <p className="mt-1">
                  {integerFormatter.format(latestCheckpoint.itemsUpdated)} item(ns) recalculados
                </p>
                <p className="mt-1">
                  {integerFormatter.format(latestCheckpoint.unmatchedItems)} item(ns) sem match
                </p>
                {latestCheckpoint.note ? <p className="mt-2">{latestCheckpoint.note}</p> : null}
              </>
            ) : (
              "Nenhum checkpoint aplicado ainda."
            )}
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <SectionHeading
            title="Base por tipo de peça"
            description="Esta é a base principal da operação. Ela cobre os tipos da tabela de custo e serve como fallback do cálculo."
          />

          <div className="brandops-table-container mt-6">
            <table className="app-table brandops-table-compact min-w-[820px]">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th className="text-right">Qtde vendida</th>
                  <th className="text-right">Receita bruta</th>
                  <th className="text-right">CMV unitário</th>
                  <th className="text-right">Salvar</th>
                </tr>
              </thead>
              <tbody>
                {typeCandidates.map((candidate) => (
                  <tr key={candidate.typeKey}>
                    <td className="font-semibold text-on-surface">{candidate.typeLabel}</td>
                    <td className="text-right text-on-surface-variant">
                      {integerFormatter.format(candidate.quantity)}
                    </td>
                    <td className="text-right text-on-surface">
                      {currencyFormatter.format(candidate.revenue)}
                    </td>
                    <td className="text-right">
                      <input
                        value={drafts[`type:${candidate.typeKey}`] ?? typeDrafts[candidate.typeKey] ?? ""}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [`type:${candidate.typeKey}`]: event.target.value,
                          }))
                        }
                        placeholder="0,00"
                        className="brandops-input max-w-32 text-right p-1.5 rounded-lg"
                      />
                    </td>
                    <td className="text-right">
                      <button
                        onClick={() => {
                          const raw = drafts[`type:${candidate.typeKey}`] ?? "";
                          const unitCost = parseCurrencyDraft(raw);
                          if (!Number.isFinite(unitCost)) {
                            return;
                          }
                          void saveCmvRule(
                            activeBrand.id,
                            "TYPE",
                            candidate.typeLabel,
                            candidate.typeLabel,
                            unitCost,
                          );
                        }}
                        className="brandops-button brandops-button-secondary py-1.5 px-3"
                      >
                        Gravar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SurfaceCard>
      </section>

      <SurfaceCard>
        <SectionHeading
          title="Overrides por produto"
          description="Use este bloco quando um produto específico fugir do custo padrão do tipo."
        />
        <div className="brandops-table-container mt-6">
          <table className="app-table brandops-table-compact min-w-[900px]">
            <thead>
              <tr>
                <th>Produto</th>
                <th>Tipo detectado</th>
                <th className="text-right">Qtde vendida</th>
                <th className="text-right">Receita bruta</th>
                <th className="text-right">CMV unitário</th>
                <th className="text-right">Salvar</th>
              </tr>
            </thead>
            <tbody>
              {productCandidates.map((product) => (
                <tr key={product.productId}>
                  <td>
                    <p className="font-semibold text-on-surface">{product.productName}</p>
                  </td>
                  <td className="text-on-surface-variant">
                    {product.productType ?? "Sem tipo detectado"}
                  </td>
                  <td className="text-right text-on-surface-variant">
                    {integerFormatter.format(product.quantity)}
                  </td>
                  <td className="text-right text-on-surface">
                    {currencyFormatter.format(product.revenue)}
                  </td>
                  <td className="text-right">
                    <input
                      value={drafts[`product:${product.productId}`] ?? productDrafts[product.productId] ?? ""}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [`product:${product.productId}`]: event.target.value,
                        }))
                      }
                      placeholder="0,00"
                      className="brandops-input max-w-32 text-right p-1.5 rounded-lg"
                    />
                  </td>
                  <td className="text-right">
                    <button
                      onClick={() => {
                        const raw = drafts[`product:${product.productId}`] ?? "";
                        const unitCost = parseCurrencyDraft(raw);
                        if (!Number.isFinite(unitCost)) {
                          return;
                        }
                        void saveCmvRule(
                          activeBrand.id,
                          "PRODUCT",
                          product.productName,
                          product.productName,
                          unitCost,
                        );
                      }}
                      className="brandops-button brandops-button-secondary py-1.5 px-3"
                    >
                      Gravar
                    </button>
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
