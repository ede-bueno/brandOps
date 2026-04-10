"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";
import { useBrandOps } from "./BrandOpsProvider";
import type {
  AtlasAnalystHistoryItem,
  AtlasAnalystRequestPayload,
  AtlasAnalystResponse,
  AtlasAnalystSkillId,
} from "@/lib/brandops/ai/types";
import { getLatestDatasetDate } from "@/lib/brandops/metrics";
import { APP_ROUTES } from "@/lib/brandops/routes";
import { AtlasCanvasViewport } from "@/components/atlas-canvas/AtlasCanvasViewport";
import {
  buildAtlasCanvasState,
  classifyAtlasCanvasDomain,
  compactAtlasLine,
  type AtlasCanvasDomain,
  type AtlasCanvasNode,
} from "@/components/atlas-canvas/atlasCanvasState";
import { AtlasMark } from "./AtlasMark";

function getQuickPrompts(pathname: string) {
  if (pathname.startsWith("/media")) {
    return [
      "Onde a mídia está queimando margem agora?",
      "Quais campanhas eu deveria rever antes de subir verba?",
      "Qual criativo merece escalar hoje?",
      "Onde existe desperdício de verba?",
    ];
  }

  if (pathname.startsWith("/traffic")) {
    return [
      "Onde o funil está travando?",
      "O que mais derruba a taxa de compra?",
      "Qual origem merece ganhar distribuição?",
      "Onde a sessão perde força?",
    ];
  }

  if (pathname.startsWith("/product-insights") || pathname.startsWith("/feed")) {
    return [
      "Quais produtos sustentam melhor a margem?",
      "O que eu deveria tirar de vitrine?",
      "Qual grupo pede escala agora?",
      "Qual produto está puxando a operação para baixo?",
    ];
  }

  if (pathname.startsWith("/dre") || pathname.startsWith("/dashboard") || pathname.startsWith("/sales")) {
    return [
      "O que mais está comprimindo o resultado?",
      "Quais 3 decisões mais impactam a margem agora?",
      "Onde está a maior alavanca operacional?",
      "Qual corte eu deveria abrir primeiro?",
    ];
  }

  return [
    "O que exige ação agora?",
    "Onde existe maior risco e maior oportunidade?",
    "Qual deveria ser meu próximo movimento?",
    "O que eu ainda não estou vendo?",
  ];
}

function formatIsoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function subtractDays(referenceDate: Date, days: number) {
  const next = new Date(referenceDate);
  next.setDate(next.getDate() - Math.max(days - 1, 0));
  return next;
}

function getAtlasDefaultDomain(pathname: string): AtlasCanvasDomain {
  if (pathname.startsWith("/media")) return "midia";
  if (pathname.startsWith("/traffic")) return "trafego";
  if (pathname.startsWith("/product-insights") || pathname.startsWith("/feed")) return "produtos";
  if (pathname.startsWith("/dre") || pathname.startsWith("/sales") || pathname.startsWith("/dashboard")) {
    return "financeiro";
  }
  return "operacao";
}

function getUserLabel(session: ReturnType<typeof useBrandOps>["session"]) {
  const metadata = session?.user?.user_metadata as Record<string, unknown> | undefined;
  const displayName =
    (typeof metadata?.display_name === "string" && metadata.display_name.trim()) ||
    (typeof metadata?.full_name === "string" && metadata.full_name.trim()) ||
    (typeof metadata?.name === "string" && metadata.name.trim()) ||
    null;

  if (displayName) {
    return displayName;
  }

  const email = session?.user?.email?.trim();
  if (email) {
    return email.split("@")[0] ?? "você";
  }

  return "você";
}

function buildFollowLines(run: AtlasAnalystHistoryItem | null) {
  if (!run) {
    return [];
  }

  return [...run.actions.slice(0, 2), ...run.evidence.slice(0, 1)]
    .map((item) => compactAtlasLine(item, 82))
    .filter(Boolean)
    .slice(0, 3);
}

function DisabledNotice({
  hasPlanAccess,
}: {
  hasPlanAccess: boolean;
}) {
  return (
    <div className="atlas-canvas-warning">
      <AlertCircle size={14} className="mt-0.5 shrink-0" />
      <div>
        <p className="font-semibold text-on-surface">
          {hasPlanAccess ? "Gemini ainda não habilitado para esta loja." : "Atlas bloqueado pelo plano desta marca."}
        </p>
        <p className="mt-1 text-on-surface-variant">
          {hasPlanAccess ? (
            <>
              Ative a integração em{" "}
              <Link href={APP_ROUTES.integrations} prefetch={false} className="text-secondary hover:underline">
                Integrações
              </Link>
              .
            </>
          ) : (
            <>
              Libere a capacidade em{" "}
              <Link href={APP_ROUTES.adminStores} prefetch={false} className="text-secondary hover:underline">
                Acessos
              </Link>
              .
            </>
          )}
        </p>
      </div>
    </div>
  );
}

export function AtlasAnalystPanel({
  variant = "command-center",
}: {
  variant?: "orb" | "command-center" | "dashboard-orb";
}) {
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const { activeBrand, activeBrandId, periodRange, selectedPeriodLabel, session } = useBrandOps();
  const [question, setQuestion] = useState("");
  const [latestRun, setLatestRun] = useState<AtlasAnalystHistoryItem | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const quickPrompts = useMemo(() => getQuickPrompts(pathname), [pathname]);
  const defaultDomain = useMemo(() => getAtlasDefaultDomain(pathname), [pathname]);
  const geminiIntegration = useMemo(
    () => activeBrand?.integrations.find((integration) => integration.provider === "gemini") ?? null,
    [activeBrand?.integrations],
  );
  const hasAtlasAiPlanAccess = activeBrand?.governance.featureFlags.atlasAi ?? false;
  const isAgentConfigured = geminiIntegration?.mode === "api" && hasAtlasAiPlanAccess;
  const isDisabled = !activeBrandId || !session?.access_token || !isAgentConfigured;
  const analysisWindowDays = geminiIntegration?.settings.analysisWindowDays ?? 30;
  const skill: AtlasAnalystSkillId = "auto";
  const userLabel = useMemo(() => getUserLabel(session), [session]);

  useEffect(() => {
    if (variant !== "command-center" || typeof document === "undefined") {
      return;
    }

    document.body.dataset.atlasCanvas = "true";
    return () => {
      delete document.body.dataset.atlasCanvas;
    };
  }, [variant]);

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

  const canvasState = useMemo(
    () =>
      buildAtlasCanvasState({
        fallbackDomain: latestRun
          ? classifyAtlasCanvasDomain(`${latestRun.summary} ${latestRun.answer}`, defaultDomain)
          : defaultDomain,
        latestRun,
      }),
    [defaultDomain, latestRun],
  );

  const activeCanvasNode = useMemo(
    () => canvasState.nodes.find((node) => node.id === (activeNodeId ?? canvasState.focusNodeId)) ?? null,
    [activeNodeId, canvasState.focusNodeId, canvasState.nodes],
  );

  const followLines = useMemo(() => buildFollowLines(latestRun), [latestRun]);

  function buildPayload(nextQuestion: string): AtlasAnalystRequestPayload {
    return {
      question: nextQuestion,
      skill,
      pageContext: pathname,
      periodLabel: atlasPeriod.label,
      brandLabel: activeBrand?.name ?? null,
      userLabel,
      from: atlasPeriod.from,
      to: atlasPeriod.to,
    };
  }

  function handleAsk(nextQuestion: string) {
    const trimmedQuestion = nextQuestion.trim();
    if (!trimmedQuestion || !activeBrandId || !session?.access_token || !isAgentConfigured) {
      return;
    }

    setErrorMessage(null);
    setQuestion("");

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
          throw new Error(payload.error ?? "Não foi possível consultar o Atlas.");
        }

        const nextRun = {
          ...payload,
          question: trimmedQuestion,
          pageContext: pathname,
        } satisfies AtlasAnalystHistoryItem;

        setLatestRun(nextRun);
        setActiveNodeId(null);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Não foi possível consultar o Atlas.");
      }
    });
  }

  function handleNodeSelect(node: AtlasCanvasNode) {
    setActiveNodeId(node.id);

    if (node.href) {
      router.push(node.href);
      return;
    }

    if (node.prompt) {
      setQuestion(node.prompt);
    }
  }

  if (variant !== "command-center") {
    return null;
  }

  return (
    <div className="atlas-canvas-root" id="atlas-ai-home">
      {!isAgentConfigured ? (
        <DisabledNotice hasPlanAccess={hasAtlasAiPlanAccess} />
      ) : (
        <section className="atlas-canvas-shell" data-state={canvasState.status}>
          <div className="atlas-canvas-chat-column">
            <header className="atlas-canvas-head">
              <div className="atlas-canvas-brandline">
                <span className="atlas-canvas-brandmark">
                  <AtlasMark size="sm" />
                </span>
                <span className="atlas-canvas-brandname">Atlas</span>
              </div>
              <span className="atlas-canvas-presence" data-state={isPending ? "busy" : canvasState.status}>
                {isPending ? "processando" : canvasState.status === "idle" ? "pronto" : "conectado"}
              </span>
            </header>

            {errorMessage ? (
              <div className="atlas-canvas-warning atlas-canvas-warning-inline">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            ) : null}

            <div className="atlas-canvas-dialogue" aria-label="Conversa com o Atlas">
              <div className="atlas-canvas-thread">
                {latestRun ? (
                  <>
                    <div className="atlas-canvas-message atlas-canvas-message-user">
                      <span className="atlas-canvas-message-kicker">{userLabel}</span>
                      <p className="atlas-canvas-message-copy">{latestRun.question}</p>
                    </div>

                    <div className="atlas-canvas-message atlas-canvas-message-atlas">
                      <span className="atlas-canvas-message-kicker">Atlas</span>
                      <p className="atlas-canvas-message-copy atlas-canvas-message-copy-atlas">
                        {compactAtlasLine(latestRun.answer || latestRun.summary, 136)}
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="atlas-canvas-idle">
                    <div className="atlas-canvas-idle-dot" aria-hidden="true" />
                    <div>
                      <p className="atlas-canvas-idle-title">Pronto.</p>
                      <span className="atlas-canvas-idle-copy">O contexto já está carregado.</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="atlas-canvas-composer">
                <textarea
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  placeholder="Pergunte do seu jeito…"
                  disabled={isDisabled || isPending}
                  rows={2}
                  className="atlas-canvas-input"
                />
                <button
                  type="button"
                  onClick={() => handleAsk(question)}
                  disabled={isDisabled || isPending || !question.trim()}
                  className="atlas-canvas-send"
                  aria-label="Enviar pergunta"
                >
                  {isPending ? <Loader2 size={15} className="animate-spin" /> : <span>↗</span>}
                </button>
              </div>
            </div>

            <div className="atlas-canvas-suggestion-deck" aria-label="Sugestões do Atlas">
              {followLines.length
                ? followLines.map((line) => (
                    <button key={line} type="button" className="atlas-canvas-follow-chip" onClick={() => handleAsk(line)}>
                      {line}
                    </button>
                  ))
                : null}

              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => handleAsk(prompt)}
                  disabled={isDisabled || isPending}
                  className="atlas-canvas-suggestion"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          <div className="atlas-canvas-map-column">
            <AtlasCanvasViewport
              state={canvasState}
              activeNodeId={activeCanvasNode?.id ?? null}
              isPending={isPending}
              onNodeSelect={handleNodeSelect}
            />
          </div>
        </section>
      )}
    </div>
  );
}
