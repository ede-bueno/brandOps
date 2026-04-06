"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarClock, CheckCircle2, Loader2, Radar } from "lucide-react";
import { useBrandOps } from "./BrandOpsProvider";
import { FormField, InlineNotice, SectionHeading } from "./ui-shell";
import {
  getIntegrationAutoSyncSettings,
  getNextAutoSyncAtLabel,
  INTEGRATION_AUTO_SYNC_INTERVAL_OPTIONS,
} from "@/lib/brandops/integration-automation-ui";

type ProviderScheduleState = {
  enabled: boolean;
  intervalHours: number;
};

type ScheduleState = {
  meta: ProviderScheduleState;
  ga4: ProviderScheduleState;
};

const DEFAULT_SCHEDULE_STATE: ScheduleState = {
  meta: {
    enabled: false,
    intervalHours: 6,
  },
  ga4: {
    enabled: false,
    intervalHours: 6,
  },
};

function getIntervalLabel(hours: number) {
  return hours === 1 ? "1 hora" : `${hours} horas`;
}

export function IntegrationAutomationSettingsPanel() {
  const { activeBrand, session, refreshActiveBrand, profile } = useBrandOps();
  const [formState, setFormState] = useState<ScheduleState>(DEFAULT_SCHEDULE_STATE);
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const canManage = profile?.role === "SUPER_ADMIN";
  const metaIntegration =
    activeBrand?.integrations.find((integration) => integration.provider === "meta") ?? null;
  const ga4Integration =
    activeBrand?.integrations.find((integration) => integration.provider === "ga4") ?? null;

  useEffect(() => {
    setFormState({
      meta: {
        enabled: getIntegrationAutoSyncSettings(metaIntegration).enabled,
        intervalHours: getIntegrationAutoSyncSettings(metaIntegration).intervalHours,
      },
      ga4: {
        enabled: getIntegrationAutoSyncSettings(ga4Integration).enabled,
        intervalHours: getIntegrationAutoSyncSettings(ga4Integration).intervalHours,
      },
    });
    setNotice(null);
  }, [ga4Integration, metaIntegration]);

  const automationCards = useMemo(
    () => [
      {
        provider: "meta" as const,
        title: "Meta Ads",
        description: "Executa o sync de mídia da loja pela cadência definida abaixo.",
        integration: metaIntegration,
        state: formState.meta,
      },
      {
        provider: "ga4" as const,
        title: "Google Analytics 4",
        description: "Atualiza tráfego e funil da loja pela janela programada.",
        integration: ga4Integration,
        state: formState.ga4,
      },
    ],
    [formState.ga4, formState.meta, ga4Integration, metaIntegration],
  );

  async function handleSave() {
    if (!activeBrand?.id || !session?.access_token) {
      setNotice({
        kind: "error",
        text: "Sessão inválida para salvar a automação de sync.",
      });
      return;
    }

    try {
      setIsSaving(true);
      setNotice(null);

      const integrations = [
        {
          provider: "meta",
          mode: metaIntegration?.mode ?? "manual_csv",
          settings: {
            autoSyncEnabled: formState.meta.enabled,
            autoSyncIntervalHours: formState.meta.intervalHours,
          },
        },
        {
          provider: "ga4",
          mode: ga4Integration?.mode ?? "disabled",
          settings: {
            autoSyncEnabled: formState.ga4.enabled,
            autoSyncIntervalHours: formState.ga4.intervalHours,
          },
        },
      ];

      const response = await fetch(`/api/admin/brands/${activeBrand.id}/integrations`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ integrations }),
      });

      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? "Não foi possível salvar a automação de sync.");
      }

      await refreshActiveBrand();
      setNotice({
        kind: "success",
        text: "Cadência automática de Meta e GA4 atualizada para esta loja.",
      });
    } catch (error) {
      setNotice({
        kind: "error",
        text:
          error instanceof Error
            ? error.message
            : "Não foi possível salvar a automação de sync.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div id="integration-automation" className="space-y-4">
      <SectionHeading
        title="Cadência de sincronização"
        description="Programe Meta e GA4 por loja sem depender de execução manual."
        aside={<CalendarClock size={14} className="text-primary" />}
      />

      <div className="grid gap-3 xl:grid-cols-2">
        {automationCards.map((item) => {
          const nextRunLabel = getNextAutoSyncAtLabel(item.integration);
          const isApiMode = item.integration?.mode === "api";
          const credentialReady = item.provider === "meta"
            ? Boolean(item.integration?.settings.hasApiKey)
            : Boolean(item.integration?.settings.hasApiKey);

          return (
            <article key={item.provider} className="atlas-soft-section px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                    {item.title}
                  </p>
                  <p className="mt-2 text-[11px] leading-5 text-on-surface-variant">
                    {item.description}
                  </p>
                </div>
                <span className="atlas-soft-pill">
                  {item.state.enabled ? getIntervalLabel(item.state.intervalHours) : "Manual"}
                </span>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-[auto_minmax(0,1fr)] md:items-center">
                <label className="atlas-soft-subcard flex items-center gap-3 px-3 py-3 text-[11px] font-semibold text-on-surface">
                  <input
                    type="checkbox"
                    checked={item.state.enabled}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        [item.provider]: {
                          ...current[item.provider],
                          enabled: event.target.checked,
                        },
                      }))
                    }
                    disabled={!canManage || !isApiMode}
                  />
                  Rodar automaticamente
                </label>

                <FormField label="Intervalo" className="text-sm">
                  <select
                    value={String(item.state.intervalHours)}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        [item.provider]: {
                          ...current[item.provider],
                          intervalHours: Number(event.target.value),
                        },
                      }))
                    }
                    className="brandops-input w-full"
                    disabled={!canManage || !isApiMode || !item.state.enabled}
                  >
                    {INTEGRATION_AUTO_SYNC_INTERVAL_OPTIONS.map((hours) => (
                      <option key={hours} value={hours}>
                        {getIntervalLabel(hours)}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>

              <div className="mt-4 grid gap-2 md:grid-cols-2">
                <div className="atlas-soft-subcard px-3 py-3 text-[11px] leading-5 text-on-surface">
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                    Próxima execução estimada
                  </span>
                  <span className="mt-1 block">{item.state.enabled ? nextRunLabel : "Somente manual"}</span>
                </div>
                <div className="atlas-soft-subcard px-3 py-3 text-[11px] leading-5 text-on-surface">
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                    Prontidão
                  </span>
                  <span className="mt-1 block">
                    {!isApiMode
                      ? "Ative API primeiro"
                      : credentialReady
                        ? "Fonte pronta"
                        : "Credencial pendente"}
                  </span>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {notice ? (
        <InlineNotice
          tone={notice.kind === "success" ? "success" : "warning"}
          icon={notice.kind === "success" ? <CheckCircle2 size={14} /> : <Radar size={14} />}
        >
          <p className="text-[11px] leading-5">{notice.text}</p>
        </InlineNotice>
      ) : null}

      {!canManage ? (
        <InlineNotice tone="info" icon={<Radar size={14} />}>
          <p className="text-[11px] leading-5">
            A cadência automática é configurada pelo superadmin da plataforma.
          </p>
        </InlineNotice>
      ) : (
        <div className="flex items-center justify-between gap-3 border-t border-outline/60 pt-3">
          <p className="text-[11px] leading-5 text-on-surface-variant">
            A produção atual verifica esta fila uma vez por dia. Se a infraestrutura for ampliada, a cadência pode ficar mais curta sem mudar esta tela.
          </p>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-primary/25 bg-primary px-3 py-2 text-[11px] font-semibold text-on-primary transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? <Loader2 size={13} className="animate-spin" /> : null}
            Salvar cadência
          </button>
        </div>
      )}
    </div>
  );
}
