import Link from "next/link";
import { ArrowUpRight, BookOpen, ExternalLink } from "lucide-react";
import { PageHeader, SectionHeading, SurfaceCard } from "@/components/ui-shell";
import { INTEGRATION_TUTORIALS } from "@/lib/brandops/integration-tutorials";

export default function IntegrationTutorialsPage() {
  const tutorials = Object.values(INTEGRATION_TUTORIALS);

  return (
    <div className="atlas-page-stack">
      <PageHeader
        eyebrow="Integrações"
        title="Tutoriais guiados"
        description="Escolha o provedor certo e siga um passo a passo curto, direto e validável."
      />

      <SurfaceCard>
        <SectionHeading
          title="Escolha a frente que deseja configurar"
          description="Cada tutorial foi escrito para o operador da loja, com foco em ação e validação."
        />

        <div className="mt-5 grid gap-4 xl:grid-cols-3">
          {tutorials.map((tutorial) => (
            <article key={tutorial.provider} className="atlas-soft-subcard flex h-full flex-col">
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
