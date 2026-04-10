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
  const shortGuide =
    activeProvider === "meta"
      ? "Confirme conta, catálogo e só sincronize quando a fonte mudar."
      : activeProvider === "ga4"
        ? "Valide a propriedade e reidrate a leitura quando o funil pedir revisão."
        : "Mantenha a rotina de upload limpa para preservar a origem comercial.";

  return (
    <div className={`atlas-component-stack-tight ${className ?? ""}`}>
      <SurfaceCard>
        <SectionHeading
          title="Situação agora"
          description="Só o que ajuda a decidir o próximo passo."
        />

        <div className="mt-4 grid gap-2 lg:grid-cols-3">
          <StackItem
            title={providerNextAction.title}
            description={providerNextAction.description}
            aside={<Radar size={16} className="text-secondary" aria-hidden="true" />}
            tone={providerNextAction.tone}
          />

          <StackItem
            title="Credencial da loja"
            description={
              activeProvider === "ink"
                ? "A origem comercial da INK segue manual e não depende de segredo por API."
                : currentState.hasApiKey
                  ? `Segredo salvo em ${currentState.apiKeyHint || "ambiente seguro"}.`
                  : "Ainda falta salvar a credencial própria desta loja."
            }
            aside={<ShieldCheck size={16} className="text-secondary" aria-hidden="true" />}
            tone={activeProvider === "ink" ? "default" : currentState.hasApiKey ? "positive" : "warning"}
          />

          <StackItem
            title="Última referência"
            description={formatSyncLabel(current)}
            aside={<RefreshCcw size={16} className="text-secondary" aria-hidden="true" />}
            tone="default"
          />
        </div>
      </SurfaceCard>

      <SurfaceCard>
        <SectionHeading
          title="Diretriz curta"
          description={shortGuide}
          aside={<Link2 size={14} className="text-secondary" aria-hidden="true" />}
        />
        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <p className="max-w-2xl text-[12px] leading-6 text-on-surface-variant">
            Abra o guia só quando precisar de setup ou validação. O workspace continua focado em conexão e execução.
          </p>
          <Link href={tutorialHref} className="brandops-button brandops-button-ghost w-full justify-between lg:w-auto">
            {tutorialCtaLabel}
            <Link2 size={14} />
          </Link>
        </div>
      </SurfaceCard>
    </div>
  );
}
