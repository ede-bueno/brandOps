"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowUpRight,
  BrainCircuit,
  CheckCircle2,
  Database,
  Link2,
  Loader2,
  PlugZap,
  Radar,
  RefreshCcw,
  ShieldCheck,
} from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { AnalyticsKpiCard } from "@/components/analytics/AnalyticsPrimitives";
import { useBrandOps } from "@/components/BrandOpsProvider";
import {
  FormField,
  InlineNotice,
  PageHeader,
  SectionHeading,
  StackItem,
  SurfaceCard,
} from "@/components/ui-shell";
import Link from "next/link";
import type {
  BrandIntegrationConfig,
  BrandGovernance,
  IntegrationMode,
  IntegrationProvider,
} from "@/lib/brandops/types";
import { getIntegrationTutorial } from "@/lib/brandops/integration-tutorials";

type IntegrationFormState = Record<
  IntegrationProvider,
  {
    mode: IntegrationMode;
    propertyId: string;
    timezone: string;
    adAccountId: string;
    catalogId: string;
    manualFallback: boolean;
    syncWindowDays: string;
    model: string;
    credentialSource: "brand_key";
    hasApiKey: boolean;
    apiKeyHint: string;
  }
>;

function isIntegrationProvider(value: string | null): value is IntegrationProvider {
  return value === "ink" || value === "meta" || value === "ga4" || value === "gemini";
}

function isIntegrationSection(value: string | null): value is "config" | "sync" | "rules" {
  return value === "config" || value === "sync" || value === "rules";
}

const providerLabels: Record<IntegrationProvider, string> = {
  ink: "INK / INCI",
  meta: "Meta Ads",
  ga4: "Google Analytics 4",
  gemini: "Atlas Analyst / Gemini",
};

const providerDescriptions: Record<IntegrationProvider, string> = {
  ink: "Base comercial por CSV.",
  meta: "Mídia paga com fallback manual.",
  ga4: "Tráfego e eventos da propriedade.",
  gemini: "Motor de IA analítica por marca.",
};

const providerEyebrows: Record<IntegrationProvider, string> = {
  ink: "Origem comercial",
  meta: "Aquisição",
  ga4: "Analytics",
  gemini: "Inteligência",
};

const providerIcons: Record<IntegrationProvider, typeof Database> = {
  ink: Database,
  meta: PlugZap,
  ga4: Radar,
  gemini: BrainCircuit,
};

const emptyIntegrationForm: IntegrationFormState = {
  ink: {
    mode: "manual_csv",
    propertyId: "",
    timezone: "America/Sao_Paulo",
    adAccountId: "",
    catalogId: "",
    manualFallback: true,
    syncWindowDays: "30",
    model: "gemini-2.5-flash",
    credentialSource: "brand_key",
    hasApiKey: false,
    apiKeyHint: "",
  },
  meta: {
    mode: "manual_csv",
    propertyId: "",
    timezone: "America/Sao_Paulo",
    adAccountId: "",
    catalogId: "",
    manualFallback: true,
    syncWindowDays: "30",
    model: "gemini-2.5-flash",
    credentialSource: "brand_key",
    hasApiKey: false,
    apiKeyHint: "",
  },
  ga4: {
    mode: "disabled",
    propertyId: "",
    timezone: "America/Sao_Paulo",
    adAccountId: "",
    catalogId: "",
    manualFallback: false,
    syncWindowDays: "30",
    model: "gemini-2.5-flash",
    credentialSource: "brand_key",
    hasApiKey: false,
    apiKeyHint: "",
  },
  gemini: {
    mode: "disabled",
    propertyId: "",
    timezone: "America/Sao_Paulo",
    adAccountId: "",
    catalogId: "",
    manualFallback: false,
    syncWindowDays: "30",
    model: "gemini-2.5-flash",
    credentialSource: "brand_key",
    hasApiKey: false,
    apiKeyHint: "",
  },
};

function toFormState(integrations: BrandIntegrationConfig[]): IntegrationFormState {
  const nextState: IntegrationFormState = structuredClone(emptyIntegrationForm);

  integrations.forEach((integration) => {
    nextState[integration.provider] = {
      mode: integration.mode,
      propertyId: integration.settings.propertyId ?? "",
      timezone: integration.settings.timezone ?? "America/Sao_Paulo",
      adAccountId: integration.settings.adAccountId ?? "",
      catalogId: integration.settings.catalogId ?? "",
      manualFallback:
        integration.settings.manualFallback ?? integration.provider !== "ga4",
      syncWindowDays: String(integration.settings.syncWindowDays ?? 30),
      model: integration.settings.model ?? "gemini-2.5-flash",
      credentialSource: "brand_key",
      hasApiKey: Boolean(integration.settings.hasApiKey),
      apiKeyHint: integration.settings.apiKeyHint ?? "",
    };
  });

  return nextState;
}

function formatSyncLabel(integration?: BrandIntegrationConfig) {
  if (!integration) {
    return "Ainda não configurado";
  }

  if (!integration.lastSyncAt) {
    return "Sem sincronização registrada";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(integration.lastSyncAt));
}

function formatCatalogSyncLabel(integration?: BrandIntegrationConfig) {
  if (!integration?.settings.catalogSyncAt) {
    return "Sem sincronização de catálogo registrada";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(integration.settings.catalogSyncAt));
}

function getModeOptions(provider: IntegrationProvider) {
  if (provider === "ink") {
    return [
      {
        value: "manual_csv",
        label: "Upload manual",
      },
    ] as const;
  }

  if (provider === "ga4") {
    return [
      {
        value: "disabled",
        label: "Desabilitado",
      },
      {
        value: "api",
        label: "API",
      },
    ] as const;
  }

  if (provider === "gemini") {
    return [
      {
        value: "disabled",
        label: "Desabilitado",
      },
      {
        value: "api",
        label: "API",
      },
    ] as const;
  }

  return [
    {
      value: "manual_csv",
      label: "Upload manual",
    },
    {
      value: "api",
      label: "API + fallback manual",
    },
    {
      value: "disabled",
      label: "Desabilitado",
    },
  ] as const;
}

function resolveProviderHealth(
  provider: IntegrationProvider,
  integration: BrandIntegrationConfig | undefined,
  governance: BrandGovernance,
) {
  if (provider === "gemini" && !governance.featureFlags.atlasAi) {
    return {
      label: "Bloqueado pelo plano",
      description: "A camada Atlas IA ainda nao foi liberada para a marca.",
      tone: "warning" as const,
    };
  }

  if (!integration) {
    return {
      label: "Nao configurado",
      description: "Ainda nao ha configuracao salva para este conector.",
      tone: "default" as const,
    };
  }

  if (integration.lastSyncStatus === "error") {
    return {
      label: "Com erro",
      description: integration.lastSyncError ?? "A ultima execucao reportou falha.",
      tone: "warning" as const,
    };
  }

  if (integration.mode === "disabled") {
    return {
      label: "Desligado",
      description: "O conector esta salvo, mas permanece desabilitado.",
      tone: "default" as const,
    };
  }

  if (provider === "ink") {
    return {
      label: "Manual",
      description: "Fluxo manual por CSV, sem dependencia de API.",
      tone: "info" as const,
    };
  }

  const hasCredential = Boolean(integration.settings.hasApiKey);

  if (integration.mode === "api" && !hasCredential) {
    return {
      label: "Credencial pendente",
      description: "A API foi habilitada, mas a credencial da loja ainda nao esta pronta.",
      tone: "warning" as const,
    };
  }

  if (integration.mode === "api") {
    return {
      label: "Operando via API",
      description: "Conector ativo com credencial propria da marca.",
      tone: "positive" as const,
    };
  }

  return {
    label: "Manual",
    description: "A operacao segue em modo manual neste conector.",
    tone: "info" as const,
  };
}

function resolveSuggestedWorkspace(
  integrations: Map<IntegrationProvider, BrandIntegrationConfig>,
  formState: IntegrationFormState,
  governance: BrandGovernance,
) {
  const priorityOrder: IntegrationProvider[] = ["meta", "ga4", "gemini", "ink"];

  for (const provider of priorityOrder) {
    const integration = integrations.get(provider);
    const health = resolveProviderHealth(provider, integration, governance);

    if (health.label === "Com erro") {
      return { provider, section: "sync" as const };
    }

    if (provider !== "ink" && integration?.mode === "api" && !formState[provider].hasApiKey) {
      return { provider, section: "config" as const };
    }

    if (provider === "meta" && integration?.mode === "api") {
      if (!formState.meta.adAccountId || !formState.meta.catalogId) {
        return { provider: "meta" as const, section: "config" as const };
      }
    }

    if (provider === "ga4" && integration?.mode === "api" && !formState.ga4.propertyId) {
      return { provider: "ga4" as const, section: "config" as const };
    }

    if (provider === "gemini" && governance.featureFlags.atlasAi && integration?.mode !== "api") {
      return { provider: "gemini" as const, section: "config" as const };
    }
  }

  const firstOperationalProvider =
    priorityOrder.find((provider) => {
      if (provider === "ink") {
        return true;
      }

      return integrations.get(provider)?.mode === "api";
    }) ?? "ink";

  return {
    provider: firstOperationalProvider,
    section: firstOperationalProvider === "gemini" ? ("config" as const) : ("sync" as const),
  };
}

export default function IntegrationsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const safeSearchParams = useMemo(
    () => searchParams ?? new URLSearchParams(),
    [searchParams],
  );
  const { activeBrand, profile, refreshActiveBrand, session } = useBrandOps();
  const [hydratedIntegrations, setHydratedIntegrations] = useState<BrandIntegrationConfig[]>([]);
  const [formState, setFormState] = useState<IntegrationFormState>(emptyIntegrationForm);
  const [metaApiKey, setMetaApiKey] = useState("");
  const [ga4ApiKey, setGa4ApiKey] = useState("");
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingMetaCredential, setSavingMetaCredential] = useState(false);
  const [savingGa4Credential, setSavingGa4Credential] = useState(false);
  const [savingGemini, setSavingGemini] = useState(false);
  const [clearingMetaKey, setClearingMetaKey] = useState(false);
  const [clearingGa4Key, setClearingGa4Key] = useState(false);
  const [clearingGeminiKey, setClearingGeminiKey] = useState(false);
  const [syncingGa4, setSyncingGa4] = useState(false);
  const [syncingMeta, setSyncingMeta] = useState(false);
  const [syncingCatalog, setSyncingCatalog] = useState(false);
  const [activeProvider, setActiveProvider] = useState<IntegrationProvider>("ink");
  const [activeSection, setActiveSection] = useState<"config" | "sync" | "rules">("config");
  const [workspaceSeedBrandId, setWorkspaceSeedBrandId] = useState<string | null>(null);

  useEffect(() => {
    const providerParam = safeSearchParams.get("provider");
    const sectionParam = safeSearchParams.get("section");

    if (isIntegrationProvider(providerParam) && providerParam !== activeProvider) {
      setActiveProvider(providerParam);
    }

    if (isIntegrationSection(sectionParam) && sectionParam !== activeSection) {
      setActiveSection(sectionParam);
    }
  }, [activeProvider, activeSection, safeSearchParams]);

  useEffect(() => {
    if (!pathname) {
      return;
    }

    const currentProvider = safeSearchParams.get("provider");
    const currentSection = safeSearchParams.get("section");

    if (currentProvider === activeProvider && currentSection === activeSection) {
      return;
    }

    const params = new URLSearchParams(safeSearchParams.toString());
    params.set("provider", activeProvider);
    params.set("section", activeSection);
    const nextUrl = `${pathname}?${params.toString()}`;
    router.replace(nextUrl, { scroll: false });
  }, [activeProvider, activeSection, pathname, router, safeSearchParams]);

  useEffect(() => {
    const nextIntegrations = activeBrand?.integrations ?? [];
    setHydratedIntegrations(nextIntegrations);
    setFormState(toFormState(nextIntegrations));
    setMetaApiKey("");
    setGa4ApiKey("");
    setGeminiApiKey("");
    setNotice(null);
  }, [activeBrand?.id, activeBrand?.integrations]);

  useEffect(() => {
    const brandId = activeBrand?.id;
    const brandIntegrations = activeBrand?.integrations ?? [];
    const accessToken = session?.access_token;

    if (!brandId || !accessToken) {
      return;
    }

    let cancelled = false;

    async function loadHydratedIntegrations() {
      try {
        const response = await fetch(`/api/admin/brands/${brandId}/integrations`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          cache: "no-store",
        });
        const payload = (await response.json()) as {
          integrations?: BrandIntegrationConfig[];
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error ?? "Falha ao carregar integrações.");
        }

        if (!cancelled && payload.integrations) {
          setHydratedIntegrations(payload.integrations);
          setFormState(toFormState(payload.integrations));
        }
      } catch {
        if (!cancelled) {
          setHydratedIntegrations(brandIntegrations);
          setFormState(toFormState(brandIntegrations));
        }
      }
    }

    void loadHydratedIntegrations();

    return () => {
      cancelled = true;
    };
  }, [activeBrand?.id, activeBrand?.integrations, session?.access_token]);

  const integrationsMap = useMemo(
    () =>
      new Map(
        (hydratedIntegrations.length ? hydratedIntegrations : activeBrand?.integrations ?? []).map((integration) => [
          integration.provider,
          integration,
        ]),
      ),
    [activeBrand?.integrations, hydratedIntegrations],
  );
  const suggestedWorkspace = useMemo(() => {
    if (!activeBrand) {
      return {
        provider: "ink" as const,
        section: "config" as const,
      };
    }

    return resolveSuggestedWorkspace(integrationsMap, formState, activeBrand.governance);
  }, [activeBrand, formState, integrationsMap]);

  useEffect(() => {
    if (!activeBrand || workspaceSeedBrandId === activeBrand.id) {
      return;
    }

    const providerParam = safeSearchParams.get("provider");
    const sectionParam = safeSearchParams.get("section");

    if (isIntegrationProvider(providerParam) || isIntegrationSection(sectionParam)) {
      setWorkspaceSeedBrandId(activeBrand.id);
      return;
    }

    setActiveProvider(suggestedWorkspace.provider);
    setActiveSection(suggestedWorkspace.section);
    setWorkspaceSeedBrandId(activeBrand.id);
  }, [activeBrand, safeSearchParams, suggestedWorkspace, workspaceSeedBrandId]);

  if (!activeBrand) {
    return (
      <EmptyState
        title="Nenhuma marca selecionada"
        description="Selecione uma marca para configurar as origens de dados desta operação."
      />
    );
  }

  const geminiFeatureEnabled = activeBrand.governance.featureFlags.atlasAi;

  const canManageIntegrations = profile?.role === "SUPER_ADMIN";
  const canManageCurrentProvider =
    profile?.role === "SUPER_ADMIN" || activeProvider === "gemini";

  const current = integrationsMap.get(activeProvider);
  const currentState = formState[activeProvider];
  const isInternalPlatformViewer = profile?.email?.toLowerCase() === "edbo84@gmail.com";
  const options = getModeOptions(activeProvider);
  const providerHealthSummary = (["ink", "meta", "ga4", "gemini"] as const).map((provider) => {
    const integration = integrationsMap.get(provider);
    const health = resolveProviderHealth(provider, integration, activeBrand.governance);

    return {
      provider,
      integration,
      health,
    };
  });
  const providerContextCard = {
    ink: {
      title: "Origem comercial manual",
      body: `A loja ${activeBrand.name} continua usando importação manual da INK, porque a plataforma não oferece API operacional.`,
      cta: null,
    },
    meta: {
      title: "Fallback e contingência",
      body:
        currentState.mode === "api"
          ? `A ${activeBrand.name} está preparada para operar Meta por API${currentState.manualFallback ? " com contingência manual" : ""}${currentState.catalogId ? " e já possui catálogo vinculado." : "."}`
          : `A ${activeBrand.name} segue em fluxo manual da Meta, com possibilidade de migração futura para API.`,
      cta: null,
    },
    ga4: {
      title: "Propriedade configurada",
      body:
        currentState.propertyId
          ? `A propriedade ${currentState.propertyId} está associada à marca ${activeBrand.name}.`
          : `A marca ${activeBrand.name} ainda não possui Property ID informado para o GA4.`,
      cta: currentState.propertyId ? "/traffic" : null,
    },
    gemini: {
      title: "Especialista analítico da marca",
      body:
        !geminiFeatureEnabled
          ? `O plano atual de ${activeBrand.name} ainda não libera a camada Atlas IA. Libere a capacidade da marca em Acessos antes da configuração técnica.`
          : currentState.mode === "api"
          ? `O Atlas Analyst está habilitado para ${activeBrand.name} com credencial da própria loja.${currentState.hasApiKey ? ` Chave da loja salva em ${currentState.apiKeyHint}.` : ""} O comportamento analítico fica centralizado em Configurações.`
          : `O Atlas Analyst da marca ${activeBrand.name} ainda está desabilitado no painel de integrações.`,
      cta: !geminiFeatureEnabled
        ? "/admin/stores"
        : currentState.mode === "api"
          ? "/settings#atlas-ai-settings"
          : null,
    },
  }[activeProvider];
  const providerNextAction = {
    ink: {
      title: "Próximo movimento",
      description: "Subir novos CSVs da operação e manter o calendário de importação consistente.",
      tone: "default" as const,
    },
    meta: {
      title: "Próximo movimento",
      description:
        currentState.mode === "api"
          ? currentState.hasApiKey
            ? "Confirmar conta de anúncios, catálogo e rodar sync apenas quando houver mudança operacional relevante."
            : "Salvar o token da loja para destravar mídia, catálogo e leituras automáticas."
          : "Decidir quando a operação deve migrar do fluxo manual para API por loja.",
      tone:
        currentState.mode === "api" && !currentState.hasApiKey ? ("warning" as const) : ("default" as const),
    },
    ga4: {
      title: "Próximo movimento",
      description:
        currentState.mode === "api"
          ? currentState.propertyId
            ? "Validar a propriedade e executar sync quando houver nova leitura de tráfego."
            : "Preencher o Property ID da loja para destravar a leitura do funil."
          : "Ativar a conexão por API quando a loja estiver pronta para leitura contínua de tráfego.",
      tone:
        currentState.mode === "api" && !currentState.propertyId ? ("warning" as const) : ("default" as const),
    },
    gemini: {
      title: "Próximo movimento",
      description:
        currentState.hasApiKey
          ? "Manter a chave da loja ativa e ajustar comportamento do Atlas em Configurações."
          : "Salvar a chave Gemini da loja para habilitar Analyst, aprendizado e respostas sob demanda.",
      tone: currentState.hasApiKey ? ("positive" as const) : ("warning" as const),
    },
  }[activeProvider];
  const providerTutorial = getIntegrationTutorial(activeProvider);
  const tutorialHref = providerTutorial?.route ?? "/integrations/tutorials";
  const tutorialCtaLabel =
    activeProvider === "meta"
      ? "Abrir tutorial Meta"
      : activeProvider === "ga4"
        ? "Abrir tutorial GA4"
        : activeProvider === "gemini"
          ? "Abrir tutorial Gemini"
          : "Abrir tutoriais";
  const metaCredentialReady = formState.meta.hasApiKey;
  const ga4CredentialReady = formState.ga4.hasApiKey;
  const noticeText = notice?.text ?? "";
  const isEncryptionKeyNotice = noticeText.includes("BRANDOPS_SECRET_ENCRYPTION_KEY");
  const isPlatformPreparationNotice =
    noticeText.includes("brand_integration_secrets") ||
    noticeText.includes("schema cache") ||
    noticeText.includes("provider_check");
  const isMetaPermissionNotice = noticeText.includes("(#100)");
  const isMetaMissingCredentialNotice =
    activeProvider === "meta" &&
    (noticeText.includes("Nenhum token da Meta foi enviado") ||
      noticeText.includes("Nenhum token próprio da Meta") ||
      noticeText.includes("META_ACCESS_TOKEN não configurada"));
  const isGa4MissingCredentialNotice =
    activeProvider === "ga4" && noticeText.includes("Nenhuma credencial própria do GA4");
  const isGeminiMissingCredentialNotice =
    activeProvider === "gemini" && noticeText.includes("Nenhuma chave própria do Gemini");
  const displayNoticeText =
    notice?.kind === "error" &&
    !isInternalPlatformViewer &&
    (isEncryptionKeyNotice || isPlatformPreparationNotice)
      ? "A plataforma ainda não está pronta para salvar ou operar esta credencial nesta loja. Acione o gestor da plataforma e tente novamente depois."
      : notice?.text ?? null;
  const activeHealth = resolveProviderHealth(activeProvider, current, activeBrand.governance);
  const ActiveProviderIcon = providerIcons[activeProvider];

  function renderHeaderActions() {
    if (activeProvider === "gemini") {
      return (
        <div className="flex flex-wrap gap-2">
          {formState.gemini.hasApiKey ? (
            <button
              type="button"
              onClick={handleClearGeminiKey}
              disabled={!canManageCurrentProvider || !geminiFeatureEnabled || clearingGeminiKey}
              className="brandops-button brandops-button-ghost"
            >
              {clearingGeminiKey ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Removendo chave
                </>
              ) : (
                "Remover chave"
              )}
            </button>
          ) : null}
          <button
            type="button"
            onClick={handleGeminiSave}
            disabled={!canManageCurrentProvider || !geminiFeatureEnabled || savingGemini}
            className="brandops-button brandops-button-primary"
          >
            {savingGemini ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Salvando Gemini
              </>
            ) : (
              "Salvar Gemini"
            )}
          </button>
        </div>
      );
    }

    if (activeProvider === "meta") {
      return (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleSave}
            disabled={!canManageIntegrations || saving}
            className="brandops-button brandops-button-ghost"
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Salvando config
              </>
            ) : (
              "Salvar config"
            )}
          </button>
          {formState.meta.hasApiKey ? (
            <button
              type="button"
              onClick={handleClearMetaKey}
              disabled={!canManageIntegrations || clearingMetaKey}
              className="brandops-button brandops-button-ghost"
            >
              {clearingMetaKey ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Removendo token
                </>
              ) : (
                "Remover token"
              )}
            </button>
          ) : null}
          <button
            type="button"
            onClick={handleMetaCredentialSave}
            disabled={!canManageIntegrations || savingMetaCredential}
            className="brandops-button brandops-button-primary"
          >
            {savingMetaCredential ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Salvando Meta
              </>
            ) : (
              "Salvar credencial"
            )}
          </button>
        </div>
      );
    }

    if (activeProvider === "ga4") {
      return (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleSave}
            disabled={!canManageIntegrations || saving}
            className="brandops-button brandops-button-ghost"
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Salvando config
              </>
            ) : (
              "Salvar config"
            )}
          </button>
          {formState.ga4.hasApiKey ? (
            <button
              type="button"
              onClick={handleClearGa4Key}
              disabled={!canManageIntegrations || clearingGa4Key}
              className="brandops-button brandops-button-ghost"
            >
              {clearingGa4Key ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Removendo credencial
                </>
              ) : (
                "Remover credencial"
              )}
            </button>
          ) : null}
          <button
            type="button"
            onClick={handleGa4CredentialSave}
            disabled={!canManageIntegrations || savingGa4Credential}
            className="brandops-button brandops-button-primary"
          >
            {savingGa4Credential ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Salvando GA4
              </>
            ) : (
              "Salvar credencial"
            )}
          </button>
        </div>
      );
    }

    if (canManageIntegrations) {
      return (
        <button
          onClick={handleSave}
          disabled={saving}
          className="brandops-button brandops-button-primary"
        >
          {saving ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Salvando
            </>
          ) : (
            "Salvar integrações"
          )}
        </button>
      );
    }

    return null;
  }

  function applyIntegrationsPayload(integrations: BrandIntegrationConfig[]) {
    setHydratedIntegrations(integrations);
    setFormState(toFormState(integrations));
  }

  function patchSingleIntegration(integration: BrandIntegrationConfig) {
    const base = hydratedIntegrations.length ? hydratedIntegrations : activeBrand?.integrations ?? [];
    const next = [
      ...base.filter((entry) => entry.provider !== integration.provider),
      integration,
    ].sort((left, right) => left.provider.localeCompare(right.provider));
    setHydratedIntegrations(next);
    setFormState(toFormState(next));
  }

  const handleSave = async () => {
    if (!session?.access_token) {
      setNotice({ kind: "error", text: "Sessão inválida para atualizar integrações." });
      return;
    }

    try {
      setSaving(true);
      setNotice(null);

      const integrations = (["ink", "meta", "ga4"] as const).map((provider) => ({
        provider,
        mode: formState[provider].mode,
        settings:
          provider === "ga4"
            ? {
                propertyId: formState.ga4.propertyId || null,
                timezone: formState.ga4.timezone || "America/Sao_Paulo",
                credentialSource: formState.ga4.credentialSource,
              }
            : provider === "meta"
              ? {
                  adAccountId: formState.meta.adAccountId || null,
                  catalogId: formState.meta.catalogId || null,
                  manualFallback: formState.meta.manualFallback,
                  syncWindowDays: Number(formState.meta.syncWindowDays || 30),
                  credentialSource: formState.meta.credentialSource,
                }
              : {
                  manualFallback: true,
                },
      }));

      const response = await fetch(`/api/admin/brands/${activeBrand.id}/integrations`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ integrations }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Falha ao salvar integrações.");
      }

      if (Array.isArray(payload.integrations)) {
        applyIntegrationsPayload(payload.integrations);
      }
      await refreshActiveBrand();
      setNotice({
        kind: "success",
        text: "Integrações da loja atualizadas com sucesso.",
      });
    } catch (error) {
      setNotice({
        kind: "error",
        text: error instanceof Error ? error.message : "Falha ao salvar integrações.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleGeminiSave = async () => {
    if (!session?.access_token) {
      setNotice({ kind: "error", text: "Sessão inválida para atualizar o Gemini." });
      return;
    }

    if (!geminiFeatureEnabled) {
      setNotice({
        kind: "error",
        text: "O plano atual desta marca ainda nao libera o Atlas IA. Ajuste a governanca da marca em Acessos antes de salvar o Gemini.",
      });
      return;
    }

    if (
      formState.gemini.mode === "api" &&
      formState.gemini.credentialSource === "brand_key" &&
      !formState.gemini.hasApiKey &&
      !geminiApiKey.trim()
    ) {
      setNotice({
        kind: "error",
        text: "Salve uma chave própria do Gemini antes de ativar o modo API por loja.",
      });
      return;
    }

    try {
      setSavingGemini(true);
      setNotice(null);

      const response = await fetch(`/api/admin/brands/${activeBrand.id}/integrations/gemini`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          mode: formState.gemini.mode,
          settings: {
            credentialSource: formState.gemini.credentialSource,
          },
          apiKey: geminiApiKey.trim() || undefined,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Falha ao salvar a integração Gemini.");
      }

      if (payload.integration) {
        patchSingleIntegration(payload.integration);
      }
      await refreshActiveBrand();
      setGeminiApiKey("");
      setNotice({
        kind: "success",
        text: "Integração Gemini atualizada para esta loja.",
      });
    } catch (error) {
      setNotice({
        kind: "error",
        text:
          error instanceof Error
            ? error.message
            : "Falha ao salvar a integração Gemini.",
      });
    } finally {
      setSavingGemini(false);
    }
  };

  const handleClearGeminiKey = async () => {
    if (!session?.access_token) {
      setNotice({ kind: "error", text: "Sessão inválida para remover a chave do Gemini." });
      return;
    }

    if (!geminiFeatureEnabled) {
      setNotice({
        kind: "error",
        text: "O plano atual desta marca ainda nao libera o Atlas IA. Ajuste a governanca da marca em Acessos antes de operar o Gemini.",
      });
      return;
    }

    try {
      setClearingGeminiKey(true);
      setNotice(null);

      const nextCredentialSource = "brand_key" as const;

      const response = await fetch(`/api/admin/brands/${activeBrand.id}/integrations/gemini`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          mode: formState.gemini.mode,
          settings: {
            credentialSource: nextCredentialSource,
          },
          clearApiKey: true,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Falha ao remover a chave do Gemini.");
      }

      if (payload.integration) {
        patchSingleIntegration(payload.integration);
      }
      await refreshActiveBrand();
      setGeminiApiKey("");
      setNotice({
        kind: "success",
        text: "Chave própria do Gemini removida desta loja.",
      });
    } catch (error) {
      setNotice({
        kind: "error",
        text:
          error instanceof Error
            ? error.message
            : "Falha ao remover a chave do Gemini.",
      });
    } finally {
      setClearingGeminiKey(false);
    }
  };

  const handleMetaCredentialSave = async () => {
    if (!session?.access_token) {
      setNotice({ kind: "error", text: "Sessão inválida para atualizar a credencial da Meta." });
      return;
    }

    if (
      formState.meta.mode === "api" &&
      formState.meta.credentialSource === "brand_key" &&
      !formState.meta.hasApiKey &&
      !metaApiKey.trim()
    ) {
      setNotice({
        kind: "error",
        text: "Salve um token próprio da Meta antes de ativar o modo API por loja.",
      });
      return;
    }

    try {
      setSavingMetaCredential(true);
      setNotice(null);

      const response = await fetch(
        `/api/admin/brands/${activeBrand.id}/integrations/meta/credentials`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            mode: formState.meta.mode,
            settings: {
              credentialSource: formState.meta.credentialSource,
            },
            apiKey: metaApiKey.trim() || undefined,
          }),
        },
      );
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Falha ao salvar a credencial da Meta.");
      }

      if (payload.integration) {
        patchSingleIntegration(payload.integration);
      }
      await refreshActiveBrand();
      setMetaApiKey("");
      setNotice({
        kind: "success",
        text: "Credencial da Meta atualizada para esta loja.",
      });
    } catch (error) {
      setNotice({
        kind: "error",
        text:
          error instanceof Error
            ? error.message
            : "Falha ao salvar a credencial da Meta.",
      });
    } finally {
      setSavingMetaCredential(false);
    }
  };

  const handleClearMetaKey = async () => {
    if (!session?.access_token) {
      setNotice({ kind: "error", text: "Sessão inválida para remover o token da Meta." });
      return;
    }

    try {
      setClearingMetaKey(true);
      setNotice(null);

      const nextCredentialSource = "brand_key" as const;

      const response = await fetch(
        `/api/admin/brands/${activeBrand.id}/integrations/meta/credentials`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            mode: formState.meta.mode,
            settings: {
              credentialSource: nextCredentialSource,
            },
            clearApiKey: true,
          }),
        },
      );
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Falha ao remover o token da Meta.");
      }

      if (payload.integration) {
        patchSingleIntegration(payload.integration);
      }
      await refreshActiveBrand();
      setMetaApiKey("");
      setNotice({
        kind: "success",
        text: "Token próprio da Meta removido desta loja.",
      });
    } catch (error) {
      setNotice({
        kind: "error",
        text:
          error instanceof Error
            ? error.message
            : "Falha ao remover o token da Meta.",
      });
    } finally {
      setClearingMetaKey(false);
    }
  };

  const handleGa4CredentialSave = async () => {
    if (!session?.access_token) {
      setNotice({ kind: "error", text: "Sessão inválida para atualizar a credencial do GA4." });
      return;
    }

    if (
      formState.ga4.mode === "api" &&
      formState.ga4.credentialSource === "brand_key" &&
      !formState.ga4.hasApiKey &&
      !ga4ApiKey.trim()
    ) {
      setNotice({
        kind: "error",
        text: "Salve o JSON da credencial do GA4 antes de ativar o modo API por loja.",
      });
      return;
    }

    try {
      setSavingGa4Credential(true);
      setNotice(null);

      const response = await fetch(
        `/api/admin/brands/${activeBrand.id}/integrations/ga4/credentials`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            mode: formState.ga4.mode,
            settings: {
              credentialSource: formState.ga4.credentialSource,
            },
            apiKey: ga4ApiKey.trim() || undefined,
          }),
        },
      );
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Falha ao salvar a credencial do GA4.");
      }

      if (payload.integration) {
        patchSingleIntegration(payload.integration);
      }
      await refreshActiveBrand();
      setGa4ApiKey("");
      setNotice({
        kind: "success",
        text: "Credencial do GA4 atualizada para esta loja.",
      });
    } catch (error) {
      setNotice({
        kind: "error",
        text:
          error instanceof Error
            ? error.message
            : "Falha ao salvar a credencial do GA4.",
      });
    } finally {
      setSavingGa4Credential(false);
    }
  };

  const handleClearGa4Key = async () => {
    if (!session?.access_token) {
      setNotice({ kind: "error", text: "Sessão inválida para remover a credencial do GA4." });
      return;
    }

    try {
      setClearingGa4Key(true);
      setNotice(null);

      const nextCredentialSource = "brand_key" as const;

      const response = await fetch(
        `/api/admin/brands/${activeBrand.id}/integrations/ga4/credentials`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            mode: formState.ga4.mode,
            settings: {
              credentialSource: nextCredentialSource,
            },
            clearApiKey: true,
          }),
        },
      );
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Falha ao remover a credencial do GA4.");
      }

      if (payload.integration) {
        patchSingleIntegration(payload.integration);
      }
      await refreshActiveBrand();
      setGa4ApiKey("");
      setNotice({
        kind: "success",
        text: "Credencial própria do GA4 removida desta loja.",
      });
    } catch (error) {
      setNotice({
        kind: "error",
        text:
          error instanceof Error
            ? error.message
            : "Falha ao remover a credencial do GA4.",
      });
    } finally {
      setClearingGa4Key(false);
    }
  };

  const handleGa4Sync = async () => {
    if (!session?.access_token) {
      setNotice({ kind: "error", text: "Sessão inválida para sincronizar o GA4." });
      return;
    }

    try {
      setSyncingGa4(true);
      setNotice(null);

      const response = await fetch(`/api/admin/brands/${activeBrand.id}/integrations/ga4/sync`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Falha ao sincronizar o GA4.");
      }

      await refreshActiveBrand();
      setNotice({
        kind: "success",
        text: `GA4 sincronizado com sucesso. ${payload.rows} linha(s) consolidadas de ${payload.startDate} até ${payload.endDate}.`,
      });
    } catch (error) {
      setNotice({
        kind: "error",
        text: error instanceof Error ? error.message : "Falha ao sincronizar o GA4.",
      });
    } finally {
      setSyncingGa4(false);
    }
  };

  const handleMetaSync = async () => {
    if (!session?.access_token) {
      setNotice({ kind: "error", text: "Sessão inválida para sincronizar a Meta." });
      return;
    }

    try {
      setSyncingMeta(true);
      setNotice(null);

      const response = await fetch(`/api/admin/brands/${activeBrand.id}/integrations/meta/sync`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Falha ao sincronizar a Meta.");
      }

      await refreshActiveBrand();
      setNotice({
        kind: "success",
        text: `Meta sincronizada com sucesso. ${payload.rows} linha(s) consolidadas de ${payload.startDate} até ${payload.endDate}.`,
      });
    } catch (error) {
      setNotice({
        kind: "error",
        text: error instanceof Error ? error.message : "Falha ao sincronizar a Meta.",
      });
    } finally {
      setSyncingMeta(false);
    }
  };

  const handleMetaCatalogSync = async () => {
    if (!session?.access_token) {
      setNotice({ kind: "error", text: "Sessão inválida para sincronizar o catálogo da Meta." });
      return;
    }

    try {
      setSyncingCatalog(true);
      setNotice(null);

      const response = await fetch(`/api/admin/brands/${activeBrand.id}/integrations/meta/catalog-sync`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Falha ao sincronizar o catálogo da Meta.");
      }

      await refreshActiveBrand();
      setNotice({
        kind: "success",
        text: `Catálogo da Meta sincronizado com sucesso. ${payload.rows} item(ns), ${payload.inserted} novo(s), ${payload.updated} atualizado(s) e ${payload.deleted} removido(s) da fonte Meta.`,
      });
    } catch (error) {
      setNotice({
        kind: "error",
        text: error instanceof Error ? error.message : "Falha ao sincronizar o catálogo da Meta.",
      });
    } finally {
      setSyncingCatalog(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Configuração por loja"
        title="Integrações"
        description="Conecte cada fonte sem espalhar configuração. Escolha o conector, ajuste a origem e opere tudo no mesmo workspace."
        badge={
          <span className="atlas-entity-chip">
            <span className="font-semibold">{activeBrand.name}</span>
            <span className="text-on-surface-variant">workspace ativo</span>
          </span>
        }
        actions={renderHeaderActions()}
      />

      {notice ? (
        <InlineNotice
          tone={notice.kind === "success" ? "success" : "error"}
          icon={notice.kind === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          className="text-sm"
        >
          <span>{displayNoticeText}</span>
        </InlineNotice>
      ) : null}

      {isEncryptionKeyNotice ? (
        <InlineNotice tone="warning" icon={<ShieldCheck size={18} />} className="text-sm">
          {isInternalPlatformViewer ? (
            <div className="space-y-1">
              <p>
                O Atlas precisa da <span className="font-semibold">BRANDOPS_SECRET_ENCRYPTION_KEY</span> no ambiente da
                Vercel para criptografar segredos por marca.
              </p>
              <p className="text-on-surface-variant">
                Em <span className="font-semibold">Project Settings &gt; Environment Variables</span>, cadastre essa env em
                <span className="font-semibold"> Production</span>, <span className="font-semibold">Preview</span> e
                <span className="font-semibold"> Development</span>, depois faça um novo deploy.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <p>Falta uma preparação da plataforma antes que esta credencial possa ser usada na loja.</p>
              <p className="text-on-surface-variant">
                Acione o gestor da plataforma e tente novamente depois da regularização do ambiente.
              </p>
            </div>
          )}
        </InlineNotice>
      ) : null}

      {isPlatformPreparationNotice && !isEncryptionKeyNotice ? (
        <InlineNotice tone="warning" icon={<ShieldCheck size={18} />} className="text-sm">
          <div className="space-y-1">
            <p>Esta integração depende de uma preparação técnica da plataforma que ainda não foi concluída.</p>
            <p className="text-on-surface-variant">
              Se você é operador da loja, acione o gestor da plataforma. Se você é o gestor técnico, revise migrations e
              preparo do banco.
            </p>
          </div>
        </InlineNotice>
      ) : null}

      {isMetaMissingCredentialNotice ? (
        <InlineNotice tone="warning" icon={<Link2 size={18} />} className="text-sm">
          <div className="space-y-1">
            <p>A sincronização da Meta agora depende do token próprio salvo na loja atual.</p>
            <p className="text-on-surface-variant">
              Salve a credencial desta marca e depois tente sincronizar de novo. O Atlas não usa mais a env global da
              plataforma como caminho principal.
            </p>
          </div>
        </InlineNotice>
      ) : null}

      {isMetaPermissionNotice ? (
        <InlineNotice tone="warning" icon={<AlertCircle size={18} />} className="text-sm">
          <div className="space-y-1">
            <p>O token da Meta existe, mas o app ou o usuário não têm permissão suficiente para a API do catálogo.</p>
            <p className="text-on-surface-variant">
              Revise as capacidades do app no Meta for Developers, o acesso ao catálogo no Business Manager e as
              permissões do token usado por esta loja.
            </p>
          </div>
        </InlineNotice>
      ) : null}

      {isGa4MissingCredentialNotice || isGeminiMissingCredentialNotice ? (
        <InlineNotice tone="info" icon={<Radar size={18} />} className="text-sm">
          <div className="space-y-1">
            <p>Esta integração só fica operacional quando a credencial própria da marca é salva com sucesso.</p>
            <p className="text-on-surface-variant">
              Se precisar de um passo a passo completo, abra o{" "}
              <Link href={tutorialHref} className="font-semibold text-primary underline underline-offset-4">
                tutorial detalhado desta integração
              </Link>.
            </p>
          </div>
        </InlineNotice>
      ) : null}

      {activeProvider === "gemini" && !geminiFeatureEnabled ? (
        <InlineNotice tone="warning" icon={<AlertCircle size={18} />} className="text-sm">
          <div className="space-y-1">
            <p className="font-semibold">O plano atual desta marca ainda não libera o Atlas IA.</p>
                <p className="text-on-surface-variant">
                  Primeiro ajuste a governança em <Link href="/admin/stores" className="font-semibold text-primary underline underline-offset-4">Acessos</Link>. Depois disso, a configuração técnica do Gemini volta a ficar operacional.
                </p>
          </div>
        </InlineNotice>
      ) : null}

      {!canManageIntegrations ? (
        <InlineNotice tone="info" icon={<ShieldCheck size={18} />} className="text-sm text-on-surface">
          <span>
            {activeProvider === "gemini"
              ? geminiFeatureEnabled
                ? "Você pode configurar a credencial Gemini da sua própria loja sem expor a chave na interface."
                : "A credencial Gemini continua isolada por loja, mas esta marca ainda não tem a camada Atlas IA liberada."
              : "Você pode acompanhar o status e executar as sincronizações da sua loja. Alterações de configuração seguem restritas ao superadmin."}
          </span>
        </InlineNotice>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[17rem_minmax(0,1fr)]">
        <SurfaceCard className="atlas-integration-nav p-3.5 xl:sticky xl:top-4 self-start">
          <SectionHeading
            title="Conexões da loja"
            description="Selecione a frente operacional e entre direto no ponto que pede ação."
          />
          <div className="mt-4 space-y-2">
            {providerHealthSummary.map(({ provider, integration, health }) => {
              const ProviderIcon = providerIcons[provider];
              return (
                <button
                  key={provider}
                  type="button"
                  data-active={activeProvider === provider}
                  onClick={() => setActiveProvider(provider)}
                  className="atlas-integration-provider-button"
                >
                  <div className="atlas-integration-provider-head">
                    <span className="atlas-integration-provider-icon">
                      <ProviderIcon size={15} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-on-surface">{providerLabels[provider]}</p>
                      <p className="text-[11px] uppercase tracking-[0.16em] text-ink-muted">
                        {providerEyebrows[provider]}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <span className="atlas-soft-pill">{health.label}</span>
                    <span className="text-[11px] text-on-surface-variant">{formatSyncLabel(integration)}</span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-4 border-t border-outline/50 pt-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
              Centro rápido
            </p>
            <div className="mt-3 space-y-2">
              <Link href={tutorialHref} className="brandops-button brandops-button-ghost w-full justify-between">
                {tutorialCtaLabel}
                <ArrowUpRight size={14} />
              </Link>
              {providerContextCard.cta ? (
                <Link
                  href={providerContextCard.cta}
                  className="brandops-button brandops-button-ghost w-full justify-between"
                >
                  Abrir painel relacionado
                  <ArrowUpRight size={14} />
                </Link>
              ) : null}
            </div>
          </div>
        </SurfaceCard>

        <SurfaceCard className="atlas-integration-shell p-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <p className="eyebrow mb-2">{providerEyebrows[activeProvider]}</p>
              <div className="flex items-center gap-3">
                <span className="atlas-integration-hero-icon">
                  <ActiveProviderIcon size={18} />
                </span>
                <div className="min-w-0">
                  <h2 className="text-xl font-semibold tracking-tight text-on-surface">
                    {providerLabels[activeProvider]}
                  </h2>
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-on-surface-variant">
                    {providerDescriptions[activeProvider]}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="atlas-soft-pill">
                {currentState.mode === "api"
                  ? "API"
                  : currentState.mode === "disabled"
                    ? "Desligado"
                    : "Manual"}
              </span>
              <span className="atlas-soft-pill">{activeHealth.label}</span>
            </div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            <AnalyticsKpiCard
              label="Modo"
              value={
                currentState.mode === "api"
                  ? "API ativa"
                  : currentState.mode === "disabled"
                    ? "Integração desligada"
                    : "Fluxo manual"
              }
              description="Como este conector está operando agora."
              tone={
                currentState.mode === "api"
                  ? "positive"
                  : currentState.mode === "disabled"
                    ? "warning"
                    : "default"
              }
            />
            <AnalyticsKpiCard
              label="Credencial"
              value={
                activeProvider === "ink"
                  ? "N/A"
                  : currentState.hasApiKey
                    ? "Loja pronta"
                    : "Pendente"
              }
              description={
                activeProvider === "ink"
                  ? "A origem comercial segue por CSV."
                  : currentState.hasApiKey
                    ? `Segredo salvo em ${currentState.apiKeyHint || "ambiente seguro"}.`
                    : "Falta salvar a credencial da loja."
              }
              tone={activeProvider === "ink" ? "info" : currentState.hasApiKey ? "positive" : "warning"}
            />
            <AnalyticsKpiCard
              label="Última referência"
              value={formatSyncLabel(current)}
              description="Último sync conhecido ou estado operacional mais recente deste conector."
              tone={
                current?.lastSyncStatus === "error"
                  ? "warning"
                  : current?.lastSyncStatus === "success"
                    ? "positive"
                    : "default"
              }
            />
          </div>

          <div className="mt-4 brandops-subtabs overflow-x-auto">
            <button
              type="button"
              className="brandops-subtab"
              data-active={activeSection === "config"}
              onClick={() => setActiveSection("config")}
            >
              Conexão
            </button>
            <button
              type="button"
              className="brandops-subtab"
              data-active={activeSection === "sync"}
              onClick={() => setActiveSection("sync")}
            >
              Sync
            </button>
            <button
              type="button"
              className="brandops-subtab"
              data-active={activeSection === "rules"}
              onClick={() => setActiveSection("rules")}
            >
              Diretrizes
            </button>
          </div>
        </SurfaceCard>
      </section>

      <section className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_21rem]">
        <SurfaceCard className="atlas-integration-workspace p-4">
          <div className="flex flex-col gap-4 border-b border-outline/50 pb-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="eyebrow mb-2">
                {activeSection === "config"
                  ? "Conexão"
                  : activeSection === "sync"
                    ? "Execução"
                    : "Diretrizes"}
              </p>
              <h2 className="text-xl font-semibold text-on-surface">
                {activeSection === "config"
                  ? "Ajuste técnico da integração"
                  : activeSection === "sync"
                    ? "Operação e sincronização"
                    : "Modelo operacional"}
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-on-surface-variant">
                {activeSection === "config"
                  ? "Defina origem, identificadores e credenciais da loja sem sair deste workspace."
                  : activeSection === "sync"
                    ? "Acompanhe o estado da fonte e rode sincronizações sob demanda."
                    : "Revise as regras desta integração e o encaixe dela no Atlas."}
              </p>
            </div>
            <span className="atlas-soft-pill">{current?.lastSyncStatus ?? activeHealth.label}</span>
          </div>

          <div className="mt-5 space-y-5">
            {activeSection === "config" ? (
            <div className="brandops-command-slab p-4 sm:p-5">
              <div className="brandops-toolbar-grid" data-columns="2">
                <FormField label="Origem principal" className="text-sm lg:col-span-2">
                  <select
                    value={currentState.mode}
                    onChange={(event) =>
                      setFormState((previous) => ({
                        ...previous,
                        [activeProvider]: {
                          ...previous[activeProvider],
                          mode: event.target.value as IntegrationMode,
                        },
                      }))
                    }
                    className="brandops-input w-full"
                    disabled={!canManageIntegrations}
                  >
                    {options.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </FormField>

                {activeProvider === "meta" ? (
                  <>
                    <FormField label="Credencial ativa" className="text-sm">
                      <div className="atlas-soft-subcard px-4 py-3 text-sm leading-6 text-on-surface">
                        Token da própria loja. O Atlas salva esse segredo criptografado no backend e usa a credencial da
                        marca atual nas sincronizações.
                      </div>
                    </FormField>
                    <FormField label="ID da conta de anúncios" className="text-sm">
                      <input
                        value={currentState.adAccountId}
                        onChange={(event) =>
                          setFormState((previous) => ({
                            ...previous,
                            meta: {
                              ...previous.meta,
                              adAccountId: event.target.value,
                            },
                          }))
                        }
                        className="brandops-input w-full"
                        placeholder="act_1234567890"
                        disabled={!canManageIntegrations}
                      />
                    </FormField>
                    <FormField label="Janela padrão de sync (dias)" className="text-sm">
                      <input
                        type="number"
                        min={1}
                        max={365}
                        value={currentState.syncWindowDays}
                        onChange={(event) =>
                          setFormState((previous) => ({
                            ...previous,
                            meta: {
                              ...previous.meta,
                              syncWindowDays: event.target.value,
                            },
                          }))
                        }
                        className="brandops-input w-full"
                        disabled={!canManageIntegrations}
                      />
                    </FormField>
                    <FormField label="Token da Meta" className="text-sm lg:col-span-2">
                      <div className="space-y-3">
                        <input
                          type="password"
                          value={metaApiKey}
                          onChange={(event) => setMetaApiKey(event.target.value)}
                          className="brandops-input w-full"
                          placeholder={
                            currentState.hasApiKey
                              ? `Token salvo (${currentState.apiKeyHint || "oculto"})`
                              : "Cole aqui o token da API da Meta"
                          }
                          disabled={!canManageIntegrations}
                        />
                        <div className="atlas-soft-subcard px-4 py-3 text-xs leading-5 text-on-surface-variant">
                          <p>
                            {currentState.hasApiKey
                              ? `Token próprio salvo em ${currentState.apiKeyHint}. Se você preencher o campo acima, o token atual será substituído.`
                              : "Salve aqui o token próprio da loja. Ele fica criptografado no backend e não volta em texto aberto para a interface."}
                          </p>
                        </div>
                      </div>
                    </FormField>
                    <FormField label="ID do catálogo da Meta" className="text-sm lg:col-span-2">
                      <input
                        value={currentState.catalogId}
                        onChange={(event) =>
                          setFormState((previous) => ({
                            ...previous,
                            meta: {
                              ...previous.meta,
                              catalogId: event.target.value,
                            },
                          }))
                        }
                        className="brandops-input w-full"
                        placeholder="2384xxxxxxxxxx"
                        disabled={!canManageIntegrations}
                      />
                    </FormField>
                    <label className="atlas-soft-subcard flex items-start gap-3 p-4 text-sm text-on-surface-variant lg:col-span-2">
                      <input
                        type="checkbox"
                        checked={currentState.manualFallback}
                        onChange={(event) =>
                          setFormState((previous) => ({
                            ...previous,
                            meta: {
                              ...previous.meta,
                              manualFallback: event.target.checked,
                            },
                          }))
                        }
                        className="mt-1"
                        disabled={!canManageIntegrations}
                      />
                      <span>
                        Manter upload manual da Meta como contingência mesmo com a API ligada.
                      </span>
                    </label>
                  </>
                ) : null}

                {activeProvider === "ga4" ? (
                  <>
                    <FormField label="Credencial ativa" className="text-sm">
                      <div className="atlas-soft-subcard px-4 py-3 text-sm leading-6 text-on-surface">
                        JSON da própria loja. O Atlas usa a service account vinculada a esta marca para consultar a
                        propriedade GA4.
                      </div>
                    </FormField>
                    <FormField label="Property ID do GA4" className="text-sm">
                      <input
                        value={currentState.propertyId}
                        onChange={(event) =>
                          setFormState((previous) => ({
                            ...previous,
                            ga4: {
                              ...previous.ga4,
                              propertyId: event.target.value,
                            },
                          }))
                        }
                        className="brandops-input w-full"
                        placeholder="506034252"
                        disabled={!canManageIntegrations}
                      />
                    </FormField>
                    <FormField label="Timezone da propriedade" className="text-sm">
                      <input
                        value={currentState.timezone}
                        onChange={(event) =>
                          setFormState((previous) => ({
                            ...previous,
                            ga4: {
                              ...previous.ga4,
                              timezone: event.target.value,
                            },
                          }))
                        }
                        className="brandops-input w-full"
                        placeholder="America/Sao_Paulo"
                        disabled={!canManageIntegrations}
                      />
                    </FormField>
                    <FormField label="JSON da credencial do GA4" className="text-sm lg:col-span-2">
                      <div className="space-y-3">
                        <textarea
                          value={ga4ApiKey}
                          onChange={(event) => setGa4ApiKey(event.target.value)}
                          className="brandops-input min-h-[160px] w-full resize-y"
                          placeholder={
                            currentState.hasApiKey
                              ? `Credencial salva (${currentState.apiKeyHint || "oculta"})`
                              : "Cole aqui o JSON da service account do GA4"
                          }
                          disabled={!canManageIntegrations}
                        />
                        <div className="atlas-soft-subcard px-4 py-3 text-xs leading-5 text-on-surface-variant">
                          <p>
                            {currentState.hasApiKey
                              ? `Credencial própria salva em ${currentState.apiKeyHint}. Se você preencher o campo acima, o JSON atual será substituído.`
                              : "Salve aqui o JSON da service account da loja. Ele fica criptografado no backend e não retorna em texto aberto para a interface."}
                          </p>
                        </div>
                      </div>
                    </FormField>
                  </>
                ) : null}

                {activeProvider === "gemini" ? (
                  <>
                    <FormField label="Credencial ativa" className="text-sm">
                      <div className="atlas-soft-subcard px-4 py-3 text-sm leading-6 text-on-surface">
                        Chave da própria loja. O Atlas Analyst usa a API key salva para esta marca e mantém o segredo
                        fora da interface.
                      </div>
                    </FormField>
                    <FormField label="Central estratégica do Atlas" className="text-sm">
                      <div className="atlas-soft-subcard px-4 py-3 text-sm leading-6 text-on-surface">
                        Modelo, temperatura, skill padrão, janela de análise e guia da marca agora ficam na{" "}
                        <Link href="/settings#atlas-ai-settings" className="text-secondary hover:underline">
                          Central de Configurações
                        </Link>
                        .
                      </div>
                    </FormField>
                    <FormField label="Nova chave Gemini da loja" className="text-sm lg:col-span-2">
                      <div className="space-y-3">
                        <input
                          type="password"
                          value={geminiApiKey}
                          onChange={(event) => setGeminiApiKey(event.target.value)}
                          className="brandops-input w-full"
                          placeholder={
                            currentState.hasApiKey
                              ? `Chave salva (${currentState.apiKeyHint || "oculta"})`
                              : "Cole aqui a chave da API Gemini"
                          }
                          disabled={!canManageCurrentProvider}
                        />
                        <div className="atlas-soft-subcard px-4 py-3 text-xs leading-5 text-on-surface-variant">
                          {currentState.hasApiKey ? (
                            <p>
                              Chave própria salva para esta loja em{" "}
                              <span className="font-semibold text-on-surface">
                                {currentState.apiKeyHint}
                              </span>
                              . Se você preencher o campo acima, a chave atual será substituída.
                            </p>
                          ) : (
                            <p>
                              A chave digitada aqui é salva criptografada no backend e nunca volta em texto aberto para a interface.
                            </p>
                          )}
                        </div>
                      </div>
                    </FormField>
                  </>
                ) : null}
              </div>
            </div>
            ) : null}

            {activeSection === "sync" ? (
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
                <div className="brandops-toolbar-panel text-sm text-on-surface-variant">
                  {activeProvider === "gemini" ? (
                    <>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-on-surface">Status da credencial</p>
                          <p className="mt-1">
                            {currentState.hasApiKey
                              ? `Chave própria salva em ${currentState.apiKeyHint}.`
                              : "Nenhuma chave própria salva para esta loja."}
                          </p>
                        </div>
                        <span className="status-chip">
                          {currentState.mode === "api" ? "agent ready" : "disabled"}
                        </span>
                      </div>
                      <div className="mt-4 border-t border-outline/50 pt-4">
                        <p className="font-medium text-on-surface">Leitura operacional</p>
                        <p className="mt-1 leading-6">
                          O Gemini não faz sync em lote. Ele só entra em ação quando o operador chama o Atlas, sempre sobre relatórios internos já consolidados.
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-4">
                      {activeProvider === "meta" || activeProvider === "ga4" ? (
                        <div className="atlas-soft-subcard px-4 py-3">
                          <p className="font-medium text-on-surface">Status da credencial</p>
                          <p className="mt-1">
                            {currentState.hasApiKey
                              ? `${activeProvider === "meta" ? "Token" : "Credencial"} própria salva em ${currentState.apiKeyHint}.`
                              : `Nenhuma ${activeProvider === "meta" ? "token" : "credencial"} própria salva para esta loja.`}
                          </p>
                        </div>
                      ) : null}
                      <div className="atlas-soft-subcard px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-medium text-on-surface">Última sincronização</p>
                            <p className="mt-1">{formatSyncLabel(current)}</p>
                          </div>
                          <span className="status-chip">{current?.lastSyncStatus ?? "idle"}</span>
                        </div>
                        {current?.lastSyncError ? (
                          <div className="mt-3 rounded-xl border border-error/12 bg-error/8 px-4 py-3 text-error">
                            {current.lastSyncError}
                          </div>
                        ) : null}
                      </div>
                      {activeProvider === "meta" ? (
                        <div className="atlas-soft-subcard px-4 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-medium text-on-surface">Sincronização do catálogo</p>
                              <p className="mt-1">{formatCatalogSyncLabel(current)}</p>
                            </div>
                            <span className="status-chip">
                              {current?.settings.catalogSyncStatus ?? "idle"}
                            </span>
                          </div>
                          {current?.settings.catalogProductCount ? (
                            <p className="mt-2 text-xs text-on-surface-variant">
                              {current.settings.catalogProductCount} item(ns) consolidados da fonte Meta.
                            </p>
                          ) : null}
                          {current?.settings.catalogSyncError ? (
                            <div className="mt-3 rounded-xl border border-error/12 bg-error/8 px-4 py-3 text-error">
                              {current.settings.catalogSyncError}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>

                <div className="brandops-toolbar-panel text-sm text-on-surface-variant">
                  <p className="font-medium text-on-surface">Executar agora</p>
                  <p className="mt-1 leading-6">
                    {activeProvider === "gemini"
                      ? "Configuração de comportamento do agente fica em Configurações. Aqui você só garante que a chave da loja está pronta para uso."
                      : "Rode sync sob demanda quando a fonte externa mudar ou quando precisar atualizar a leitura desta marca."}
                  </p>
                  <div className="brandops-toolbar-actions pt-4">
                    {activeProvider === "meta" ? (
                      <>
                        <button
                          type="button"
                          onClick={handleMetaSync}
                          disabled={
                            syncingMeta ||
                            currentState.mode !== "api" ||
                            !currentState.adAccountId ||
                            !metaCredentialReady
                          }
                          className="brandops-button brandops-button-primary"
                        >
                          {syncingMeta ? (
                            <>
                              <Loader2 size={16} className="animate-spin" />
                              Sincronizando Meta
                            </>
                          ) : (
                            "Sincronizar Meta agora"
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={handleMetaCatalogSync}
                          disabled={
                            syncingCatalog ||
                            currentState.mode !== "api" ||
                            !currentState.catalogId ||
                            !metaCredentialReady
                          }
                          className="brandops-button brandops-button-ghost"
                        >
                          {syncingCatalog ? (
                            <>
                              <Loader2 size={16} className="animate-spin" />
                              Sincronizando catálogo
                            </>
                          ) : (
                            "Sincronizar catálogo"
                          )}
                        </button>
                      </>
                    ) : null}
                    {activeProvider === "ga4" ? (
                      <button
                        type="button"
                        onClick={handleGa4Sync}
                        disabled={
                          syncingGa4 ||
                          currentState.mode !== "api" ||
                          !currentState.propertyId ||
                          !ga4CredentialReady
                        }
                        className="brandops-button brandops-button-primary"
                      >
                        {syncingGa4 ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            Sincronizando GA4
                          </>
                        ) : (
                          "Sincronizar GA4 agora"
                        )}
                      </button>
                    ) : null}
                    {activeProvider === "gemini" ? (
                      <Link href="/settings#atlas-ai-settings" className="brandops-button brandops-button-primary">
                        Abrir Configurações do Atlas
                      </Link>
                    ) : null}
                  </div>
                  {activeProvider === "gemini" ? (
                    <p className="mt-4 text-[11px] leading-5 text-on-surface-variant">
                      Modelo, temperatura, skill e janela padrão ficam na Central Estratégica.
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}

            {activeSection === "rules" ? (
              <div className="brandops-toolbar-panel text-sm text-on-surface-variant">
                <p className="font-medium text-on-surface">{providerContextCard.title}</p>
                <p className="leading-6">{providerContextCard.body}</p>
                {providerContextCard.cta || providerTutorial ? (
                  <div className="flex flex-wrap gap-2">
                    {providerContextCard.cta ? (
                      <Link href={providerContextCard.cta} className="brandops-button brandops-button-ghost">
                        Abrir painel relacionado
                      </Link>
                    ) : null}
                    {providerTutorial ? (
                      <Link href={providerTutorial.route} className="brandops-button brandops-button-ghost">
                        {tutorialCtaLabel}
                      </Link>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </SurfaceCard>

        <SurfaceCard className="p-4">
          <SectionHeading
            title="Radar lateral"
            description="Leitura compacta para orientar a próxima ação sem abrir mais blocos."
          />
          <div className="mt-5 grid gap-3">
            <StackItem
              title={providerNextAction.title}
              description={providerNextAction.description}
              aside={<Radar size={16} className="text-secondary" />}
              tone={providerNextAction.tone}
            />
            <StackItem
              title="Credencial da loja"
              description={
                activeProvider === "ink"
                  ? "A origem comercial da INK continua manual e não depende de segredo por API."
                  : currentState.hasApiKey
                    ? `Segredo salvo em ${currentState.apiKeyHint || "ambiente seguro"}.`
                    : "Ainda falta salvar a credencial própria desta loja."
              }
              aside={<ShieldCheck size={16} className="text-secondary" />}
              tone={activeProvider === "ink" ? "default" : currentState.hasApiKey ? "positive" : "warning"}
            />
            <StackItem
              title="Última referência"
              description={formatSyncLabel(current)}
              aside={<RefreshCcw size={16} className="text-secondary" />}
              tone="default"
            />
            {activeProvider === "meta" ? (
              <StackItem
                title="Fallback manual"
                description="A Meta pode operar com API e manter contingência manual sem perder o histórico do CSV."
                aside={<Link2 size={16} className="text-secondary" />}
                tone="default"
              />
            ) : null}
            {providerContextCard.cta || providerTutorial ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {providerContextCard.cta ? (
                  <Link href={providerContextCard.cta} className="brandops-button brandops-button-ghost">
                    Abrir painel relacionado
                  </Link>
                ) : null}
                {providerTutorial ? (
                  <Link href={providerTutorial.route} className="brandops-button brandops-button-ghost">
                    {tutorialCtaLabel}
                  </Link>
                ) : null}
              </div>
            ) : null}
          </div>
        </SurfaceCard>
      </section>
    </div>
  );
}







