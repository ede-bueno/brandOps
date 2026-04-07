import type { ElementType, ReactNode } from "react";
import type { BrandIntegrationConfig, IntegrationProvider, IntegrationMode } from "@/lib/brandops/types";
import { WorkspaceTabs } from "@/components/ui-shell";

type HealthTone = "default" | "positive" | "warning" | "info";

type IntegrationSection = "overview" | "config" | "sync" | "rules";

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
  activeSection: IntegrationSection;
  activateWorkspace: (provider: IntegrationProvider, section: IntegrationSection) => void;
  headerActions: ReactNode;
  formatSyncLabel: (integration?: BrandIntegrationConfig) => string;
}) {
  return (
    <>
      <div className="flex flex-col gap-3 border-b border-outline/50 pb-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <p className="eyebrow mb-1.5">{providerEyebrows[activeProvider]}</p>
            <div className="flex items-center gap-3">
              <span className="atlas-integration-hero-icon">
                <ActiveProviderIcon size={18} />
              </span>
              <div className="min-w-0">
                <h2 className="text-[1.1rem] font-semibold tracking-tight text-on-surface">
                  {providerLabels[activeProvider]}
                </h2>
                <p className="mt-0.5 max-w-2xl text-[12px] leading-5 text-on-surface-variant">
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

        <div className="atlas-integration-summary-strip">
          <div className="atlas-integration-summary-item">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Estado</p>
            <p className="mt-1 text-[13px] font-semibold text-on-surface">
              {currentState.mode === "api"
                ? "API ativa"
                : currentState.mode === "disabled"
                  ? "Integração desligada"
                  : "Fluxo manual"}
            </p>
            <p className="mt-1 text-[11px] leading-5 text-on-surface-variant">
              {activeHealth.description}
            </p>
          </div>
          <div className="atlas-integration-summary-item">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Última referência</p>
            <p className="mt-1 text-[13px] font-semibold text-on-surface">
              {formatSyncLabel(current)}
            </p>
            <p className="mt-1 text-[11px] leading-5 text-on-surface-variant">
              {activeProvider === "ink"
                ? "Origem comercial manual da INK."
                : currentState.hasApiKey
                  ? `Credencial pronta em ${currentState.apiKeyHint || "ambiente seguro"}.`
                  : "Credencial própria ainda pendente."}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-2 border-t border-outline/50 pt-3 lg:flex-row lg:items-center lg:justify-between">
        <WorkspaceTabs
          className="overflow-x-auto"
          items={[
            {
              key: `${activeProvider}-overview`,
              label: "Resumo",
              active: activeSection === "overview",
              onClick: () => activateWorkspace(activeProvider, "overview"),
            },
            {
              key: `${activeProvider}-config`,
              label: "Conexão",
              active: activeSection === "config",
              onClick: () => activateWorkspace(activeProvider, "config"),
            },
            {
              key: `${activeProvider}-sync`,
              label: "Execução",
              active: activeSection === "sync",
              onClick: () => activateWorkspace(activeProvider, "sync"),
            },
            {
              key: `${activeProvider}-rules`,
              label: "Guia",
              active: activeSection === "rules",
              onClick: () => activateWorkspace(activeProvider, "rules"),
            },
          ]}
        />
        <div className="flex flex-wrap items-center gap-2">
          <span className="atlas-soft-pill">{current?.lastSyncStatus ?? activeHealth.label}</span>
          {headerActions}
        </div>
      </div>
    </>
  );
}
