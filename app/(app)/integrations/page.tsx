"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Link2,
  Loader2,
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
  IntegrationMode,
  IntegrationProvider,
} from "@/lib/brandops/types";

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
  }
>;

const providerLabels: Record<IntegrationProvider, string> = {
  ink: "INK / INCI",
  meta: "Meta Ads",
  ga4: "Google Analytics 4",
};

const providerDescriptions: Record<IntegrationProvider, string> = {
  ink: "Base comercial por CSV.",
  meta: "Mídia paga com fallback manual.",
  ga4: "Tráfego e eventos da propriedade.",
};

const providerEyebrows: Record<IntegrationProvider, string> = {
  ink: "Origem comercial",
  meta: "Aquisição",
  ga4: "Analytics",
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
  },
  meta: {
    mode: "manual_csv",
    propertyId: "",
    timezone: "America/Sao_Paulo",
    adAccountId: "",
    catalogId: "",
    manualFallback: true,
    syncWindowDays: "30",
  },
  ga4: {
    mode: "disabled",
    propertyId: "",
    timezone: "America/Sao_Paulo",
    adAccountId: "",
    catalogId: "",
    manualFallback: false,
    syncWindowDays: "30",
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

export default function IntegrationsPage() {
  const { activeBrand, profile, refreshActiveBrand, session } = useBrandOps();
  const [formState, setFormState] = useState<IntegrationFormState>(emptyIntegrationForm);
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [syncingGa4, setSyncingGa4] = useState(false);
  const [syncingMeta, setSyncingMeta] = useState(false);
  const [syncingCatalog, setSyncingCatalog] = useState(false);
  const [activeProvider, setActiveProvider] = useState<IntegrationProvider>("ink");
  const [activeSection, setActiveSection] = useState<"config" | "sync" | "rules">("config");

  useEffect(() => {
    setFormState(toFormState(activeBrand?.integrations ?? []));
    setNotice(null);
  }, [activeBrand?.id, activeBrand?.integrations]);

  const integrationsMap = useMemo(
    () =>
      new Map(
        (activeBrand?.integrations ?? []).map((integration) => [
          integration.provider,
          integration,
        ]),
      ),
    [activeBrand?.integrations],
  );

  if (!activeBrand) {
    return (
      <EmptyState
        title="Nenhuma marca selecionada"
        description="Selecione uma marca para configurar as origens de dados desta operação."
      />
    );
  }

  const canManageIntegrations = profile?.role === "SUPER_ADMIN";

  const current = integrationsMap.get(activeProvider);
  const currentState = formState[activeProvider];
  const options = getModeOptions(activeProvider);
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
  }[activeProvider];

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
              }
            : provider === "meta"
              ? {
                  adAccountId: formState.meta.adAccountId || null,
                  catalogId: formState.meta.catalogId || null,
                  manualFallback: formState.meta.manualFallback,
                  syncWindowDays: Number(formState.meta.syncWindowDays || 30),
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
        description="Defina a origem de cada dado por marca. O Atlas preserva o manual quando necessário e prepara a evolução para API sem quebrar a operação."
        badge={`Escopo atual: ${activeBrand.name}`}
        actions={
          canManageIntegrations ? (
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
          ) : null
        }
      />

      {notice ? (
        <InlineNotice
          tone={notice.kind === "success" ? "success" : "error"}
          icon={notice.kind === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          className="text-sm"
        >
          <span>{notice.text}</span>
        </InlineNotice>
      ) : null}

      {!canManageIntegrations ? (
        <InlineNotice tone="info" icon={<ShieldCheck size={18} />} className="text-sm text-on-surface">
          <span>
            Você pode acompanhar o status e executar as sincronizações da sua loja. Alterações de configuração seguem restritas ao superadmin.
          </span>
        </InlineNotice>
      ) : null}

      <SurfaceCard>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <SectionHeading
            title={`Conector ${providerLabels[activeProvider]}`}
            description={providerDescriptions[activeProvider]}
          />
          <div className="grid gap-3 sm:grid-cols-3">
            <AnalyticsKpiCard
              label="Modo"
              value={
                currentState.mode === "api"
                  ? "API ativa"
                  : currentState.mode === "disabled"
                    ? "Integração desligada"
                    : "Operação manual"
              }
              description="Forma atual de operação desta origem."
              tone={currentState.mode === "api" ? "positive" : currentState.mode === "disabled" ? "warning" : "default"}
            />
            <AnalyticsKpiCard
              label="Última sync"
              value={formatSyncLabel(current)}
              description="Última sincronização registrada nesta integração."
            />
            <AnalyticsKpiCard
              label="Escopo"
              value={providerEyebrows[activeProvider]}
              description="Camada da operação atendida por este conector."
              tone="info"
            />
          </div>
        </div>
        <div className="mt-4 brandops-subtabs overflow-x-auto">
          {(["ink", "meta", "ga4"] as const).map((provider) => (
            <button
              key={provider}
              type="button"
              data-active={activeProvider === provider}
              onClick={() => setActiveProvider(provider)}
              className="brandops-subtab"
            >
              {providerLabels[provider]}
            </button>
          ))}
        </div>
      </SurfaceCard>

      <SurfaceCard>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <SectionHeading
            title="Painel operacional"
            description="Escolha entre configurar a origem, acompanhar a sincronização ou revisar as regras desta integração."
          />
          <div className="brandops-subtabs">
            <button type="button" className="brandops-subtab" data-active={activeSection === "config"} onClick={() => setActiveSection("config")}>
              Config
            </button>
            <button type="button" className="brandops-subtab" data-active={activeSection === "sync"} onClick={() => setActiveSection("sync")}>
              Sync
            </button>
            <button type="button" className="brandops-subtab" data-active={activeSection === "rules"} onClick={() => setActiveSection("rules")}>
              Diretrizes
            </button>
          </div>
        </div>
      </SurfaceCard>

      <section className={`grid gap-6 ${activeSection === "rules" ? "xl:grid-cols-[1.1fr_0.9fr]" : ""}`}>
        <SurfaceCard>
          <div className="flex flex-col gap-4 border-b border-outline pb-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="eyebrow mb-2">{providerEyebrows[activeProvider]}</p>
              <h2 className="text-xl font-semibold text-on-surface">{providerLabels[activeProvider]}</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-on-surface-variant">
                {providerDescriptions[activeProvider]}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="status-chip">{current?.mode === "api" ? "API" : current?.mode === "disabled" ? "OFF" : "MANUAL"}</span>
              <span className="status-chip">{current?.lastSyncStatus ?? "idle"}</span>
              <span className="status-chip">{formatSyncLabel(current)}</span>
            </div>
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
                    <label className="flex items-start gap-3 rounded-xl border border-outline bg-surface-container-low p-4 text-sm text-on-surface-variant lg:col-span-2">
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
                  </>
                ) : null}
              </div>
            </div>
            ) : null}

            {activeSection === "sync" ? (
            <div className="brandops-toolbar-panel text-sm text-on-surface-variant">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-on-surface">Última sincronização</p>
                  <p className="mt-1">{formatSyncLabel(current)}</p>
                </div>
                <span className="status-chip">{current?.lastSyncStatus ?? "idle"}</span>
              </div>
              {current?.lastSyncError ? (
                <p className="mt-3 text-error">{current.lastSyncError}</p>
              ) : null}
              {activeProvider === "meta" ? (
                <div className="mt-4 border-t border-outline pt-4">
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
                    <p className="mt-3 text-error">{current.settings.catalogSyncError}</p>
                  ) : null}
                </div>
              ) : null}
              <div className="brandops-toolbar-actions pt-1">
                {activeProvider === "meta" ? (
                  <>
                    <button
                      type="button"
                      onClick={handleMetaSync}
                      disabled={syncingMeta || currentState.mode !== "api" || !currentState.adAccountId}
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
                      disabled={syncingCatalog || currentState.mode !== "api" || !currentState.catalogId}
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
                    disabled={syncingGa4 || currentState.mode !== "api" || !currentState.propertyId}
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
              </div>
            </div>
            ) : null}

            {activeSection === "rules" ? (
              <div className="brandops-toolbar-panel text-sm text-on-surface-variant">
                <p className="font-medium text-on-surface">{providerContextCard.title}</p>
                <p className="leading-6">{providerContextCard.body}</p>
                {providerContextCard.cta ? (
                  <div>
                    <Link href={providerContextCard.cta} className="brandops-button brandops-button-ghost">
                      Abrir painel relacionado
                    </Link>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </SurfaceCard>

        {activeSection === "rules" ? (
        <SurfaceCard>
          <SectionHeading
            title="Modelo operacional"
            description="Regras de operação, contingência e segurança aplicadas a esta integração."
          />
          <div className="mt-5 grid gap-3">
            <StackItem
              title="Fonte por loja"
              description="Cada marca pode combinar `INK` manual, `Meta` por API e `GA4` desabilitado sem misturar contextos de origem."
              aside={<Link2 size={16} className="text-secondary" />}
              tone="info"
            />
            {activeProvider === "meta" ? (
              <StackItem
                title="Fallback manual"
                description="A integração da Meta pode ficar em API com contingência manual, sem perder auditoria do CSV."
                aside={<RefreshCcw size={16} className="text-secondary" />}
                tone="default"
              />
            ) : null}
            <StackItem
              title="Segredos não ficam aqui"
              description="Esta tela guarda apenas configuração não sensível por marca. Tokens e chaves devem ficar em ambiente seguro do backend."
              aside={<ShieldCheck size={16} className="text-secondary" />}
              tone="warning"
            />
            <StackItem
              title={providerContextCard.title}
              description={
                <div className="space-y-2">
                  <p>{providerContextCard.body}</p>
                  {providerContextCard.cta ? (
                    <Link href={providerContextCard.cta} className="inline-flex text-secondary hover:underline">
                      Abrir painel relacionado →
                    </Link>
                  ) : null}
                </div>
              }
              aside={<Radar size={16} className="text-secondary" />}
              tone="info"
            />
          </div>
        </SurfaceCard>
        ) : null}
      </section>
    </div>
  );
}
