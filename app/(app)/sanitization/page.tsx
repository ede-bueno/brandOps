"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/EmptyState";
import { useBrandOps } from "@/components/BrandOpsProvider";
import { PageHeader, SurfaceCard } from "@/components/ui-shell";
import { buildMediaAnomalies } from "@/lib/brandops/metrics";

export default function SanitizationPage() {

  const {
    activeBrand,
    filteredBrand,
    ignoreMediaRow,
    restoreMediaRow,
    ignoreOrder,
    restoreOrder,
    selectedPeriodLabel,
  } = useBrandOps();
  
  const [activeTab, setActiveTab] = useState<"pending" | "ignored">("pending");
  const [reasonDrafts, setReasonDrafts] = useState<Record<string, string>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkReason, setBulkReason] = useState("");

  if (!activeBrand || !filteredBrand || (!filteredBrand.media.length && !filteredBrand.paidOrders.length)) {
    return (
      <EmptyState
        title="Nenhum dado carregado para saneamento"
        description="Importe mídia e pedidos para revisar as linhas que merecem decisão operacional."
      />
    );
  }

  const allAnomalies = buildMediaAnomalies(filteredBrand);
  const pendingAnomalies = allAnomalies.filter(a => !a.isIgnored);
  const ignoredAnomalies = allAnomalies.filter(a => a.isIgnored);
  
  const currentAnomalies = activeTab === "pending" ? pendingAnomalies : ignoredAnomalies;

  const toggleSelect = (id: string) => {
    setSelectedIds((current: Set<string>) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };


  const handleBulkIgnore = async () => {
    if (!selectedIds.size) return;
    
    for (const id of selectedIds) {
      const anomaly = pendingAnomalies.find(a => a.id === id);
      if (!anomaly) continue;
      
      if (anomaly.target === "MEDIA" && anomaly.targetId) {
        await ignoreMediaRow(anomaly.targetId, bulkReason);
      } else if (anomaly.target === "ORDER" && anomaly.orderNumber) {
        await ignoreOrder(activeBrand.id, anomaly.orderNumber, bulkReason);
      }
    }
    
    setSelectedIds(new Set());
    setBulkReason("");
  };

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Decisão operacional"
        title="Saneamento"
        description="O sistema só aponta linhas suspeitas. A decisão final de ignorar ou restaurar fica com o operador."
        badge={`Período analisado: ${selectedPeriodLabel}`}
      />

      <div className="flex gap-1 border-b border-outline/20">
        <button 
          onClick={() => setActiveTab("pending")}
          className={cn(
            "px-6 py-3 text-sm font-semibold transition-all border-b-2",
            activeTab === "pending" 
              ? "border-primary text-primary bg-primary/5" 
              : "border-transparent text-on-surface-variant hover:text-on-surface"
          )}
        >
          Para Decisão ({pendingAnomalies.length})
        </button>
        <button 
          onClick={() => setActiveTab("ignored")}
          className={cn(
            "px-6 py-3 text-sm font-semibold transition-all border-b-2",
            activeTab === "ignored" 
              ? "border-warning text-warning bg-warning/5" 
              : "border-transparent text-on-surface-variant hover:text-on-surface"
          )}
        >
          Histórico / Ignorados ({ignoredAnomalies.length})
        </button>
      </div>

      {activeTab === "pending" && selectedIds.size > 0 && (
        <SurfaceCard className="bg-primary/5 border-primary/20">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {selectedIds.size}
              </span>
              <p className="text-sm font-medium text-on-surface">Itens selecionados para decisão em massa</p>
            </div>
            <div className="flex flex-1 gap-2 max-w-md">
              <input 
                value={bulkReason}
                onChange={e => setBulkReason(e.target.value)}
                placeholder="Motivo comum (Ex: Outlier Meta Ads)"
                className="brandops-input flex-1 px-3 py-1.5 text-sm"
              />
              <button 
                onClick={handleBulkIgnore}
                className="brandops-button brandops-button-primary whitespace-nowrap px-4"
              >
                Ignorar Selecionados
              </button>
            </div>
          </div>
        </SurfaceCard>
      )}

      {currentAnomalies.length === 0 ? (
        <SurfaceCard>
          <p className="text-sm leading-7 text-on-surface-variant">
            Nenhuma ocorrência encontrada nesta categoria para o período atual.
          </p>
        </SurfaceCard>
      ) : (
        <SurfaceCard>
          <div className="brandops-table-container">
            <table className="app-table brandops-table-compact min-w-[980px]">
              <thead>
                <tr>
                  {activeTab === "pending" && <th className="w-10"></th>}
                  <th>Alvo</th>
                  <th>Contexto</th>
                  <th>Métrica</th>
                  <th>Motivo</th>
                  <th>{activeTab === "pending" ? "Decisão" : "Ação"}</th>
                </tr>
              </thead>
              <tbody>
                {currentAnomalies.map((anomaly) => (
                  <tr key={anomaly.id} className={cn(selectedIds.has(anomaly.id) && "bg-primary/5")}>
                    {activeTab === "pending" && (
                      <td>
                        <input 
                          type="checkbox" 
                          checked={selectedIds.has(anomaly.id)}
                          onChange={() => toggleSelect(anomaly.id)}
                          className="h-4 w-4 rounded border-outline/30 bg-surface accent-primary"
                        />
                      </td>
                    )}
                    <td>
                      <p className="font-semibold text-on-surface">
                        {anomaly.target === "MEDIA" ? "Mídia" : "Pedido"}
                      </p>
                      <p className="mt-1 text-xs text-on-surface-variant">{anomaly.date}</p>
                    </td>
                    <td>
                      <p className="font-semibold text-on-surface max-w-[200px] truncate">{anomaly.campaignName}</p>
                      <p className="mt-1 text-xs text-on-surface-variant">
                        {anomaly.target === "ORDER"
                          ? anomaly.orderNumber
                          : `${anomaly.adsetName}`}
                      </p>
                    </td>
                    <td className="text-on-surface font-medium">
                      <span className="text-xs text-on-surface-variant block uppercase tracking-tighter opacity-70">{anomaly.metric}</span>
                      {anomaly.value}
                    </td>
                    <td className="text-on-surface-variant text-xs italic">{anomaly.reason}</td>
                    <td>
                      <div className="flex items-center gap-3">
                        {anomaly.isIgnored ? (
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] text-on-surface-variant italic">"{anomaly.ignoreReason}"</span>
                            <button
                              onClick={() => {
                                if (anomaly.target === "MEDIA" && anomaly.targetId) {
                                  void restoreMediaRow(anomaly.targetId);
                                  return;
                                }
                                if (anomaly.target === "ORDER" && anomaly.orderNumber) {
                                  void restoreOrder(activeBrand.id, anomaly.orderNumber);
                                }
                              }}
                              className="text-xs font-bold text-primary hover:underline uppercase"
                            >
                              Restaurar
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2 w-full">
                            <textarea
                              value={reasonDrafts[anomaly.id] ?? ""}
                              onChange={(event) =>
                                setReasonDrafts((current) => ({
                                  ...current,
                                  [anomaly.id]: event.target.value,
                                }))
                              }
                              placeholder="Justificativa"
                              className="brandops-input min-h-[40px] w-full p-2 rounded text-xs"
                            />
                            <button
                              onClick={() => {
                                const reason = reasonDrafts[anomaly.id] ?? "";
                                if (anomaly.target === "MEDIA" && anomaly.targetId) {
                                  void ignoreMediaRow(anomaly.targetId, reason);
                                  return;
                                }
                                if (anomaly.target === "ORDER" && anomaly.orderNumber) {
                                  void ignoreOrder(activeBrand.id, anomaly.orderNumber, reason);
                                }
                              }}
                              className="brandops-button brandops-button-primary text-[10px] py-1 uppercase"
                            >
                              Ignorar no cálculo
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SurfaceCard>
      )}
    </div>
  );
}

