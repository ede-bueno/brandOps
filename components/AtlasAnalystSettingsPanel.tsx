"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BrainCircuit,
  ChevronDown,
  Loader2,
  Radar,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";
import { useBrandOps } from "./BrandOpsProvider";
import {
  FormField,
  InfoHint,
  InlineNotice,
  SectionHeading,
} from "./ui-shell";
import type {
  AtlasAnalystBehaviorSkill,
  GeminiAvailableModel,
} from "@/lib/brandops/types";
import {
  ATLAS_GEMINI_DEFAULT_MODEL,
  ATLAS_GEMINI_MODEL_SUGGESTIONS,
} from "@/lib/brandops/ai/model-policy";
import { APP_ROUTES } from "@/lib/brandops/routes";

const ANALYSIS_WINDOW_OPTIONS = [7, 14, 30, 60, 90] as const;

const SKILL_OPTIONS: Array<{
  value: AtlasAnalystBehaviorSkill;
  label: string;
  description: string;
}> = [
  {
    value: "auto",
    label: "Auto",
    description:
      "Deixa o Atlas escolher o especialista mais aderente pela pergunta.",
  },
  {
    value: "executive_operator",
    label: "Executivo",
    description: "Prioriza margem, resultado e leitura operacional mais ampla.",
  },
  {
    value: "marketing_performance",
    label: "Marketing",
    description:
      "Puxa mídia, funil e eficiência de campanha para o centro da leitura.",
  },
  {
    value: "revenue_operator",
    label: "Receita",
    description:
      "Enfatiza vendas, densidade comercial, ticket e proteção de receita.",
  },
  {
    value: "pod_strategist",
    label: "POD",
    description: "Foca sortimento, estampa, vitrine e decisão de catálogo.",
  },
];

type FormState = {
  model: string;
  temperature: number;
  analysisWindowDays: number;
  defaultSkill: AtlasAnalystBehaviorSkill;
  operatorGuidance: string;
};

type ModelCatalogResponse = {
  models?: GeminiAvailableModel[];
  error?: string;
};

const DEFAULT_FORM: FormState = {
  model: ATLAS_GEMINI_DEFAULT_MODEL,
  temperature: 0.25,
  analysisWindowDays: 30,
  defaultSkill: "executive_operator",
  operatorGuidance: "",
};

function buildFallbackModel(id: string): GeminiAvailableModel {
  return {
    id,
    displayName: id,
    description: null,
    inputTokenLimit: null,
    outputTokenLimit: null,
    supportsGenerateContent: true,
  };
}

export function AtlasAnalystSettingsPanel() {
  const { activeBrand, activeBrandId, refreshActiveBrand, session } = useBrandOps();
  const [formState, setFormState] = useState<FormState>(DEFAULT_FORM);
  const [notice, setNotice] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [availableModels, setAvailableModels] = useState<GeminiAvailableModel[]>([]);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  const geminiIntegration = useMemo(
    () =>
      activeBrand?.integrations.find((integration) => integration.provider === "gemini") ??
      null,
    [activeBrand?.integrations],
  );
  const isAtlasEnabled = geminiIntegration?.mode === "api";
  const hasBrandApiKey = Boolean(geminiIntegration?.settings.hasApiKey);
  const hasAtlasAiPlanAccess = activeBrand?.governance.featureFlags.atlasAi ?? false;
  const hasGeminiModelCatalogAccess =
    activeBrand?.governance.featureFlags.geminiModelCatalog ?? false;
  const effectiveModel = hasGeminiModelCatalogAccess
    ? formState.model
    : DEFAULT_FORM.model;

  useEffect(() => {
    if (!geminiIntegration) {
      setFormState(DEFAULT_FORM);
      setNotice(null);
      return;
    }

    setFormState({
      model: geminiIntegration.settings.model ?? ATLAS_GEMINI_DEFAULT_MODEL,
      temperature: geminiIntegration.settings.temperature ?? 0.25,
      analysisWindowDays: geminiIntegration.settings.analysisWindowDays ?? 30,
      defaultSkill:
        geminiIntegration.settings.defaultSkill ?? "executive_operator",
      operatorGuidance: geminiIntegration.settings.operatorGuidance ?? "",
    });
    setNotice(null);
  }, [geminiIntegration]);

  const loadAvailableModels = useCallback(async () => {
    if (
      !activeBrandId ||
      !session?.access_token ||
      !hasBrandApiKey ||
      !hasGeminiModelCatalogAccess
    ) {
      setAvailableModels([]);
      setModelsError(null);
      setIsLoadingModels(false);
      return;
    }

    try {
      setIsLoadingModels(true);
      setModelsError(null);

      const response = await fetch(
        `/api/admin/brands/${activeBrandId}/integrations/gemini/models`,
        {
          headers: {
            authorization: `Bearer ${session.access_token}`,
          },
        },
      );

      const payload = (await response.json().catch(() => null)) as
        | ModelCatalogResponse
        | null;

      if (!response.ok) {
        throw new Error(
          payload?.error ??
            "Nao foi possivel listar os modelos disponiveis do Gemini.",
        );
      }

      setAvailableModels(payload?.models ?? []);
    } catch (error) {
      setAvailableModels([]);
      setModelsError(
        error instanceof Error
          ? error.message
          : "Nao foi possivel listar os modelos disponiveis do Gemini.",
      );
    } finally {
      setIsLoadingModels(false);
    }
  }, [
    activeBrandId,
    hasBrandApiKey,
    hasGeminiModelCatalogAccess,
    session?.access_token,
  ]);

  useEffect(() => {
    void loadAvailableModels();
  }, [loadAvailableModels]);

  const modelOptions = useMemo(() => {
    const items = new Map<string, GeminiAvailableModel>();

    availableModels.forEach((model) => {
      items.set(model.id, model);
    });

    ATLAS_GEMINI_MODEL_SUGGESTIONS.forEach((model) => {
      if (!items.has(model)) {
        items.set(model, buildFallbackModel(model));
      }
    });

    if (formState.model && !items.has(formState.model)) {
      items.set(formState.model, buildFallbackModel(formState.model));
    }

    return Array.from(items.values()).sort((left, right) =>
      left.id.localeCompare(right.id),
    );
  }, [availableModels, formState.model]);

  const manualModelSuggestions = useMemo(
    () => Array.from(new Set(ATLAS_GEMINI_MODEL_SUGGESTIONS)),
    [],
  );

  const selectedModel = useMemo(
    () =>
      modelOptions.find((model) => model.id === effectiveModel) ??
      buildFallbackModel(effectiveModel || DEFAULT_FORM.model),
    [effectiveModel, modelOptions],
  );
  const statusNoticeTone: "success" | "warning" | "info" | undefined = notice
    ? notice.kind === "success"
      ? "success"
      : "warning"
    : undefined;
  const statusNotice = useMemo(() => {
    if (notice) {
      return {
        tone: statusNoticeTone ?? "warning",
        icon: notice.kind === "success" ? <SlidersHorizontal size={14} /> : <Radar size={14} />,
        title: null as string | null,
        text: notice.text,
      };
    }

    if (!hasAtlasAiPlanAccess) {
      return {
        tone: "info" as const,
        icon: <Radar size={14} />,
        title: "Atlas IA bloqueado neste plano.",
        text: "Os parâmetros podem ficar prontos aqui, mas a liberação efetiva depende da governança da marca.",
      };
    }

    if (!isAtlasEnabled) {
      return {
        tone: "info" as const,
        icon: <Radar size={14} />,
        title: "Atlas pronto para ativação.",
        text: "Deixe o comportamento configurado aqui e faça a ativação técnica em Integrações.",
      };
    }

    if (!hasGeminiModelCatalogAccess) {
      return {
        tone: "info" as const,
        icon: <BrainCircuit size={14} />,
        title: "Catálogo de modelos bloqueado pelo plano.",
        text: "Temperatura, skill, janela e guia continuam livres; o modelo fica no padrão da plataforma.",
      };
    }

    return null;
  }, [hasAtlasAiPlanAccess, hasGeminiModelCatalogAccess, isAtlasEnabled, notice, statusNoticeTone]);

  async function handleSave() {
    if (!activeBrandId || !session?.access_token) {
      setNotice({
        kind: "error",
        text: "Sessão inválida para salvar os parâmetros do Atlas.",
      });
      return;
    }

    try {
      setIsSaving(true);
      setNotice(null);

      const response = await fetch(
        `/api/admin/brands/${activeBrandId}/integrations/gemini`,
        {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            mode: geminiIntegration?.mode ?? "disabled",
            settings: {
              model: effectiveModel,
              temperature: formState.temperature,
              analysisWindowDays: formState.analysisWindowDays,
              defaultSkill: formState.defaultSkill,
              operatorGuidance: formState.operatorGuidance,
            },
          }),
        },
      );

      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!response.ok) {
        throw new Error(
          payload?.error ??
            "Nao foi possivel salvar os parâmetros do Atlas.",
        );
      }

      await refreshActiveBrand();
      setNotice({
        kind: "success",
        text: "Parâmetros do Atlas atualizados para esta marca.",
      });
    } catch (error) {
      setNotice({
        kind: "error",
        text:
          error instanceof Error
            ? error.message
            : "Nao foi possivel salvar os parâmetros do Atlas.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div id="atlas-ai-settings" className="space-y-4">
      <SectionHeading
        title={
          <span className="flex items-center gap-2">
            Atlas IA
            <InfoHint label="O que é ajustado aqui">
              Modelo, temperatura, janela padrão, skill base e playbook da marca
              vivem aqui. Credenciais e ativação da API continuam em
              Integrações.
            </InfoHint>
          </span>
        }
        description="Defina o comportamento do Atlas desta marca."
        aside={<BrainCircuit size={14} className="text-primary" />}
      />

      <div className="flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
        <span className="rounded-full border border-primary/20 bg-primary-container px-2.5 py-1 text-on-primary-container">
          {hasAtlasAiPlanAccess
            ? isAtlasEnabled
              ? "Atlas IA ativo"
              : "Atlas IA opcional"
            : "Atlas IA bloqueado"}
        </span>
        <span className="rounded-full border border-outline px-2.5 py-1">
          {effectiveModel}
        </span>
        <span className="rounded-full border border-outline px-2.5 py-1">
          temp {formState.temperature.toFixed(2)}
        </span>
        <span className="rounded-full border border-outline px-2.5 py-1">
          {formState.analysisWindowDays} dias
        </span>
      </div>

      {statusNotice ? (
        <InlineNotice tone={statusNotice.tone} icon={statusNotice.icon}>
          {statusNotice.title ? (
            <p className="font-semibold text-on-surface">{statusNotice.title}</p>
          ) : null}
          <p className={`${statusNotice.title ? "mt-1 " : ""}text-[11px] leading-5`}>
            {statusNotice.text}
            {!notice ? (
              <>
                {" "}A leitura histórica da marca fica em{" "}
                <Link href={APP_ROUTES.settingsAtlasLearning} prefetch={false} className="relative z-10 text-secondary hover:underline">
                  Aprender negócio
                </Link>
                .
              </>
            ) : null}
          </p>
        </InlineNotice>
      ) : null}

      <div className="grid gap-3 xl:grid-cols-2">
        <FormField
          label="Modelo Gemini"
          hint="O Atlas tenta listar os modelos reais liberados pela chave desta loja."
        >
          <div className="space-y-3">
            {availableModels.length > 0 ? (
              <select
                value={effectiveModel}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    model: event.target.value,
                  }))
                }
                className="brandops-input"
                disabled={!hasGeminiModelCatalogAccess}
              >
                {modelOptions.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.displayName}
                  </option>
                ))}
              </select>
            ) : (
              <>
                <input
                  list="atlas-gemini-model-suggestions"
                  value={effectiveModel}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      model: event.target.value,
                    }))
                  }
                  className="brandops-input"
                  placeholder={ATLAS_GEMINI_DEFAULT_MODEL}
                  disabled={!hasGeminiModelCatalogAccess}
                />
                <datalist id="atlas-gemini-model-suggestions">
                  {manualModelSuggestions.map((model) => (
                    <option key={model} value={model} />
                  ))}
                </datalist>
              </>
            )}

            <div className="rounded-2xl border border-outline/70 bg-surface-container-low px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold text-on-surface">
                    {selectedModel.displayName}
                  </p>
                  <p className="text-[11px] leading-5 text-on-surface-variant">
                    {selectedModel.description ??
                      "Modelo selecionado para a camada analítica desta marca."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void loadAvailableModels()}
                  disabled={
                    !hasBrandApiKey ||
                    !hasGeminiModelCatalogAccess ||
                    isLoadingModels
                  }
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-outline/70 text-on-surface-variant transition hover:border-secondary/35 hover:text-secondary disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Atualizar lista de modelos Gemini"
                >
                  {isLoadingModels ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <RefreshCw size={13} />
                  )}
                </button>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
                <span className="rounded-full border border-outline bg-background px-2.5 py-1">
                  {availableModels.length > 0
                    ? `${availableModels.length} modelos`
                    : "catálogo parcial"}
                </span>
                {selectedModel.inputTokenLimit ? (
                  <span className="rounded-full border border-outline bg-background px-2.5 py-1">
                    in {selectedModel.inputTokenLimit.toLocaleString("pt-BR")}
                  </span>
                ) : null}
                {selectedModel.outputTokenLimit ? (
                  <span className="rounded-full border border-outline bg-background px-2.5 py-1">
                    out {selectedModel.outputTokenLimit.toLocaleString("pt-BR")}
                  </span>
                ) : null}
              </div>

              <p className="mt-3 text-[11px] leading-5 text-on-surface-variant">
                {hasBrandApiKey
                  ? !hasGeminiModelCatalogAccess
                    ? "O plano atual desta marca nao libera a listagem dinamica de modelos Gemini."
                    : availableModels.length > 0
                    ? "Lista puxada ao vivo da chave Gemini desta loja."
                    : modelsError ??
                      "A chave existe, mas a lista ao vivo ainda nao foi carregada. O Atlas mantém fallback manual."
                  : "Salve a chave Gemini da loja em Integrações para listar os modelos liberados por ela."}
              </p>
            </div>
          </div>
        </FormField>

        <FormField
          label="Temperatura"
          hint="Mais baixa deixa o Atlas mais conservador; mais alta abre espaço para formulação mais exploratória."
        >
          <div className="space-y-3 rounded-2xl border border-outline/70 bg-surface-container-low px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] leading-5 text-on-surface-variant">
                Estilo de resposta
              </span>
              <span className="rounded-full border border-outline bg-background px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-on-surface">
                {formState.temperature.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={formState.temperature}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  temperature: Number(event.target.value),
                }))
              }
              className="w-full accent-[var(--color-primary)]"
            />
            <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.14em] text-ink-muted">
              <span>Mais conservador</span>
              <span>Mais aberto</span>
            </div>
          </div>
        </FormField>

        <FormField
          label="Janela padrão de análise"
          hint="O Atlas usa esta janela quando você não força outro recorte na própria pergunta."
        >
          <select
            value={String(formState.analysisWindowDays)}
            onChange={(event) =>
              setFormState((current) => ({
                ...current,
                analysisWindowDays: Number(event.target.value),
              }))
            }
            className="brandops-input"
          >
            {ANALYSIS_WINDOW_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {value} dias
              </option>
            ))}
          </select>
        </FormField>

        <FormField
          label="Skill padrão"
          hint={
            SKILL_OPTIONS.find((option) => option.value === formState.defaultSkill)
              ?.description ?? "Especialista principal usado pelo Atlas."
          }
        >
          <select
            value={formState.defaultSkill}
            onChange={(event) =>
              setFormState((current) => ({
                ...current,
                defaultSkill: event.target.value as AtlasAnalystBehaviorSkill,
              }))
            }
            className="brandops-input"
          >
            {SKILL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FormField>

        <details className="atlas-soft-section px-4 py-4 xl:col-span-2">
          <summary className="atlas-disclosure-summary list-none">
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
              Guia da marca para o Atlas
            </span>
            <ChevronDown size={15} className="atlas-disclosure-chevron" />
          </summary>
          <div className="mt-4 space-y-3">
            <p className="text-[11px] leading-5 text-on-surface-variant">
              Ensine critérios, restrições e contexto histórico que o Atlas deve priorizar.
            </p>
            <textarea
              value={formState.operatorGuidance}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  operatorGuidance: event.target.value.slice(0, 2400),
                }))
              }
              rows={7}
              className="brandops-input min-h-[168px] resize-y"
              placeholder="Ex.: priorize margem real sobre ROAS, trate promoções agressivas como exceção, sinalize risco de catálogo quando uma campanha depender de poucas estampas..."
            />
          </div>
        </details>
      </div>

      <div className="flex flex-col gap-3 border-t border-outline/60 pt-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[11px] leading-5 text-on-surface-variant">
          A memória operacional da marca fica logo ao lado. Integrações, chave e
          ativação continuam em{" "}
          <Link href={APP_ROUTES.integrations} prefetch={false} className="text-secondary hover:underline">
            Integrações
          </Link>
          .
        </p>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-primary/25 bg-primary px-3 py-2 text-[11px] font-semibold text-on-primary transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? <Loader2 size={13} className="animate-spin" /> : null}
          Salvar parâmetros
        </button>
      </div>
    </div>
  );
}
