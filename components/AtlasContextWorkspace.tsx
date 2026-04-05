"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  Loader2,
  Megaphone,
  NotebookPen,
  Radar,
} from "lucide-react";
import { useBrandOps } from "./BrandOpsProvider";
import { FormField, InfoHint, InlineNotice, SectionHeading } from "./ui-shell";
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

export function AtlasContextWorkspace({
  mode,
  limit = 6,
}: {
  mode: "tower" | "settings";
  limit?: number;
}) {
  const { activeBrand, activeBrandId, session } = useBrandOps();
  const [entries, setEntries] = useState<AtlasContextEntry[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [contextError, setContextError] = useState<string | null>(null);
  const [contextNotice, setContextNotice] = useState<string | null>(null);
  const [isLoadingContext, setIsLoadingContext] = useState(false);
  const [isSavingContext, setIsSavingContext] = useState(false);
  const [formState, setFormState] = useState<ContextFormState>(EMPTY_FORM);

  const geminiIntegration = useMemo(
    () => activeBrand?.integrations.find((integration) => integration.provider === "gemini") ?? null,
    [activeBrand?.integrations],
  );
  const isAtlasAiEnabled = geminiIntegration?.mode === "api";
  const accessToken = session?.access_token ?? null;
  const isSettingsMode = mode === "settings";

  useEffect(() => {
    if (!activeBrandId || !accessToken || !isAtlasAiEnabled) {
      setEntries([]);
      setSummary(null);
      setUpdatedAt(null);
      setContextError(null);
      setContextNotice(null);
      if (isSettingsMode) {
        setFormState(EMPTY_FORM);
      }
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    async function loadAtlasContext() {
      try {
        setIsLoadingContext(true);
        setContextError(null);

        const response = await fetch(`/api/admin/brands/${activeBrandId}/atlas-context?limit=${limit}`, {
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

    void loadAtlasContext();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [accessToken, activeBrandId, isAtlasAiEnabled, isSettingsMode, limit]);

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

      setEntries((current) => [payload, ...current].slice(0, limit));
      setUpdatedAt(payload.eventDate ?? payload.createdAt);
      setSummary("O Atlas passou a considerar esta anotação nas próximas leituras da marca.");
      setContextNotice("Contexto salvo com sucesso.");
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

  if (!activeBrand || !isAtlasAiEnabled) {
    if (!isSettingsMode) {
      return null;
    }

    return (
      <div className="space-y-3">
        <SectionHeading
          title="Memória e aprendizado"
          description="Esta área fica pronta para a marca assim que o Atlas IA estiver ativo."
          aside={<Radar size={14} className="text-primary" />}
        />
        <InlineNotice tone="info">
          <p className="font-semibold text-on-surface">Atlas IA ainda não está ativo para esta loja.</p>
          <p className="mt-1 text-[11px] leading-5">
            Ative o Gemini em{" "}
            <Link href="/integrations" className="text-secondary hover:underline">
              Integrações
            </Link>{" "}
            para começar a alimentar a memória operacional.
          </p>
        </InlineNotice>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SectionHeading
        title={
          <span className="flex items-center gap-2">
            {isSettingsMode ? "Memória e aprendizado" : "Contexto operacional"}
            <InfoHint label="O que entra aqui">
              Registre fatos curtos que ajudam o Atlas a explicar viradas de resultado, mídia, catálogo
              ou operação sem misturar isso com configuração técnica.
            </InfoHint>
          </span>
        }
        description={
          isSettingsMode
            ? "Ensine fatos da marca que devem influenciar a leitura do Atlas no futuro."
            : "Linha do tempo recente que ajuda o Atlas a separar causa real de coincidência."
        }
        aside={
          isLoadingContext ? (
            <Loader2 size={14} className="animate-spin text-primary" />
          ) : (
            <CalendarClock size={14} className="text-primary" />
          )
        }
      />

      {summary ? (
        <div className="rounded-2xl border border-outline/70 bg-surface-container-low px-3 py-3 text-[11px] leading-5 text-on-surface">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                Resumo curado
              </p>
              <p className="mt-1 text-on-surface-variant">{summary}</p>
            </div>
            {updatedAt ? (
              <span className="shrink-0 text-[10px] uppercase tracking-[0.14em] text-ink-muted">
                {formatContextDate(updatedAt)}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      {contextError ? (
        <InlineNotice
          tone="warning"
          icon={<AlertTriangle size={14} />}
        >
          <p className="font-semibold text-on-surface">Contexto ainda indisponível</p>
          <p className="mt-1 text-[11px] leading-5">{contextError}</p>
        </InlineNotice>
      ) : null}

      {contextNotice ? (
        <InlineNotice tone="success">
          <p className="text-[11px] leading-5">{contextNotice}</p>
        </InlineNotice>
      ) : null}

      <div className={isSettingsMode ? "grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_20rem]" : "space-y-3"}>
        <div className="space-y-3">
          {entries.length ? (
            entries.map((entry) => (
              <article key={entry.id} className="atlas-list-row">
                <div className="flex items-start gap-3">
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
                      {(entry.summary || entry.details) ? (
                        <InfoHint label={`Detalhe de ${entry.title}`}>
                          <p className="font-semibold text-on-surface">{entry.title}</p>
                          <p className="mt-1">{entry.summary}</p>
                          {entry.details ? <p className="mt-2 text-on-surface">{entry.details}</p> : null}
                        </InfoHint>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm font-semibold leading-5 text-on-surface">
                      {entry.title}
                    </p>
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
            ))
          ) : !contextError ? (
            <div className="rounded-2xl border border-dashed border-outline/70 bg-background px-3 py-4 text-[11px] leading-5 text-on-surface-variant">
              Ainda não há fatos curados suficientes para preencher esta linha do tempo.
            </div>
          ) : null}

          {!isSettingsMode ? (
            <Link
              href="/settings#atlas-context"
              className="inline-flex items-center gap-2 rounded-full border border-outline bg-background px-3 py-1.5 text-[11px] font-semibold text-on-surface transition hover:border-secondary/30 hover:text-secondary"
            >
              Ajustar memória do Atlas
            </Link>
          ) : null}
        </div>

        {isSettingsMode ? (
          <div id="atlas-context" className="rounded-2xl border border-outline/70 bg-background p-3">
            <SectionHeading
              title="Ensinar o Atlas"
              description="Registre o fato curto. O Atlas usa isso nas próximas leituras."
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

              <FormField label="Título">
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

              <FormField label="Resumo">
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
                  placeholder="Explique em 1 ou 2 frases."
                />
              </FormField>

              <FormField label="Detalhe opcional">
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
                  placeholder="Nuances, causa provável ou decisão tomada."
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
                disabled={isSavingContext || !formState.title.trim() || !formState.summary.trim()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-primary/25 bg-primary px-3 py-2 text-[11px] font-semibold text-on-primary transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSavingContext ? <Loader2 size={13} className="animate-spin" /> : null}
                Salvar no Atlas
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
