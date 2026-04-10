"use client";


import { useState } from "react";
import Link from "next/link";
import { AlertCircle, DatabaseZap, KeyRound, Link2, ShieldCheck, Sparkles, type LucideIcon } from "lucide-react";
import {
  OperationalMetric,
  OperationalMetricStrip,
  PageHeader,
  SectionHeading,
  SurfaceCard,
  WorkspaceTabs,
} from "@/components/ui-shell";
import { APP_ROUTES } from "@/lib/brandops/routes";

type HelpTab = "operation" | "integrations" | "configurations" | "security";

const helpTabs: Array<{ key: HelpTab; label: string }> = [
  { key: "operation", label: "Operação" },
  { key: "integrations", label: "Integrações" },
  { key: "configurations", label: "Configurações" },
  { key: "security", label: "Segurança" },
];

const operationCards = [
  {
    title: "Torre de Controle",
    icon: Sparkles,
    items: [
      "Faturado vem da exportação da INK.",
      "Margem de contribuição = RLD menos CMV menos mídia.",
      "Resultado = margem menos despesas operacionais.",
    ],
  },
  {
    title: "DRE consolidado",
    icon: DatabaseZap,
    items: [
      "DRE histórico mostra a série completa da marca.",
      "DRE filtrado respeita o período selecionado.",
      "Ponto de equilíbrio usa a margem atual para estimar a RLD necessária.",
    ],
  },
  {
    title: "Saneamento",
    icon: AlertCircle,
    items: [
      "Manter, ignorar e pendente ficam gravados no banco.",
      "O histórico não depende do filtro global.",
      "A decisão volta a aparecer no fluxo ao retomar a operação.",
    ],
  },
  {
    title: "CMV e lançamentos",
    icon: ShieldCheck,
    items: [
      "CMV é aplicado por tipo de peça com vigência histórica.",
      "Lançamentos de DRE entram por competência mensal.",
      "O backend mantém os cálculos canônicos para a operação.",
    ],
  },
];

const integrationCards = [
  {
    title: "Origem por loja",
    icon: Link2,
    items: [
      "INK segue por CSV manual.",
      "Meta pode operar em API ou fallback manual.",
      "GA4 só fica ativo quando a credencial da própria loja foi salva.",
    ],
  },
  {
    title: "Meta Ads",
    icon: Sparkles,
    items: [
      "Cada marca precisa salvar o próprio token.",
      "Segredos ficam no backend, nunca no navegador.",
      "Se a API falhar, o fallback manual continua disponível.",
    ],
  },
  {
    title: "GA4",
    icon: DatabaseZap,
    items: [
      "Cada marca precisa de uma Property ID válida.",
      "A service account deve ter acesso de leitura na propriedade.",
      "Sem credencial, o modo correto é desabilitado.",
    ],
  },
  {
    title: "Catálogo",
    icon: Link2,
    items: [
      "Feed manual e Meta Catalog podem coexistir.",
      "A camada de catálogo deve preservar a fonte original.",
      "O objetivo é permitir leitura operacional e base para criativos.",
    ],
  },
];

const securityCards = [
  {
    title: "Preparo da plataforma",
    icon: KeyRound,
    items: [
      "Algumas integrações dependem de preparo técnico prévio da plataforma.",
      "Se a loja salvou tudo corretamente e ainda assim não consegue operar, pode existir uma pendência estrutural do ambiente.",
      "Nesse caso, o caminho certo é acionar o gestor da plataforma, não insistir na mesma credencial.",
    ],
  },
  {
    title: "Boas práticas",
    icon: ShieldCheck,
    items: [
      "Backend manda; frontend só renderiza e opera.",
      "Cada loja deve usar a própria credencial para Meta e GA4.",
      "Cálculo canônico não deve nascer no navegador.",
    ],
  },
  {
    title: "Diagnóstico rápido",
    icon: AlertCircle,
    items: [
      "Se o erro aparecer logo ao salvar a credencial, revise primeiro se o problema é da loja ou do ambiente da plataforma.",
      "Erro (#100) da Meta indica token ou app sem permissão para a API do catálogo.",
      "Se a integração não existe, deixe o modo desabilitado.",
    ],
  },
];

const configurationCards = [
  {
    title: "Configurações",
    icon: ShieldCheck,
    items: [
      "Plano, governança e rotina operacional da marca ficam aqui.",
      "Contexto do negócio deve ficar documentado fora da Torre de Controle.",
      "Use esta área para regras da operação, não para conexão técnica.",
    ],
  },
  {
    title: "Integrações",
    icon: Link2,
    items: [
      "Meta e GA4 devem receber credencial própria de cada loja.",
      "Salve primeiro o modo e os IDs operacionais; salve a credencial depois.",
      "A aba de integrações cuida de conexão, sync e saúde do conector.",
    ],
  },
  {
    title: "Governança SaaS",
    icon: DatabaseZap,
    items: [
      "Plano da marca, limites e liberações pertencem à governança.",
      "Esse controle deve ficar com o superadmin e não com a operação do dia a dia.",
      "A marca pode enxergar recursos bloqueados, mas a liberação nasce em Admin > Lojas.",
    ],
  },
  {
    title: "Ambiente",
    icon: KeyRound,
    items: [
      "Variáveis de ambiente e migrations são responsabilidade da plataforma.",
      "A proteção dos segredos por marca é tratada na camada técnica da plataforma.",
      "Erro de infraestrutura não deve ser tratado como erro do provedor da loja.",
    ],
  },
];

const tutorialSteps = [
  "Selecione a marca correta antes de editar qualquer integração.",
  "Salve primeiro o modo da integração e os IDs operacionais.",
  "Depois salve a credencial própria da loja.",
  "Só execute sincronização depois de configuração e credencial estarem salvas.",
];

const providerTutorials = [
  {
    title: "Meta Ads",
    eyebrow: "Passo a passo",
    items: [
      "Defina o modo API se a loja vai sincronizar mídia e catálogo.",
      "Preencha ID da conta de anúncios e, se houver, ID do catálogo.",
      "Salve a configuração e depois salve o token próprio da loja.",
      "Se aparecer (#100), revise permissões do app, Business Manager e catálogo.",
    ],
  },
  {
    title: "GA4",
    eyebrow: "Passo a passo",
    items: [
      "Defina o modo API e preencha a Property ID.",
      "Ajuste a timezone da propriedade quando necessário.",
      "Salve a configuração e depois salve o JSON completo da service account.",
      "A service account precisa ter acesso de leitura à propriedade GA4.",
    ],
  },
];

function cardDescription(title: string) {
  if (title === "Torre de Controle") return "Leitura rápida para receita, margem e pressão de custo.";
  if (title === "DRE consolidado") return "Separação clara entre série histórica e recorte filtrado.";
  if (title === "Saneamento") return "Trilha auditável para manter, ignorar ou devolver decisões.";
  if (title === "CMV e lançamentos") return "Base gerencial para custo histórico e competência mensal.";
  if (title === "Origem por loja") return "Cada fonte opera no modo certo por marca.";
  if (title === "Meta Ads") return "Sincronização segura por loja, com fallback manual preservado.";
  if (title === "GA4") return "Ativo só quando propriedade e credencial estiverem corretas.";
  if (title === "Catálogo") return "Feed manual e Meta Catalog podem coexistir.";
  if (title === "Preparo da plataforma") return "Quando a loja configurou tudo certo e ainda falha, o problema pode estar na camada técnica da plataforma.";
  if (title === "Boas práticas") return "Backend manda; frontend só opera e apresenta.";
  if (title === "Diagnóstico rápido") return "Separar erro de infraestrutura de erro real do provedor reduz retrabalho.";
  if (title === "Configurações") return "Central estratégica para governança e contexto da marca.";
  if (title === "Integrações") return "Conexão técnica, credenciais por loja e sincronizações.";
  if (title === "Governança SaaS") return "Planos, limites e liberações por marca.";
  if (title === "Ambiente") return "Infraestrutura, envs e migrações que sustentam a plataforma.";
  return "Resumo objetivo para orientar a próxima ação da operação.";
}

function HelpCallout({
  title,
  icon: Icon,
  items,
}: {
  title: string;
  icon: LucideIcon;
  items: string[];
}) {
  return (
    <article className="atlas-soft-subcard p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-secondary-container/70 text-secondary">
          <Icon size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="atlas-analytics-eyebrow">{title}</p>
          <p className="mt-1.5 text-[0.95rem] font-semibold leading-6 text-on-surface">
            {cardDescription(title)}
          </p>
          <ul className="mt-3 atlas-component-stack-tight text-[13px] leading-6 text-on-surface-variant">
            {items.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-secondary/80" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </article>
  );
}

export default function HelpPage() {
  const [activeTab, setActiveTab] = useState<HelpTab>("operation");

  return (
    <div className="atlas-page-stack-compact">
      <PageHeader
        eyebrow="Central de ajuda"
        title="BrandOps em operação"
        description="Guias curtos para operação, integrações, configurações e segurança."
        actions={
          <WorkspaceTabs
            items={helpTabs.map((tab) => ({
              key: tab.key,
              label: tab.label,
              active: activeTab === tab.key,
              onClick: () => setActiveTab(tab.key),
            }))}
          />
        }
      />

      <OperationalMetricStrip desktopColumns={3}>
        <OperationalMetric
          label="Leitura"
          value="Backend"
          helper="Cálculos e decisões saem do backend. O front só apresenta e opera."
          tone="info"
        />
        <OperationalMetric
          label="Integração"
          value="Por loja"
          helper="Meta e GA4 usam credencial própria de cada marca."
        />
        <OperationalMetric
          label="Confiança"
          value="Auditável"
          helper="Saneamento, histórico e credenciais ficam consistentes e rastreáveis."
          tone="positive"
        />
      </OperationalMetricStrip>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(18rem,0.92fr)]">
        <SurfaceCard>
          <SectionHeading
            title="Abrir agora"
            description="Use os atalhos principais para resolver a frente certa."
          />
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <Link href={APP_ROUTES.integrationsTutorials} className="atlas-soft-subcard p-4 transition hover:border-secondary/30">
              <p className="atlas-analytics-eyebrow">Atalho principal</p>
              <p className="mt-1.5 text-[0.95rem] font-semibold text-on-surface">Tutoriais de integração</p>
              <p className="mt-2 text-sm leading-6 text-on-surface-variant">Passo a passo por provedor, com validação e erro comum.</p>
            </Link>
            <Link href={APP_ROUTES.settings} className="atlas-soft-subcard p-4 transition hover:border-secondary/30">
              <p className="atlas-analytics-eyebrow">Configurações</p>
              <p className="mt-1.5 text-[0.95rem] font-semibold text-on-surface">Central estratégica</p>
              <p className="mt-2 text-sm leading-6 text-on-surface-variant">Governança, contexto e regras operacionais da marca.</p>
            </Link>
            <Link href={APP_ROUTES.integrations} className="atlas-soft-subcard p-4 transition hover:border-secondary/30">
              <p className="atlas-analytics-eyebrow">Conexão técnica</p>
              <p className="mt-1.5 text-[0.95rem] font-semibold text-on-surface">Integrações</p>
              <p className="mt-2 text-sm leading-6 text-on-surface-variant">Conexões, saúde do conector e sincronizações da loja.</p>
            </Link>
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <div className="atlas-component-stack">
            <article className="panel-muted p-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-on-surface-variant">
                Regra principal
              </p>
              <p className="mt-2 font-semibold text-on-surface">
                Backend calcula, frontend opera.
              </p>
              <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                Credenciais são por loja, decisões ficam auditáveis e a interface só organiza a operação.
              </p>
            </article>
            <article className="panel-muted p-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-on-surface-variant">
                Quando agir
              </p>
              <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                Use Ajuda para entender o fluxo. Use Integrações e Configurações quando a ação pedir execução real.
              </p>
            </article>
          </div>
        </SurfaceCard>
      </section>

      <SurfaceCard className="overflow-hidden p-0">
        <div className="px-4 py-4">
          {activeTab === "operation" && (
            <section className="grid gap-4 xl:grid-cols-2">
              {operationCards.map((card) => (
                <HelpCallout
                  key={card.title}
                  title={card.title}
                  icon={card.icon}
                  items={card.items}
                />
              ))}
            </section>
          )}

          {activeTab === "integrations" && (
<div className="atlas-component-stack">
              <section className="grid gap-4 xl:grid-cols-2">
                {integrationCards.map((card) => (
                  <HelpCallout
                    key={card.title}
                    title={card.title}
                    icon={card.icon}
                    items={card.items}
                  />
                ))}
              </section>

              <section className="rounded-3xl border border-outline bg-surface-container-low px-4 py-4 sm:px-5">
<div className="atlas-component-stack-tight">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                    Tutorial rápido
                  </p>
                  <h2 className="text-lg font-semibold text-on-surface">
                    Ordem recomendada para configurar uma loja
                  </h2>
                </div>

                <ol className="mt-4 grid gap-3 md:grid-cols-2">
                  {tutorialSteps.map((step, index) => (
                    <li
                      key={step}
                      className="rounded-2xl border border-outline bg-surface px-4 py-3 text-sm leading-6 text-on-surface"
                    >
                      <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/12 text-xs font-semibold text-primary">
                        {index + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </section>

              <details className="atlas-disclosure">
                <summary>
                  <span>Abrir passos por provedor</span>
                  <span>{providerTutorials.length}</span>
                </summary>
                <section className="mt-4 grid gap-4 xl:grid-cols-3">
                  {providerTutorials.map((provider) => (
                    <article key={provider.title} className="atlas-soft-subcard p-4">
                      <p className="atlas-analytics-eyebrow">{provider.eyebrow}</p>
                      <p className="mt-1.5 text-[0.95rem] font-semibold text-on-surface">{provider.title}</p>
                      <ul className="mt-3 atlas-component-stack-tight text-[13px] leading-6 text-on-surface-variant">
                        {provider.items.map((item) => (
                          <li key={item} className="flex gap-2">
                            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-secondary/80" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </article>
                  ))}
                </section>
              </details>

              <section className="rounded-3xl border border-outline bg-surface-container-low px-4 py-4 sm:px-5">
<div className="atlas-component-stack-tight">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                    Tutoriais detalhados
                  </p>
                  <h2 className="text-lg font-semibold text-on-surface">
                    Abra o passo a passo por provedor
                  </h2>
                  <p className="text-sm leading-6 text-on-surface-variant">
                    Quando a operação pedir mais detalhe, use os tutoriais completos da área de
                    integrações.
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href={APP_ROUTES.integrationsTutorialMeta} prefetch={false} className="brandops-button brandops-button-ghost">
                    Tutorial Meta
                  </Link>
                  <Link href={APP_ROUTES.integrationsTutorialGa4} prefetch={false} className="brandops-button brandops-button-ghost">
                    Tutorial GA4
                  </Link>
                </div>
              </section>
            </div>
          )}

          {activeTab === "security" && (
            <section className="grid gap-4 xl:grid-cols-2">
              {securityCards.map((card) => (
                <HelpCallout
                  key={card.title}
                  title={card.title}
                  icon={card.icon}
                  items={card.items}
                />
              ))}
            </section>
          )}

          {activeTab === "configurations" && (
<div className="atlas-component-stack">
              <section className="grid gap-4 xl:grid-cols-2">
                {configurationCards.map((card) => (
                  <HelpCallout
                    key={card.title}
                    title={card.title}
                    icon={card.icon}
                    items={card.items}
                  />
                ))}
              </section>

              <section className="rounded-3xl border border-outline bg-surface-container-low px-4 py-4 sm:px-5">
<div className="atlas-component-stack-tight">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                    Arquitetura recomendada
                  </p>
                  <h2 className="text-lg font-semibold text-on-surface">
                    Onde cada decisão deve morar
                  </h2>
        <p className="text-sm leading-6 text-on-surface-variant">
          Manter conexão, governança e resultado em lugares separados reduz ruído e deixa o BrandOps mais pronto para escalar como SaaS.
        </p>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-outline bg-surface px-4 py-3 text-sm leading-6 text-on-surface">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                      Integrações
                    </span>
                    <p className="mt-1 text-on-surface-variant">
                      Conectar fontes, salvar credenciais por loja e executar sincronizações.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-outline bg-surface px-4 py-3 text-sm leading-6 text-on-surface">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                      Configurações
                    </span>
        <p className="mt-1 text-on-surface-variant">
          Definir plano, limites e contexto operacional da marca.
        </p>
                  </div>
                  <div className="rounded-2xl border border-outline bg-surface px-4 py-3 text-sm leading-6 text-on-surface">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                      Admin &gt; Lojas
                    </span>
                    <p className="mt-1 text-on-surface-variant">
                      Controlar plano, recursos liberados, governança e expansão SaaS.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-outline bg-surface px-4 py-3 text-sm leading-6 text-on-surface">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                      Torre
                    </span>
                    <p className="mt-1 text-on-surface-variant">
                      Consumir o que já foi configurado para mostrar pressão, prioridade e decisão.
                    </p>
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>
      </SurfaceCard>
    </div>
  );
}

