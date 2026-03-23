"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Save, CalendarClock, Info } from "lucide-react";
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
  const [checkpointDate, setCheckpointDate] = useState(new Date().toISOString().slice(0, 10));
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
    <div className="relative isolate overflow-hidden space-y-6 lg:space-y-8">
      {/* Background patterns */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-20 right-[-6rem] h-96 w-96 rounded-full bg-secondary/10 blur-[120px]" />
        <div className="absolute left-[-5rem] top-64 h-80 w-80 rounded-full bg-primary/10 blur-[100px]" />
      </div>

      <PageHeader
        eyebrow="Custos & Precificação"
        title="Gestão de CMV"
        description="Defina e reajuste os custos base de cada categoria de produto ou crie exceções por SKU. Utilize checkpoints para proteger dados de fechamentos anteriores."
        badge={
          <div className="flex items-center gap-2 bg-secondary/10 text-secondary px-3 py-1 rounded-full border border-secondary/20">
            <span className="text-[10px] font-bold uppercase tracking-wider">{selectedPeriodLabel}</span>
          </div>
        }
      />

      <section className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <SurfaceCard className="p-0 overflow-hidden bg-background">
          <div className="p-6 border-b border-outline bg-surface-container/20 flex items-center justify-between">
            <SectionHeading
              title="Novo Checkpoint"
              description="Trave o custo das vendas até uma data limite. Essencial para fechamentos."
            />
            <CalendarClock className="text-secondary/50" />
          </div>
          <div className="p-6 sm:p-8 grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <label className="block">
                <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant flex items-center gap-2 mb-2">
                  <CalendarClock size={12} /> Data do Fechamento
                </span>
                <input
                  type="date"
                  value={checkpointDate}
                  onChange={(event) => setCheckpointDate(event.target.value)}
                  className="brandops-input w-full p-3.5 text-sm rounded-xl border border-outline bg-surface-container/30 focus:bg-background focus:border-secondary transition-all outline-none"
                />
              </label>
              <label className="block">
                <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">Motivo / Observação</span>
                <textarea
                  value={checkpointNote}
                  onChange={(event) => setCheckpointNote(event.target.value)}
                  placeholder="Ex.: Fechamento contábil Mar/2026..."
                  className="brandops-input w-full p-3.5 text-sm rounded-xl border border-outline bg-surface-container/30 focus:bg-background focus:border-secondary transition-all outline-none resize-none h-20"
                />
              </label>
            </div>
            <div className="flex flex-col justify-end">
              <div className="p-4 rounded-xl border border-secondary/20 bg-secondary/5 text-xs text-on-surface-variant mb-4 flex items-start gap-3">
                 <Info size={16} className="text-secondary shrink-0 mt-0.5" />
                 <p>Qualquer pedido fechado <strong>antes ou na data escolhida</strong> receberá um "carimbo" impossibilitando que alterações futuras de regra mudem retroativamente o histórico de lucro deste período.</p>
              </div>
              <button
                onClick={async () => {
                  setIsApplyingCheckpoint(true);
                  try {
                    await applyCmvCheckpoint(activeBrand.id, checkpointNote, checkpointDate);
                    setCheckpointNote("");
                  } finally {
                    setIsApplyingCheckpoint(false);
                  }
                }}
                disabled={isApplyingCheckpoint}
                className="brandops-button brandops-button-primary w-full py-4 text-sm rounded-xl shadow-lg shadow-secondary/20 flex items-center justify-center gap-2"
              >
                {isApplyingCheckpoint ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-on-secondary border-t-transparent" />
                    Processando Pedidos...
                  </>
                ) : (
                  <>
                    <Save size={16} /> 
                    <span>Congelar Histórico</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </SurfaceCard>

        <SurfaceCard className="p-0 overflow-hidden bg-background">
          <div className="p-6 border-b border-outline bg-surface-container/20">
             <SectionHeading title="Último Checkpoint" description="Fechamento mais recente gravado." />
          </div>
          <div className="p-6 sm:p-8 flex flex-col justify-center h-[calc(100%-80px)]">
             {latestCheckpoint ? (
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 flex shrink-0 items-center justify-center rounded-2xl bg-secondary/10 border border-secondary/20 text-secondary">
                    <CheckCircle2 size={24} />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-on-surface">{formatLongDateTime(latestCheckpoint.createdAt).split(' às ')[0]}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/70 mt-1">Às {formatLongDateTime(latestCheckpoint.createdAt).split(' às ')[1]}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-surface-container/30 border border-outline">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-70 mb-1">Pedidos Travados</p>
                    <p className="text-2xl font-black text-on-surface">{integerFormatter.format(latestCheckpoint.itemsUpdated)}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-tertiary/5 border border-tertiary/20">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-tertiary/70 mb-1">Sem Preço</p>
                    <p className="text-2xl font-black text-tertiary">{integerFormatter.format(latestCheckpoint.unmatchedItems)}</p>
                  </div>
                </div>
                
                {latestCheckpoint.note && (
                  <div className="p-3 rounded-xl bg-surface-container/20 border border-outline text-xs text-on-surface-variant italic relative">
                    <span className="absolute -top-2 left-4 px-1 bg-background text-[9px] font-bold uppercase tracking-widest text-on-surface-variant/50">Motivo</span>
                    "{latestCheckpoint.note}"
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center h-full space-y-3 opacity-60">
                <CalendarClock size={40} className="text-on-surface-variant/40" />
                <div>
                  <p className="text-sm font-bold uppercase tracking-widest text-on-surface-variant">Base Aberta</p>
                  <p className="text-xs text-on-surface-variant/70 mt-2 max-w-[200px]">Nenhum período foi congelado. Regras afetam todo o histórico.</p>
                </div>
              </div>
            )}
          </div>
        </SurfaceCard>
      </section>

      <SurfaceCard className="p-0 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-outline bg-surface-container/20">
          <SectionHeading
            title="Custo Padrão por Categoria"
            description="Defina as regras bases (Fallback) aplicadas a todos os itens que compartilharem da mesma tipificação."
          />
        </div>

        <div className="brandops-table-container">
          <table className="app-table brandops-table-compact w-full">
            <thead>
              <tr className="bg-surface-container/10">
                <th className="pl-6">Tipo / Categoria</th>
                <th className="text-right">Volume</th>
                <th className="text-right">Bruto Base</th>
                <th className="text-right w-44">Tabela Praticada (R$)</th>
                <th className="pr-6 text-right w-32">Ação</th>
              </tr>
            </thead>
            <tbody>
              {typeCandidates.map((candidate) => {
                const storedValue = typeDrafts[candidate.typeKey];
                const currentDraft = drafts[`type:${candidate.typeKey}`];
                const isModified = currentDraft !== undefined && currentDraft !== storedValue;
                
                return (
                  <tr key={candidate.typeKey} className="group hover:bg-secondary/[0.02] border-b border-outline/50 last:border-0">
                    <td className="pl-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-on-surface text-sm">{candidate.typeLabel}</span>
                        {storedValue && (
                          <span className="text-[10px] text-secondary font-bold uppercase tracking-widest mt-1">
                            Vigente: {currencyFormatter.format(Number(storedValue.replace(",", ".")))}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="text-right text-on-surface-variant font-medium text-sm">
                      {integerFormatter.format(candidate.quantity)}
                    </td>
                    <td className="text-right text-on-surface font-semibold text-sm">
                      {currencyFormatter.format(candidate.revenue)}
                    </td>
                    <td className="text-right">
                      <input
                        value={currentDraft ?? storedValue ?? ""}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [`type:${candidate.typeKey}`]: event.target.value,
                          }))
                        }
                        placeholder="Ex: 45,90"
                        className={`brandops-input w-full text-right p-2.5 text-sm font-semibold rounded-xl border-2 transition-all outline-none ${
                          isModified ? "border-secondary/60 bg-secondary/5 text-secondary" : "border-outline bg-surface-container/30 text-on-surface focus:border-secondary"
                        }`}
                      />
                    </td>
                    <td className="pr-6 text-right">
                      <button
                        onClick={() => {
                          const raw = currentDraft ?? "";
                          const unitCost = parseCurrencyDraft(raw);
                          if (!Number.isFinite(unitCost)) return;
                          void saveCmvRule(
                            activeBrand.id,
                            "TYPE",
                            candidate.typeLabel,
                            candidate.typeLabel,
                            unitCost,
                          );
                        }}
                        disabled={!isModified}
                        className={`brandops-button px-4 py-2.5 rounded-xl text-xs font-bold w-full transition-all ${
                          isModified 
                            ? "brandops-button-secondary scale-100 opacity-100 shadow-md shadow-secondary/20" 
                            : "opacity-40 scale-[0.98] bg-surface-container text-on-surface-variant"
                        }`}
                      >
                        {isModified ? "Gravar" : "Salvo"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SurfaceCard>

      <SurfaceCard className="p-0 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-outline bg-surface-container/20">
          <SectionHeading
            title="Exceções Individuais (Overrides)"
            description="Custos específicos por produto que prevalecem sobre a categoria padrão."
          />
        </div>
        <div className="brandops-table-container">
          <table className="app-table brandops-table-compact w-full">
            <thead>
              <tr className="bg-surface-container/10">
                <th className="pl-6">Produto</th>
                <th>Categoria</th>
                <th className="text-right">Pedidos</th>
                <th className="text-right w-44">Custo Unit. (R$)</th>
                <th className="pr-6 text-right w-32">Ação</th>
              </tr>
            </thead>
            <tbody>
              {productCandidates.map((product) => {
                const storedValue = productDrafts[product.productId];
                const currentDraft = drafts[`product:${product.productId}`];
                const isModified = currentDraft !== undefined && currentDraft !== storedValue;

                return (
                  <tr key={product.productId} className="group hover:bg-secondary/[0.02] border-b border-outline/50 last:border-0">
                    <td className="pl-6 py-4 max-w-[300px]">
                      <div className="flex flex-col">
                        <span className="font-bold text-on-surface text-sm truncate" title={product.productName}>
                           {product.productName}
                        </span>
                        {storedValue && (
                          <span className="text-[10px] text-tertiary font-bold uppercase tracking-widest mt-1">
                            Override Ativo: {currencyFormatter.format(Number(storedValue.replace(",", ".")))}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="text-on-surface-variant font-medium text-xs">
                      {product.productType ? (
                         <span className="px-2 py-1 rounded bg-surface-container-high">{product.productType}</span>
                      ) : <span className="opacity-30">—</span>}
                    </td>
                    <td className="text-right text-on-surface-variant font-medium text-sm">
                      {integerFormatter.format(product.quantity)}
                    </td>
                    <td className="text-right">
                      <input
                        value={currentDraft ?? storedValue ?? ""}
                        onChange={(event) =>
                          setDrafts((current) => ({
                            ...current,
                            [`product:${product.productId}`]: event.target.value,
                          }))
                        }
                        placeholder="Ex: 85,00"
                        className={`brandops-input w-full text-right p-2.5 text-sm font-semibold rounded-xl border-2 transition-all outline-none ${
                          isModified ? "border-tertiary/60 bg-tertiary/5 text-tertiary" : "border-outline bg-surface-container/30 text-on-surface focus:border-tertiary/50"
                        }`}
                      />
                    </td>
                    <td className="pr-6 text-right">
                      <button
                        onClick={() => {
                          const raw = currentDraft ?? "";
                          const unitCost = parseCurrencyDraft(raw);
                          if (!Number.isFinite(unitCost)) return;
                          void saveCmvRule(
                            activeBrand.id,
                            "PRODUCT",
                            product.productName,
                            product.productName,
                            unitCost,
                          );
                        }}
                        disabled={!isModified}
                        className={`brandops-button px-4 py-2.5 rounded-xl text-xs font-bold w-full transition-all ${
                          isModified 
                            ? "bg-tertiary text-on-secondary shadow-md shadow-tertiary/20 scale-100 opacity-100 hover:opacity-90" 
                            : "opacity-40 scale-[0.98] bg-surface-container text-on-surface-variant"
                        }`}
                      >
                        {isModified ? "Sobrescrever" : "Salvo"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SurfaceCard>
    </div>
  );
}
