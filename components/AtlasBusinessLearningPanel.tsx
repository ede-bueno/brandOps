"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BrainCircuit,
  Check,
  Loader2,
  Radar,
  RefreshCcw,
  ThumbsDown,
  ThumbsUp,
  TriangleAlert,
} from "lucide-react";
import { useBrandOps } from "./BrandOpsProvider";
import { InlineNotice, SectionHeading } from "./ui-shell";
import type {
  AtlasBrandLearningEvidence,
  AtlasBrandLearningFeedbackPayload,
  AtlasBrandLearningFeedbackSummary,
  AtlasBrandLearningFinding,
  AtlasBrandLearningRequestPayload,
  AtlasBrandLearningResponse,
  AtlasBrandLearningRun,
  AtlasBrandLearningScope,
  AtlasBrandLearningSnapshot,
} from "@/lib/brandops/ai/types";

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "Sem registro";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatDateOnly(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
  }).format(new Date(`${value}T00:00:00Z`));
}

function formatRange(snapshot: AtlasBrandLearningSnapshot | null) {
  if (!snapshot) {
    return "Todo histórico disponível";
  }

  const fromLabel = formatDateOnly(snapshot.periodFrom);
  const toLabel = formatDateOnly(snapshot.periodTo);

  if (fromLabel && toLabel) {
    return `${fromLabel} a ${toLabel}`;
  }

  if (fromLabel) {
    return `Desde ${fromLabel}`;
  }

  if (toLabel) {
    return `Até ${toLabel}`;
  }

  return "Todo histórico disponível";
}

function getRunStatusLabel(run: AtlasBrandLearningRun | null) {
  if (!run) {
    return "Sem execução";
  }

  if (run.status === "completed") {
    return "Aprendido";
  }

  if (run.status === "failed") {
    return "Falhou";
  }

  return "Aprendendo";
}

function buildLearningScopeOptions(analysisWindowDays: number) {
  return [
    {
      value: "analysis_window" as const,
      label: `Janela estratégica (${analysisWindowDays} dias)`,
    },
    { value: "all" as const, label: "Todo histórico" },
    { value: "180d" as const, label: "180 dias" },
    { value: "90d" as const, label: "90 dias" },
    { value: "30d" as const, label: "30 dias" },
  ] satisfies Array<{
    value: AtlasBrandLearningScope;
    label: string;
  }>;
}

function getEvidenceTone(evidence: AtlasBrandLearningEvidence) {
  if (
    evidence.kind === "risk" ||
    evidence.kind === "constraint" ||
    evidence.kind === "quality"
  ) {
    return "warning";
  }

  if (evidence.kind === "opportunity" || evidence.kind === "metric") {
    return "positive";
  }

  return "default";
}

export function AtlasBusinessLearningPanel() {
  const { activeBrand, activeBrandId, session } = useBrandOps();
  const [selectedScope, setSelectedScope] = useState<AtlasBrandLearningScope>("all");
  const [snapshot, setSnapshot] = useState<AtlasBrandLearningSnapshot | null>(null);
  const [previousSnapshot, setPreviousSnapshot] = useState<AtlasBrandLearningSnapshot | null>(null);
  const [findings, setFindings] = useState<AtlasBrandLearningFinding[]>([]);
  const [evidences, setEvidences] = useState<AtlasBrandLearningEvidence[]>([]);
  const [runs, setRuns] = useState<AtlasBrandLearningRun[]>([]);
  const [feedback, setFeedback] = useState<AtlasBrandLearningFeedbackSummary | null>(null);
  const [notice, setNotice] = useState<{ kind: "info" | "error" | "success"; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isSavingFeedback, setIsSavingFeedback] = useState(false);

  const geminiIntegration = useMemo(
    () => activeBrand?.integrations.find((integration) => integration.provider === "gemini") ?? null,
    [activeBrand?.integrations],
  );
  const analysisWindowDays =
    geminiIntegration?.settings.analysisWindowDays && geminiIntegration.settings.analysisWindowDays > 0
      ? geminiIntegration.settings.analysisWindowDays
      : 30;
  const learningScopeOptions = useMemo(
    () => buildLearningScopeOptions(analysisWindowDays),
    [analysisWindowDays],
  );
  const isAtlasEnabled = geminiIntegration?.mode === "api";
  const isLearningEnabled = activeBrand?.governance.featureFlags.brandLearning ?? false;
  const latestRun = runs[0] ?? null;
  const latestStatus = getRunStatusLabel(latestRun);
  const isExecutionRunning = isRunning || latestRun?.status === "running";
  const latestRunFailureMessage =
    latestRun?.status === "failed" && latestRun.errorMessage?.trim()
      ? latestRun.errorMessage.trim()
      : null;

  const summaryCards = useMemo(() => {
    return [
      {
        label: "Prioridade dominante",
        value: snapshot?.priorityStack[0] ?? "O Atlas ainda não consolidou a prioridade central.",
      },
      {
        label: "Maior oportunidade",
        value:
          snapshot?.growthOpportunities[0] ??
          "Nenhuma oportunidade dominante consolidada nesta rodada.",
      },
      {
        label: "Maior risco",
        value:
          snapshot?.operationalRisks[0] ??
          snapshot?.recurringErrors[0] ??
          "Nenhum risco crítico consolidado nesta rodada.",
      },
    ];
  }, [snapshot]);

  const evidenceHighlights = useMemo(() => evidences.slice(0, 4), [evidences]);
  const structuredGroups = useMemo(
    () =>
      [
        {
          title: "Prioridades",
          items: findings
            .filter((item) => item.group === "priority")
            .map((item) => item.label)
            .slice(0, 4),
        },
        {
          title: "Oportunidades",
          items: findings
            .filter((item) => item.group === "opportunity")
            .map((item) => item.label)
            .slice(0, 4),
        },
        {
          title: "Riscos",
          items: findings
            .filter((item) => item.group === "risk" || item.group === "error")
            .map((item) => item.label)
            .slice(0, 4),
        },
        {
          title: "Gatilhos de reaprendizagem",
          items: findings
            .filter((item) => item.group === "trigger" || item.group === "watch")
            .map((item) => item.label)
            .slice(0, 4),
        },
      ].filter((group) => group.items.length > 0),
    [findings],
  );
  const whatsNew = useMemo(() => {
    if (!snapshot || !previousSnapshot) {
      return [];
    }

    const previousItems = new Set(
      [
        ...previousSnapshot.priorityStack,
        ...previousSnapshot.growthOpportunities,
        ...previousSnapshot.operationalRisks,
      ].map((item) => item.trim()),
    );

    return [
      ...snapshot.priorityStack,
      ...snapshot.growthOpportunities,
      ...snapshot.operationalRisks,
    ]
      .map((item) => item.trim())
      .filter(Boolean)
      .filter((item, index, array) => array.indexOf(item) === index)
      .filter((item) => !previousItems.has(item))
      .slice(0, 4);
  }, [previousSnapshot, snapshot]);

  const loadLearning = useCallback(
    async (options?: { silent?: boolean }) => {
      const accessToken = session?.access_token;

      if (!activeBrandId || !accessToken) {
        setSnapshot(null);
        setPreviousSnapshot(null);
        setFindings([]);
        setEvidences([]);
        setRuns([]);
        setFeedback(null);
        setNotice(null);
        return;
      }

      try {
        if (!options?.silent) {
          setIsLoading(true);
          setNotice(null);
        }

        const response = await fetch(`/api/admin/brands/${activeBrandId}/atlas-learning`, {
          headers: {
            authorization: `Bearer ${accessToken}`,
          },
          cache: "no-store",
        });

        const payload = (await response.json().catch(() => null)) as
          | AtlasBrandLearningResponse
          | {
              error?: string;
            }
          | null;

        if (!response.ok) {
          throw new Error(payload && "error" in payload && payload.error ? payload.error : "Nao foi possivel carregar o aprendizado do Atlas.");
        }

        const successPayload = payload as AtlasBrandLearningResponse | null;
        setSnapshot(successPayload?.snapshot ?? null);
        setPreviousSnapshot(successPayload?.previousSnapshot ?? null);
        setFindings(successPayload?.findings ?? []);
        setEvidences(successPayload?.evidences ?? []);
        setRuns(successPayload?.runs ?? []);
        setFeedback(successPayload?.feedback ?? null);
      } catch (error) {
        setNotice({
          kind: "error",
          text: error instanceof Error ? error.message : "Falha ao carregar o aprendizado do Atlas.",
        });
      } finally {
        if (!options?.silent) {
          setIsLoading(false);
        }
      }
    },
    [activeBrandId, session?.access_token],
  );

  useEffect(() => {
    void loadLearning();
  }, [loadLearning]);

  useEffect(() => {
    if (latestRun?.status !== "running") {
      return;
    }

    const interval = window.setInterval(() => {
      void loadLearning({ silent: true });
    }, 5000);

    return () => {
      window.clearInterval(interval);
    };
  }, [latestRun?.status, loadLearning]);

  async function handleLearnBusiness() {
    if (!activeBrandId || !session?.access_token) {
      setNotice({
        kind: "error",
        text: "Sessão inválida para executar o aprendizado do negócio.",
      });
      return;
    }

    try {
      setIsRunning(true);
      setNotice({
        kind: "info",
        text: "O Atlas está varrendo o histórico da marca para consolidar o entendimento do negócio.",
      });

      const response = await fetch(`/api/admin/brands/${activeBrandId}/atlas-learning`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          scope: selectedScope,
        } satisfies AtlasBrandLearningRequestPayload),
      });

      const payload = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "Nao foi possivel iniciar o aprendizado do Atlas.");
      }

      await loadLearning({ silent: true });
      setNotice({
        kind: "success",
        text: "Aprendizado iniciado. O Atlas vai atualizar este painel assim que concluir a rodada.",
      });
    } catch (error) {
      setNotice({
        kind: "error",
        text: error instanceof Error ? error.message : "Falha ao iniciar o aprendizado do Atlas.",
      });
    } finally {
      setIsRunning(false);
    }
  }

  async function handleFeedback(vote: AtlasBrandLearningFeedbackPayload["vote"]) {
    if (!activeBrandId || !session?.access_token || !snapshot?.id) {
      return;
    }

    try {
      setIsSavingFeedback(true);
      const response = await fetch(`/api/admin/brands/${activeBrandId}/atlas-learning`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          snapshotId: snapshot.id,
          vote,
        } satisfies AtlasBrandLearningFeedbackPayload),
      });

      const payload = (await response.json().catch(() => null)) as
        | { feedback?: AtlasBrandLearningFeedbackSummary; error?: string }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "Nao foi possivel salvar o feedback.");
      }

      setFeedback(payload?.feedback ?? null);
    } catch (error) {
      setNotice({
        kind: "error",
        text: error instanceof Error ? error.message : "Falha ao salvar o feedback do aprendizado.",
      });
    } finally {
      setIsSavingFeedback(false);
    }
  }

  return (
    <div id="atlas-learning" className="space-y-4">
      <SectionHeading
        title="Aprender negócio"
        description="Varredura histórica para o Atlas consolidar o que esta marca realmente é, onde trava e onde cresce."
        aside={<BrainCircuit size={14} className="text-primary" />}
      />

      <div className="flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
        <span className="rounded-full border border-primary/20 bg-primary-container px-2.5 py-1 text-on-primary-container">
          {isAtlasEnabled && isLearningEnabled
            ? "Pronto para aprender"
            : !isLearningEnabled
              ? "Bloqueado pelo plano"
              : "Aguardando Atlas IA"}
        </span>
        <span className="rounded-full border border-outline px-2.5 py-1">{latestStatus}</span>
        <span className="rounded-full border border-outline px-2.5 py-1">
          {snapshot ? formatDateTime(snapshot.generatedAt) : "Sem snapshot"}
        </span>
        <span className="rounded-full border border-outline px-2.5 py-1">
          {snapshot?.scopeLabel ?? learningScopeOptions.find((item) => item.value === selectedScope)?.label}
        </span>
      </div>

      {notice ? (
        <InlineNotice
          tone={notice.kind === "error" ? "error" : notice.kind === "success" ? "success" : "info"}
          icon={
            notice.kind === "error" ? <TriangleAlert size={14} /> : notice.kind === "success" ? <Check size={14} /> : <Radar size={14} />
          }
        >
          <p className="text-xs leading-5">{notice.text}</p>
        </InlineNotice>
      ) : null}

      {!notice && latestRunFailureMessage ? (
        <InlineNotice tone="error" icon={<TriangleAlert size={14} />}>
          <div className="space-y-1">
            <p className="text-xs font-semibold leading-5 text-on-surface">
              A última rodada do aprendizado falhou.
            </p>
            <p className="text-xs leading-5">{latestRunFailureMessage}</p>
          </div>
        </InlineNotice>
      ) : null}

      {!isLearningEnabled ? (
        <InlineNotice tone="info" icon={<Radar size={14} />}>
          <p className="font-semibold text-on-surface">O plano atual ainda nao libera o modo Aprender negócio.</p>
          <p className="mt-1 text-[11px] leading-5">Libere esta capacidade na governança da marca antes de iniciar a varredura histórica.</p>
        </InlineNotice>
      ) : !isAtlasEnabled ? (
        <InlineNotice tone="info" icon={<Radar size={14} />}>
          <p className="font-semibold text-on-surface">O Atlas IA ainda nao está ativo nesta marca.</p>
          <p className="mt-1 text-[11px] leading-5">Conecte o Gemini primeiro para habilitar aprendizado e leitura assistida.</p>
        </InlineNotice>
      ) : (
        <>
          <div className="atlas-soft-section px-4 py-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                  Disparo da aprendizagem
                </p>
                <p className="mt-1 text-sm text-on-surface">
                  O Atlas lê o período escolhido, reconcilia histórico, memória operacional e base factual, e devolve uma visão executiva da marca.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <select
                  value={selectedScope}
                  onChange={(event) => setSelectedScope(event.target.value as AtlasBrandLearningScope)}
                  className="min-h-10 rounded-full border border-outline bg-surface px-3 text-sm text-on-surface"
                >
                  {learningScopeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="brandops-button brandops-button-primary min-h-10"
                  onClick={handleLearnBusiness}
                  disabled={isExecutionRunning}
                >
                  {isExecutionRunning ? <Loader2 size={14} className="animate-spin" /> : <BrainCircuit size={14} />}
                  {isExecutionRunning ? "Aprendendo..." : "Aprender agora"}
                </button>
                <button
                  type="button"
                  className="brandops-button brandops-button-secondary min-h-10"
                  onClick={() => void loadLearning()}
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
                  Atualizar
                </button>
              </div>
            </div>
          </div>

          {snapshot ? (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.9fr)]">
              <article className="atlas-soft-section px-4 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                  Resumo aprendido
                </p>
                <p className="mt-3 text-sm leading-6 text-on-surface">{snapshot.summary}</p>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  {summaryCards.map((card) => (
                    <div key={card.label} className="atlas-soft-subcard px-3 py-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                        {card.label}
                      </p>
                      <p className="mt-2 text-[12px] leading-5 text-on-surface">{card.value}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="atlas-soft-subcard px-3 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                      Período analisado
                    </p>
                    <p className="mt-2 text-[11px] leading-5 text-on-surface">{formatRange(snapshot)}</p>
                  </div>
                  <div className="atlas-soft-subcard px-3 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                      Confiança
                    </p>
                    <p className="mt-2 text-[11px] leading-5 text-on-surface">
                      {snapshot.confidence === "high"
                        ? "Alta"
                        : snapshot.confidence === "medium"
                          ? "Média"
                          : "Baixa"}
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                    Evidências que sustentam a leitura
                  </p>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {evidenceHighlights.length ? (
                      evidenceHighlights.map((evidence) => (
                        <details
                          key={evidence.id}
                          className="atlas-soft-subcard px-3 py-3"
                          data-tone={getEvidenceTone(evidence)}
                        >
                          <summary className="cursor-pointer list-none">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                                  {evidence.source.replace("-", " ")}
                                </p>
                                <p className="mt-1 text-sm font-semibold text-on-surface">{evidence.title}</p>
                              </div>
                              {evidence.metricDisplay ? (
                                <span className="atlas-soft-pill shrink-0 text-[11px] normal-case tracking-[0.02em]">
                                  {evidence.metricDisplay}
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-2 text-[11px] leading-5 text-on-surface-variant">
                              {evidence.summary}
                            </p>
                          </summary>
                          <div className="mt-3 border-t border-outline/50 pt-3">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                              Consulta rápida
                            </p>
                            <div className="mt-2 space-y-2 text-[11px] leading-5 text-on-surface-variant">
                              <p>
                                Tipo: <span className="text-on-surface">{evidence.kind}</span>
                              </p>
                              <p>
                                Referência: <span className="text-on-surface">{evidence.sourceKey ?? "sem chave específica"}</span>
                              </p>
                              {evidence.metricLabel && evidence.metricDisplay ? (
                                <p>
                                  {evidence.metricLabel}: <span className="text-on-surface">{evidence.metricDisplay}</span>
                                </p>
                              ) : null}
                            </div>
                          </div>
                        </details>
                      ))
                    ) : (
                      <p className="text-[11px] leading-5 text-on-surface-variant">
                        Esta rodada ainda nao registrou evidências consultáveis.
                      </p>
                    )}
                  </div>
                </div>
              </article>

              <div className="space-y-4">
                <article className="atlas-soft-section px-4 py-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                    Mudança de ciclo
                  </p>
                  {whatsNew.length ? (
                    <div className="mt-3 space-y-2">
                      {whatsNew.map((item) => (
                        <div key={item} className="atlas-soft-subcard px-3 py-2 text-[11px] leading-5 text-on-surface">
                          {item}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-[11px] leading-5 text-on-surface-variant">
                      Nenhuma mudança dominante em relação ao snapshot anterior.
                    </p>
                  )}
                </article>

                <article className="atlas-soft-section px-4 py-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                    Feedback humano
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={`brandops-button min-h-10 ${
                        feedback?.currentVote === "aligned"
                          ? "brandops-button-primary"
                          : "brandops-button-secondary"
                      }`}
                      onClick={() => void handleFeedback("aligned")}
                      disabled={isSavingFeedback}
                    >
                      {isSavingFeedback && feedback?.currentVote !== "aligned" ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <ThumbsUp size={14} />
                      )}
                      Alinhado
                    </button>
                    <button
                      type="button"
                      className={`brandops-button min-h-10 ${
                        feedback?.currentVote === "needs_review"
                          ? "brandops-button-primary"
                          : "brandops-button-secondary"
                      }`}
                      onClick={() => void handleFeedback("needs_review")}
                      disabled={isSavingFeedback}
                    >
                      {isSavingFeedback && feedback?.currentVote !== "needs_review" ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <ThumbsDown size={14} />
                      )}
                      Pedir revisão
                    </button>
                  </div>
                  {feedback ? (
                    <p className="mt-3 text-[11px] leading-5 text-on-surface-variant">
                      {feedback.alignedCount} leitura(s) alinhada(s) e {feedback.needsReviewCount} pedindo revisão.
                    </p>
                  ) : null}
                </article>

                <details className="atlas-soft-section px-4 py-4">
                  <summary className="cursor-pointer list-none text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                    Abrir mapa completo
                  </summary>
                  <div className="mt-4 space-y-4">
                    {structuredGroups.length ? (
                      structuredGroups.map((group) => (
                        <div key={group.title}>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                            {group.title}
                          </p>
                          <div className="mt-2 space-y-2">
                            {group.items.map((item) => (
                              <div key={`${group.title}-${item}`} className="atlas-soft-subcard px-3 py-2 text-[11px] leading-5 text-on-surface">
                                {item}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    ) : null}

                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                        Lacunas da leitura
                      </p>
                      <div className="mt-2 space-y-2">
                        {snapshot.dataGaps.length ? (
                          snapshot.dataGaps.map((item) => (
                            <div key={item} className="atlas-soft-subcard px-3 py-2 text-[11px] leading-5 text-on-surface-variant">
                              {item}
                            </div>
                          ))
                        ) : (
                          <p className="text-[11px] leading-5 text-on-surface-variant">
                            Nenhuma lacuna crítica registrada neste ciclo.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </details>
              </div>
            </div>
          ) : (
            <InlineNotice tone="info" icon={<Radar size={14} />}>
              <p className="font-semibold text-on-surface">Nenhum snapshot consolidado ainda.</p>
              <p className="mt-1 text-[11px] leading-5">
                Dispare a primeira rodada para o Atlas começar a montar o perfil histórico desta marca.
              </p>
            </InlineNotice>
          )}
        </>
      )}
    </div>
  );
}
