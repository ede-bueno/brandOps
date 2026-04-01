"use client";

import { useEffect, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { useBrandOps } from "@/components/BrandOpsProvider";
import { PageHeader, ProcessingOverlay, SurfaceCard } from "@/components/ui-shell";
import { buildMediaAnomalies, buildSanitizationHistory } from "@/lib/brandops/metrics";
import { cn } from "@/lib/utils";

function statusLabel(status: "PENDING" | "KEPT" | "IGNORED") {
  if (status === "KEPT") return "Mantido";
  if (status === "IGNORED") return "Ignorado";
  return "Pendente";
}

function statusClasses(status: "PENDING" | "KEPT" | "IGNORED") {
  if (status === "KEPT") return "bg-secondary-container text-on-secondary-container";
  if (status === "IGNORED") return "bg-tertiary-container text-on-tertiary-container";
  return "bg-surface-container-high text-on-surface-variant";
}

export default function SanitizationPage() {
  const {
    activeBrand,
    ignoreMediaRow,
    keepMediaRow,
    restoreMediaRow,
    ignoreOrder,
    keepOrder,
    restoreOrder,
  } = useBrandOps();
  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending");
  const [reasonDrafts, setReasonDrafts] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState("Atualizando o saneamento da marca.");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null,
  );

  useEffect(() => {
    if (!feedback) {
      return;
    }

    const timeoutId = window.setTimeout(() => setFeedback(null), 3500);
    return () => window.clearTimeout(timeoutId);
  }, [feedback]);

  if (!activeBrand || (!activeBrand.media.length && !activeBrand.paidOrders.length)) {
    return (
      <EmptyState
        title="Nenhum dado carregado para saneamento"
        description="Importe mídia e pedidos para revisar as linhas suspeitas antes de fechar os números."
      />
    );
  }

  const anomalies = buildMediaAnomalies(activeBrand);
  const pendingAnomalies = anomalies.filter(
    (anomaly) => anomaly.sanitizationStatus === "PENDING",
  );
  const historyAnomalies = buildSanitizationHistory(activeBrand);
  const visibleAnomalies = activeTab === "pending" ? pendingAnomalies : historyAnomalies;
  const allKnownAnomalies = [...pendingAnomalies, ...historyAnomalies];

  const commitDecision = async (
    anomalyId: string,
    decision: "PENDING" | "KEPT" | "IGNORED",
    note?: string,
  ) => {
    const anomaly = allKnownAnomalies.find((item) => item.id === anomalyId);
    if (!anomaly) {
      return;
    }

    const cleanNote = note?.trim() || undefined;
    const decisionLabel =
      decision === "PENDING"
        ? "Voltando a ocorrência para a fila de decisão."
        : decision === "KEPT"
          ? "Mantendo o cálculo e atualizando o histórico."
          : "Ignorando o cálculo e atualizando o histórico.";

    setFeedback(null);
    setProcessingMessage(decisionLabel);
    setIsProcessing(true);

    try {
      if (anomaly.target === "MEDIA" && anomaly.targetId) {
        if (decision === "PENDING") {
          await restoreMediaRow(anomaly.targetId);
        } else if (decision === "KEPT") {
          await keepMediaRow(anomaly.targetId, cleanNote);
        } else {
          await ignoreMediaRow(anomaly.targetId, cleanNote);
        }

        setReasonDrafts((current) => ({ ...current, [anomalyId]: "" }));
      } else if (anomaly.target === "ORDER" && anomaly.orderNumber) {
        if (decision === "PENDING") {
          await restoreOrder(activeBrand.id, anomaly.orderNumber);
        } else if (decision === "KEPT") {
          await keepOrder(activeBrand.id, anomaly.orderNumber, cleanNote);
        } else {
          await ignoreOrder(activeBrand.id, anomaly.orderNumber, cleanNote);
        }

        setReasonDrafts((current) => ({ ...current, [anomalyId]: "" }));
      }

      setActiveTab(decision === "PENDING" ? "pending" : "history");
      setFeedback({
        type: "success",
        message:
          decision === "PENDING"
            ? "Ocorrência devolvida para a tomada de decisão."
            : "Decisão registrada no histórico do saneamento.",
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Não foi possível concluir a decisão de saneamento.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <ProcessingOverlay
        open={isProcessing}
        title="Atualizando saneamento"
        description={processingMessage}
      />

      <PageHeader
        eyebrow="Decisão operacional"
        title="Saneamento"
        description="O sistema aponta divergências, mas a decisão final fica com o operador. Mantido ou ignorado, o histórico permanece salvo no banco mesmo após reimportações."
        badge="Histórico completo da marca"
      />

      <SurfaceCard className="p-0 overflow-hidden">
        {feedback ? (
          <div
            className={cn(
              "border-b px-5 py-3 text-sm",
              feedback.type === "success"
                ? "border-secondary/20 bg-secondary/10 text-secondary"
                : "border-error/20 bg-error/10 text-error",
            )}
          >
            {feedback.message}
          </div>
        ) : null}

        <div className="border-b border-outline px-5 py-4">
          <div className="flex flex-wrap gap-2">
            {[
              { key: "pending", label: `Para decisão (${pendingAnomalies.length})` },
              { key: "history", label: `Histórico (${historyAnomalies.length})` },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as "pending" | "history")}
                disabled={isProcessing}
                className={cn(
                  "rounded-xl px-4 py-2 text-sm font-semibold transition-all",
                  activeTab === tab.key
                    ? "bg-secondary-container text-on-secondary-container"
                    : "bg-surface-container text-on-surface-variant hover:text-on-surface",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {!visibleAnomalies.length ? (
          <div className="p-6 text-sm text-on-surface-variant">
            Nenhuma ocorrência encontrada nesta categoria no histórico operacional da marca.
          </div>
        ) : (
          <div className="brandops-table-container rounded-none border-0">
            <table className="brandops-table-compact min-w-[1120px] w-full">
              <thead>
                <tr>
                  <th>Alvo</th>
                  <th>Contexto</th>
                  <th>Divergência</th>
                  <th>Justificativa</th>
                  <th>Status</th>
                  <th className="text-right">Ação</th>
                </tr>
              </thead>
              <tbody>
                {visibleAnomalies.map((anomaly) => {
                  const note = reasonDrafts[anomaly.id] ?? anomaly.sanitizationNote ?? "";
                  return (
                    <tr key={anomaly.id}>
                      <td className="align-top">
                        <p className="font-semibold text-on-surface">
                          {anomaly.target === "MEDIA" ? "Mídia" : "Pedido"}
                        </p>
                        <p className="mt-1 text-xs text-on-surface-variant">{anomaly.date}</p>
                      </td>
                      <td className="align-top">
                        <p className="max-w-[260px] truncate font-semibold text-on-surface">
                          {anomaly.campaignName}
                        </p>
                        <p className="mt-1 text-xs text-on-surface-variant">
                          {anomaly.target === "ORDER"
                            ? anomaly.orderNumber
                            : `${anomaly.adsetName} • ${anomaly.adName}`}
                        </p>
                      </td>
                      <td className="align-top">
                        <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                          {anomaly.metric}
                        </p>
                        <p className="mt-1 font-semibold text-on-surface">{anomaly.value}</p>
                        <p className="mt-2 max-w-[420px] whitespace-normal break-words text-xs leading-5 text-on-surface-variant">
                          {anomaly.reason}
                        </p>
                      </td>
                      <td className="align-top">
                        <textarea
                          value={note}
                          onChange={(event) =>
                            setReasonDrafts((current) => ({
                              ...current,
                              [anomaly.id]: event.target.value,
                            }))
                          }
                          placeholder="Contexto da decisão do operador"
                          className="brandops-input min-h-[92px] w-[260px] p-3 text-xs"
                          disabled={isProcessing}
                        />
                      </td>
                      <td className="align-top">
                        <div className="space-y-2">
                          <span
                            className={cn(
                              "inline-flex rounded-full px-3 py-1 text-[11px] font-semibold",
                              statusClasses(anomaly.sanitizationStatus),
                            )}
                          >
                            {statusLabel(anomaly.sanitizationStatus)}
                          </span>
                          {anomaly.sanitizedAt ? (
                            <p className="text-xs text-on-surface-variant">
                              Revisado em{" "}
                              {new Intl.DateTimeFormat("pt-BR", {
                                dateStyle: "short",
                                timeStyle: "short",
                              }).format(new Date(anomaly.sanitizedAt))}
                            </p>
                          ) : null}
                        </div>
                      </td>
                      <td className="align-top">
                        <div className="flex flex-col items-end gap-2">
                          {activeTab === "pending" ? (
                            <>
                              <button
                                onClick={() => void commitDecision(anomaly.id, "KEPT", note)}
                                className="brandops-button brandops-button-secondary min-w-[148px]"
                                disabled={isProcessing}
                              >
                                Manter cálculo
                              </button>
                              <button
                                onClick={() => void commitDecision(anomaly.id, "IGNORED", note)}
                                className="brandops-button brandops-button-primary min-w-[148px]"
                                disabled={isProcessing}
                              >
                                Ignorar cálculo
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => void commitDecision(anomaly.id, "PENDING")}
                              className="brandops-button brandops-button-ghost min-w-[148px]"
                              disabled={isProcessing}
                            >
                              Voltar para pendente
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SurfaceCard>
    </div>
  );
}
