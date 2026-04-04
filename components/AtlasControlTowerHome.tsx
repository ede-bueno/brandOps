"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  BrainCircuit,
  CalendarClock,
  DatabaseZap,
  Loader2,
  Megaphone,
  NotebookPen,
  Radar,
  Sparkles,
} from "lucide-react";
import { useBrandOps } from "./BrandOpsProvider";
import { AtlasAnalystPanel } from "./AtlasAnalystPanel";
import { FormField, InlineNotice, SectionHeading, StackItem, SurfaceCard } from "./ui-shell";
import type {
  AtlasContextEntry,
  AtlasContextEntryListResponse,
  AtlasContextEntryType,
} from "@/lib/brandops/ai/types";

type AtlasContextRouteResponse = AtlasContextEntryListResponse & {
  summary?: string | null;
  updatedAt?: string | null;
};

type ContextFormState = {
  entryType: AtlasContextEntryType;
  title: string;
  summary: string;
  details: string;
  eventDate: string;
};

const EMPTY_FORM: ContextFormState = {
  entryType: "insight",
  title: "",
  summary: "",
  details: "",
  eventDate: "",
};

const CONTEXT_TYPE_OPTIONS: Array<{ value: AtlasContextEntryType; label: string }> = [
  { value: "campaign", label: "Campanha" },
  { value: "promotion", label: "Promoção" },
  { value: "launch", label: "Lançamento" },
  { value: "incident", label: "Incidente" },
  { value: "insight", label: "Aprendizado" },
];

function formatContextDate(value: string | null) {
  if (!value) {
    return "Sem data";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

function getContextKindLabel(value: AtlasContextEntryType) {
  const option = CONTEXT_TYPE_OPTIONS.find((item) => item.value === value);
  return option?.label ?? "Contexto";
}

function getContextImportanceLabel(entry: AtlasContextEntry) {
  if (entry.importance === "critical") {
    return "Crítico";
  }

  if (entry.importance === "high") {
    return "Alto";
  }

  if (entry.importance === "low") {
    return "Baixo";
  }

  return "Normal";
}

function ContextIcon({ kind }: { kind: AtlasContextEntryType }) {
  if (kind === "campaign") {
    return <Megaphone size={14} />;
  }

  if (kind === "incident") {
    return <AlertTriangle size={14} />;
  }

  return <NotebookPen size={14} />;
}

export function AtlasControlTowerHome() {
  const { activeBrand, activeBrandId, selectedPeriodLabel, session } = useBrandOps();
  const [entries, setEntries] = useState<AtlasContextEntry[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [contextError, setContextError] = useState<string | null>(null);
  const [contextNotice, setContextNotice] = useState<string | null>(null);
  const [isLoadingContext, setIsLoadingContext] = useState(false);
  const [isSavingContext, setIsSavingContext] = useState(false);
  const [formState, setFormState] = useState<ContextFormState>(EMPTY_FORM);

  const geminiIntegration =
    activeBrand?.integrations.find((integration) => integration.provider === "gemini") ?? null;
  const isAtlasAiEnabled = geminiIntegration?.mode === "api";
  const accessToken = session?.access_token ?? null;

  useEffect(() => {
    if (!activeBrandId || !accessToken || !isAtlasAiEnabled) {
      setEntries([]);
      setSummary(null);
      setUpdatedAt(null);
      setContextError(null);
      setContextNotice(null);
      setFormState(EMPTY_FORM);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    async function loadAtlasContext() {
      try {
        setIsLoadingContext(true);
        setContextError(null);

        const response = await fetch(`/api/admin/brands/${activeBrandId}/atlas-context?limit=6`, {
          headers: {
            authorization: `Bearer ${accessToken}`,
          },
          cache: "no-store",
          signal: controller.signal,
        });

        const payload = (await response.json().catch(() => null)) as (AtlasContextRouteResponse & {
          error?: string;
        }) | null;

        if (!response.ok) {
          throw new Error(
            payload?.error ?? "Nao foi possivel carregar o contexto operacional do Atlas.",
          );
        }

        if (!cancelled) {
          setEntries(payload?.entries ?? []);
          setSummary(payload?.summary ?? null);
          setUpdatedAt(payload?.updatedAt ?? null);
        }
      } catch (error) {
        if (!cancelled && !(error instanceof DOMException && error.name === "AbortError")) {
          setEntries([]);
          setSummary(null);
          setUpdatedAt(null);
          setContextError(
            error instanceof Error
              ? error.message
              : "Nao foi possivel carregar o contexto operacional do Atlas.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingContext(false);
        }
      }
    }

    loadAtlasContext();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [accessToken, activeBrandId, isAtlasAiEnabled]);

  if (!activeBrand || !isAtlasAiEnabled) {
    return null;
  }

  const modelLabel = geminiIntegration.settings.model ?? "gemini-2.5-flash";
  const credentialLabel =
    geminiIntegration.settings.credentialSource === "brand_key" ? "Chave da loja" : "Chave da plataforma";

  async function handleCreateContextEntry() {
    if (!activeBrandId || !accessToken) {
      return;
    }

    try {
      setIsSavingContext(true);
      setContextError(null);
      setContextNotice(null);

      const response = await fetch(`/api/admin/brands/${activeBrandId}/atlas-context`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          entryType: formState.entryType,
          title: formState.title,
          summary: formState.summary,
          details: formState.details || null,
          eventDate: formState.eventDate || null,
          importance: formState.entryType === "incident" ? "high" : "normal",
          tags: [formState.entryType],
        }),
      });

      const payload = (await response.json().catch(() => null)) as (AtlasContextEntry & {
        error?: string;
      }) | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "Nao foi possivel registrar o contexto da marca.");
      }

      if (!payload) {
        throw new Error("O Atlas nao recebeu uma resposta valida ao salvar o contexto.");
      }

      setEntries((current) => [payload, ...current].slice(0, 6));
      setUpdatedAt(payload.eventDate ?? payload.createdAt);
      setSummary(
        "O Atlas agora passa a considerar esta anotação nas próximas leituras da marca.",
      );
      setContextNotice("Contexto registrado e já disponível para o Atlas Analyst.");
      setFormState(EMPTY_FORM);
    } catch (error) {
      setContextError(
        error instanceof Error
          ? error.message
          : "Nao foi possivel registrar o contexto da marca.",
      );
    } finally {
      setIsSavingContext(false);
    }
  }

  return (
    <SurfaceCard id="atlas-ai-home" className="overflow-hidden p-0">
      <div className="grid gap-0 xl:grid-cols-[minmax(0,1.45fr)_24rem]">
        <div className="relative overflow-hidden p-4 sm:p-5 lg:p-6">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top_left,rgba(43,142,255,0.16),transparent_65%)]" />
          <div className="relative">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-primary/20 bg-primary-container px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-on-primary-container">
                Torre de Controle + Atlas IA
              </span>
              <span className="rounded-full border border-outline px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
                {selectedPeriodLabel}
              </span>
              <span className="rounded-full border border-outline px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
                {modelLabel}
              </span>
            </div>

            <div className="mt-4 max-w-3xl">
              <p className="eyebrow">Casa nativa do Atlas</p>
              <h2 className="font-headline text-[1.45rem] font-semibold tracking-tight text-on-surface sm:text-[1.85rem]">
                A Torre de Controle vira a base fixa da inteligência operacional da marca.
              </h2>
              <p className="mt-2 max-w-2xl text-[12px] leading-6 text-on-surface-variant sm:text-[13px]">
                Aqui o Atlas cruza DRE, vendas, mídia, tráfego, catálogo, saneamento e contexto operacional
                curado para recomendar o próximo movimento com mais memória de campanha, promoção e operação.
                O Orb continua vivendo em todo o produto como camada acompanhante.
              </p>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-outline/70 bg-background/85 px-4 py-3">
                <div className="flex items-center gap-2 text-primary">
                  <BrainCircuit size={16} />
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-on-surface">
                    Leitura read-only
                  </p>
                </div>
                <p className="mt-2 text-[11px] leading-5 text-on-surface-variant">
                  O Atlas recomenda, mas os cálculos seguem vindo apenas das camadas canônicas do backend.
                </p>
              </div>

              <div className="rounded-2xl border border-outline/70 bg-background/85 px-4 py-3">
                <div className="flex items-center gap-2 text-primary">
                  <Radar size={16} />
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-on-surface">
                    Memória operacional
                  </p>
                </div>
                <p className="mt-2 text-[11px] leading-5 text-on-surface-variant">
                  O Atlas passa a lembrar mudanças de campanha, lançamentos, promoções e incidentes desta marca.
                </p>
              </div>

              <div className="rounded-2xl border border-outline/70 bg-background/85 px-4 py-3">
                <div className="flex items-center gap-2 text-primary">
                  <DatabaseZap size={16} />
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-on-surface">
                    Base única
                  </p>
                </div>
                <p className="mt-2 text-[11px] leading-5 text-on-surface-variant">
                  A conversa nasce em cima do que já entrou no banco via INK, Meta, GA4 e tabelas gerenciais do Atlas.
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-[1.75rem] border border-outline/70 bg-background/95 p-4 sm:p-5">
              <AtlasAnalystPanel variant="command-center" />
            </div>
          </div>
        </div>

        <div className="border-t border-outline/60 bg-surface-container-low/55 p-4 sm:p-5 xl:border-l xl:border-t-0">
          <SectionHeading
            title="Base ativa"
            description="Como o Atlas está sentado na mesa desta marca neste momento."
            aside={<Sparkles size={14} className="text-primary" />}
          />

          <div className="mt-4 space-y-2">
            <StackItem
              title="Marca em foco"
              description="A leitura e a memória recente seguem a loja ativa no shell."
              aside={activeBrand.name}
              tone="info"
            />
            <StackItem
              title="Recorte da conversa"
              description="Toda recomendação respeita o mesmo período selecionado na Torre de Controle."
              aside={selectedPeriodLabel}
            />
            <StackItem
              title="Credencial do Gemini"
              description="A loja pode operar com a chave da plataforma ou com a própria chave."
              aside={credentialLabel}
            />
          </div>

          <div className="mt-5">
            <SectionHeading
              title="Linha do tempo operacional"
              description="Campanhas, promoções, lançamentos e incidentes entram no contexto do Atlas."
              aside={
                isLoadingContext ? (
                  <Loader2 size={14} className="animate-spin text-primary" />
                ) : (
                  <CalendarClock size={14} className="text-primary" />
                )
              }
            />

            {summary ? (
              <div className="mt-4 rounded-2xl border border-primary/15 bg-primary-container/35 px-3 py-3 text-[11px] leading-5 text-on-surface">
                <p className="font-semibold text-on-surface">Resumo curado</p>
                <p className="mt-1 text-on-surface-variant">{summary}</p>
                {updatedAt ? (
                  <p className="mt-2 text-[10px] uppercase tracking-[0.14em] text-ink-muted">
                    Atualizado em {formatContextDate(updatedAt)}
                  </p>
                ) : null}
              </div>
            ) : null}

            {contextError ? (
              <InlineNotice
                tone="warning"
                icon={<AlertTriangle size={14} />}
                className="mt-4"
              >
                <p className="font-semibold text-on-surface">Contexto ainda em aquecimento</p>
                <p className="mt-1 text-[11px] leading-5">{contextError}</p>
              </InlineNotice>
            ) : null}

            {contextNotice ? (
              <InlineNotice tone="success" className="mt-4">
                <p className="text-[11px] leading-5">{contextNotice}</p>
              </InlineNotice>
            ) : null}

            {entries.length ? (
              <div className="mt-4 space-y-2">
                {entries.map((entry) => (
                  <article
                    key={entry.id}
                    className="relative overflow-hidden rounded-2xl border border-outline/70 bg-background px-3 py-3"
                  >
                    <div className="absolute left-3 top-3 bottom-3 w-px bg-outline/70" />
                    <div className="relative flex gap-3 pl-4">
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-outline bg-surface-container-low text-primary">
                        <ContextIcon kind={entry.entryType} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-outline bg-surface-container-low px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
                            {getContextKindLabel(entry.entryType)}
                          </span>
                          <span className="text-[10px] uppercase tracking-[0.14em] text-ink-muted">
                            {formatContextDate(entry.eventDate ?? entry.createdAt)}
                          </span>
                          <span className="text-[10px] uppercase tracking-[0.14em] text-ink-muted">
                            impacto {getContextImportanceLabel(entry)}
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] font-semibold leading-5 text-on-surface">
                          {entry.title}
                        </p>
                        <p className="mt-1 text-[11px] leading-5 text-on-surface-variant">
                          {entry.summary}
                        </p>
                        {entry.details ? (
                          <p className="mt-2 text-[11px] leading-5 text-on-surface">
                            {entry.details}
                          </p>
                        ) : null}
                        {entry.tags.length ? (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {entry.tags.map((tag) => (
                              <span
                                key={tag}
                                className="rounded-full border border-outline px-2 py-0.5 text-[10px] font-medium text-on-surface-variant"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : !contextError ? (
              <div className="mt-4 rounded-2xl border border-dashed border-outline/70 bg-background px-3 py-4 text-[11px] leading-5 text-on-surface-variant">
                A marca ainda não registrou contexto curado suficiente para preencher esta linha do tempo.
              </div>
            ) : null}
          </div>

          <div className="mt-6 rounded-2xl border border-outline bg-background p-3">
            <SectionHeading
              title="Registrar contexto"
              description="Alimente o Atlas com fatos que expliquem por que a operação mudou."
            />

            <div className="mt-3 space-y-3">
              <FormField label="Tipo">
                <select
                  value={formState.entryType}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      entryType: event.target.value as AtlasContextEntryType,
                    }))
                  }
                  className="brandops-input"
                >
                  {CONTEXT_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField
                label="Título curto"
                hint="Ex.: troca de criativo na campanha de Páscoa, promoção de frete, atraso operacional."
              >
                <input
                  value={formState.title}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  className="brandops-input"
                  placeholder="O que mudou?"
                />
              </FormField>

              <FormField
                label="Resumo"
                hint="Escreva o fato de forma curta para o Atlas lembrar isso ao recomendar."
              >
                <textarea
                  value={formState.summary}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      summary: event.target.value,
                    }))
                  }
                  rows={3}
                  className="brandops-input min-h-[84px] resize-y"
                  placeholder="Explique em 1 ou 2 frases o que aconteceu."
                />
              </FormField>

              <FormField
                label="Detalhe opcional"
                hint="Use para registrar nuances que ajudam o Atlas a não confundir causa com coincidência."
              >
                <textarea
                  value={formState.details}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      details: event.target.value,
                    }))
                  }
                  rows={3}
                  className="brandops-input min-h-[84px] resize-y"
                  placeholder="Ex.: verba redistribuída, troca de oferta, problema de estoque, ajuste de pricing."
                />
              </FormField>

              <FormField label="Data do evento">
                <input
                  type="date"
                  value={formState.eventDate}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      eventDate: event.target.value,
                    }))
                  }
                  className="brandops-input"
                />
              </FormField>

              <button
                type="button"
                onClick={handleCreateContextEntry}
                disabled={
                  isSavingContext ||
                  !formState.title.trim() ||
                  !formState.summary.trim()
                }
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-primary/25 bg-primary px-3 py-2 text-[11px] font-semibold text-on-primary transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSavingContext ? <Loader2 size={13} className="animate-spin" /> : null}
                Registrar no contexto do Atlas
              </button>
            </div>
          </div>

          <Link
            href="/integrations"
            className="mt-5 inline-flex items-center gap-2 rounded-full border border-outline bg-background px-3 py-1.5 text-[11px] font-semibold text-on-surface transition hover:border-secondary/30 hover:text-secondary"
          >
            Ajustar integração Gemini
          </Link>
        </div>
      </div>
    </SurfaceCard>
  );
}
