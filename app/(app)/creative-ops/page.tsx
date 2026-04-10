"use client";

import { PageHeader, SectionHeading, SurfaceCard } from "@/components/ui-shell";
import { useBrandOps } from "@/components/BrandOpsProvider";

const targetFlow = [
  {
    title: "Produto ou linha em foco",
    description: "Escolher a base do conteúdo a partir do catálogo da marca, coleção, preço, estoque e apelo comercial.",
  },
  {
    title: "Anúncio ou campanha relacionada",
    description: "Cruzar o post com o que já performa em Meta Ads, evitando criar peça desconectada da operação real.",
  },
  {
    title: "Insight do Atlas",
    description: "Usar os sinais do recorte para sugerir ângulo, prioridade, CTA, público e objetivo da peça.",
  },
  {
    title: "Post, aprovação e publicação",
    description: "Montar a copy, revisar o destino social, aprovar e só então agendar ou publicar por API.",
  },
];

const requiredInputs = [
  "Catálogo da marca com produto, imagem, preço, disponibilidade e link.",
  "Anúncios e campanhas da Meta com criativo, desempenho e intenção de escala ou revisão.",
  "Contexto operacional do Atlas para dizer por que a peça existe agora.",
  "Destino final claro: Instagram feed, Instagram story, Facebook feed ou criativo para Meta Ads.",
];

const avoidNow = [
  "dashboard de KPIs no topo",
  "fila genérica de tarefas sem contexto de produto ou anúncio",
  "cards grandes competindo com o editor",
  "passos de publicação sem ligação clara com Instagram, Facebook ou Meta Ads",
];

export default function CreativeOpsPlanningPage() {
  const { activeBrand, selectedPeriodLabel } = useBrandOps();

  return (
    <div className="atlas-page-stack">
      <PageHeader
        eyebrow="Operação"
        title="Conteúdo social em replanejamento"
        description="Esta área saiu da operação para ser redesenhada do jeito certo: produto, anúncio e insight do Atlas primeiro; editor e publicação depois."
        actions={
          <div className="flex min-w-0 flex-wrap items-center gap-2.5">
            <span className="atlas-inline-metric">{activeBrand?.name ?? "Loja"}</span>
            <span className="atlas-inline-metric">{selectedPeriodLabel}</span>
          </div>
        }
      />

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.18fr)_minmax(20rem,0.82fr)]">
        <SurfaceCard>
          <SectionHeading
            title="Como a próxima versão precisa funcionar"
            description="A tela não vai mais ser uma mesa genérica de tarefas. Ela precisa operar como um estúdio de posts para Instagram e Facebook orientado por catálogo, anúncios e dados reais."
          />
          <div className="mt-5 grid gap-3">
            {targetFlow.map((step, index) => (
              <article key={step.title} className="atlas-list-row">
                <div className="flex items-start gap-3">
                  <span className="atlas-inline-metric">{String(index + 1).padStart(2, "0")}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-on-surface">{step.title}</p>
                    <p className="mt-1 text-[12px] leading-6 text-on-surface-variant">
                      {step.description}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </SurfaceCard>

        <div className="atlas-component-stack">
          <SurfaceCard>
            <SectionHeading
              title="Entradas obrigatórias"
              description="Sem essas bases, a funcionalidade vira um editor solto e perde valor operacional."
            />
            <div className="mt-5 atlas-component-stack-tight">
              {requiredInputs.map((item) => (
                <div key={item} className="atlas-list-row">
                  <p className="text-[12px] leading-6 text-on-surface">{item}</p>
                </div>
              ))}
            </div>
          </SurfaceCard>

          <SurfaceCard>
            <SectionHeading
              title="O que foi retirado"
              description="Esses pontos saíram da interface atual porque estavam atrapalhando a compreensão da funcionalidade."
            />
            <div className="mt-5 atlas-component-stack-tight">
              {avoidNow.map((item) => (
                <div key={item} className="atlas-list-row">
                  <p className="text-[12px] leading-6 text-on-surface">{item}</p>
                </div>
              ))}
            </div>
          </SurfaceCard>
        </div>
      </section>

      <SurfaceCard>
        <SectionHeading
          title="Próximo passo do produto"
          description="O trabalho agora deixa de ser interface e volta para especificação. A próxima implementação deve nascer como um fluxo explícito de estúdio social, já conectado às integrações certas."
        />
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <article className="panel-muted p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-on-surface-variant">
              Catálogo
            </p>
            <p className="mt-3 text-sm font-semibold text-on-surface">
              Escolha do produto base
            </p>
            <p className="mt-2 text-[12px] leading-6 text-on-surface-variant">
              A peça precisa nascer de produto, coleção ou linha selecionada.
            </p>
          </article>
          <article className="panel-muted p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-on-surface-variant">
              Mídia
            </p>
            <p className="mt-3 text-sm font-semibold text-on-surface">
              Referência de anúncio e criativo
            </p>
            <p className="mt-2 text-[12px] leading-6 text-on-surface-variant">
              O post precisa herdar aprendizado dos anúncios que já performam ou pedem revisão.
            </p>
          </article>
          <article className="panel-muted p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-on-surface-variant">
              Social
            </p>
            <p className="mt-3 text-sm font-semibold text-on-surface">
              Publicação por destino
            </p>
            <p className="mt-2 text-[12px] leading-6 text-on-surface-variant">
              Instagram e Facebook precisam ter destino, formato e aprovação humana explícitos.
            </p>
          </article>
        </div>
      </SurfaceCard>
    </div>
  );
}
