"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Ban, CheckCircle2, RotateCcw, Search, ShieldCheck } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { useBrandOps } from "@/components/BrandOpsProvider";
import {
  InlineNotice,
  OperationalMetric,
  OperationalMetricStrip,
  PageHeader,
  ProcessingOverlay,
  SectionHeading,
  SurfaceCard,
  WorkspaceTabs,
} from "@/components/ui-shell";
import { fetchSanitizationReport } from "@/lib/brandops/database";
import { APP_ROUTES } from "@/lib/brandops/routes";
import type { SanitizationReport } from "@/lib/brandops/types";
import { cn } from "@/lib/utils";

const EMPTY_REPORT: SanitizationReport = {
  pending: [],
  history: [],
  meta: {
    generatedAt: "",
    pendingCount: 0,
    historyCount: 0,
    hasData: false,
  },
};

const targetOptions = [
  { value: "all", label: "Tudo" },
  { value: "MEDIA", label: "Mídia" },
  { value: "ORDER", label: "Pedido" },
] as const;

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
    activeBrandId,
    brands,
    isBrandHydrating,
    ignoreMediaRow,
    keepMediaRow,
    restoreMediaRow,
    ignoreOrder,
    keepOrder,
    restoreOrder,
  } = useBrandOps();
  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [targetFilter, setTargetFilter] = useState<"all" | "MEDIA" | "ORDER">("all");
  const [reasonDrafts, setReasonDrafts] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState("Atualizando o saneamento da marca.");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null,
  );
  const [report, setReport] = useState<SanitizationReport>(EMPTY_REPORT);
  const [isReportLoading, setIsReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  useEffect(() => {
    if (!feedback) {
      return;
    }

    const timeoutId = window.setTimeout(() => setFeedback(null), 3500);
    return () => window.clearTimeout(timeoutId);
  }, [feedback]);

  useEffect(() => {
    if (!activeBrandId) {
      setReport(EMPTY_REPORT);
      setReportError(null);
      setIsReportLoading(false);
      return;
    }

    let cancelled = false;
    const currentBrandId = activeBrandId;

    async function loadReport() {
      setIsReportLoading(true);
      setReportError(null);

      try {
        const nextReport = await fetchSanitizationReport(currentBrandId);
        if (!cancelled) {
          setReport(nextReport);
        }
      } catch (error) {
        if (!cancelled) {
          setReport(EMPTY_REPORT);
          setReportError(
            error instanceof Error
              ? error.message
              : "Não foi possível carregar o relatório de saneamento.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsReportLoading(false);
        }
      }
    }

    void loadReport();

    return () => {
      cancelled = true;
    };
  }, [activeBrandId, isBrandHydrating]);

  const selectedBrandName =
    activeBrand?.name ?? brands.find((brand) => brand.id === activeBrandId)?.name ?? "Loja";

  const pendingAnomalies = report.pending;
  const historyAnomalies = report.history;
  const allKnownAnomalies = useMemo(
    () => [...pendingAnomalies, ...historyAnomalies],
    [pendingAnomalies, historyAnomalies],
  );

  const visibleAnomalies = useMemo(() => {
    const base = activeTab === "pending" ? pendingAnomalies : historyAnomalies;
    const normalizedTerm = searchTerm.trim().toLowerCase();

    return base.filter((anomaly) => {
      const matchesTarget = targetFilter === "all" ? true : anomaly.target === targetFilter;
      const matchesSearch =
        !normalizedTerm ||
        anomaly.campaignName.toLowerCase().includes(normalizedTerm) ||
        anomaly.reason.toLowerCase().includes(normalizedTerm) ||
        anomaly.value.toLowerCase().includes(normalizedTerm) ||
        anomaly.metric.toLowerCase().includes(normalizedTerm) ||
        (anomaly.orderNumber ?? "").toLowerCase().includes(normalizedTerm) ||
        (anomaly.adsetName ?? "").toLowerCase().includes(normalizedTerm) ||
        (anomaly.adName ?? "").toLowerCase().includes(normalizedTerm);

      return matchesTarget && matchesSearch;
    });
  }, [activeTab, historyAnomalies, pendingAnomalies, searchTerm, targetFilter]);

  const summary = useMemo(
    () => ({
      pending: report.meta.pendingCount,
      history: report.meta.historyCount,
      media: allKnownAnomalies.filter((anomaly) => anomaly.target === "MEDIA").length,
      orders: allKnownAnomalies.filter((anomaly) => anomaly.target === "ORDER").length,
    }),
    [allKnownAnomalies, report.meta.historyCount, report.meta.pendingCount],
  );
  const dominantTarget =
    summary.media === 0 && summary.orders === 0
      ? "Base limpa"
      : summary.media >= summary.orders
        ? "Mídia"
        : "Pedidos";

  if (activeBrandId && (!activeBrand || isBrandHydrating || isReportLoading)) {
    return (
      <div className="atlas-page-stack">
        <PageHeader
          eyebrow="Decisão operacional"
          title="Saneamento"
          description={`Carregando histórico e pendências de saneamento da loja ${selectedBrandName}.`}
        />
        <div className="atlas-page-stack animate-pulse">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 rounded-2xl bg-surface-container" />
            ))}
          </div>
          <div className="h-[420px] rounded-2xl bg-surface-container" />
        </div>
      </div>
    );
  }

  if (!activeBrand || (!activeBrand.media.length && !activeBrand.paidOrders.length)) {
    return (
      <EmptyState
        title={reportError ? "Saneamento indisponível" : "Nenhum dado carregado para saneamento"}
        description={
          reportError ??
          "Importe mídia e pedidos para revisar as linhas suspeitas antes de fechar os números."
        }
        ctaHref={APP_ROUTES.import}
        ctaLabel="Abrir importação"
        variant={reportError ? "error" : "default"}
      />
    );
  }

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

      if (activeBrandId) {
        const nextReport = await fetchSanitizationReport(activeBrandId);
        setReport(nextReport);
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
    <div className="atlas-page-stack-compact">
      <ProcessingOverlay
        open={isProcessing}
        title="Atualizando saneamento"
        description={processingMessage}
      />

      <PageHeader
        eyebrow="Decisão operacional"
        title="Console de saneamento"
        description="Decida o que entra no cálculo, preserve histórico e trate ruído operacional sem sair da marca."
        actions={
          <div className="flex flex-wrap gap-2">
            <WorkspaceTabs
              items={[
                {
                  key: "pending",
                  label: `Para decisão (${report.meta.pendingCount})`,
                  active: activeTab === "pending",
                  onClick: () => setActiveTab("pending"),
                },
                {
                  key: "history",
                  label: `Histórico (${report.meta.historyCount})`,
                  active: activeTab === "history",
                  onClick: () => setActiveTab("history"),
                },
              ]}
            />
            <span className="atlas-inline-metric">{selectedBrandName}</span>
            <span className="atlas-inline-metric">Histórico completo</span>
          </div>
        }
      />

      <OperationalMetricStrip desktopColumns={3}>
        <OperationalMetric
          label="Pendentes"
          value={String(summary.pending)}
          helper="Ocorrências que ainda precisam de decisão."
          tone="warning"
        />
        <OperationalMetric
          label="Histórico"
          value={String(summary.history)}
          helper="Decisões já registradas no banco."
          tone="info"
        />
        <OperationalMetric
          label="Foco atual"
          value={dominantTarget}
          helper={
            summary.pending
              ? "O Atlas destaca primeiro o alvo com mais pressão aberta."
              : "Sem pendência aberta. A tela vira histórico e auditoria."
          }
          tone={summary.pending ? "default" : "positive"}
        />
      </OperationalMetricStrip>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.12fr)_minmax(20rem,0.88fr)]">
        <SurfaceCard className="p-0 overflow-hidden">
          {feedback ? (
            <div className="border-b border-outline/60 px-5 py-3">
              <InlineNotice
                tone={feedback.type === "success" ? "success" : "error"}
                icon={
                  feedback.type === "success" ? (
                    <CheckCircle2 size={16} />
                  ) : (
                    <AlertCircle size={16} />
                  )
                }
              >
                <p className="text-sm leading-6">{feedback.message}</p>
              </InlineNotice>
            </div>
          ) : null}

          <div className="border-b border-outline px-5 py-4">
            <SectionHeading
              title="Mesa de decisão"
              description="Pendências abertas ou histórico completo, sem sair da marca."
              aside={<span className="atlas-inline-metric">{activeTab === "pending" ? "Pendências" : "Histórico"}</span>}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline px-5 py-3 text-[11px] leading-5 text-on-surface-variant">
            <span>
              Exibindo {visibleAnomalies.length} ocorrência(s) em {activeTab === "pending" ? "pendência" : "histórico"}.
            </span>
            <span className="atlas-inline-metric">
              {activeTab === "pending" ? "Decisão aberta" : "Auditoria concluída"}
            </span>
          </div>

          {!visibleAnomalies.length ? (
            <div className="p-5 text-sm text-on-surface-variant">
              Nenhuma ocorrência encontrada nesta categoria no histórico operacional da marca.
            </div>
          ) : (
            <div className="brandops-table-container atlas-table-shell max-h-[72vh] overflow-auto">
              <table className="brandops-table-compact min-w-[1040px] w-full">
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
                        <p className="mt-1 text-[11px] leading-5 text-on-surface-variant">{anomaly.date}</p>
                      </td>
                      <td className="align-top">
                        <p className="max-w-[260px] truncate font-semibold text-on-surface">
                          {anomaly.campaignName}
                        </p>
                        <p className="mt-1 text-[11px] leading-5 text-on-surface-variant">
                          {anomaly.target === "ORDER"
                            ? anomaly.orderNumber
                            : `${anomaly.adsetName} • ${anomaly.adName}`}
                        </p>
                      </td>
                      <td className="align-top">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                          {anomaly.metric}
                        </p>
                        <p className="mt-1 font-semibold text-on-surface">{anomaly.value}</p>
                        <p className="mt-2 max-w-[360px] whitespace-normal break-words text-[11px] leading-5 text-on-surface-variant">
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
                          className="brandops-input min-h-[88px] w-full max-w-[220px] text-[11px]"
                          disabled={isProcessing}
                        />
                      </td>
                      <td className="align-top">
                        <div className="atlas-component-stack-tight">
                          <span
                            className={cn(
                              "inline-flex rounded-full px-3 py-1 text-[11px] font-semibold",
                              statusClasses(anomaly.sanitizationStatus),
                            )}
                          >
                            {statusLabel(anomaly.sanitizationStatus)}
                          </span>
                          {anomaly.sanitizedAt ? (
                            <p className="text-[11px] leading-5 text-on-surface-variant">
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
                                className="brandops-button brandops-button-secondary min-w-[136px]"
                                disabled={isProcessing}
                              >
                                <ShieldCheck size={14} />
                                Manter
                              </button>
                              <button
                                onClick={() => void commitDecision(anomaly.id, "IGNORED", note)}
                                className="brandops-button brandops-button-primary min-w-[136px]"
                                disabled={isProcessing}
                              >
                                <Ban size={14} />
                                Ignorar
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => void commitDecision(anomaly.id, "PENDING")}
                              className="brandops-button brandops-button-ghost min-w-[136px]"
                              disabled={isProcessing}
                            >
                              <RotateCcw size={14} />
                              Voltar
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

        <div className="atlas-component-stack">
          <SurfaceCard>
            <SectionHeading
              title="Filtro operacional"
              description="Refine a fila antes de decidir ou auditar."
            />
            <div className="mt-5 atlas-component-stack">
              <label className="brandops-field-stack">
                <span className="brandops-field-label">Buscar ocorrência</span>
                <div className="brandops-input-with-icon">
                  <Search size={16} />
                  <input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Campanha, pedido, métrica ou motivo"
                    className="brandops-input"
                    disabled={isProcessing}
                  />
                </div>
              </label>

              <div className="brandops-field-stack">
                <span className="brandops-field-label">Filtrar alvo</span>
                <div className="flex flex-wrap gap-2">
                  {targetOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setTargetFilter(option.value)}
                      className="brandops-subtab"
                      data-active={targetFilter === option.value}
                      disabled={isProcessing}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </SurfaceCard>

          <SurfaceCard>
            <SectionHeading
              title="Pulso do saneamento"
              description="Distribuição e pressão atual por alvo."
            />
            <div className="mt-5 atlas-component-stack">
              <OperationalMetricStrip baseColumns={2} desktopColumns={2}>
                <OperationalMetric
                  label="Mídia"
                  value={String(summary.media)}
                  helper="Ocorrências ligadas a campanhas e investimento."
                />
                <OperationalMetric
                  label="Pedidos"
                  value={String(summary.orders)}
                  helper="Ocorrências vindas da camada comercial."
                />
              </OperationalMetricStrip>
              <article className="panel-muted p-3.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-on-surface-variant">
                  Prioridade atual
                </p>
                <p className="mt-2 font-semibold text-on-surface">{dominantTarget}</p>
                <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                  {summary.pending
                    ? "O Atlas destaca primeiro o alvo com mais pressão aberta neste recorte."
                    : "Sem pendência aberta. A tela passa a servir principalmente para auditoria e histórico."}
                </p>
              </article>
            </div>
          </SurfaceCard>
        </div>
      </section>
    </div>
  );
}
