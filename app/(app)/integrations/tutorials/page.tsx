import Link from "next/link";
import { ArrowUpRight, BookOpen, ExternalLink } from "lucide-react";
import { OperationalMetric, OperationalMetricStrip, PageHeader, SectionHeading, SurfaceCard } from "@/components/ui-shell";
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

      <OperationalMetricStrip baseColumns={1} desktopColumns={2}>
        <OperationalMetric
          label="Provedores"
          value={String(tutorials.length)}
          helper="Tutoriais ativos na central."
          tone="info"
        />
        <OperationalMetric
          label="Foco"
          value="Operação"
          helper="Guias escritos para quem conecta e valida a loja."
        />
        <OperationalMetric
          label="Fluxo"
          value="Passo a passo"
          helper="Configuração, validação e erro comum no mesmo lugar."
          tone="positive"
        />
      </OperationalMetricStrip>

      <section className="grid gap-3 md:grid-cols-3">
        <article className="atlas-soft-subcard p-4">
          <p className="atlas-analytics-eyebrow">Ponto de partida</p>
          <p className="mt-1.5 text-[0.95rem] font-semibold text-on-surface">Escolha o provedor certo</p>
          <p className="mt-2 text-sm leading-6 text-on-surface-variant">Comece pelo conector que está travando a operação ou a validação da loja.</p>
        </article>
        <article className="atlas-soft-subcard p-4">
          <p className="atlas-analytics-eyebrow">Fluxo</p>
          <p className="mt-1.5 text-[0.95rem] font-semibold text-on-surface">Configurar, validar e só depois sincronizar</p>
          <p className="mt-2 text-sm leading-6 text-on-surface-variant">Cada tutorial já organiza a ordem certa para evitar retrabalho.</p>
        </article>
        <Link href="/integrations" className="atlas-soft-subcard p-4 transition hover:border-secondary/30">
          <p className="atlas-analytics-eyebrow">Atalho</p>
          <p className="mt-1.5 text-[0.95rem] font-semibold text-on-surface">Voltar para Integrações</p>
          <p className="mt-2 text-sm leading-6 text-on-surface-variant">Depois do tutorial, aplique a configuração direto no workspace técnico.</p>
        </Link>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.06fr)_minmax(18rem,0.94fr)]">
      <SurfaceCard>
          <SectionHeading
            title="Escolha a frente que deseja configurar"
            description="Cada tutorial foi escrito para ação, validação e tratamento de erro."
          />

        <div className="mt-5 grid gap-4 xl:grid-cols-2">
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

      <SurfaceCard>
        <SectionHeading
          title="Referência rápida"
          description="Resumo das frentes antes de abrir o passo a passo."
        />
        <div className="mt-5 atlas-component-stack">
          <article className="panel-muted p-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-on-surface-variant">
              Meta Ads
            </p>
            <p className="mt-2 text-sm leading-6 text-on-surface-variant">
              Conta de anúncios, token e catálogo quando a loja também usa base de produtos.
            </p>
          </article>
          <article className="panel-muted p-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-on-surface-variant">
              GA4
            </p>
            <p className="mt-2 text-sm leading-6 text-on-surface-variant">
              Property ID, timezone e JSON da service account com acesso de leitura.
            </p>
          </article>
        </div>
      </SurfaceCard>
      </section>
    </div>
  );
}
