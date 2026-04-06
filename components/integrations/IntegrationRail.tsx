import Link from "next/link";
import type { ElementType } from "react";
import { ArrowUpRight } from "lucide-react";
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
  tutorialHref,
  tutorialCtaLabel,
  providerIcons,
  providerLabels,
  providerEyebrows,
  formatSyncLabel,
  className,
}: {
  providerHealthSummary: ProviderSummary[];
  activeProvider: IntegrationProvider;
  activeSection: "config" | "sync" | "rules";
  activateWorkspace: (provider: IntegrationProvider, section: "config" | "sync" | "rules") => void;
  tutorialHref: string;
  tutorialCtaLabel: string;
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
      <SectionHeading title="Conexões da loja" description="Escolha a frente e vá direto ao ponto." />
      <div className="mt-4 xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:pr-1">
        <div className="space-y-2">
        {providerHealthSummary.map(({ provider, integration, health }) => {
          const ProviderIcon = providerIcons[provider];
          return (
            <button
              key={provider}
              type="button"
              data-active={activeProvider === provider}
              onClick={() => activateWorkspace(provider, activeSection)}
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
      </div>

      <div className="mt-4 border-t border-outline/50 pt-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Atalhos úteis</p>
        <div className="mt-3 space-y-2">
          <Link href={tutorialHref} className="brandops-button brandops-button-ghost w-full justify-between">
            {tutorialCtaLabel}
            <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>
    </SurfaceCard>
  );
}
