"use client";

import { useEffect, useMemo, useState } from "react";
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
  AtlasBrandLearningFeedbackPayload,
  AtlasBrandLearningFeedbackSummary,
  AtlasBrandLearningResponse,
  AtlasBrandLearningRun,
  AtlasBrandLearningSnapshot,
} from "@/lib/brandops/ai/types";

function formatDateTime(value: string | null) {
  if (!value) {
    return "Sem registro";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
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

  return "Em execução";
}

function toTimestamp(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function AtlasBusinessLearningPanel() {
  const { activeBrand, activeBrandId, session } = useBrandOps();
  const [snapshot, setSnapshot] = useState<AtlasBrandLearningSnapshot | null>(null);
  const [previousSnapshot, setPreviousSnapshot] = useState<AtlasBrandLearningSnapshot | null>(null);
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
  const isAtlasEnabled = geminiIntegration?.mode === "api";
  const isLearningEnabled = activeBrand?.governance.featureFlags.brandLearning ?? false;
  const latestRun = runs[0] ?? null;
  const whatsNew = useMemo(() => {
    if (!snapshot) {
      return [];
    }

    const previousItems = new Set(
      [
        ...(previousSnapshot?.growthOpportunities ?? []),
        ...(previousSnapshot?.operationalRisks ?? []),
        ...(previousSnapshot?.priorityStack ?? []),
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
  const comparison = useMemo(() => {
    if (!snapshot || !previousSnapshot) {
      return {
        persisted: [] as string[],
        dropped: [] as string[],
      };
    }

    const previousItems = Array.from(
      new Set(
        [
          ...previousSnapshot.priorityStack,
          ...previousSnapshot.growthOpportunities,
          ...previousSnapshot.operationalRisks,
        ]
          .map((item) => item.trim())
          .filter(Boolean),
      ),
    );
    const currentItems = Array.from(
      new Set(
        [
          ...snapshot.priorityStack,
          ...snapshot.growthOpportunities,
          ...snapshot.operationalRisks,
        ]
          .map((item) => item.trim())
          .filter(Boolean),
      ),
    );

    return {
      persisted: currentItems.filter((item) => previousItems.includes(item)).slice(0, 4),
      dropped: previousItems.filter((item) => !currentItems.includes(item)).slice(0, 4),
    };
  }, [previousSnapshot, snapshot]);
  const relearnSignal = useMemo(() => {
    const snapshotTimestamp = toTimestamp(snapshot?.generatedAt);

    const fileImports = Object.values(activeBrand?.files ?? {})
      .map((file) => toTimestamp(file?.lastImportedAt))
      .filter((value): value is number => value !== null);

    const integrationSyncs = (activeBrand?.integrations ?? [])
      .map((integration) => toTimestamp(integration.lastSyncAt))
      .filter((value): value is number => value !== null);

    const latestSourceUpdate = [...fileImports, ...integrationSyncs].sort((left, right) => right - left)[0] ?? null;

    if (!latestSourceUpdate) {
      return null;
    }

    if (!snapshotTimestamp) {
      return {
        kind: "initial" as const,
        timestamp: latestSourceUpdate,
      };
    }

    if (latestSourceUpdate > snapshotTimestamp + 60_000) {
      return {
        kind: "refresh" as const,
        timestamp: latestSourceUpdate,
      };
    }

    return null;
  }, [activeBrand?.files, activeBrand?.integrations, snapshot?.generatedAt]);

  useEffect(() => {
    const accessToken = session?.access_token;

    if (!activeBrandId || !accessToken) {
      setSnapshot(null);
      setPreviousSnapshot(null);
      setRuns([]);
      setFeedback(null);
      setNotice(null);
      return;
    }

    let cancelled = false;

    async function loadLearning() {
      try {
        setIsLoading(true);
        setNotice(null);

        const response = await fetch(`/api/admin/brands/${activeBrandId}/atlas-learning`, {
          headers: {
            authorization: `Bearer ${accessToken}`,
          },
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => null)) as
          | (AtlasBrandLearningResponse & { error?: string })
          | null;

        if (!response.ok) {
          throw new Error(payload?.error ?? "Nao foi possivel carregar o aprendizado do negócio.");
        }

        if (!cancelled) {
          setSnapshot(payload?.snapshot ?? null);
          setPreviousSnapshot(payload?.previousSnapshot ?? null);
          setRuns(payload?.runs ?? []);
          setFeedback(payload?.feedback ?? null);
        }
      } catch (error) {
        if (!cancelled) {
          setNotice({
            kind: "error",
            text:
              error instanceof Error
                ? error.message
                : "Nao foi possivel carregar o aprendizado do negócio.",
          });
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadLearning();

    return () => {
      cancelled = true;
    };
  }, [activeBrandId, session?.access_token]);

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
          authorization: `Bearer ${session.access_token}`,
        },
      });
      const payload = (await response.json().catch(() => null)) as
        | ({
            snapshot?: AtlasBrandLearningSnapshot;
            run?: AtlasBrandLearningRun;
            error?: string;
          })
        | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "Nao foi possivel executar o aprendizado do negócio.");
      }

      if (payload?.snapshot) {
        setSnapshot(payload.snapshot);
      }
      if (payload?.run) {
        setRuns((current) => [
          payload.run!,
          ...current.filter((entry) => entry.id !== payload.run!.id),
        ].slice(0, 6));
      }

      setNotice({
        kind: "success",
        text: "O Atlas atualizou o entendimento do negócio desta marca.",
      });
    } catch (error) {
      setNotice({
        kind: "error",
        text:
          error instanceof Error
            ? error.message
            : "Nao foi possivel executar o aprendizado do negócio.",
      });
    } finally {
      setIsRunning(false);
    }
  }

  async function handleSnapshotFeedback(vote: AtlasBrandLearningFeedbackPayload["vote"]) {
    if (!activeBrandId || !session?.access_token || !snapshot?.id) {
      setNotice({
        kind: "error",
        text: "Sessão inválida para registrar feedback do aprendizado.",
      });
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
        | {
            feedback?: AtlasBrandLearningFeedbackSummary;
            error?: string;
          }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "Nao foi possivel salvar o feedback do aprendizado.");
      }

      setFeedback(payload?.feedback ?? null);
      setNotice({
        kind: "success",
        text:
          vote === "aligned"
            ? "O Atlas registrou que esta leitura está alinhada ao negócio."
            : "O Atlas registrou que esta leitura precisa de revisão.",
      });
    } catch (error) {
      setNotice({
        kind: "error",
        text:
          error instanceof Error
            ? error.message
            : "Nao foi possivel salvar o feedback do aprendizado.",
      });
    } finally {
      setIsSavingFeedback(false);
    }
  }

  return (
    <div id="atlas-business-learning" className="space-y-4">
      <SectionHeading
        title="Aprender negócio"
        description="Faça o Atlas varrer o histórico da marca para montar um entendimento estrutural do negócio."
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
        <span className="rounded-full border border-outline px-2.5 py-1">
          {getRunStatusLabel(latestRun)}
        </span>
        <span className="rounded-full border border-outline px-2.5 py-1">
          {snapshot ? formatDateTime(snapshot.generatedAt) : "Sem snapshot"}
        </span>
      </div>

      {!isLearningEnabled ? (
        <InlineNotice tone="info" icon={<Radar size={14} />}>
          <p className="font-semibold text-on-surface">
            O plano atual ainda nao libera o modo Aprender negócio.
          </p>
          <p className="mt-1 text-[11px] leading-5">
            Libere a capacidade da marca em Acessos antes de tentar ensinar o Atlas por varredura histórica.
          </p>
        </InlineNotice>
      ) : !isAtlasEnabled ? (
        <InlineNotice tone="info" icon={<Radar size={14} />}>
          <p className="font-semibold text-on-surface">Ative o Atlas IA para usar este modo.</p>
          <p className="mt-1 text-[11px] leading-5">
            O aprendizado do negócio depende da integração Gemini ativa para consolidar o snapshot da marca.
          </p>
        </InlineNotice>
      ) : null}

      {notice ? (
        <InlineNotice
          tone={
            notice.kind === "success"
              ? "success"
              : notice.kind === "error"
                ? "warning"
                : "info"
          }
          icon={
            notice.kind === "error" ? <TriangleAlert size={14} /> : <RefreshCcw size={14} />
          }
        >
          <p className="text-[11px] leading-5">{notice.text}</p>
        </InlineNotice>
      ) : null}

      {relearnSignal ? (
        <InlineNotice tone="info" icon={<RefreshCcw size={14} />}>
          <p className="font-semibold text-on-surface">
            {relearnSignal.kind === "initial"
              ? "Já existem dados suficientes para o primeiro aprendizado."
              : "Há novas importações ou sincronizações depois do último snapshot."}
          </p>
          <p className="mt-1 text-[11px] leading-5">
            Última atualização relevante detectada em {formatDateTime(new Date(relearnSignal.timestamp).toISOString())}.
            {relearnSignal.kind === "refresh"
              ? " Vale reaprender para alinhar o entendimento do Atlas ao estado atual da operação."
              : " O Atlas já pode consolidar o primeiro entendimento estrutural da marca."}
          </p>
        </InlineNotice>
      ) : null}

      <div className="atlas-soft-section flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold text-on-surface">
            O Atlas vai mapear nicho, baseline, oportunidades e erros recorrentes.
          </p>
          <p className="mt-1 text-[11px] leading-5 text-on-surface-variant">
            Esta primeira versão usa o histórico consolidado de finanças, vendas, mídia, tráfego, catálogo e saneamento.
          </p>
        </div>
        <button
          type="button"
          onClick={handleLearnBusiness}
          disabled={!isAtlasEnabled || !isLearningEnabled || isRunning}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-primary/25 bg-primary px-3 py-2 text-[11px] font-semibold text-on-primary transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isRunning ? <Loader2 size={13} className="animate-spin" /> : null}
          Aprender negócio
        </button>
      </div>

      {snapshot ? (
        <div className="grid gap-3 xl:grid-cols-2">
          <article className="atlas-soft-section px-4 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
              Resumo executivo
            </p>
            <p className="mt-2 text-sm font-semibold leading-6 text-on-surface">{snapshot.summary}</p>
            <p className="mt-3 text-[11px] leading-5 text-on-surface-variant">{snapshot.businessProfile}</p>
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-outline/50 pt-3">
              <button
                type="button"
                onClick={() => handleSnapshotFeedback("aligned")}
                disabled={isSavingFeedback}
                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-semibold transition ${
                  feedback?.currentVote === "aligned"
                    ? "border-primary/24 bg-primary-container text-on-primary-container"
                    : "border-outline/70 text-on-surface-variant hover:border-primary/20 hover:text-on-surface"
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                {feedback?.currentVote === "aligned" ? <Check size={12} /> : <ThumbsUp size={12} />}
                Alinhado
                <span className="text-[10px] opacity-80">({feedback?.alignedCount ?? 0})</span>
              </button>
              <button
                type="button"
                onClick={() => handleSnapshotFeedback("needs_review")}
                disabled={isSavingFeedback}
                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-semibold transition ${
                  feedback?.currentVote === "needs_review"
                    ? "border-warning/20 bg-warning/10 text-warning"
                    : "border-outline/70 text-on-surface-variant hover:border-warning/20 hover:text-on-surface"
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                <ThumbsDown size={12} />
                Revisar
                <span className="text-[10px] opacity-80">({feedback?.needsReviewCount ?? 0})</span>
              </button>
            </div>
          </article>

          <article className="atlas-soft-section px-4 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
              Nicho e baseline
            </p>
            <p className="mt-2 text-[11px] leading-5 text-on-surface-variant">{snapshot.nicheProfile}</p>
            <p className="mt-3 text-[11px] leading-5 text-on-surface">{snapshot.performanceBaseline}</p>
          </article>

          <article className="atlas-soft-section px-4 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
              Pilha de prioridade
            </p>
            <div className="mt-3 space-y-2">
              {snapshot.priorityStack.length ? (
                snapshot.priorityStack.map((item, index) => (
                  <div key={`${index}-${item}`} className="atlas-soft-subcard px-3 py-2 text-[11px] leading-5 text-on-surface">
                    {item}
                  </div>
                ))
              ) : (
                <p className="text-[11px] leading-5 text-on-surface-variant">
                  O Atlas ainda nao consolidou uma ordem clara de prioridade.
                </p>
              )}
            </div>
          </article>

          <article className="atlas-soft-section px-4 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
              Sinais estruturais
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {snapshot.businessSignals.length ? (
                snapshot.businessSignals.map((item) => (
                  <span
                    key={item}
                    className="atlas-soft-pill text-[11px] normal-case tracking-[0.02em]"
                  >
                    {item}
                  </span>
                ))
              ) : (
                <p className="text-[11px] leading-5 text-on-surface-variant">
                  Ainda sem sinais estruturais consolidados.
                </p>
              )}
            </div>
          </article>

          <article className="atlas-soft-section px-4 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
              Oportunidades
            </p>
            <div className="mt-3 space-y-2">
              {snapshot.growthOpportunities.map((item) => (
                <div key={item} className="atlas-soft-subcard px-3 py-2 text-[11px] leading-5 text-on-surface">
                  {item}
                </div>
              ))}
            </div>
          </article>

          <article className="atlas-soft-section px-4 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
              Riscos e erros recorrentes
            </p>
            <div className="mt-3 space-y-2">
              {[...snapshot.operationalRisks, ...snapshot.recurringErrors].slice(0, 6).map((item) => (
                <div key={item} className="atlas-soft-subcard px-3 py-2 text-[11px] leading-5 text-on-surface-variant">
                  {item}
                </div>
              ))}
            </div>
          </article>

          <article className="atlas-soft-section px-4 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
              Padrões sazonais e de campanha
            </p>
            <div className="mt-3 space-y-2">
              {[...snapshot.seasonalityPatterns, ...snapshot.campaignPatterns].length ? (
                [...snapshot.seasonalityPatterns, ...snapshot.campaignPatterns]
                  .slice(0, 6)
                  .map((item) => (
                    <div key={item} className="atlas-soft-subcard px-3 py-2 text-[11px] leading-5 text-on-surface">
                      {item}
                    </div>
                  ))
              ) : (
                <p className="text-[11px] leading-5 text-on-surface-variant">
                  Ainda sem padrões sazonais ou de campanha consolidados.
                </p>
              )}
            </div>
          </article>

          <article className="atlas-soft-section px-4 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
              Padrões de catálogo e POD
            </p>
            <div className="mt-3 space-y-2">
              {snapshot.catalogPatterns.length ? (
                snapshot.catalogPatterns.map((item) => (
                  <div key={item} className="atlas-soft-subcard px-3 py-2 text-[11px] leading-5 text-on-surface">
                    {item}
                  </div>
                ))
              ) : (
                <p className="text-[11px] leading-5 text-on-surface-variant">
                  O Atlas ainda nao consolidou padrões relevantes de catálogo.
                </p>
              )}
            </div>
          </article>

          <article className="atlas-soft-section px-4 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
              O que mudou
            </p>
            <div className="mt-3 space-y-2">
              {previousSnapshot ? (
                whatsNew.length ? (
                  whatsNew.map((item) => (
                    <div key={item} className="atlas-soft-subcard px-3 py-2 text-[11px] leading-5 text-on-surface">
                      {item}
                    </div>
                  ))
                ) : (
                  <p className="text-[11px] leading-5 text-on-surface-variant">
                    Esta execução reafirmou a leitura anterior sem abrir mudanças fortes de prioridade.
                  </p>
                )
              ) : (
                <p className="text-[11px] leading-5 text-on-surface-variant">
                  Esta é a primeira aprendizagem registrada para a marca.
                </p>
              )}
            </div>
          </article>

          <article className="atlas-soft-section px-4 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
              Comparação com o ciclo anterior
            </p>
            {previousSnapshot ? (
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <div className="atlas-soft-subcard px-3 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                    Novos focos
                  </p>
                  <div className="mt-2 space-y-2">
                    {whatsNew.length ? (
                      whatsNew.map((item) => (
                        <div key={item} className="text-[11px] leading-5 text-on-surface">
                          {item}
                        </div>
                      ))
                    ) : (
                      <p className="text-[11px] leading-5 text-on-surface-variant">
                        Sem novos focos fortes nesta rodada.
                      </p>
                    )}
                  </div>
                </div>
                <div className="atlas-soft-subcard px-3 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                    Focos persistentes
                  </p>
                  <div className="mt-2 space-y-2">
                    {comparison.persisted.length ? (
                      comparison.persisted.map((item) => (
                        <div key={item} className="text-[11px] leading-5 text-on-surface">
                          {item}
                        </div>
                      ))
                    ) : (
                      <p className="text-[11px] leading-5 text-on-surface-variant">
                        O Atlas não encontrou foco persistente forte entre os dois ciclos.
                      </p>
                    )}
                  </div>
                </div>
                <div className="atlas-soft-subcard px-3 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                    Sinais que perderam força
                  </p>
                  <div className="mt-2 space-y-2">
                    {comparison.dropped.length ? (
                      comparison.dropped.map((item) => (
                        <div key={item} className="text-[11px] leading-5 text-on-surface">
                          {item}
                        </div>
                      ))
                    ) : (
                      <p className="text-[11px] leading-5 text-on-surface-variant">
                        Nenhum foco anterior perdeu força de forma relevante.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-[11px] leading-5 text-on-surface-variant">
                A comparação detalhada começa a aparecer depois do segundo snapshot da marca.
              </p>
            )}
          </article>
        </div>
      ) : !isLoading ? (
        <div className="atlas-soft-section border-dashed px-4 py-4 text-[11px] leading-5 text-on-surface-variant">
          O Atlas ainda não consolidou um entendimento histórico desta marca. Execute o modo
          <span className="font-semibold text-on-surface"> Aprender negócio </span>
          para gerar o primeiro snapshot.
        </div>
      ) : null}

      <div className="atlas-soft-section px-4 py-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
          Histórico de execuções
        </p>
        <div className="mt-3 space-y-2">
          {runs.length ? (
            runs.map((run) => (
              <div
                key={run.id}
                className="atlas-soft-subcard px-3 py-2.5"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] font-semibold text-on-surface">{run.scopeLabel}</p>
                  <span className="text-[10px] uppercase tracking-[0.14em] text-ink-muted">
                    {getRunStatusLabel(run)}
                  </span>
                </div>
                <p className="mt-1 text-[11px] leading-5 text-on-surface-variant">
                  {run.summary ?? run.errorMessage ?? "Execução registrada sem resumo final."}
                </p>
                <p className="mt-2 text-[10px] uppercase tracking-[0.14em] text-ink-muted">
                  {formatDateTime(run.startedAt)}
                </p>
              </div>
            ))
          ) : (
            <p className="text-[11px] leading-5 text-on-surface-variant">
              Nenhuma execução de aprendizado foi registrada para esta marca ainda.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
