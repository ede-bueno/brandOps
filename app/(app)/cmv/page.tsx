"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, PencilLine, X } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { useBrandOps } from "@/components/BrandOpsProvider";
import {
  InlineNotice,
  OperationalMetric,
  OperationalMetricStrip,
  PageHeader,
  SectionHeading,
  SurfaceCard,
  WorkspaceRailSection,
  WorkspaceSplitLayout,
  WorkspaceTabs,
} from "@/components/ui-shell";
import {
  currencyFormatter,
  formatCompactDate,
  formatLongDateTime,
  integerFormatter,
} from "@/lib/brandops/format";
import {
  buildCmvCandidates,
  buildCmvOrderDetails,
  buildCmvStampGroups,
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
  ["Cropped moletom", 69],
  ["Suéter moletom", 90],
  ["Hoodie moletom", 110],
  ["Bone Dad Hat", 46],
] as const;

type CmvView = "types" | "orders" | "references" | "products";

const viewTabs: Array<{ key: CmvView; label: string; description: string }> = [
  {
    key: "types",
    label: "Tipos",
    description: "Atualize custo por peça com vigência.",
  },
  {
    key: "orders",
    label: "Pedidos",
    description: "Audite o CMV pedido a pedido.",
  },
  {
    key: "references",
    label: "Referências",
    description: "Consulte a tabela oficial vigente.",
  },
  {
    key: "products",
    label: "Produtos",
    description: "Veja a base conciliada por categoria.",
  },
];

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
  const { activeBrand, saveCmvRule, applyCmvCheckpoint, isLoading, isBrandHydrating } = useBrandOps();
  const [activeView, setActiveView] = useState<CmvView>("types");
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
  const typesWithRuleCount = useMemo(
    () =>
      typeCandidates.filter((candidate) =>
        activeBrand?.cmvEntries.some(
          (entry) => entry.matchType === "TYPE" && entry.matchValue === candidate.typeKey,
        ),
      ).length,
    [activeBrand?.cmvEntries, typeCandidates],
  );
  const unmatchedProductsCount = soldProducts.filter(
    (product) => !product.productName || !product.productType,
  ).length;
  const primaryAction =
    typesWithRuleCount < typeCandidates.length
      ? "Cobrir tipos sem regra antes de revisar o restante da base."
      : latestCheckpoint
        ? "Base protegida: aplique novo checkpoint só depois de revisar mudanças."
        : "Criar o primeiro checkpoint para congelar a vigência atual.";

  const typeHistory = useMemo(() => {
    if (!activeBrand || !selectedType) {
      return [];
    }

    return activeBrand.cmvEntries
      .filter(
        (entry) =>
          entry.matchType === "TYPE" && entry.matchValue === selectedType.typeKey,
      )
      .sort((left, right) => right.validFrom.localeCompare(left.validFrom));
  }, [activeBrand, selectedType]);

  const productsByType = useMemo(
    () => (activeBrand ? buildCmvStampGroups(activeBrand) : []),
    [activeBrand],
  );
  const typesWithoutRuleCount = Math.max(typeCandidates.length - typesWithRuleCount, 0);
  const ordersUnitsTotal = useMemo(
    () => orderDetails.reduce((accumulator, order) => accumulator + order.units, 0),
    [orderDetails],
  );
  const ordersRevenueTotal = useMemo(
    () => orderDetails.reduce((accumulator, order) => accumulator + order.orderValue, 0),
    [orderDetails],
  );
  const ordersCmvTotal = useMemo(
    () => orderDetails.reduce((accumulator, order) => accumulator + order.cmvTotal, 0),
    [orderDetails],
  );

  if (isLoading || !activeBrand) {
    return (
      <div className="atlas-page-stack animate-pulse">
        <div className="h-24 rounded-3xl bg-surface-container" />
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-surface-container" />
          ))}
        </div>
        <div className="h-[420px] rounded-3xl bg-surface-container" />
      </div>
    );
  }

  if (isBrandHydrating && !activeBrand.cmvEntries.length && !activeBrand.cmvCheckpoints.length) {
    return (
      <div className="atlas-page-stack animate-pulse">
        <div className="h-24 rounded-3xl bg-surface-container" />
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-surface-container" />
          ))}
        </div>
        <div className="h-[420px] rounded-3xl bg-surface-container" />
      </div>
    );
  }

  if (!activeBrand.orderItems.length) {
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
    <div className="atlas-page-stack-compact">
      <PageHeader
        eyebrow="CMV histórico"
        title="Gestão de custo por tipo"
        description={
          activeView === "types"
            ? "Atualize custo por tipo com vigência e preserve a rastreabilidade da base."
            : activeView === "orders"
              ? "Audite o CMV pedido a pedido para validar aplicação e custo."
              : activeView === "references"
                ? "Consulte a referência oficial antes de abrir nova vigência."
                : "Confira a base conciliada por categoria para validar o vínculo entre produto e tipo."
        }
        actions={
          <div className="flex w-full flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 flex-wrap items-center gap-2.5">
              <WorkspaceTabs
                items={viewTabs.map((tab) => ({
                  key: tab.key,
                  label: tab.label,
                  active: activeView === tab.key,
                  onClick: () => setActiveView(tab.key),
                }))}
              />
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <span className="atlas-inline-metric">{activeBrand.name}</span>
              <span className="atlas-inline-metric">Vigência preservada</span>
              <span className="atlas-inline-metric">
                {typesWithRuleCount}/{typeCandidates.length} tipos com regra
              </span>
            </div>
          </div>
        }
      />

      {activeView === "types" ? (
        <>
          <OperationalMetricStrip>
            <OperationalMetric
              label="Tipos vendidos"
              value={integerFormatter.format(typeCandidates.length)}
              helper="Tipos com volume no período."
            />
            <OperationalMetric
              label="Tipos com regra"
              value={integerFormatter.format(typesWithRuleCount)}
              helper="Tipos já protegidos por vigência registrada."
              tone={typesWithoutRuleCount === 0 ? "positive" : "info"}
            />
            <OperationalMetric
              label="Sem cobertura"
              value={integerFormatter.format(typesWithoutRuleCount)}
              helper="Tipos que ainda pedem regra de custo."
              tone={typesWithoutRuleCount ? "warning" : "positive"}
            />
            <OperationalMetric
              label="Último checkpoint"
              value={latestCheckpoint ? formatCompactDate(latestCheckpoint.createdAt) : "Base aberta"}
              helper="Fechamento que congelou a vigência anterior."
              tone={latestCheckpoint ? "info" : "warning"}
            />
          </OperationalMetricStrip>

          <WorkspaceSplitLayout
            layout="wide-rail"
            className="items-start"
            main={
              <SurfaceCard className="p-0 overflow-hidden">
                <div className="border-b border-outline px-5 py-4">
                  <SectionHeading
                    title="Tipos de peça"
                    description="Atualize a vigência quando houver mudança de tabela. O histórico permanece intacto."
                  />
                </div>
                <div className="brandops-table-container atlas-table-shell">
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
                                className="brandops-button brandops-button-secondary"
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
            }
            rail={
              <div className="atlas-component-stack">
                <WorkspaceRailSection
                  title="Gestão do CMV"
                  description="Proteja os tipos sem regra antes de abrir nova vigência."
                >
                  <div className="atlas-dre-summary-card">
                    <span className="atlas-ledger-summary-label">Próximo ajuste</span>
                    <strong className="atlas-ledger-summary-value">{primaryAction}</strong>
                    <span className="atlas-ledger-summary-help">
                      Use essa leitura para priorizar a próxima alteração na base.
                    </span>
                  </div>
                  <div className="atlas-dre-summary-card">
                    <span className="atlas-ledger-summary-label">Revisar primeiro</span>
                    <strong className="atlas-ledger-summary-value">
                      {unmatchedProductsCount
                        ? `${integerFormatter.format(unmatchedProductsCount)} produto(s) sem match`
                        : "Sem produto sem match"}
                    </strong>
                    <span className="atlas-ledger-summary-help">
                      Conferência de vínculo antes de confiar na leitura detalhada.
                    </span>
                  </div>
                </WorkspaceRailSection>

                <WorkspaceRailSection
                  title="Checkpoint"
                  description="Congele a vigência depois de revisar a tabela."
                >
                  <div className="brandops-toolbar-panel">
                    <label className="brandops-field-stack">
                      <span className="brandops-field-label">Data do checkpoint</span>
                      <input
                        type="date"
                        value={checkpointDate}
                        onChange={(event) => setCheckpointDate(event.target.value)}
                        className="brandops-input"
                      />
                    </label>
                    <label className="brandops-field-stack">
                      <span className="brandops-field-label">Nota operacional</span>
                      <textarea
                        value={checkpointNote}
                        onChange={(event) => setCheckpointNote(event.target.value)}
                        placeholder="Fechamento CMV março/2026"
                        className="brandops-input min-h-[96px]"
                      />
                    </label>
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
                    className="brandops-button brandops-button-primary w-full"
                    disabled={isApplyingCheckpoint}
                  >
                    {isApplyingCheckpoint ? "Aplicando checkpoint..." : "Aplicar checkpoint"}
                  </button>
                </WorkspaceRailSection>

                <WorkspaceRailSection
                  title="Resumo operacional"
                  description="Fechamento mais recente da base."
                >
                  <OperationalMetricStrip baseColumns={1} desktopColumns={1}>
                    <OperationalMetric
                      label="Tipos com regra"
                      value={integerFormatter.format(typesWithRuleCount)}
                      helper="Cobertura atual da base por tipo."
                      tone={typesWithoutRuleCount === 0 ? "positive" : "info"}
                    />
                    <OperationalMetric
                      label="Sem match"
                      value={integerFormatter.format(unmatchedProductsCount)}
                      helper="Produtos que ainda pedem conferência de vínculo."
                      tone={unmatchedProductsCount ? "warning" : "positive"}
                    />
                  </OperationalMetricStrip>
                  {latestCheckpoint ? (
                    <InlineNotice
                      tone="success"
                      icon={<CheckCircle2 size={16} />}
                      className="text-sm text-on-surface-variant"
                    >
                      <div className="font-semibold text-on-surface">Último fechamento registrado</div>
                      <p className="mt-2">{formatLongDateTime(latestCheckpoint.createdAt)}</p>
                      <p className="mt-1">
                        {integerFormatter.format(latestCheckpoint.itemsUpdated)} itens atualizados e{" "}
                        {integerFormatter.format(latestCheckpoint.unmatchedItems)} sem match.
                      </p>
                    </InlineNotice>
                  ) : (
                    <InlineNotice tone="info" className="text-sm text-on-surface-variant">
                      <p>A base ainda não recebeu um checkpoint de vigência.</p>
                    </InlineNotice>
                  )}
                </WorkspaceRailSection>
              </div>
            }
          />
        </>
      ) : activeView === "orders" ? (
        <>
          <OperationalMetricStrip>
            <OperationalMetric
              label="Pedidos auditados"
              value={integerFormatter.format(orderDetails.length)}
              helper="Pedidos com detalhe de CMV disponível."
              tone="info"
            />
            <OperationalMetric
              label="Peças auditadas"
              value={integerFormatter.format(ordersUnitsTotal)}
              helper="Volume total conciliado na auditoria."
            />
            <OperationalMetric
              label="Venda auditada"
              value={currencyFormatter.format(ordersRevenueTotal)}
              helper="Valor bruto dos pedidos no recorte auditado."
              tone="positive"
            />
            <OperationalMetric
              label="CMV auditado"
              value={currencyFormatter.format(ordersCmvTotal)}
              helper="Custo total aplicado nos pedidos auditados."
              tone="warning"
            />
          </OperationalMetricStrip>

          <WorkspaceSplitLayout
            layout="wide-rail"
            main={
              <SurfaceCard className="p-0 overflow-hidden">
                <div className="border-b border-outline px-5 py-4">
                  <SectionHeading
                    title="Pedidos auditados"
                    description="Detalhe linha a linha para conferir pedido, itens conciliados, valor de venda e CMV aplicado."
                  />
                </div>
                <div className="brandops-table-container atlas-table-shell">
                  <table className="brandops-table-compact min-w-[1000px] w-full">
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
                            <p className="line-clamp-2 text-sm leading-6 text-on-surface">
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
            }
            rail={
              <WorkspaceRailSection
                title="Leitura da auditoria"
                description="Revise aplicação e custo pedido a pedido."
              >
                <div className="atlas-dre-summary-card">
                  <span className="atlas-ledger-summary-label">Cobertura</span>
                  <strong className="atlas-ledger-summary-value">
                    {integerFormatter.format(orderDetails.length)} pedido(s)
                  </strong>
                  <span className="atlas-ledger-summary-help">
                    Base pronta para revisar venda, peças e custo no mesmo fluxo.
                  </span>
                </div>
                <div className="atlas-dre-summary-card">
                  <span className="atlas-ledger-summary-label">Foco de revisão</span>
                  <strong className="atlas-ledger-summary-value">
                    {typesWithoutRuleCount ? "Fechar tipos sem regra" : "Conferir desvios por pedido"}
                  </strong>
                  <span className="atlas-ledger-summary-help">
                    A auditoria fica mais confiável depois que a cobertura por tipo está protegida.
                  </span>
                </div>
              </WorkspaceRailSection>
            }
          />
        </>
      ) : activeView === "references" ? (
        <>
          <OperationalMetricStrip>
            <OperationalMetric
              label="Tabela anterior"
              value="Até 28/02/2026"
              helper="Referência oficial antes do reajuste."
            />
            <OperationalMetric
              label="Tabela vigente"
              value="Desde 01/03/2026"
              helper="Referência oficial usada nas novas vigências."
              tone="info"
            />
            <OperationalMetric
              label="Tipos na referência"
              value={integerFormatter.format(OFFICIAL_CMV_FROM_MARCH.length)}
              helper="Quantidade de tipos mapeados na tabela atual."
            />
            <OperationalMetric
              label="Uso recomendado"
              value="Abrir antes da vigência"
              helper="Consulte a referência antes de atualizar custo unitário."
              tone="warning"
            />
          </OperationalMetricStrip>

          <WorkspaceSplitLayout
            layout="wide-rail"
            main={
              <div className="grid gap-4 xl:grid-cols-2">
                <SurfaceCard>
                  <SectionHeading
                    title="Referência até 28/02/2026"
                    description="Tabela vigente antes do reajuste da INK."
                  />
                  <div className="mt-5 atlas-component-stack-tight">
                    {OFFICIAL_CMV_BEFORE_MARCH.map(([label, value]) => (
                      <div key={label} className="atlas-stack-item">
                        <span className="atlas-stack-item-copy font-medium text-on-surface">{label}</span>
                        <span className="atlas-stack-item-value">{currencyFormatter.format(value)}</span>
                      </div>
                    ))}
                  </div>
                </SurfaceCard>

                <SurfaceCard>
                  <SectionHeading
                    title="Referência a partir de 01/03/2026"
                    description="Tabela vigente após o reajuste da INK."
                  />
                  <div className="mt-5 atlas-component-stack-tight">
                    {OFFICIAL_CMV_FROM_MARCH.map(([label, value]) => (
                      <div key={label} className="atlas-stack-item">
                        <span className="atlas-stack-item-copy font-medium text-on-surface">{label}</span>
                        <span className="atlas-stack-item-value">{currencyFormatter.format(value)}</span>
                      </div>
                    ))}
                  </div>
                </SurfaceCard>
              </div>
            }
            rail={
              <WorkspaceRailSection
                title="Como usar a referência"
                description="Consulte a tabela oficial antes de salvar nova vigência."
              >
                <div className="atlas-dre-summary-card">
                  <span className="atlas-ledger-summary-label">Tabela oficial</span>
                  <strong className="atlas-ledger-summary-value">INK como fonte de preço</strong>
                  <span className="atlas-ledger-summary-help">
                    Use a referência vigente para decidir custo unitário antes de congelar a regra no sistema.
                  </span>
                </div>
                <div className="atlas-dre-summary-card">
                  <span className="atlas-ledger-summary-label">Próximo passo</span>
                  <strong className="atlas-ledger-summary-value">Abrir nova vigência por tipo</strong>
                  <span className="atlas-ledger-summary-help">
                    A leitura desta tela não substitui o histórico; ela orienta a atualização correta.
                  </span>
                </div>
              </WorkspaceRailSection>
            }
          />
        </>
      ) : (
        <>
          <OperationalMetricStrip>
            <OperationalMetric
              label="Categorias conciliadas"
              value={integerFormatter.format(productsByType.length)}
              helper="Tipos agrupados com base na categoria conciliada."
              tone="info"
            />
            <OperationalMetric
              label="Produtos conciliados"
              value={integerFormatter.format(soldProducts.length)}
              helper="Base usada para agrupar estampas e peças."
            />
            <OperationalMetric
              label="Sem match"
              value={integerFormatter.format(unmatchedProductsCount)}
              helper="Produtos que ainda pedem conferência de vínculo."
              tone={unmatchedProductsCount ? "warning" : "positive"}
            />
            <OperationalMetric
              label="Leitura da base"
              value={typesWithoutRuleCount ? "Pede revisão" : "Base protegida"}
              helper="Conciliação pronta para apoiar novas vigências."
              tone={typesWithoutRuleCount ? "warning" : "positive"}
            />
          </OperationalMetricStrip>

          <WorkspaceSplitLayout
            layout="wide-rail"
            main={
              <SurfaceCard className="p-0 overflow-hidden">
                <div className="border-b border-outline px-5 py-4">
                  <SectionHeading
                    title="Produtos conciliados por categoria"
                    description="Base consolidada para conferir quais estampas e peças entram em cada tipo."
                  />
                </div>
                <div className="grid gap-4 p-4 xl:grid-cols-2">
                  {productsByType.map((group) => (
                    <article key={group.typeLabel} className="panel-muted p-3.5">
                      <p className="font-semibold text-on-surface">{group.typeLabel}</p>
                      <div className="atlas-stack-list mt-3">
                        {group.products.slice(0, 5).map((product) => (
                          <div
                            key={`${group.typeLabel}-${product.printName}`}
                            className="atlas-stack-item text-sm"
                          >
                            <div className="atlas-stack-item-copy">
                              <p className="truncate text-on-surface">{product.printName}</p>
                              <p className="text-[11px] leading-5 text-on-surface-variant">
                                {integerFormatter.format(product.quantity)} peças
                              </p>
                            </div>
                            <p className="atlas-stack-item-value whitespace-nowrap">
                              {currencyFormatter.format(product.revenue)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              </SurfaceCard>
            }
            rail={
              <WorkspaceRailSection
                title="Leitura da base"
                description="Valide o vínculo entre produto, tipo e volume."
              >
                <div className="atlas-dre-summary-card">
                  <span className="atlas-ledger-summary-label">Conciliação</span>
                  <strong className="atlas-ledger-summary-value">
                    {productsByType.length} grupo(s) por tipo
                  </strong>
                  <span className="atlas-ledger-summary-help">
                    A leitura ajuda a confirmar se a classificação da peça está coerente.
                  </span>
                </div>
                <div className="atlas-dre-summary-card">
                  <span className="atlas-ledger-summary-label">Atenção</span>
                  <strong className="atlas-ledger-summary-value">
                    {unmatchedProductsCount
                      ? `${integerFormatter.format(unmatchedProductsCount)} item(ns) pedem revisão`
                      : "Sem item pendente de vínculo"}
                  </strong>
                  <span className="atlas-ledger-summary-help">
                    Revise o vínculo antes de confiar no custo aplicado por categoria.
                  </span>
                </div>
              </WorkspaceRailSection>
            }
          />
        </>
      )}

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
                className="brandops-button brandops-button-ghost"
              >
                <X size={16} />
              </button>
            </div>

          <div className="grid gap-4 p-5 lg:grid-cols-[0.94fr_1.06fr]">
            <div className="atlas-component-stack">
              <OperationalMetricStrip baseColumns={2} desktopColumns={2}>
                <OperationalMetric
                  label="Peças vendidas"
                  value={integerFormatter.format(selectedType.quantity)}
                  helper="Volume conciliado para a vigência selecionada."
                  tone="info"
                />
                <OperationalMetric
                  label="Faturado"
                  value={currencyFormatter.format(selectedType.revenue)}
                  helper="Receita usada como base de leitura do tipo."
                  tone="positive"
                />
              </OperationalMetricStrip>
              <label className="block">
                <span className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                  Vigência
                </span>
                <input
                  type="date"
                  value={effectiveDate}
                  onChange={(event) => setEffectiveDate(event.target.value)}
                  className="brandops-input w-full"
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
                  className="brandops-input w-full"
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

            <div className="atlas-component-stack">
                <SectionHeading
                  title="Histórico desse tipo"
                  description="Cada alteração cria uma nova vigência e encerra a anterior."
                />
                <div className="atlas-component-stack-compact">
                  {typeHistory.length ? (
                    typeHistory.map((entry) => (
                      <article key={entry.id} className="panel-muted p-3.5">
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
                    <div className="atlas-empty-state p-3.5 text-sm">
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
