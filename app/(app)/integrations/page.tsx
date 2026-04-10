"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  BrainCircuit,
  CheckCircle2,
  Database,
  Link2,
  Loader2,
  PlugZap,
  Radar,
  ShieldCheck,
} from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { useBrandOps } from "@/components/BrandOpsProvider";
import { IntegrationRadar } from "@/components/integrations/IntegrationRadar";
import { IntegrationWorkspaceHeader } from "@/components/integrations/IntegrationWorkspaceHeader";
import { FormField, InlineNotice, PageHeader, SectionHeading, StackItem, SurfaceCard } from "@/components/ui-shell";
import Link from "next/link";
import type {
  BrandIntegrationConfig,
  BrandGovernance,
  IntegrationMode,
  IntegrationProvider,
} from "@/lib/brandops/types";
import { ATLAS_GEMINI_DEFAULT_MODEL } from "@/lib/brandops/ai/model-policy";
import { getIntegrationTutorial } from "@/lib/brandops/integration-tutorials";
import { setAtlasOrbSyncLoading } from "@/lib/brandops/orb-sync-loading";
import { APP_ROUTES } from "@/lib/brandops/routes";

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

type IntegrationSection = "overview" | "config" | "sync" | "rules";

function isIntegrationProvider(value: string | null): value is IntegrationProvider {
  return value === "ink" || value === "meta" || value === "ga4" || value === "gemini";
}

function isIntegrationSection(value: string | null): value is IntegrationSection {
  return value === "overview" || value === "config" || value === "sync" || value === "rules";
}

const providerLabels: Record<IntegrationProvider, string> = {
  ink: "INK / INCI",
  meta: "Meta Ads",
  ga4: "Google Analytics 4",
  gemini: "Atlas Analyst / Gemini",
};

const providerDescriptions: Record<IntegrationProvider, string> = {
  ink: "CSV comercial da operação.",
  meta: "Mídia, catálogo e contingência.",
  ga4: "Tráfego, funil e propriedade.",
  gemini: "Camada Atlas da marca.",
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
    model: ATLAS_GEMINI_DEFAULT_MODEL,
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
    model: ATLAS_GEMINI_DEFAULT_MODEL,
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
    model: ATLAS_GEMINI_DEFAULT_MODEL,
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
    model: ATLAS_GEMINI_DEFAULT_MODEL,
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
      model: integration.settings.model ?? ATLAS_GEMINI_DEFAULT_MODEL,
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
    section: "overview" as const,
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
  const [activeSection, setActiveSection] = useState<IntegrationSection>("overview");
  const [workspaceSeedBrandId, setWorkspaceSeedBrandId] = useState<string | null>(null);

  const replaceWorkspaceUrl = useCallback(
    (
      nextProvider: IntegrationProvider,
      nextSection: IntegrationSection,
    ) => {
      if (!pathname) {
        return;
      }

      const currentProvider = safeSearchParams.get("provider");
      const currentSection = safeSearchParams.get("section");

      if (currentProvider === nextProvider && currentSection === nextSection) {
        return;
      }

      const params = new URLSearchParams(safeSearchParams.toString());
      params.set("provider", nextProvider);
      params.set("section", nextSection);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, safeSearchParams],
  );

  const activateWorkspace = useCallback(
    (
      nextProvider: IntegrationProvider,
      nextSection: IntegrationSection,
    ) => {
      setActiveProvider(nextProvider);
      setActiveSection(nextSection);
      replaceWorkspaceUrl(nextProvider, nextSection);
    },
    [replaceWorkspaceUrl],
  );

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
        section: "overview" as const,
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
      const nextProvider = isIntegrationProvider(providerParam)
        ? providerParam
        : suggestedWorkspace.provider;
      const nextSection = isIntegrationSection(sectionParam)
        ? sectionParam
        : suggestedWorkspace.section;
      setActiveProvider(nextProvider);
      setActiveSection(nextSection);
      setWorkspaceSeedBrandId(activeBrand.id);
      return;
    }

    activateWorkspace(suggestedWorkspace.provider, suggestedWorkspace.section);
    setWorkspaceSeedBrandId(activeBrand.id);
  }, [activeBrand, activateWorkspace, safeSearchParams, suggestedWorkspace, workspaceSeedBrandId]);

  useEffect(() => {
    if (!activeBrand || workspaceSeedBrandId !== activeBrand.id) {
      return;
    }

    const providerParam = safeSearchParams.get("provider");
    const sectionParam = safeSearchParams.get("section");

    if (isIntegrationProvider(providerParam) && providerParam !== activeProvider) {
      setActiveProvider(providerParam);
    }

    if (isIntegrationSection(sectionParam) && sectionParam !== activeSection) {
      setActiveSection(sectionParam);
    }
  }, [
    activeBrand,
    activeProvider,
    activeSection,
    safeSearchParams,
    workspaceSeedBrandId,
  ]);

  if (!activeBrand) {
    return (
      <EmptyState
        title="Nenhuma marca selecionada"
        description="Selecione uma marca para configurar as origens de dados desta operação."
        ctaHref={null}
        ctaLabel={null}
      />
    );
  }

  const geminiFeatureEnabled = activeBrand.governance.featureFlags.atlasAi;

  const canManageIntegrations = profile?.role === "SUPER_ADMIN";
  const canManageCurrentProvider =
    profile?.role === "SUPER_ADMIN" || activeProvider === "gemini";

  const current = integrationsMap.get(activeProvider);
  const currentState = formState[activeProvider];
  const activeBrandName = activeBrand?.name ?? "Loja";
  const activeSectionLabel =
    activeSection === "overview"
      ? "Resumo"
      : activeSection === "config"
        ? "Conexão"
        : activeSection === "sync"
          ? "Execução"
          : "Guia";
  const isInternalPlatformViewer = profile?.email?.toLowerCase() === "edbo84@gmail.com";
  const options = getModeOptions(activeProvider);
  const providerContextCard = {
    ink: {
      title: "Origem comercial manual",
      body: `A loja ${activeBrand.name} segue operando a origem comercial por CSV.`,
      cta: null,
    },
    meta: {
      title: "Fallback e contingência",
      body:
        currentState.mode === "api"
          ? `A ${activeBrand.name} opera Meta por API${currentState.manualFallback ? " com contingência manual" : ""}${currentState.catalogId ? " e catálogo vinculado." : "."}`
          : `A ${activeBrand.name} segue em fluxo manual da Meta.`,
      cta: null,
    },
    ga4: {
      title: "Propriedade configurada",
      body:
        currentState.propertyId
          ? `A propriedade ${currentState.propertyId} já está ligada à marca ${activeBrand.name}.`
          : `A marca ${activeBrand.name} ainda não possui Property ID informado.`,
      cta: currentState.propertyId ? "/traffic" : null,
    },
    gemini: {
      title: "Atlas da marca",
      body:
        !geminiFeatureEnabled
          ? `O plano atual de ${activeBrand.name} ainda não libera a camada Atlas IA.`
          : currentState.mode === "api"
          ? `O Atlas Analyst está habilitado para ${activeBrand.name}.${currentState.hasApiKey ? ` Chave da loja salva em ${currentState.apiKeyHint}.` : ""}`
          : `O Atlas Analyst da marca ${activeBrand.name} ainda está desabilitado.`,
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
      description: "Subir novos CSVs e manter a rotina de importação consistente.",
      tone: "default" as const,
    },
    meta: {
      title: "Próximo movimento",
      description:
        currentState.mode === "api"
          ? currentState.hasApiKey
            ? "Confirmar conta, catálogo e sincronizar só quando a fonte mudar."
            : "Salvar o token da loja para destravar mídia e catálogo."
          : "Decidir quando a operação sai do fluxo manual e entra em API.",
      tone:
        currentState.mode === "api" && !currentState.hasApiKey ? ("warning" as const) : ("default" as const),
    },
    ga4: {
      title: "Próximo movimento",
      description:
        currentState.mode === "api"
          ? currentState.propertyId
            ? "Validar a propriedade e sincronizar quando a leitura precisar ser renovada."
            : "Preencher o Property ID para destravar a leitura do funil."
          : "Ativar a API quando a loja quiser leitura contínua de tráfego.",
      tone:
        currentState.mode === "api" && !currentState.propertyId ? ("warning" as const) : ("default" as const),
    },
    gemini: {
      title: "Próximo movimento",
      description:
        currentState.hasApiKey
          ? "Manter a chave ativa e ajustar o comportamento do Atlas em Configurações."
          : "Salvar a chave Gemini para habilitar Analyst e aprendizado.",
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
  const operationalNotice: {
    tone: "warning" | "info" | "error" | "success";
    icon: ReactNode;
    content: ReactNode;
  } | null = (() => {
    if (notice) {
      if (isEncryptionKeyNotice) {
        return {
          tone: "warning" as const,
          icon: <ShieldCheck size={18} />,
          content: isInternalPlatformViewer ? (
            <div className="atlas-component-stack-tight">
              <p>Falta preparar o ambiente seguro da plataforma antes de operar segredos por loja.</p>
              <p className="text-on-surface-variant">
                Cadastre a variável necessária na Vercel, faça um novo deploy e tente novamente.
              </p>
            </div>
          ) : (
            <div className="atlas-component-stack-tight">
              <p>Esta operação depende de uma preparação técnica que ainda não foi concluída.</p>
              <p className="text-on-surface-variant">
                Acione o gestor da plataforma e tente novamente depois da regularização do ambiente.
              </p>
            </div>
          ),
        };
      }

      if (isPlatformPreparationNotice) {
        return {
          tone: "warning" as const,
          icon: <ShieldCheck size={18} />,
          content: (
            <div className="atlas-component-stack-tight">
              <p>Esta integração depende de uma preparação técnica da plataforma que ainda não foi concluída.</p>
              <p className="text-on-surface-variant">
                Se você é operador da loja, acione o gestor da plataforma. Se você é gestor técnico, revise o preparo do banco e das secrets.
              </p>
            </div>
          ),
        };
      }

      if (isMetaPermissionNotice) {
        return {
          tone: "warning" as const,
          icon: <AlertCircle size={18} />,
          content: (
            <div className="atlas-component-stack-tight">
              <p>O token da Meta existe, mas o app ou o usuário não têm permissão suficiente para a API do catálogo.</p>
              <p className="text-on-surface-variant">
                Revise capacidades do app, acesso ao catálogo no Business Manager e permissões do token usado por esta loja.
              </p>
            </div>
          ),
        };
      }

      if (isMetaMissingCredentialNotice) {
        return {
          tone: "warning" as const,
          icon: <Link2 size={18} />,
          content: (
            <div className="atlas-component-stack-tight">
              <p>A Meta desta loja ainda não pode operar por API.</p>
              <p className="text-on-surface-variant">
                Salve o token próprio da marca e depois execute a sincronização novamente.
              </p>
            </div>
          ),
        };
      }

      if (isGa4MissingCredentialNotice || isGeminiMissingCredentialNotice) {
        return {
          tone: "info" as const,
          icon: <Radar size={18} />,
          content: (
            <div className="atlas-component-stack-tight">
              <p>Esta integração só fica operacional quando a credencial própria da marca é salva com sucesso.</p>
              <p className="text-on-surface-variant">
                Se precisar do passo a passo, abra o{" "}
                <Link href={tutorialHref} className="font-semibold text-primary underline underline-offset-4">
                  tutorial detalhado desta integração
                </Link>
                .
              </p>
            </div>
          ),
        };
      }

      return {
        tone: notice.kind === "success" ? "success" : "error",
        icon: notice.kind === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />,
        content: <span>{displayNoticeText}</span>,
      };
    }

    if (activeProvider === "gemini" && !geminiFeatureEnabled) {
      return {
        tone: "warning" as const,
        icon: <AlertCircle size={18} />,
        content: (
          <div className="atlas-component-stack-tight">
            <p className="font-semibold">O plano atual desta marca ainda não libera o Atlas IA.</p>
            <p className="text-on-surface-variant">
              Primeiro ajuste a governança em{" "}
              <Link
                href={APP_ROUTES.adminStores}
                prefetch={false}
                className="font-semibold text-primary underline underline-offset-4"
              >
                Acessos
              </Link>
              . Depois disso, a configuração técnica do Gemini volta a ficar operacional.
            </p>
          </div>
        ),
      };
    }

    if (!canManageIntegrations) {
      return {
        tone: "info" as const,
        icon: <ShieldCheck size={18} />,
        content: (
          <span>
            {activeProvider === "gemini"
              ? geminiFeatureEnabled
                ? "Você pode configurar a credencial Gemini da sua própria loja sem expor a chave na interface."
                : "A credencial Gemini continua isolada por loja, mas esta marca ainda não tem a camada Atlas IA liberada."
              : "Você pode acompanhar o status e executar as sincronizações da sua loja. Alterações de configuração seguem restritas ao superadmin."}
          </span>
        ),
      };
    }

    return null;
  })();
  const activeHealth = resolveProviderHealth(activeProvider, current, activeBrand.governance);
  const ActiveProviderIcon = providerIcons[activeProvider];
  function renderHeaderActions() {
    if (activeProvider === "gemini") {
      return (
        <div className="atlas-action-cluster">
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
        <div className="atlas-action-cluster">
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
        <div className="atlas-action-cluster">
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
      setAtlasOrbSyncLoading({ active: true, label: "Sincronizando GA4" });
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
      setAtlasOrbSyncLoading({ active: false });
    }
  };

  const handleMetaSync = async () => {
    if (!session?.access_token) {
      setNotice({ kind: "error", text: "Sessão inválida para sincronizar a Meta." });
      return;
    }

    try {
      setSyncingMeta(true);
      setAtlasOrbSyncLoading({ active: true, label: "Sincronizando Meta Ads" });
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
      setAtlasOrbSyncLoading({ active: false });
    }
  };

  const handleMetaCatalogSync = async () => {
    if (!session?.access_token) {
      setNotice({ kind: "error", text: "Sessão inválida para sincronizar o catálogo da Meta." });
      return;
    }

    try {
      setSyncingCatalog(true);
      setAtlasOrbSyncLoading({ active: true, label: "Sincronizando catálogo Meta" });
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
      setAtlasOrbSyncLoading({ active: false });
    }
  };

  return (
    <div className="atlas-integration-room atlas-page-stack-compact xl:flex xl:h-[calc(100dvh-8.75rem)] xl:flex-col xl:overflow-hidden">
      <PageHeader
        eyebrow="Plataforma"
        title="Console de integrações"
        description="Conecte a fonte ativa e ajuste a operação sem perder o contexto da loja."
        actions={
          <div className="flex flex-wrap gap-2">
            <span className="atlas-inline-metric">{activeBrandName}</span>
            <span className="atlas-inline-metric">{providerLabels[activeProvider]}</span>
            <span className="atlas-inline-metric">{activeSectionLabel}</span>
          </div>
        }
      />

      {operationalNotice ? (
        <InlineNotice tone={operationalNotice.tone} icon={operationalNotice.icon} className="text-sm">
          {operationalNotice.content}
        </InlineNotice>
      ) : null}

      <section className="grid gap-4 xl:min-h-0 xl:flex-1">
        <SurfaceCard className="atlas-integration-shell atlas-integration-workspace min-w-0 p-3.5 lg:p-4 xl:flex xl:h-full xl:min-h-0 xl:flex-col">
          <IntegrationWorkspaceHeader
            activeProvider={activeProvider}
            current={current}
            currentState={currentState}
            activeHealth={activeHealth}
            activeIcon={ActiveProviderIcon}
            providerLabels={providerLabels}
            providerDescriptions={providerDescriptions}
            providerEyebrows={providerEyebrows}
            activeSection={activeSection}
            activateWorkspace={activateWorkspace}
            headerActions={renderHeaderActions()}
            formatSyncLabel={formatSyncLabel}
            providerTabs={(["ink", "meta", "ga4", "gemini"] as const).map((provider) => ({
              key: `integration-provider-${provider}`,
              label: providerLabels[provider],
              active: activeProvider === provider,
              onClick: () => activateWorkspace(provider, activeProvider === provider ? activeSection : "overview"),
            }))}
          />

            <div className="mt-5 xl:min-h-0 xl:flex-1">
            {activeSection === "overview" ? (
              <div className="xl:h-full xl:min-h-0 xl:overflow-y-auto">
                <IntegrationRadar
                  activeProvider={activeProvider}
                  current={current}
                  currentState={currentState}
                  providerNextAction={providerNextAction}
                  tutorialHref={tutorialHref}
                  tutorialCtaLabel={tutorialCtaLabel}
                  formatSyncLabel={formatSyncLabel}
                  className="h-full"
                />
              </div>
            ) : null}

            {activeSection === "config" ? (
            <div className="brandops-command-slab px-5 py-5 xl:h-full xl:min-h-0 xl:overflow-y-auto">
              <SectionHeading
                title="Conexão da fonte"
                description="Defina modo, identificadores e credencial própria da loja."
              />
              <div className="brandops-toolbar-grid mt-4" data-columns="2">
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
                        Token da própria loja. Só esta marca usa essa credencial.
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
                      <div className="atlas-component-stack-compact">
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
                              ? `Token salvo em ${currentState.apiKeyHint}. Preencha acima para substituir.`
                              : "Salve aqui o token próprio da loja. O segredo não volta em texto aberto para a interface."}
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
                        JSON da própria loja. Só esta marca usa essa service account.
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
                      <div className="atlas-component-stack-compact">
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
                              ? `Credencial salva em ${currentState.apiKeyHint}. Preencha acima para substituir.`
                              : "Salve aqui o JSON da service account da loja. O segredo não retorna em texto aberto para a interface."}
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
                        Chave da própria loja. Só este Atlas usa essa credencial.
                      </div>
                    </FormField>
                    <FormField label="Central estratégica do Atlas" className="text-sm">
                      <div className="atlas-soft-subcard px-4 py-3 text-sm leading-6 text-on-surface">
                        Modelo, skill, janela e guia da marca ficam na{" "}
                        <Link href={APP_ROUTES.settingsAtlasAi} prefetch={false} className="text-secondary hover:underline">
                          Central de Configurações
                        </Link>
                        .
                      </div>
                    </FormField>
                    <FormField label="Nova chave Gemini da loja" className="text-sm lg:col-span-2">
                      <div className="atlas-component-stack-compact">
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
                              Chave salva para esta loja em{" "}
                              <span className="font-semibold text-on-surface">
                                {currentState.apiKeyHint}
                              </span>
                              . Preencha acima para substituir.
                            </p>
                          ) : (
                            <p>
                              A chave digitada aqui fica protegida no backend e nunca volta em texto aberto para a interface.
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
              <div className="brandops-toolbar-panel text-sm text-on-surface-variant xl:h-full xl:min-h-0 xl:overflow-y-auto">
                <SectionHeading
                  title="Execução da fonte"
                  description="Estado atual, sincronização e ação manual do conector."
                />
                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  <div className="atlas-soft-subcard px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-on-surface">Estado da integração</p>
                        <p className="mt-1">
                          {activeProvider === "gemini"
                            ? currentState.hasApiKey
                              ? `Chave própria salva em ${currentState.apiKeyHint}.`
                              : "Nenhuma chave própria salva para esta loja."
                            : currentState.hasApiKey
                              ? `${activeProvider === "meta" ? "Token" : "Credencial"} própria salva em ${currentState.apiKeyHint}.`
                              : `Nenhuma ${activeProvider === "meta" ? "token" : "credencial"} própria salva para esta loja.`}
                        </p>
                      </div>
                      <span className="atlas-inline-metric">{current?.lastSyncStatus ?? "idle"}</span>
                    </div>
                    {current?.lastSyncError ? (
                      <div className="atlas-soft-subcard mt-3 border-error/18 bg-error/8 px-4 py-3 text-error">
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
                        <span className="atlas-inline-metric">{current?.settings.catalogSyncStatus ?? "idle"}</span>
                      </div>
                      {current?.settings.catalogProductCount ? (
                        <p className="mt-2 text-[11px] leading-5 text-on-surface-variant">
                          {current.settings.catalogProductCount} item(ns) consolidados da fonte Meta.
                        </p>
                      ) : null}
                      {current?.settings.catalogSyncError ? (
                        <div className="atlas-soft-subcard mt-3 border-error/18 bg-error/8 px-4 py-3 text-error">
                          {current.settings.catalogSyncError}
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="atlas-soft-subcard px-4 py-3 lg:col-span-2">
                    <p className="font-medium text-on-surface">Executar agora</p>
                    <p className="mt-1 leading-6">
                      {activeProvider === "gemini"
                        ? "O comportamento do agente fica em Configurações. Aqui você só garante que a chave da loja está pronta."
                        : "Rode sync quando a fonte externa mudar ou quando a leitura da marca precisar ser atualizada."}
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
                        <Link href={APP_ROUTES.settingsAtlasAi} prefetch={false} className="brandops-button brandops-button-primary">
                          Abrir Configurações do Atlas
                        </Link>
                      ) : null}
                    </div>
                    {activeProvider === "gemini" ? (
                      <p className="mt-4 text-[11px] leading-5 text-on-surface-variant">
                        Modelo, skill e janela padrão ficam na Central Estratégica.
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}

            {activeSection === "rules" ? (
              <div className="brandops-toolbar-panel text-sm text-on-surface-variant xl:h-full xl:min-h-0 xl:overflow-y-auto">
                <SectionHeading
                  title="Guia operacional"
                  description="O que esta fonte exige e quando vale agir."
                />
                <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_18rem]">
                  <div className="atlas-component-stack-tight">
                    <StackItem
                      title={providerContextCard.title}
                      description={providerContextCard.body}
                      aside="contexto"
                      tone="default"
                    />
                    <StackItem
                      title="Quando entrar aqui"
                      description={
                        activeProvider === "ink"
                          ? "Quando a operação comercial subir um novo CSV ou quando o histórico pedir conferência."
                          : activeProvider === "gemini"
                            ? "Só para garantir prontidão técnica da chave. Estratégia do agente fica em Configurações."
                            : "Quando a fonte mudar, falhar ou precisar reidratar a leitura da marca."
                      }
                      aside="uso"
                      tone="info"
                    />
                    <StackItem
                      title="Próximo passo fora desta tela"
                      description={
                        activeProvider === "meta"
                          ? "Volte para Mídia e Performance depois do sync."
                          : activeProvider === "ga4"
                            ? "Volte para Tráfego Digital após validar propriedade e coleta."
                            : activeProvider === "gemini"
                              ? "Ajuste modelo, skill e aprendizado na Central Estratégica."
                              : "Retome ETL e leituras comerciais assim que o upload fechar."
                      }
                      aside="seguir"
                      tone="default"
                    />
                  </div>

                  {providerTutorial ? (
                    <div className="atlas-soft-subcard flex flex-col justify-between gap-4 px-4 py-4">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                          Tutorial
                        </p>
                        <p className="mt-2 text-[12px] leading-6 text-on-surface-variant">
                          Abra o passo a passo detalhado só quando precisar de setup ou validação externa.
                        </p>
                      </div>
                      <Link href={providerTutorial.route} className="brandops-button brandops-button-ghost w-full justify-between">
                        {tutorialCtaLabel}
                      </Link>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
            </div>
        </SurfaceCard>
      </section>
    </div>
  );
}







