import Link from "next/link";
import { ArrowLeft, ArrowUpRight, CheckCircle2, CircleAlert } from "lucide-react";
import { notFound } from "next/navigation";
import { OperationalMetric, OperationalMetricStrip, PageHeader, SectionHeading, SurfaceCard } from "@/components/ui-shell";
import { getIntegrationTutorial } from "@/lib/brandops/integration-tutorials";
import { APP_ROUTES } from "@/lib/brandops/routes";

export default async function IntegrationTutorialProviderPage({
  params,
}: {
  params: Promise<{ provider: string }>;
}) {
  const { provider } = await params;
  const tutorial = getIntegrationTutorial(provider);

  if (!tutorial) {
    notFound();
  }

  return (
    <div className="atlas-page-stack">
      <PageHeader
        eyebrow={tutorial.eyebrow}
        title={tutorial.title}
        description="Siga o caminho curto, valide o resultado e consulte erros comuns só quando precisar."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href={APP_ROUTES.integrationsTutorials} prefetch={false} className="brandops-button brandops-button-ghost">
              <ArrowLeft size={14} />
              Voltar aos tutoriais
            </Link>
            <Link href={APP_ROUTES.integrations} prefetch={false} className="brandops-button brandops-button-ghost">
              Voltar para Integrações
            </Link>
          </div>
        }
      />

      <OperationalMetricStrip baseColumns={1} desktopColumns={3}>
        <OperationalMetric
          label="Passos"
          value={String(tutorial.steps.length)}
          helper="Etapas principais do guia."
          tone="info"
        />
        <OperationalMetric
          label="Validações"
          value={String(tutorial.validation.length)}
          helper="Checks para confirmar que a integração ficou pronta."
          tone="positive"
        />
        <OperationalMetric
          label="Links oficiais"
          value={String(tutorial.externalLinks.length)}
          helper="Atalhos para o ambiente certo do provedor."
        />
      </OperationalMetricStrip>

      <section className="grid gap-3 md:grid-cols-3">
        <article className="atlas-soft-subcard p-4">
          <p className="atlas-analytics-eyebrow">Para quem é</p>
          <p className="mt-1.5 text-[0.95rem] font-semibold text-on-surface">{tutorial.audience}</p>
          <p className="mt-2 text-sm leading-6 text-on-surface-variant">Perfil esperado para executar este fluxo.</p>
        </article>
        <article className="atlas-soft-subcard p-4">
          <p className="atlas-analytics-eyebrow">Abrir agora</p>
          <p className="mt-1.5 text-[0.95rem] font-semibold text-on-surface">{tutorial.externalLinks[0]?.label ?? "Painel oficial"}</p>
          <p className="mt-2 text-sm leading-6 text-on-surface-variant">{tutorial.externalLinks[0]?.helper ?? "Abra o ambiente correto do provedor."}</p>
        </article>
        <article className="atlas-soft-subcard p-4">
          <p className="atlas-analytics-eyebrow">Resumo</p>
          <p className="mt-1.5 text-[0.95rem] font-semibold text-on-surface">{tutorial.summary}</p>
          <p className="mt-2 text-sm leading-6 text-on-surface-variant">Visão do que este tutorial cobre.</p>
        </article>
      </section>

      <SurfaceCard>
        <SectionHeading
          title="Visão geral"
          description="Pré-requisitos e contexto para executar o fluxo."
        />

        <div className="mt-5 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="atlas-soft-subcard">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
              Para quem é
            </p>
            <p className="mt-2 text-sm leading-6 text-on-surface">{tutorial.audience}</p>
          </div>
          <div className="atlas-soft-subcard">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
              Pré-requisitos
            </p>
            <ul className="mt-2 space-y-2 text-sm leading-6 text-on-surface-variant">
              {tutorial.prerequisites.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-secondary/80" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </SurfaceCard>

      <SurfaceCard>
        <SectionHeading
          title="Passo a passo"
          description="Siga a ordem abaixo para reduzir erro de configuração e validar o resultado."
        />

        <div className="atlas-component-stack">
          {tutorial.steps.map((step, index) => (
            <article key={step.title} className="atlas-soft-subcard">
              <details className="atlas-disclosure" open={index === 0}>
                <summary>
                  <span>{`${index + 1}. ${step.title}`}</span>
                  <span>abrir</span>
                </summary>
                <div className="mt-4 min-w-0">
                  <ul className="space-y-2 text-sm leading-6 text-on-surface-variant">
                    {step.items.map((item) => (
                      <li key={item} className="flex gap-2">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-secondary/80" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 rounded-2xl border border-outline/70 bg-surface px-3 py-3 text-sm text-on-surface">
                    <span className="font-semibold">Resultado esperado:</span> {step.outcome}
                  </div>
                </div>
              </details>
            </article>
          ))}
        </div>
      </SurfaceCard>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <SurfaceCard>
          <SectionHeading
            title="Validação"
            description="Use este checklist para saber se a integração realmente ficou pronta."
          />
          <div className="atlas-component-stack">
            {tutorial.validation.map((item) => (
              <div key={item} className="atlas-soft-subcard flex items-start gap-3 p-4">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-secondary" />
                <p className="text-sm leading-6 text-on-surface">{item}</p>
              </div>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <SectionHeading
            title="Erros comuns"
            description="Se algo falhar, comece por aqui antes de repetir a operação inteira."
          />
          <div className="atlas-component-stack">
            {tutorial.commonErrors.map((error) => (
              <article key={error.title} className="atlas-soft-subcard">
                <div className="flex items-start gap-3">
                  <CircleAlert size={16} className="mt-0.5 shrink-0 text-secondary" />
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-on-surface">{error.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-on-surface-variant">
                      {error.explanation}
                    </p>
                    <ul className="mt-3 space-y-2 text-sm leading-6 text-on-surface">
                      {error.actions.map((action) => (
                        <li key={action} className="flex gap-2">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-secondary/80" />
                          <span>{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </SurfaceCard>
      </div>

      <SurfaceCard>
        <SectionHeading
          title="Links oficiais"
          description="Abra sempre no ambiente certo e com a conta correta da marca."
        />

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {tutorial.externalLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className="atlas-soft-subcard flex h-full flex-col justify-between gap-3 transition hover:border-secondary/30"
            >
              <div>
                <p className="text-sm font-semibold text-on-surface">{link.label}</p>
                <p className="mt-1 text-sm leading-6 text-on-surface-variant">{link.helper}</p>
              </div>
              <span className="inline-flex items-center gap-1 text-sm font-medium text-secondary">
                Abrir
                <ArrowUpRight size={14} />
              </span>
            </a>
          ))}
        </div>
      </SurfaceCard>
    </div>
  );
}
