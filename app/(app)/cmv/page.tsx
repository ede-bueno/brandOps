"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, PencilLine, X } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { useBrandOps } from "@/components/BrandOpsProvider";
import { PageHeader, SectionHeading, SurfaceCard } from "@/components/ui-shell";
import {
  currencyFormatter,
  formatCompactDate,
  formatLongDateTime,
  integerFormatter,
} from "@/lib/brandops/format";
import {
  buildCmvCandidates,
  buildCmvOrderDetails,
  buildCmvTypeCandidates,
} from "@/lib/brandops/metrics";

const OFFICIAL_CMV_BEFORE_MARCH = [
  ["Regata", 37],
  ["Cropped", 37],
  ["Mini", 37],
  ["Body", 37],
  ["Camiseta", 44],
  ["Camiseta Peruana", 59],
  ["Oversized", 69],
  ["Cropped moletom", 69],
  ["Suéter moletom", 90],
  ["Hoodie moletom", 110],
] as const;

const OFFICIAL_CMV_FROM_MARCH = [
  ["Camiseta", 49.9],
  ["Camiseta Peruana", 65],
  ["Mini", 46],
  ["Body", 46],
  ["Oversized", 75],
  ["Regata", 46],
  ["Cropped", 44],
  ["Bone Dad Hat", 46],
] as const;

function toDraftValue(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "";
  }
  return value.toFixed(2).replace(".", ",");
}

function parseCurrencyDraft(value: string) {
  return Number(value.trim().replace(/\./g, "").replace(",", "."));
}

export default function CmvPage() {
  const { activeBrand, saveCmvRule, applyCmvCheckpoint } = useBrandOps();
  const [activeView, setActiveView] = useState<"types" | "orders">("types");
  const [editorTypeKey, setEditorTypeKey] = useState<string | null>(null);
  const [effectiveDate, setEffectiveDate] = useState("2026-03-01");
  const [draftCost, setDraftCost] = useState("");
  const [checkpointDate, setCheckpointDate] = useState(new Date().toISOString().slice(0, 10));
  const [checkpointNote, setCheckpointNote] = useState("");
  const [isSavingRule, setIsSavingRule] = useState(false);
  const [isApplyingCheckpoint, setIsApplyingCheckpoint] = useState(false);

  const typeCandidates = useMemo(
    () => (activeBrand ? buildCmvTypeCandidates(activeBrand).filter((item) => item.quantity > 0) : []),
    [activeBrand],
  );

  const soldProducts = useMemo(
    () => (activeBrand ? buildCmvCandidates(activeBrand) : []),
    [activeBrand],
  );
  const orderDetails = useMemo(
    () => (activeBrand ? buildCmvOrderDetails(activeBrand) : []),
    [activeBrand],
  );

  const selectedType = typeCandidates.find((item) => item.typeKey === editorTypeKey) ?? null;
  const latestCheckpoint = activeBrand?.cmvCheckpoints[0] ?? null;

  const typeHistory = useMemo(() => {
    if (!activeBrand || !selectedType) {
      return [];
    }
    return activeBrand.cmvEntries
      .filter(
        (entry) =>
          entry.matchType === "TYPE" &&
          entry.matchValue === selectedType.typeKey,
      )
      .sort((left, right) => right.validFrom.localeCompare(left.validFrom));
  }, [activeBrand, selectedType]);

  const productsByType = useMemo(() => {
    const groups = new Map<
      string,
      Array<{ productName: string; quantity: number; revenue: number }>
    >();

    soldProducts.forEach((product) => {
      const key = product.productType ?? "Sem tipo detectado";
      const current = groups.get(key) ?? [];
      current.push({
        productName: product.productName,
        quantity: product.quantity,
        revenue: product.revenue,
      });
      groups.set(key, current);
    });

    return [...groups.entries()]
      .map(([typeLabel, products]) => ({
        typeLabel,
        products: products.sort((a, b) => b.quantity - a.quantity),
      }))
      .sort((a, b) => a.typeLabel.localeCompare(b.typeLabel));
  }, [soldProducts]);

  if (!activeBrand || !activeBrand.orderItems.length) {
    return (
      <EmptyState
        title="Ainda não há itens para CMV"
        description="Importe Lista de Itens.csv para listar os tipos vendidos e cadastrar o custo por peça com histórico."
      />
    );
  }

  const openEditor = (typeKey: string, currentCost: number | null) => {
    setEditorTypeKey(typeKey);
    setDraftCost(toDraftValue(currentCost));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="CMV histórico"
        title="Gestão de custo por tipo"
        description="O custo é mantido por tipo de peça, com vigência histórica para preservar períodos já fechados. A alteração de 01/03/2026 já está refletida nesta base."
      />

      <section className="flex flex-wrap gap-2">
        {[
          { key: "types", label: "Gestão por tipo" },
          { key: "orders", label: "Detalhamento por pedido" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveView(tab.key as "types" | "orders")}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
              activeView === tab.key
                ? "bg-secondary-container text-on-secondary-container"
                : "bg-surface-container text-on-surface-variant hover:text-on-surface"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <SurfaceCard>
          <p className="text-sm text-on-surface-variant">Tipos vendidos</p>
          <p className="mt-3 text-3xl font-semibold text-on-surface">
            {integerFormatter.format(typeCandidates.length)}
          </p>
        </SurfaceCard>
        <SurfaceCard>
          <p className="text-sm text-on-surface-variant">Produtos conciliados</p>
          <p className="mt-3 text-3xl font-semibold text-on-surface">
            {integerFormatter.format(soldProducts.length)}
          </p>
        </SurfaceCard>
        <SurfaceCard>
          <p className="text-sm text-on-surface-variant">Último checkpoint</p>
          <p className="mt-3 text-lg font-semibold text-on-surface">
            {latestCheckpoint ? formatLongDateTime(latestCheckpoint.createdAt) : "Base ainda aberta"}
          </p>
        </SurfaceCard>
      </section>

      {activeView === "types" ? (
        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <SurfaceCard className="p-0 overflow-hidden">
            <div className="border-b border-outline p-5">
              <SectionHeading
                title="Tipos de peça vendidos"
                description="Atualize o custo por tipo quando houver mudança de tabela. O histórico fica preservado por vigência."
              />
            </div>
            <div className="brandops-table-container rounded-none border-0">
              <table className="brandops-table-compact min-w-[760px] w-full">
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th className="text-right">Peças</th>
                    <th className="text-right">Faturado</th>
                    <th className="text-right">Regras</th>
                    <th className="text-right">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {typeCandidates.map((candidate) => {
                    const rulesCount = activeBrand.cmvEntries.filter(
                      (entry) =>
                        entry.matchType === "TYPE" && entry.matchValue === candidate.typeKey,
                    ).length;
                    return (
                      <tr key={candidate.typeKey}>
                        <td className="font-semibold text-on-surface">{candidate.typeLabel}</td>
                        <td className="text-right">{integerFormatter.format(candidate.quantity)}</td>
                        <td className="text-right">{currencyFormatter.format(candidate.revenue)}</td>
                        <td className="text-right">{rulesCount}</td>
                        <td className="text-right">
                          <button
                            onClick={() => openEditor(candidate.typeKey, candidate.unitCost)}
                            className="brandops-button brandops-button-secondary px-3 py-1.5 text-xs"
                          >
                            <PencilLine size={14} />
                            Atualizar custo
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </SurfaceCard>

          <SurfaceCard>
            <SectionHeading
              title="Checkpoint de fechamento"
              description="Use o checkpoint depois de revisar os custos para congelar a aplicação do CMV."
            />
            <div className="mt-5 space-y-4">
              <input
                type="date"
                value={checkpointDate}
                onChange={(event) => setCheckpointDate(event.target.value)}
                className="brandops-input w-full px-3 py-2.5"
              />
              <textarea
                value={checkpointNote}
                onChange={(event) => setCheckpointNote(event.target.value)}
                placeholder="Ex.: Fechamento CMV março/2026"
                className="brandops-input min-h-[96px] w-full p-3"
              />
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
                className="brandops-button brandops-button-primary w-full"
                disabled={isApplyingCheckpoint}
              >
                {isApplyingCheckpoint ? "Aplicando checkpoint..." : "Aplicar checkpoint"}
              </button>
              {latestCheckpoint ? (
                <div className="rounded-2xl border border-secondary/20 bg-secondary-container/40 p-4 text-sm text-on-surface-variant">
                  <div className="flex items-center gap-2 font-semibold text-on-surface">
                    <CheckCircle2 size={16} />
                    Último fechamento registrado
                  </div>
                  <p className="mt-2">{formatLongDateTime(latestCheckpoint.createdAt)}</p>
                  <p className="mt-1">
                    {integerFormatter.format(latestCheckpoint.itemsUpdated)} itens atualizados e{" "}
                    {integerFormatter.format(latestCheckpoint.unmatchedItems)} sem match.
                  </p>
                </div>
              ) : null}
            </div>
          </SurfaceCard>
        </section>
      ) : (
        <SurfaceCard className="p-0 overflow-hidden">
          <div className="border-b border-outline p-5">
            <SectionHeading
              title="Detalhamento de CMV por pedido"
              description="Auditoria direta para conferir número do pedido, itens conciliados, valor de venda e CMV aplicado em cada venda."
            />
          </div>
          <div className="brandops-table-container rounded-none border-0">
            <table className="brandops-table-compact min-w-[1040px] w-full">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Pedido</th>
                  <th>Itens do pedido</th>
                  <th className="text-right">Peças</th>
                  <th className="text-right">Valor de venda</th>
                  <th className="text-right">CMV do pedido</th>
                </tr>
              </thead>
              <tbody>
                {orderDetails.map((order) => (
                  <tr key={order.orderNumber}>
                    <td>{formatCompactDate(order.orderDate)}</td>
                    <td className="font-semibold text-on-surface">{order.orderNumber}</td>
                    <td className="max-w-[520px]">
                      <p className="line-clamp-3 text-sm leading-6 text-on-surface">
                        {order.itemsSummary}
                      </p>
                    </td>
                    <td className="text-right">{integerFormatter.format(order.units)}</td>
                    <td className="text-right">{currencyFormatter.format(order.orderValue)}</td>
                    <td className="text-right font-semibold text-on-surface">
                      {currencyFormatter.format(order.cmvTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SurfaceCard>
      )}

      <section className="grid gap-6 xl:grid-cols-2">
        <SurfaceCard>
          <SectionHeading
            title="Referência oficial até 28/02/2026"
            description="Tabela vigente antes do reajuste da INK."
          />
          <div className="mt-5 space-y-3">
            {OFFICIAL_CMV_BEFORE_MARCH.map(([label, value]) => (
              <div key={label} className="panel-muted flex items-center justify-between p-4">
                <span className="font-medium text-on-surface">{label}</span>
                <span className="font-semibold text-on-surface">
                  {currencyFormatter.format(value)}
                </span>
              </div>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <SectionHeading
            title="Referência oficial a partir de 01/03/2026"
            description="Tabela vigente após o reajuste da INK."
          />
          <div className="mt-5 space-y-3">
            {OFFICIAL_CMV_FROM_MARCH.map(([label, value]) => (
              <div key={label} className="panel-muted flex items-center justify-between p-4">
                <span className="font-medium text-on-surface">{label}</span>
                <span className="font-semibold text-on-surface">
                  {currencyFormatter.format(value)}
                </span>
              </div>
            ))}
          </div>
        </SurfaceCard>
      </section>

      <SurfaceCard className="p-0 overflow-hidden">
        <div className="border-b border-outline p-5">
          <SectionHeading
            title="Produtos vendidos por categoria"
            description="Auditoria rápida para conferir quais estampas e peças entram em cada tipo."
          />
        </div>
        <div className="grid gap-4 p-5 xl:grid-cols-2">
          {productsByType.map((group) => (
            <article key={group.typeLabel} className="panel-muted p-4">
              <p className="font-semibold text-on-surface">{group.typeLabel}</p>
              <div className="mt-3 space-y-2">
                {group.products.slice(0, 5).map((product) => (
                  <div
                    key={`${group.typeLabel}-${product.productName}`}
                    className="flex items-start justify-between gap-4 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-on-surface">{product.productName}</p>
                      <p className="text-xs text-on-surface-variant">
                        {integerFormatter.format(product.quantity)} peças
                      </p>
                    </div>
                    <p className="whitespace-nowrap font-medium text-on-surface">
                      {currencyFormatter.format(product.revenue)}
                    </p>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </SurfaceCard>

      {selectedType ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-3xl rounded-3xl border border-outline bg-surface shadow-2xl">
            <div className="flex items-center justify-between border-b border-outline px-6 py-5">
              <div>
                <p className="eyebrow">Atualização por vigência</p>
                <h2 className="font-headline text-2xl font-semibold text-on-surface">
                  {selectedType.typeLabel}
                </h2>
              </div>
              <button
                onClick={() => setEditorTypeKey(null)}
                className="brandops-button brandops-button-ghost h-9 w-9 rounded-full p-0"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid gap-6 p-6 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="space-y-4">
                <div className="panel-muted p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                    Peças vendidas
                  </p>
                  <p className="mt-2 font-headline text-2xl font-semibold text-on-surface">
                    {integerFormatter.format(selectedType.quantity)}
                  </p>
                </div>
                <div className="panel-muted p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                    Faturado
                  </p>
                  <p className="mt-2 font-headline text-2xl font-semibold text-on-surface">
                    {currencyFormatter.format(selectedType.revenue)}
                  </p>
                </div>
                <label className="block">
                  <span className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                    Vigência
                  </span>
                  <input
                    type="date"
                    value={effectiveDate}
                    onChange={(event) => setEffectiveDate(event.target.value)}
                    className="brandops-input w-full px-3 py-2.5"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                    Novo custo unitário
                  </span>
                  <input
                    value={draftCost}
                    onChange={(event) => setDraftCost(event.target.value)}
                    placeholder="0,00"
                    className="brandops-input w-full px-3 py-2.5"
                  />
                </label>
                <button
                  onClick={async () => {
                    const unitCost = parseCurrencyDraft(draftCost);
                    if (!Number.isFinite(unitCost)) {
                      return;
                    }
                    setIsSavingRule(true);
                    try {
                      await saveCmvRule(
                        activeBrand.id,
                        "TYPE",
                        selectedType.typeKey,
                        selectedType.typeLabel,
                        unitCost,
                        effectiveDate,
                      );
                      setEditorTypeKey(null);
                    } finally {
                      setIsSavingRule(false);
                    }
                  }}
                  className="brandops-button brandops-button-primary w-full"
                  disabled={isSavingRule}
                >
                  {isSavingRule ? "Salvando..." : "Salvar nova vigência"}
                </button>
              </div>

              <div className="space-y-4">
                <SectionHeading
                  title="Histórico desse tipo"
                  description="Cada alteração cria uma nova vigência e encerra a anterior."
                />
                <div className="space-y-3">
                  {typeHistory.length ? (
                    typeHistory.map((entry) => (
                      <article key={entry.id} className="panel-muted p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="font-semibold text-on-surface">{entry.matchLabel}</p>
                            <p className="mt-1 text-sm text-on-surface-variant">
                              {entry.validFrom.slice(0, 10)}
                              {entry.validTo ? ` até ${entry.validTo.slice(0, 10)}` : " em diante"}
                            </p>
                          </div>
                          <p className="font-semibold text-on-surface">
                            {currencyFormatter.format(entry.unitCost)}
                          </p>
                        </div>
                      </article>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-outline p-4 text-sm text-on-surface-variant">
                      Nenhuma regra histórica cadastrada ainda para este tipo.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
