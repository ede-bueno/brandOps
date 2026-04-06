"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import {
  AlertCircle,
  Check,
  ChevronDown,
  Loader2,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { useBrandOps } from "./BrandOpsProvider";
import type {
  AtlasAnalystFeedbackPayload,
  AtlasAnalystHistoryItem,
  AtlasAnalystHistoryResponse,
  AtlasAnalystRequestPayload,
  AtlasAnalystResponse,
  AtlasAnalystSkillId,
} from "@/lib/brandops/ai/types";
import { ATLAS_GEMINI_DEFAULT_MODEL } from "@/lib/brandops/ai/model-policy";
import { getLatestDatasetDate } from "@/lib/brandops/metrics";
import { APP_ROUTES } from "@/lib/brandops/routes";

const SKILL_OPTIONS: Array<{ value: AtlasAnalystSkillId; label: string }> = [
  { value: "auto", label: "Auto" },
  { value: "executive_operator", label: "Executivo" },
  { value: "marketing_performance", label: "Marketing" },
  { value: "revenue_operator", label: "Receita" },
  { value: "pod_strategist", label: "POD" },
];

function getQuickPrompts(pathname: string) {
  if (pathname.startsWith("/media")) {
    return [
      "Onde eu realocaria verba hoje sem aumentar risco?",
      "Quais campanhas eu deveria revisar antes de escalar?",
    ];
  }

  if (pathname.startsWith("/traffic")) {
    return [
      "Onde o funil esta travando mais neste recorte?",
      "Qual origem ou landing merece ganhar mais distribuicao?",
    ];
  }

  if (pathname.startsWith("/product-insights") || pathname.startsWith("/feed")) {
    return [
      "Quais estampas eu deveria escalar agora?",
      "O que esta pedindo revisao de vitrine antes de ganhar trafego?",
    ];
  }

  if (pathname.startsWith("/dre") || pathname.startsWith("/dashboard")) {
    return [
      "Quais 3 decisoes mais impactam a margem agora?",
      "O que mais esta comprimindo o resultado neste periodo?",
    ];
  }

  return [
    "Qual deveria ser minha proxima decisao operacional?",
    "Onde existe maior risco e maior oportunidade agora?",
  ];
}

function formatRunDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatIsoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function subtractDays(referenceDate: Date, days: number) {
  const next = new Date(referenceDate);
  next.setDate(next.getDate() - Math.max(days - 1, 0));
  return next;
}

function getSkillLabel(skillId: AtlasAnalystSkillId) {
  return SKILL_OPTIONS.find((option) => option.value === skillId)?.label ?? "Executivo";
}

function getPrimaryRisk(entry: AtlasAnalystResponse | AtlasAnalystHistoryItem | null) {
  if (!entry) {
    return null;
  }

  return entry.risks[0] ?? entry.warnings[0] ?? null;
}

function DisabledNotice({
  hasPlanAccess,
}: {
  hasPlanAccess: boolean;
}) {
  return (
    <div className="rounded-2xl border border-warning/25 bg-warning/10 px-3 py-3 text-[11px] leading-5 text-on-surface-variant">
      <p className="font-semibold text-on-surface">
        {hasPlanAccess
          ? "Gemini ainda não habilitado para esta loja."
          : "Atlas IA bloqueado pelo plano desta marca."}
      </p>
      <p className="mt-1">
        {hasPlanAccess ? (
          <>
            Ative a integração no painel de{" "}
            <Link href={APP_ROUTES.integrations} prefetch={false} className="text-secondary hover:underline">
              Integrações
            </Link>{" "}
            para usar o Atlas com a chave própria desta loja.
          </>
        ) : (
          <>
            A capacidade precisa ser liberada em{" "}
            <Link href={APP_ROUTES.adminStores} prefetch={false} className="text-secondary hover:underline">
              Acessos
            </Link>{" "}
            antes da configuração técnica.
          </>
        )}
      </p>
    </div>
  );
}

export function AtlasAnalystPanel({
  variant = "orb",
}: {
  variant?: "orb" | "command-center" | "dashboard-orb";
}) {
  const pathname = usePathname() ?? "/";
  const { activeBrand, activeBrandId, periodRange, selectedPeriodLabel, session } = useBrandOps();
  const [question, setQuestion] = useState("");
  const [skill, setSkill] = useState<AtlasAnalystSkillId>("auto");
  const [result, setResult] = useState<AtlasAnalystResponse | null>(null);
  const [history, setHistory] = useState<AtlasAnalystHistoryItem[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isSavingFeedback, setIsSavingFeedback] = useState(false);
  const [isPending, startTransition] = useTransition();

  const quickPrompts = useMemo(() => getQuickPrompts(pathname), [pathname]);
  const geminiIntegration = useMemo(
    () => activeBrand?.integrations.find((integration) => integration.provider === "gemini") ?? null,
    [activeBrand?.integrations],
  );
  const hasAtlasAiPlanAccess = activeBrand?.governance.featureFlags.atlasAi ?? false;
  const isAgentConfigured = geminiIntegration?.mode === "api" && hasAtlasAiPlanAccess;
  const isDisabled = !activeBrandId || !session?.access_token || !isAgentConfigured;
  const latestEntry = result ?? history[0] ?? null;
  const latestQuestion = result ? question : history[0]?.question ?? null;
  const isDashboardOrb = variant === "dashboard-orb";
  const isCommandCenter = variant === "command-center";
  const modelLabel = geminiIntegration?.settings.model ?? ATLAS_GEMINI_DEFAULT_MODEL;
  const analysisWindowDays = geminiIntegration?.settings.analysisWindowDays ?? 30;
  const defaultSkill = geminiIntegration?.settings.defaultSkill ?? "executive_operator";
  const defaultSkillLabel =
    defaultSkill === "auto" ? "Especialista dinâmico" : getSkillLabel(defaultSkill);
  const atlasPeriod = useMemo(() => {
    if (!activeBrand || !isAgentConfigured) {
      return {
        label: selectedPeriodLabel,
        from: periodRange?.start ?? null,
        to: periodRange?.end ?? null,
      };
    }

    const referenceDate = getLatestDatasetDate(activeBrand) ?? new Date();
    return {
      label: `Atlas ${analysisWindowDays} dias`,
      from: formatIsoDate(subtractDays(referenceDate, analysisWindowDays)),
      to: formatIsoDate(referenceDate),
    };
  }, [activeBrand, analysisWindowDays, isAgentConfigured, periodRange?.end, periodRange?.start, selectedPeriodLabel]);

  useEffect(() => {
    const accessToken = session?.access_token;
    if (!activeBrandId || !accessToken) {
      setHistory([]);
      setResult(null);
      return;
    }

    let cancelled = false;

    async function loadHistory() {
      try {
        setIsLoadingHistory(true);
        const response = await fetch(`/api/admin/brands/${activeBrandId}/atlas-analyst`, {
          headers: { authorization: `Bearer ${accessToken}` },
          cache: "no-store",
        });
        const payload = (await response.json()) as AtlasAnalystHistoryResponse & { error?: string };
        if (!response.ok) {
          throw new Error(payload.error ?? "Nao foi possivel carregar o historico do Atlas.");
        }
        if (!cancelled) {
          setHistory(payload.runs ?? []);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : "Nao foi possivel carregar o historico do Atlas.");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingHistory(false);
        }
      }
    }

    void loadHistory();
    return () => {
      cancelled = true;
    };
  }, [activeBrandId, session?.access_token]);

  function buildPayload(nextQuestion: string): AtlasAnalystRequestPayload {
    return {
      question: nextQuestion,
      skill,
      pageContext: pathname,
      periodLabel: atlasPeriod.label,
      brandLabel: activeBrand?.name ?? null,
      from: atlasPeriod.from,
      to: atlasPeriod.to,
    };
  }

  function mergeHistoryItem(item: AtlasAnalystHistoryItem) {
    setHistory((current) => [item, ...current.filter((entry) => entry.runId !== item.runId)].slice(0, 6));
  }

  function handleAsk(nextQuestion: string) {
    const trimmedQuestion = nextQuestion.trim();
    if (!trimmedQuestion || !activeBrandId || !session?.access_token || !isAgentConfigured) {
      return;
    }

    setQuestion(trimmedQuestion);
    setErrorMessage(null);

    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/brands/${activeBrandId}/atlas-analyst`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(buildPayload(trimmedQuestion)),
        });
        const payload = (await response.json()) as AtlasAnalystResponse & { error?: string };
        if (!response.ok) {
          throw new Error(payload.error ?? "Nao foi possivel consultar o Atlas.");
        }
        setResult(payload);
        if (payload.runId) {
          mergeHistoryItem({ ...payload, question: trimmedQuestion, pageContext: pathname });
        }
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Nao foi possivel consultar o Atlas.");
      }
    });
  }

  async function handleFeedback(vote: AtlasAnalystFeedbackPayload["vote"]) {
    if (!result?.runId || !activeBrandId || !session?.access_token) {
      return;
    }

    try {
      setIsSavingFeedback(true);
      const response = await fetch(`/api/admin/brands/${activeBrandId}/atlas-analyst`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ runId: result.runId, vote } satisfies AtlasAnalystFeedbackPayload),
      });
      const payload = (await response.json()) as { error?: string; vote?: AtlasAnalystFeedbackPayload["vote"] };
      if (!response.ok) {
        throw new Error(payload.error ?? "Nao foi possivel salvar o feedback do Atlas.");
      }
      setResult((current) => (current ? { ...current, feedbackVote: payload.vote ?? vote } : current));
      setHistory((current) => current.map((entry) => (entry.runId === result.runId ? { ...entry, feedbackVote: payload.vote ?? vote } : entry)));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Nao foi possivel salvar o feedback do Atlas.");
    } finally {
      setIsSavingFeedback(false);
    }
  }

  if (isDashboardOrb) {
    return (
      <div className="mt-4 border-t border-outline/70 pt-4">
        <div className="rounded-2xl border border-outline bg-background px-3 py-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">Atlas em casa</p>
              <p className="mt-1 text-[11px] leading-5 text-on-surface-variant">
                A Torre abriga a base nativa do Atlas IA. O Orb fica com atalhos e contexto rápido.
              </p>
            </div>
            <Sparkles size={16} className="text-primary" />
          </div>
          {!isAgentConfigured ? (
            <div className="mt-3">
              <DisabledNotice hasPlanAccess={hasAtlasAiPlanAccess} />
            </div>
          ) : (
            <>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full border border-primary/20 bg-primary-container px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-on-primary-container">
                  {atlasPeriod.label}
                </span>
                <span className="rounded-full border border-outline px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
                  {modelLabel}
                </span>
              </div>
              <div className="mt-3 rounded-2xl border border-outline bg-surface-container-low px-3 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">Última leitura</p>
                <p className="mt-2 text-[11px] font-semibold leading-5 text-on-surface">
                  {latestEntry?.summary ?? "A base do Atlas está pronta para começar a acumular leituras desta marca."}
                </p>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-[10px] leading-4 text-ink-muted">Abra a base fixa do Atlas abaixo para conversar com o agente.</p>
                <Link href={`${APP_ROUTES.dashboard}#atlas-ai-home`} prefetch={false} className="inline-flex shrink-0 items-center gap-2 rounded-full border border-primary/25 bg-primary px-3 py-1.5 text-[11px] font-semibold text-on-primary transition hover:brightness-105">
                  Abrir base do Atlas
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  const commandCenterHeadline = latestEntry?.summary ?? "Atlas pronto para assumir esta mesa de decisão.";
  const commandCenterNarrative =
    latestEntry?.summary?.trim() ||
    "Faça uma pergunta curta e o Atlas cruza finanças, mídia, tráfego e catálogo antes de recomendar.";
  const commandCenterDecision =
    latestEntry?.actions[0] ?? "Escolha um corte prioritário para o Atlas ranquear a próxima decisão da operação.";
  const commandCenterAlert =
    getPrimaryRisk(latestEntry) ?? "Sem alerta crítico destacado na última leitura. Use uma pergunta objetiva para pressionar o Atlas onde importa.";
  const commandCenterOpportunity =
    latestEntry?.followUps[0] ?? latestEntry?.actions[1] ?? quickPrompts[0] ?? "Use um corte pronto para abrir a próxima leitura do Atlas.";
  const disclosureFollowUps = latestEntry?.followUps?.length ? latestEntry.followUps.slice(0, 3) : (latestEntry?.actions ?? []).slice(1, 3);
  const evidencePreview = latestEntry?.evidence?.slice(0, 3) ?? [];
  const recentMemory = history.slice(0, 3);
  const quickPromptPreview = quickPrompts.slice(0, 2);

  if (isCommandCenter) {
    return (
      <div className="space-y-4">
        {!isAgentConfigured ? (
          <DisabledNotice hasPlanAccess={hasAtlasAiPlanAccess} />
        ) : (
          <>
            <section className="atlas-command-hero rounded-[24px] px-4 py-4 sm:px-5 sm:py-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-3xl">
                  <p className="eyebrow">Atlas agora</p>
                  <h3 className="mt-1 font-headline text-[1.18rem] font-semibold tracking-tight text-on-surface sm:text-[1.48rem]">{commandCenterHeadline}</h3>
                  <p className="mt-2 max-w-2xl text-[12px] leading-6 text-on-surface-variant">{commandCenterNarrative}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="atlas-soft-pill" data-emphasis="primary">{atlasPeriod.label}</span>
                  <span className="atlas-soft-pill">{modelLabel}</span>
                  {latestEntry ? <span className="atlas-soft-pill">{latestEntry.confidence}</span> : null}
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <article className="atlas-decision-card" data-tone="primary">
                  <p className="atlas-decision-label">Decisão agora</p>
                  <p className="atlas-decision-copy">{commandCenterDecision}</p>
                </article>
                <article className="atlas-decision-card" data-tone="negative">
                  <p className="atlas-decision-label">Alerta dominante</p>
                  <p className="atlas-decision-copy">{commandCenterAlert}</p>
                </article>
                <article className="atlas-decision-card" data-tone="positive">
                  <p className="atlas-decision-label">Melhor abertura</p>
                  <p className="atlas-decision-copy">{commandCenterOpportunity}</p>
                </article>
              </div>

            </section>

            <section className="atlas-soft-section p-4">
              <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                <div className="space-y-2">
                  <textarea value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Pergunte ao Atlas qual decisão ele tomaria agora..." disabled={isDisabled || isPending} rows={3} className="brandops-input min-h-[96px] w-full text-[12px] leading-5 disabled:cursor-not-allowed disabled:opacity-60" />
                  <p className="text-[10px] leading-4 text-ink-muted">O Atlas só lê dados internos e recomenda. Execução continua com o operador.</p>
                </div>
                <button type="button" onClick={() => handleAsk(question)} disabled={isDisabled || isPending || !question.trim()} className="inline-flex min-h-[2.8rem] shrink-0 items-center justify-center gap-2 rounded-full border border-primary/25 bg-primary px-4 py-2 text-[12px] font-semibold text-on-primary transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60">
                  {isPending ? <Loader2 size={13} className="animate-spin" /> : null}
                  Analisar agora
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {quickPromptPreview.map((prompt) => (
                  <button key={prompt} type="button" onClick={() => handleAsk(prompt)} disabled={isDisabled || isPending} className="atlas-soft-pill text-left normal-case tracking-[0.02em] disabled:cursor-not-allowed disabled:opacity-60" data-interactive="true">
                    {prompt}
                  </button>
                ))}
              </div>
              <details className="atlas-disclosure mt-3">
                <summary className="atlas-disclosure-summary">
                  <span>Ajustar leitura</span>
                  <ChevronDown size={15} className="atlas-disclosure-chevron" />
                </summary>
                <div className="atlas-disclosure-body">
                  <div className="flex flex-wrap gap-2">
                    {SKILL_OPTIONS.map((option) => (
                      <button key={option.value} type="button" onClick={() => setSkill(option.value)} disabled={isDisabled || isPending} className="atlas-soft-pill shrink-0 disabled:cursor-not-allowed disabled:opacity-60" data-emphasis={skill === option.value ? "active" : undefined} data-interactive="true">
                        {option.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] leading-5 text-ink-muted">
                    {skill === "auto" ? (
                      <>
                        Auto usa <span className="font-semibold text-on-surface">{defaultSkillLabel}</span> como base e respeita os parâmetros salvos em{" "}
                        <Link href={APP_ROUTES.settingsAtlasAi} prefetch={false} className="text-secondary hover:underline">Configurações</Link>.
                      </>
                    ) : (
                      "Troque a skill só quando quiser forçar uma lente específica nesta leitura."
                    )}
                  </p>
                  {quickPrompts.length > quickPromptPreview.length ? (
                    <div className="flex flex-wrap gap-2">
                      {quickPrompts.slice(quickPromptPreview.length).map((prompt) => (
                        <button key={prompt} type="button" onClick={() => handleAsk(prompt)} disabled={isDisabled || isPending} className="atlas-soft-pill text-left normal-case tracking-[0.02em] disabled:cursor-not-allowed disabled:opacity-60" data-interactive="true">
                          {prompt}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </details>
            </section>

            {errorMessage ? (
              <div className="flex items-start gap-2 rounded-2xl border border-error/12 bg-error/8 px-3 py-2.5 text-[11px] leading-5 text-error">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            ) : null}

            <div className="grid gap-3 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
              <details className="atlas-disclosure">
                <summary className="atlas-disclosure-summary">
                  <span>Base da leitura</span>
                  <ChevronDown size={15} className="atlas-disclosure-chevron" />
                </summary>
                <div className="atlas-disclosure-body">
                  {latestQuestion ? (
                    <div className="atlas-soft-subcard px-3 py-2 text-[11px] leading-5 text-on-surface">
                      <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Pergunta ativa</span>
                      <span className="mt-1 block">{latestQuestion}</span>
                    </div>
                  ) : null}
                  {evidencePreview.length ? evidencePreview.map((item) => (
                    <div key={item} className="atlas-soft-subcard px-3 py-2 text-[11px] leading-5 text-on-surface-variant">{item}</div>
                  )) : (
                    <p className="text-[11px] leading-5 text-on-surface-variant">A próxima leitura do Atlas vai preencher esta base com evidências e cortes de aprofundamento.</p>
                  )}
                  {latestEntry?.warnings?.slice(0, 3).map((warning) => (
                    <div key={warning} className="atlas-soft-subcard px-3 py-2 text-[11px] leading-5 text-on-surface-variant">{warning}</div>
                  ))}
                </div>
              </details>

              <div className="space-y-3">
                <details className="atlas-disclosure">
                  <summary className="atlas-disclosure-summary">
                    <span>Próximos cortes</span>
                    <ChevronDown size={15} className="atlas-disclosure-chevron" />
                  </summary>
                  <div className="atlas-disclosure-body">
                    {disclosureFollowUps.length ? disclosureFollowUps.map((item) => (
                      <button key={item} type="button" onClick={() => handleAsk(item)} disabled={isDisabled || isPending} className="atlas-soft-pill text-left normal-case tracking-[0.02em] disabled:cursor-not-allowed disabled:opacity-60" data-interactive="true">
                        {item}
                      </button>
                    )) : (
                      <p className="text-[11px] leading-5 text-on-surface-variant">Assim que o Atlas fechar uma leitura, os próximos cortes recomendados ficam disponíveis aqui.</p>
                    )}
                  </div>
                </details>

                <details className="atlas-disclosure">
                  <summary className="atlas-disclosure-summary">
                    <span>Memória e feedback</span>
                    <ChevronDown size={15} className="atlas-disclosure-chevron" />
                  </summary>
                  <div className="atlas-disclosure-body">
                    {result?.runId ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <button type="button" onClick={() => handleFeedback("helpful")} disabled={isSavingFeedback} className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-semibold transition ${result.feedbackVote === "helpful" ? "border-primary/30 bg-primary-container text-on-primary-container" : "border-outline text-on-surface-variant hover:border-secondary/30 hover:text-on-surface"} disabled:cursor-not-allowed disabled:opacity-60`}>
                          {result.feedbackVote === "helpful" ? <Check size={12} /> : <ThumbsUp size={12} />}
                          Ajudou
                        </button>
                        <button type="button" onClick={() => handleFeedback("not_helpful")} disabled={isSavingFeedback} className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-semibold transition ${result.feedbackVote === "not_helpful" ? "border-error/30 bg-error/10 text-error" : "border-outline text-on-surface-variant hover:border-secondary/30 hover:text-on-surface"} disabled:cursor-not-allowed disabled:opacity-60`}>
                          <ThumbsDown size={12} />
                          Não ajudou
                        </button>
                      </div>
                    ) : null}
                    {isLoadingHistory ? <Loader2 size={12} className="animate-spin text-ink-muted" /> : null}
                    {recentMemory.length ? recentMemory.map((entry) => (
                      <button key={entry.runId ?? `${entry.generatedAt}-${entry.question}`} type="button" onClick={() => {
                        setQuestion(entry.question);
                        setResult(entry);
                      }} className="atlas-soft-memory-card w-full px-3 py-2 text-left">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[11px] font-semibold leading-5 text-on-surface">{entry.question}</p>
                          <span className="text-[10px] font-medium text-ink-muted">{formatRunDate(entry.generatedAt)}</span>
                        </div>
                        <p className="mt-1 text-[11px] leading-5 text-on-surface-variant">{entry.summary}</p>
                      </button>
                    )) : (
                      <p className="text-[11px] leading-5 text-on-surface-variant">As próximas análises desta loja vão começar a formar a memória operacional do Atlas.</p>
                    )}
                  </div>
                </details>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  return null;
}
