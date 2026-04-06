"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { AlertCircle, Check, Loader2, Sparkles, ThumbsDown, ThumbsUp } from "lucide-react";
import { useBrandOps } from "./BrandOpsProvider";
import type {
  AtlasAnalystFeedbackPayload,
  AtlasAnalystHistoryItem,
  AtlasAnalystHistoryResponse,
  AtlasAnalystRequestPayload,
  AtlasAnalystResponse,
  AtlasAnalystSkillId,
} from "@/lib/brandops/ai/types";
import { getLatestDatasetDate } from "@/lib/brandops/metrics";

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
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function subtractDays(referenceDate: Date, days: number) {
  const next = new Date(referenceDate);
  next.setDate(next.getDate() - Math.max(days - 1, 0));
  return next;
}

function getSkillLabel(skillId: AtlasAnalystSkillId) {
  return SKILL_OPTIONS.find((option) => option.value === skillId)?.label ?? "Executivo";
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
  const latestFollowUps = latestEntry?.followUps?.slice(0, 3) ?? [];
  const isCommandCenter = variant === "command-center";
  const isDashboardOrb = variant === "dashboard-orb";
  const modelLabel = geminiIntegration?.settings.model ?? "gemini-2.5-flash";
  const temperatureLabel = `temp ${(geminiIntegration?.settings.temperature ?? 0.25).toFixed(2)}`;
  const analysisWindowDays = geminiIntegration?.settings.analysisWindowDays ?? 30;
  const defaultSkill = geminiIntegration?.settings.defaultSkill ?? "executive_operator";
  const defaultSkillLabel =
    defaultSkill === "auto" ? "Especialista dinâmico" : getSkillLabel(defaultSkill);
  const hasOperatorGuidance = Boolean(geminiIntegration?.settings.operatorGuidance?.trim());
  const credentialLabel = "Chave da loja";
  const atlasPeriod = useMemo(() => {
    if (!activeBrand || !isAgentConfigured) {
      return {
        label: selectedPeriodLabel,
        from: periodRange?.start ?? null,
        to: periodRange?.end ?? null,
      };
    }

    const referenceDate = getLatestDatasetDate(activeBrand) ?? new Date();
    const startDate = subtractDays(referenceDate, analysisWindowDays);

    return {
      label: `Atlas ${analysisWindowDays} dias`,
      from: formatIsoDate(startDate),
      to: formatIsoDate(referenceDate),
    };
  }, [
    activeBrand,
    analysisWindowDays,
    isAgentConfigured,
    periodRange?.end,
    periodRange?.start,
    selectedPeriodLabel,
  ]);

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
          headers: {
            authorization: `Bearer ${accessToken}`,
          },
          cache: "no-store",
        });
        const payload = (await response.json()) as AtlasAnalystHistoryResponse & { error?: string };

        if (!response.ok) {
          throw new Error(payload.error ?? "Nao foi possivel carregar o historico do Atlas Analyst.");
        }

        if (!cancelled) {
          setHistory(payload.runs ?? []);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Nao foi possivel carregar o historico do Atlas Analyst.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingHistory(false);
        }
      }
    }

    loadHistory();

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

        const payload = (await response.json()) as AtlasAnalystResponse & {
          error?: string;
        };
        if (!response.ok) {
          throw new Error(payload.error ?? "Nao foi possivel consultar o Atlas Analyst.");
        }

        setResult(payload);
        if (payload.runId) {
          mergeHistoryItem({
            ...payload,
            question: trimmedQuestion,
            pageContext: pathname,
          });
        }
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Nao foi possivel consultar o Atlas Analyst.",
        );
      }
    });
  }

  async function handleFeedback(vote: AtlasAnalystFeedbackPayload["vote"]) {
    if (!result?.runId || !activeBrandId || !session?.access_token) {
      return;
    }

    try {
      setIsSavingFeedback(true);
      setErrorMessage(null);

      const response = await fetch(`/api/admin/brands/${activeBrandId}/atlas-analyst`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          runId: result.runId,
          vote,
        } satisfies AtlasAnalystFeedbackPayload),
      });

      const payload = (await response.json()) as { error?: string; vote?: AtlasAnalystFeedbackPayload["vote"] };
      if (!response.ok) {
        throw new Error(payload.error ?? "Nao foi possivel salvar o feedback do Atlas Analyst.");
      }

      setResult((current) => (current ? { ...current, feedbackVote: payload.vote ?? vote } : current));
      setHistory((current) =>
        current.map((entry) =>
          entry.runId === result.runId
            ? { ...entry, feedbackVote: payload.vote ?? vote }
            : entry,
        ),
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Nao foi possivel salvar o feedback do Atlas Analyst.",
      );
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
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
                Atlas em casa
              </p>
              <p className="mt-1 text-[11px] leading-5 text-on-surface-variant">
                A Torre de Controle abriga a base nativa do Atlas IA quando o plano da marca libera essa camada. O Orb fica com atalhos e contexto rápido.
              </p>
            </div>
            <Sparkles size={16} className="text-primary" />
          </div>

          {!isAgentConfigured ? (
            <div className="mt-3 rounded-2xl border border-outline bg-surface-container-low px-3 py-3 text-[11px] leading-5 text-on-surface-variant">
              <p className="font-semibold text-on-surface">
                {hasAtlasAiPlanAccess
                  ? "Esta loja segue na Torre de Controle sem IA."
                  : "Esta loja ainda nao tem Atlas IA liberado no plano."}
              </p>
              <p className="mt-1">
                {hasAtlasAiPlanAccess ? (
                  <>
                    O Atlas IA continua opcional. Se a marca quiser ativar depois, a configuração fica em{" "}
                    <Link href="/integrations" className="text-secondary hover:underline">
                      Integrações
                    </Link>
                    .
                  </>
                ) : (
                  <>
                    Primeiro libere a capacidade da marca em{" "}
                    <Link href="/admin/stores" className="text-secondary hover:underline">
                      Acessos
                    </Link>{" "}
                    e depois conecte o Gemini em{" "}
                    <Link href="/integrations" className="text-secondary hover:underline">
                      Integrações
                    </Link>
                    .
                  </>
                )}
              </p>
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
                <span className="rounded-full border border-outline px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
                  {temperatureLabel}
                </span>
                <span className="rounded-full border border-outline px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
                  Base {defaultSkillLabel}
                </span>
              </div>

              <div className="mt-3 rounded-2xl border border-outline bg-surface-container-low px-3 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
                  Última leitura
                </p>
                <p className="mt-2 text-[11px] font-semibold leading-5 text-on-surface">
                  {latestEntry?.summary ?? "A base do Atlas IA está pronta para começar a acumular leituras desta marca."}
                </p>
                {latestQuestion ? (
                  <p className="mt-1 text-[11px] leading-5 text-on-surface-variant">
                    {latestQuestion}
                  </p>
                ) : null}
                {latestFollowUps.length ? (
                  <div className="mt-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                      Próximos cortes
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {latestFollowUps.map((followUp) => (
                        <button
                          key={followUp}
                          type="button"
                          onClick={() => handleAsk(followUp)}
                          disabled={isDisabled || isPending}
                          className="rounded-full border border-outline bg-background px-3 py-1.5 text-left text-[10px] font-medium leading-4 text-on-surface-variant transition hover:border-secondary/30 hover:text-on-surface disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {followUp}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-[10px] leading-4 text-ink-muted">
                  Abra a base fixa do Atlas IA abaixo para conversar com o agente.
                </p>
                <Link
                  href="/dashboard#atlas-ai-home"
                  className="inline-flex shrink-0 items-center gap-2 rounded-full border border-primary/25 bg-primary px-3 py-1.5 text-[11px] font-semibold text-on-primary transition hover:brightness-105"
                >
                  Abrir base do Atlas
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={isCommandCenter ? "space-y-4" : "mt-4 border-t border-outline/70 pt-4"}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
            {isCommandCenter ? "Casa do Atlas IA" : "Atlas Analyst"}
          </p>
          <p className={`mt-1 leading-5 text-on-surface-variant ${isCommandCenter ? "text-[12px]" : "text-[11px]"}`}>
            {isCommandCenter
              ? "O backend segue como fonte de verdade. Aqui o Atlas cruza contexto histórico, leituras internas e o playbook da marca para recomendar o próximo movimento da operação."
              : "Leitura read-only com contexto de margem, mídia, tráfego e POD."}
          </p>
        </div>
        <Sparkles size={16} className="text-primary" />
      </div>

      {isCommandCenter ? (
        <div className="flex flex-wrap gap-2">
          <span className="atlas-soft-pill" data-emphasis="primary">
            {activeBrand?.name ?? "Loja ativa"}
          </span>
          <span className="atlas-soft-pill">
            {atlasPeriod.label}
          </span>
          <span className="atlas-soft-pill">
            {modelLabel}
          </span>
          <span className="atlas-soft-pill">
            {temperatureLabel}
          </span>
          <span className="atlas-soft-pill">
            Base {defaultSkillLabel}
          </span>
          <span className="atlas-soft-pill">
            {hasOperatorGuidance ? "Guia ativo" : credentialLabel}
          </span>
        </div>
      ) : null}

      {!isAgentConfigured ? (
        <div className="mt-3 rounded-2xl border border-warning/25 bg-warning/10 px-3 py-3 text-[11px] leading-5 text-on-surface-variant">
          <p className="font-semibold text-on-surface">
            {hasAtlasAiPlanAccess
              ? "Gemini ainda não habilitado para esta loja."
              : "Atlas IA bloqueado pelo plano desta marca."}
          </p>
          <p className="mt-1">
            {hasAtlasAiPlanAccess ? (
              <>
                Ative a integração no painel de{" "}
                <Link href="/integrations" className="text-secondary hover:underline">
                  Integrações
                </Link>{" "}
                para usar o Atlas Analyst com a chave própria desta loja.
              </>
            ) : (
              <>
                A capacidade precisa ser liberada em{" "}
                <Link href="/admin/stores" className="text-secondary hover:underline">
                  Acessos
                </Link>{" "}
                antes da configuração técnica.
              </>
            )}
          </p>
        </div>
      ) : null}

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {SKILL_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setSkill(option.value)}
            disabled={isDisabled || isPending}
            className="atlas-soft-pill shrink-0 disabled:cursor-not-allowed disabled:opacity-60"
            data-emphasis={skill === option.value ? "active" : undefined}
            data-interactive="true"
          >
            {option.label}
          </button>
        ))}
      </div>

      {skill === "auto" ? (
        <p className="text-[10px] leading-4 text-ink-muted">
          Auto usa <span className="font-semibold text-on-surface">{defaultSkillLabel}</span> como base
          desta marca e respeita os parâmetros salvos em{" "}
          <Link href="/settings#atlas-ai-settings" className="text-secondary hover:underline">
            Configurações
          </Link>
          .
        </p>
      ) : null}

      <div className="mt-3 space-y-2">
        <textarea
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Pergunte ao Atlas o que ele faria agora..."
          disabled={isDisabled || isPending}
          rows={isCommandCenter ? 4 : 3}
          className={`brandops-input w-full text-[12px] leading-5 disabled:cursor-not-allowed disabled:opacity-60 ${
            isCommandCenter ? "min-h-[112px]" : "min-h-[88px]"
          }`}
        />
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] leading-4 text-ink-muted">
            Usa apenas leituras internas do Atlas e não executa ações.
          </p>
          <button
            type="button"
            onClick={() => handleAsk(question)}
            disabled={isDisabled || isPending || !question.trim()}
            className="inline-flex shrink-0 items-center gap-2 rounded-full border border-primary/25 bg-primary px-3 py-1.5 text-[11px] font-semibold text-on-primary transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? <Loader2 size={12} className="animate-spin" /> : null}
            Analisar
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {quickPrompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => handleAsk(prompt)}
            disabled={isDisabled || isPending}
            className="atlas-soft-pill text-left normal-case tracking-[0.02em] disabled:cursor-not-allowed disabled:opacity-60"
            data-interactive="true"
          >
            {prompt}
          </button>
        ))}
      </div>

      {errorMessage ? (
        <div className="mt-3 flex items-start gap-2 rounded-2xl border border-error/12 bg-error/8 px-3 py-2.5 text-[11px] leading-5 text-error">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      ) : null}

      {result ? (
        <div className={`mt-4 space-y-3 ${isCommandCenter ? "" : "max-h-[22rem] overflow-y-auto pr-1"}`}>
          <div className="atlas-soft-section p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
                {result.skillLabel}
              </p>
              <span className="atlas-soft-pill" data-emphasis="primary">
                {result.confidence}
              </span>
            </div>
            <p className="mt-2 text-[12px] font-semibold leading-5 text-on-surface">
              {result.summary}
            </p>
            <p className="mt-2 text-[12px] leading-5 text-on-surface-variant">
              {result.answer}
            </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {result.usedReports.map((report) => (
                  <span
                    key={report}
                    className="atlas-soft-pill"
                  >
                    {report}
                  </span>
                ))}
              </div>
            {result.runId ? (
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-outline/70 pt-3">
                <button
                  type="button"
                  onClick={() => handleFeedback("helpful")}
                  disabled={isSavingFeedback}
                  className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-semibold transition ${
                    result.feedbackVote === "helpful"
                      ? "border-primary/30 bg-primary-container text-on-primary-container"
                      : "border-outline text-on-surface-variant hover:border-secondary/30 hover:text-on-surface"
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  {result.feedbackVote === "helpful" ? <Check size={12} /> : <ThumbsUp size={12} />}
                  Ajudou
                </button>
                <button
                  type="button"
                  onClick={() => handleFeedback("not_helpful")}
                  disabled={isSavingFeedback}
                  className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-semibold transition ${
                    result.feedbackVote === "not_helpful"
                      ? "border-error/30 bg-error/10 text-error"
                      : "border-outline text-on-surface-variant hover:border-secondary/30 hover:text-on-surface"
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  <ThumbsDown size={12} />
                  Não ajudou
                </button>
              </div>
            ) : null}
          </div>

          {result.actions.length ? (
            <section className="atlas-soft-section p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
                Próximas ações
              </p>
              <div className="mt-2 space-y-2">
                {result.actions.map((action) => (
                  <div key={action} className="atlas-soft-subcard px-3 py-2 text-[11px] leading-5 text-on-surface">
                    {action}
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {result.evidence.length ? (
            <section className="atlas-soft-section p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
                Evidências
              </p>
              <div className="mt-2 space-y-2">
                {result.evidence.map((item) => (
                  <div key={item} className="atlas-soft-subcard px-3 py-2 text-[11px] leading-5 text-on-surface-variant">
                    {item}
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {result.risks.length ? (
            <section className="atlas-soft-section p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
                Riscos e cuidados
              </p>
              <div className="mt-2 space-y-2">
                {result.risks.map((risk) => (
                  <div key={risk} className="atlas-soft-subcard px-3 py-2 text-[11px] leading-5 text-on-surface-variant">
                    {risk}
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {result.warnings.length ? (
            <section className="atlas-soft-section p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
                Avisos de contexto
              </p>
              <div className="mt-2 space-y-2">
                {result.warnings.map((warning) => (
                  <div key={warning} className="atlas-soft-subcard px-3 py-2 text-[11px] leading-5 text-on-surface-variant">
                    {warning}
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {result.followUps.length ? (
            <section className="atlas-soft-section p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
                Próximos cortes
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {result.followUps.map((followUp) => (
                  <button
                    key={followUp}
                    type="button"
                    onClick={() => handleAsk(followUp)}
                    disabled={isDisabled || isPending}
                    className="atlas-soft-pill text-left normal-case tracking-[0.02em] disabled:cursor-not-allowed disabled:opacity-60"
                    data-interactive="true"
                  >
                    {followUp}
                  </button>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      ) : null}

      <section className="atlas-soft-section mt-4 p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
            Memória recente
          </p>
          {isLoadingHistory ? <Loader2 size={12} className="animate-spin text-ink-muted" /> : null}
        </div>
        {history.length ? (
          <div className="mt-3 space-y-2">
            {history.map((entry) => (
              <button
                key={entry.runId ?? `${entry.generatedAt}-${entry.question}`}
                type="button"
                onClick={() => {
                  setQuestion(entry.question);
                  setResult(entry);
                }}
                className="atlas-soft-memory-card w-full px-3 py-2 text-left"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold leading-5 text-on-surface">
                    {entry.question}
                  </p>
                  <span className="text-[10px] font-medium text-ink-muted">
                    {formatRunDate(entry.generatedAt)}
                  </span>
                </div>
                <p className="mt-1 text-[11px] leading-5 text-on-surface-variant">
                  {entry.summary}
                </p>
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-[11px] leading-5 text-on-surface-variant">
            As próximas análises desta loja vão começar a formar a memória operacional do Atlas Analyst.
          </p>
        )}
      </section>
    </div>
  );
}
