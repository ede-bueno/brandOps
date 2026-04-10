import type { LucideIcon } from "lucide-react";
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
  providerIcons: Record<IntegrationProvider, LucideIcon>;
  providerLabels: Record<IntegrationProvider, string>;
  providerEyebrows: Record<IntegrationProvider, string>;
  formatSyncLabel: (integration?: BrandIntegrationConfig) => string;
  className?: string;
}) {
  return (
    <SurfaceCard
      className={`atlas-integration-nav self-start xl:flex xl:h-full xl:min-h-0 xl:flex-col ${className ?? ""}`}
    >
      <SectionHeading title="Conectores" description="Escolha a fonte." />
      <div className="mt-5 xl:min-h-0 xl:flex-1">
        <div className="atlas-component-stack-compact">
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
                  "atlas-integration-provider-button w-full text-left transition-colors duration-150",
                  isActive ? "translate-x-0" : "opacity-95 hover:opacity-100",
                ].join(" ")}
              >
                <div className="atlas-integration-provider-head">
                  <span className="atlas-integration-provider-icon">
                    <ProviderIcon size={15} aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-on-surface">{providerLabels[provider]}</p>
                      <span className="text-[10px] uppercase tracking-[0.14em] text-ink-muted">
                        {isActive ? "ativo" : providerEyebrows[provider]}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] leading-5 text-on-surface-variant">
                      {health.description}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="atlas-inline-metric">{health.label}</span>
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

