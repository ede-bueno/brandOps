import Link from "next/link";
import { ArrowUpRight, BookOpen, ExternalLink } from "lucide-react";
import { AnalyticsCalloutCard, AnalyticsKpiCard } from "@/components/analytics/AnalyticsPrimitives";
import { PageHeader, SectionHeading, SurfaceCard } from "@/components/ui-shell";
import { INTEGRATION_TUTORIALS } from "@/lib/brandops/integration-tutorials";

export default function IntegrationTutorialsPage() {
  const tutorials = Object.values(INTEGRATION_TUTORIALS);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Integrações"
        title="Tutoriais guiados"
        description="Escolha o provedor certo e siga um passo a passo curto, direto e validável."
      />

      <section className="grid gap-3 md:grid-cols-3">
        <AnalyticsKpiCard
          label="Provedores"
          value={String(tutorials.length)}
          description="Tutoriais ativos na central."
          tone="info"
        />
        <AnalyticsKpiCard
          label="Foco"
          value="Operação"
          description="Guias escritos para quem conecta e valida a loja."
          tone="default"
        />
        <AnalyticsKpiCard
          label="Fluxo"
          value="Passo a passo"
          description="Configuração, validação e erro comum no mesmo lugar."
          tone="positive"
        />
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <AnalyticsCalloutCard
          eyebrow="Mais usado"
          title="Meta Ads"
          description="Mídia, catálogo e permissões em um único fluxo."
          href="/integrations/tutorials/meta"
          tone="info"
        />
        <AnalyticsCalloutCard
          eyebrow="Mais sensível"
          title="GA4"
          description="Property ID, service account e leitura operacional correta."
          href="/integrations/tutorials/ga4"
          tone="default"
        />
        <AnalyticsCalloutCard
          eyebrow="Atlas IA"
          title="Gemini"
          description="Chave da loja, modelo ativo e validação do Analyst."
          href="/integrations/tutorials/gemini"
          tone="default"
        />
      </section>

      <SurfaceCard>
        <SectionHeading
          title="Escolha a frente que deseja configurar"
          description="Cada tutorial foi escrito para o operador da loja, com foco em ação e validação."
        />

        <div className="mt-5 grid gap-4 xl:grid-cols-3">
          {tutorials.map((tutorial) => (
            <article key={tutorial.provider} className="atlas-soft-subcard flex h-full flex-col p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                {tutorial.eyebrow}
              </p>
              <h2 className="mt-2 text-lg font-semibold text-on-surface">{tutorial.title}</h2>
              <p className="mt-2 text-sm leading-6 text-on-surface-variant">{tutorial.summary}</p>

              <div className="mt-4 space-y-2 text-xs text-on-surface-variant">
                <div className="flex items-start gap-2">
                  <BookOpen size={14} className="mt-0.5 text-secondary" />
                  <span>{tutorial.audience}</span>
                </div>
                <div className="flex items-start gap-2">
                  <ExternalLink size={14} className="mt-0.5 text-secondary" />
                  <span>{tutorial.externalLinks[0]?.label}</span>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <Link href={tutorial.route} className="brandops-button brandops-button-primary">
                  Abrir tutorial
                </Link>
                <a
                  href={tutorial.externalLinks[0]?.href}
                  target="_blank"
                  rel="noreferrer"
                  className="brandops-button brandops-button-ghost"
                >
                  Abrir painel externo
                  <ArrowUpRight size={14} />
                </a>
              </div>
            </article>
          ))}
        </div>
      </SurfaceCard>
    </div>
  );
}
