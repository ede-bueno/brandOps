import Link from "next/link";
import { Link2, Radar, RefreshCcw, ShieldCheck } from "lucide-react";
import { SectionHeading, StackItem, SurfaceCard } from "@/components/ui-shell";
import type { BrandIntegrationConfig, IntegrationMode, IntegrationProvider } from "@/lib/brandops/types";

type HealthTone = "default" | "positive" | "warning" | "info";

type IntegrationStateSummary = {
  mode: IntegrationMode;
  hasApiKey: boolean;
  apiKeyHint: string;
};

export function IntegrationRadar({
  activeProvider,
  current,
  currentState,
  providerNextAction,
  tutorialHref,
  tutorialCtaLabel,
  formatSyncLabel,
  className,
}: {
  activeProvider: IntegrationProvider;
  current: BrandIntegrationConfig | undefined;
  currentState: IntegrationStateSummary;
  providerNextAction: { title: string; description: string; tone: HealthTone };
  tutorialHref: string;
  tutorialCtaLabel: string;
  formatSyncLabel: (integration?: BrandIntegrationConfig) => string;
  className?: string;
}) {
  return (
    <SurfaceCard
      className={`self-start p-4 xl:flex xl:h-full xl:min-h-0 xl:flex-col ${className ?? ""}`}
    >
      <SectionHeading title="Radar lateral" description="Só o que ajuda a decidir o próximo passo." />
      <div className="mt-5 grid gap-3 xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:pr-1">
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
        <div className="flex flex-wrap gap-2 pt-1">
          <Link href={tutorialHref} className="brandops-button brandops-button-ghost">
            {tutorialCtaLabel}
          </Link>
        </div>
      </div>
    </SurfaceCard>
  );
}
