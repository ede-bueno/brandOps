import type { ElementType } from "react";
import { SectionHeading, SurfaceCard } from "@/components/ui-shell";
import type { BrandIntegrationConfig, IntegrationProvider } from "@/lib/brandops/types";

type HealthTone = "default" | "positive" | "warning" | "info";

type ProviderSummary = {
  provider: IntegrationProvider;
  integration: BrandIntegrationConfig | undefined;
  health: {
    label: string;
    description: string;
    tone: HealthTone;
  };
};

export function IntegrationRail({
  providerHealthSummary,
  activeProvider,
  activeSection,
  activateWorkspace,
  providerIcons,
  providerLabels,
  providerEyebrows,
  formatSyncLabel,
  className,
}: {
  providerHealthSummary: ProviderSummary[];
  activeProvider: IntegrationProvider;
  activeSection: "overview" | "config" | "sync" | "rules";
  activateWorkspace: (
    provider: IntegrationProvider,
    section: "overview" | "config" | "sync" | "rules",
  ) => void;
  providerIcons: Record<IntegrationProvider, ElementType>;
  providerLabels: Record<IntegrationProvider, string>;
  providerEyebrows: Record<IntegrationProvider, string>;
  formatSyncLabel: (integration?: BrandIntegrationConfig) => string;
  className?: string;
}) {
  return (
    <SurfaceCard
      className={`atlas-integration-nav self-start p-3.5 xl:flex xl:h-full xl:min-h-0 xl:flex-col ${className ?? ""}`}
    >
      <SectionHeading title="Conectores" description="Escolha a fonte." />
      <div className="mt-4 xl:min-h-0 xl:flex-1">
        <div className="space-y-2">
          {providerHealthSummary.map(({ provider, integration, health }) => {
            const ProviderIcon = providerIcons[provider];
            const isActive = activeProvider === provider;

            return (
              <button
                key={provider}
                type="button"
                aria-pressed={isActive}
                data-active={isActive}
                onClick={() => activateWorkspace(provider, isActive ? activeSection : "overview")}
                className={[
                  "atlas-integration-provider-button w-full text-left transition-transform duration-150",
                  isActive ? "pl-4 ring-1 ring-primary/28 translate-x-0" : "ml-1 pl-4.5 opacity-92 hover:opacity-100",
                ].join(" ")}
              >
                <div className="atlas-integration-provider-head">
                  <span className="atlas-integration-provider-icon">
                    <ProviderIcon size={15} aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-on-surface">{providerLabels[provider]}</p>
                      {isActive ? <span className="atlas-soft-pill">aberto</span> : null}
                    </div>
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
      </div>
    </SurfaceCard>
  );
}
