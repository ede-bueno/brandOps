import type { ElementType, ReactNode } from "react";
import { AnalyticsKpiCard } from "@/components/analytics/AnalyticsPrimitives";
import type { BrandIntegrationConfig, IntegrationProvider, IntegrationMode } from "@/lib/brandops/types";

type HealthTone = "default" | "positive" | "warning" | "info";

type IntegrationStateSummary = {
  mode: IntegrationMode;
  hasApiKey: boolean;
  apiKeyHint: string;
};

export function IntegrationWorkspaceHeader({
  activeProvider,
  current,
  currentState,
  activeHealth,
  activeIcon: ActiveProviderIcon,
  providerLabels,
  providerDescriptions,
  providerEyebrows,
  workspaceSectionMeta,
  activeSection,
  activateWorkspace,
  headerActions,
  formatSyncLabel,
}: {
  activeProvider: IntegrationProvider;
  current: BrandIntegrationConfig | undefined;
  currentState: IntegrationStateSummary;
  activeHealth: { label: string; description: string; tone: HealthTone };
  activeIcon: ElementType;
  providerLabels: Record<IntegrationProvider, string>;
  providerDescriptions: Record<IntegrationProvider, string>;
  providerEyebrows: Record<IntegrationProvider, string>;
  workspaceSectionMeta: { eyebrow: string; title: string; description: string };
  activeSection: "config" | "sync" | "rules";
  activateWorkspace: (provider: IntegrationProvider, section: "config" | "sync" | "rules") => void;
  headerActions: ReactNode;
  formatSyncLabel: (integration?: BrandIntegrationConfig) => string;
}) {
  return (
    <>
      <div className="flex flex-col gap-4 border-b border-outline/50 pb-4">
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

        <div className="grid gap-3 lg:grid-cols-3">
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
            description="Último sinal útil deste conector."
            tone={
              current?.lastSyncStatus === "error"
                ? "warning"
                : current?.lastSyncStatus === "success"
                  ? "positive"
                  : "default"
            }
          />
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-4">
        <div className="flex flex-col gap-4 border-b border-outline/50 pb-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="eyebrow mb-2">{workspaceSectionMeta.eyebrow}</p>
            <h3 className="text-xl font-semibold text-on-surface">{workspaceSectionMeta.title}</h3>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-on-surface-variant">
              {workspaceSectionMeta.description}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="atlas-soft-pill">{current?.lastSyncStatus ?? activeHealth.label}</span>
            {headerActions}
          </div>
        </div>

        <div className="brandops-subtabs overflow-x-auto">
          <button
            type="button"
            className="brandops-subtab"
            data-active={activeSection === "config"}
            onClick={() => activateWorkspace(activeProvider, "config")}
          >
            Conectar
          </button>
          <button
            type="button"
            className="brandops-subtab"
            data-active={activeSection === "sync"}
            onClick={() => activateWorkspace(activeProvider, "sync")}
          >
            Operar
          </button>
          <button
            type="button"
            className="brandops-subtab"
            data-active={activeSection === "rules"}
            onClick={() => activateWorkspace(activeProvider, "rules")}
          >
            Regras
          </button>
        </div>
      </div>
    </>
  );
}
