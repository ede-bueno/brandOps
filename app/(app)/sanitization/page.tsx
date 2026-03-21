"use client";

import { useState } from "react";
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
  const [reasonDrafts, setReasonDrafts] = useState<Record<string, string>>({});

  if (!activeBrand || !filteredBrand || (!filteredBrand.media.length && !filteredBrand.paidOrders.length)) {
    return (
      <EmptyState
        title="Nenhum dado carregado para saneamento"
        description="Importe mídia e pedidos para revisar as linhas que merecem decisão operacional."
      />
    );
  }

  const anomalies = buildMediaAnomalies(filteredBrand);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Decisão operacional"
        title="Saneamento"
        description="O sistema só aponta linhas suspeitas. A decisão final de ignorar ou restaurar fica com o operador, e essa escolha passa a valer nos relatórios."
        badge={`Período analisado: ${selectedPeriodLabel}`}
      />

      {anomalies.length === 0 ? (
        <SurfaceCard>
          <p className="text-sm leading-7 text-[var(--color-ink-soft)]">
            Nenhuma ocorrência relevante foi encontrada na base atual.
          </p>
        </SurfaceCard>
      ) : (
        <SurfaceCard>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-[-0.03em] text-[var(--color-ink-strong)]">
                Ocorrências para decisão
              </h2>
              <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
                {anomalies.length} item(ns) precisam de revisão humana.
              </p>
            </div>
          </div>

          <div className="brandops-table-container mt-6">
            <table className="app-table brandops-table-compact min-w-[980px]">
              <thead>
                <tr>
                  <th>Alvo</th>
                  <th>Contexto</th>
                  <th>Métrica</th>
                  <th>Motivo</th>
                  <th>Decisão</th>
                </tr>
              </thead>
              <tbody>
                {anomalies.map((anomaly) => (
                  <tr key={anomaly.id}>
                    <td>
                      <p className="font-semibold text-on-surface">
                        {anomaly.target === "MEDIA" ? "Linha de mídia" : "Pedido"}
                      </p>
                      <p className="mt-1 text-sm text-on-surface-variant">{anomaly.date}</p>
                    </td>
                    <td>
                      <p className="font-semibold text-on-surface">{anomaly.campaignName}</p>
                      <p className="mt-1 text-sm text-on-surface-variant">
                        {anomaly.target === "ORDER"
                          ? anomaly.orderNumber
                          : `${anomaly.adsetName} • ${anomaly.adName}`}
                      </p>
                    </td>
                    <td className="text-on-surface">
                      {anomaly.metric}: {anomaly.value}
                    </td>
                    <td className="text-on-surface-variant">{anomaly.reason}</td>
                    <td>
                      <div className="space-y-3">
                        <textarea
                          value={reasonDrafts[anomaly.id] ?? anomaly.ignoreReason ?? ""}
                          onChange={(event) =>
                            setReasonDrafts((current) => ({
                              ...current,
                              [anomaly.id]: event.target.value,
                            }))
                          }
                          placeholder="Justificativa da decisão"
                          className="brandops-input min-h-24 w-full p-2 rounded-lg text-sm"
                        />
                        <div className="flex flex-wrap gap-2">
                          {anomaly.isIgnored ? (
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
                              className="brandops-button brandops-button-secondary py-1.5 px-3"
                            >
                              Restaurar
                            </button>
                          ) : (
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
                              className="brandops-button brandops-button-primary py-1.5 px-3"
                            >
                              Ignorar no cálculo
                            </button>
                          )}
                          <span
                            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                              anomaly.severity === "high"
                                ? "bg-[rgba(255,142,110,0.14)] text-[var(--color-tertiary)]"
                                : "bg-[rgba(139,225,255,0.12)] text-[var(--color-secondary)]"
                            }`}
                          >
                            {anomaly.severity === "high" ? "Alta" : "Média"}
                          </span>
                        </div>
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
