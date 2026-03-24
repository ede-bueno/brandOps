"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Link2,
  Loader2,
  Radar,
  RefreshCcw,
  ShieldCheck,
} from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { useBrandOps } from "@/components/BrandOpsProvider";
import { PageHeader, SectionHeading, SurfaceCard } from "@/components/ui-shell";
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
  ink: "Base comercial e operacional vinda por CSV da plataforma de vendas.",
  meta: "Mídia paga com opção de manter upload manual como contingência, mesmo com API ligada.",
  ga4: "Tráfego, origem/mídia e eventos de funil por propriedade da loja.",
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
    manualFallback: true,
    syncWindowDays: "30",
  },
  meta: {
    mode: "manual_csv",
    propertyId: "",
    timezone: "America/Sao_Paulo",
    adAccountId: "",
    manualFallback: true,
    syncWindowDays: "30",
  },
  ga4: {
    mode: "disabled",
    propertyId: "",
    timezone: "America/Sao_Paulo",
    adAccountId: "",
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

  if (profile?.role !== "SUPER_ADMIN") {
    return (
      <EmptyState
        title="Área restrita"
        description="As integrações por loja ficam disponíveis apenas para superadmin."
      />
    );
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
              }
            : provider === "meta"
              ? {
                  adAccountId: formState.meta.adAccountId || null,
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

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Configuração por loja"
        title="Integrações"
        description="Defina a origem de cada dado por marca. O BrandOps mantém o fluxo manual disponível onde ele ainda é necessário e prepara a evolução para API sem quebrar a operação."
        badge={`Escopo atual: ${activeBrand.name}`}
        actions={
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
        }
      />

      {notice ? (
        <div
          className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm ${
            notice.kind === "success"
              ? "border-secondary/20 bg-secondary-container/30 text-on-secondary-container"
              : "border-error/20 bg-error-container/30 text-on-error-container"
          }`}
        >
          {notice.kind === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{notice.text}</span>
        </div>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-3">
        {(["ink", "meta", "ga4"] as const).map((provider) => {
          const current = integrationsMap.get(provider);
          const currentState = formState[provider];
              const options = getModeOptions(provider);

              return (
                <SurfaceCard key={provider}>
                  <p className="eyebrow mb-2">{providerEyebrows[provider]}</p>
                  <SectionHeading
                    title={providerLabels[provider]}
                    description={providerDescriptions[provider]}
                  />

              <div className="mt-5 space-y-4">
                <label className="space-y-2 text-sm">
                  <span className="font-medium text-on-surface">Origem principal</span>
                  <select
                    value={currentState.mode}
                    onChange={(event) =>
                      setFormState((previous) => ({
                        ...previous,
                        [provider]: {
                          ...previous[provider],
                          mode: event.target.value as IntegrationMode,
                        },
                      }))
                    }
                    className="brandops-input"
                  >
                    {options.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                {provider === "meta" ? (
                  <>
                    <label className="space-y-2 text-sm">
                      <span className="font-medium text-on-surface">ID da conta de anúncios</span>
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
                        className="brandops-input"
                        placeholder="act_1234567890"
                      />
                    </label>
                    <label className="space-y-2 text-sm">
                      <span className="font-medium text-on-surface">Janela padrão de sync (dias)</span>
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
                        className="brandops-input"
                      />
                    </label>
                    <label className="flex items-start gap-3 rounded-2xl border border-outline bg-surface-container-low p-4 text-sm text-on-surface-variant">
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
                      />
                      <span>
                        Manter upload manual da Meta como contingência mesmo com a API ligada.
                      </span>
                    </label>
                  </>
                ) : null}

                {provider === "ga4" ? (
                  <>
                    <label className="space-y-2 text-sm">
                      <span className="font-medium text-on-surface">Property ID do GA4</span>
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
                        className="brandops-input"
                        placeholder="506034252"
                      />
                    </label>
                    <label className="space-y-2 text-sm">
                      <span className="font-medium text-on-surface">Timezone da propriedade</span>
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
                        className="brandops-input"
                        placeholder="America/Sao_Paulo"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={handleGa4Sync}
                      disabled={syncingGa4 || currentState.mode !== "api" || !currentState.propertyId}
                      className="brandops-button brandops-button-secondary"
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
                  </>
                ) : null}

                <div className="rounded-2xl border border-outline bg-surface-container-low p-4 text-sm text-on-surface-variant">
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
                </div>
              </div>
            </SurfaceCard>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <SurfaceCard>
          <SectionHeading
            title="Regras de operação"
            description="O dado consolidado continua indo para o mesmo banco. O que muda é a origem de cada bloco por loja."
          />
          <div className="mt-5 space-y-4 text-sm text-on-surface-variant">
            <div className="flex items-start gap-3">
              <Link2 size={16} className="mt-1 text-secondary" />
              <p>
                `INK` segue manual por CSV, porque a plataforma não oferece API operacional hoje.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <RefreshCcw size={16} className="mt-1 text-secondary" />
              <p>
                `Meta` pode ficar em API e manter o CSV como fallback para contingência e auditoria.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <Radar size={16} className="mt-1 text-secondary" />
              <p>
                `GA4` é configurado por propriedade. Se uma loja não tem GA4, deixe desabilitado.
              </p>
            </div>
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <SectionHeading
            title="Segurança e próximos passos"
            description="Segredos e tokens continuam fora do frontend."
          />
          <div className="mt-5 grid gap-3">
            <article className="panel-muted flex items-start gap-3 p-4">
              <ShieldCheck size={18} className="mt-0.5 text-secondary" />
              <div className="text-sm text-on-surface-variant">
                <p className="font-medium text-on-surface">Segredos não ficam aqui</p>
                <p className="mt-1">
                  Esta tela guarda apenas configuração não sensível por marca. Tokens e chaves devem
                  ficar em ambiente seguro do backend.
                </p>
              </div>
            </article>
            <article className="panel-muted flex items-start gap-3 p-4">
              <KeyRound size={18} className="mt-0.5 text-secondary" />
              <div className="text-sm text-on-surface-variant">
                <p className="font-medium text-on-surface">OMD já preparada para GA4</p>
                <p className="mt-1">
                  A propriedade <span className="font-medium text-on-surface">506034252</span> já
                  pode ser associada à loja `Oh My Dog` assim que a service account estiver pronta.
                </p>
                <Link href="/traffic" className="mt-3 inline-flex text-secondary hover:underline">
                  Abrir painel de tráfego →
                </Link>
              </div>
            </article>
          </div>
        </SurfaceCard>
      </section>
    </div>
  );
}
