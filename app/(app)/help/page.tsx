"use client";

import type { ElementType } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, DatabaseZap, KeyRound, Link2, ShieldCheck, Sparkles } from "lucide-react";
import {
  AnalyticsCalloutCard,
  AnalyticsKpiCard,
} from "@/components/analytics/AnalyticsPrimitives";
import { PageHeader, SurfaceCard } from "@/components/ui-shell";
import { APP_ROUTES } from "@/lib/brandops/routes";

type HelpTab = "operation" | "integrations" | "configurations" | "security";

const helpTabs: Array<{ key: HelpTab; label: string }> = [
  { key: "operation", label: "Operação" },
  { key: "integrations", label: "Integrações" },
  { key: "configurations", label: "Configurações" },
  { key: "security", label: "Segurança" },
];

const helpHashTargets: Record<
  string,
  { tab: HelpTab; sectionId?: string }
> = {
  "#dashboard": { tab: "operation", sectionId: "help-dashboard" },
  "#torre-de-controle": { tab: "operation", sectionId: "help-dashboard" },
  "#dre": { tab: "operation", sectionId: "help-dre" },
  "#sanitization": { tab: "operation", sectionId: "help-sanitization" },
  "#cmv": { tab: "operation", sectionId: "help-cmv" },
  "#integrations": { tab: "integrations", sectionId: "help-integrations" },
  "#settings": { tab: "configurations", sectionId: "help-settings" },
  "#security": { tab: "security", sectionId: "help-security" },
};

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
      "A decisão volta a aparecer no fluxo sem precisar recarregar a marca.",
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
      "GA4 e Gemini só ficam ativos quando a credencial da própria loja foi salva.",
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
      "Cada loja deve usar a própria credencial para Meta, GA4 e Gemini.",
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
      "Modelo, temperatura, skill, janela e playbook da marca ficam aqui.",
      "Aprendizado do Atlas e contexto do negócio devem sair da Torre e ser mantidos nesta central.",
      "Use esta área para comportamento do agente, não para conexão técnica.",
    ],
  },
  {
    title: "Integrações",
    icon: Link2,
    items: [
      "Meta, GA4 e Gemini devem receber credencial própria de cada loja.",
      "Salve primeiro o modo e os IDs operacionais; salve a credencial depois.",
      "A aba de integrações cuida de conexão, sync e saúde do conector.",
    ],
  },
  {
    title: "Governança SaaS",
    icon: DatabaseZap,
    items: [
      "Plano da marca e liberações como Atlas IA, learning e catálogo de modelos pertencem à governança.",
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
  {
    title: "Gemini",
    eyebrow: "Passo a passo",
    items: [
      "Ative o modo API e escolha o modelo padrão da loja.",
      "Salve a configuração e depois salve a chave Gemini da própria marca.",
      "Sem chave própria salva, o Atlas Analyst deve permanecer desabilitado.",
      "A chave da loja fica criptografada no backend e não retorna em texto aberto.",
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
  if (title === "Configurações") return "Central estratégica para comportamento do Atlas e contexto da marca.";
  if (title === "Integrações") return "Conexão técnica, credenciais por loja e sincronizações.";
  if (title === "Governança SaaS") return "Planos, limites e liberações por marca.";
  if (title === "Ambiente") return "Infraestrutura, envs e migrações que sustentam a plataforma.";
  return "Leitura curta para agir sem abrir código nem documentação técnica.";
}

function HelpCallout({
  id,
  title,
  icon: Icon,
  items,
}: {
  id?: string;
  title: string;
  icon: ElementType;
  items: string[];
}) {
  return (
    <div id={id}>
      <AnalyticsCalloutCard
        eyebrow={title}
        title={cardDescription(title)}
        description={
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-secondary-container/70 text-secondary">
              <Icon size={16} />
            </span>
            <ul className="atlas-component-stack-tight text-[13px] leading-6 text-on-surface-variant">
              {items.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-secondary/80" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        }
        tone="default"
      />
    </div>
  );
}

export default function HelpPage() {
  const [activeTab, setActiveTab] = useState<HelpTab>("operation");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const syncFromHash = () => {
      const target = helpHashTargets[window.location.hash.toLowerCase()];
      if (!target) {
        return;
      }

      setActiveTab(target.tab);
      if (target.sectionId) {
        const sectionId = target.sectionId;
        window.setTimeout(() => {
          document.getElementById(sectionId)?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }, 40);
      }
    };

    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  return (
    <div className="atlas-page-stack-compact">
      <PageHeader
        eyebrow="Central de ajuda"
        title="Ajuda operacional"
        description="Abra rápido o guia certo sem precisar vasculhar o sistema."
      />

      <section className="grid gap-3 md:grid-cols-3">
        <AnalyticsKpiCard
          label="Leitura"
          value="Backend"
          description="Cálculos e decisões saem do backend. O front só apresenta e opera."
          tone="info"
        />
        <AnalyticsKpiCard
          label="Integração"
          value="Por loja"
          description="Meta, GA4 e Gemini usam credencial própria de cada marca."
          tone="default"
        />
        <AnalyticsKpiCard
          label="Confiança"
          value="Auditável"
          description="Saneamento, histórico e credenciais ficam consistentes e rastreáveis."
          tone="positive"
        />
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <AnalyticsCalloutCard
          eyebrow="Abrir agora"
          title="Tutoriais de integração"
          description="Passo a passo por provedor, com links para os painéis corretos."
          href={APP_ROUTES.integrationsTutorials}
          tone="info"
        />
        <AnalyticsCalloutCard
          eyebrow="Abrir agora"
          title="Central estratégica"
          description="Comportamento do Atlas, learning e governança da marca."
          href={APP_ROUTES.settings}
          tone="default"
        />
        <AnalyticsCalloutCard
          eyebrow="Abrir agora"
          title="Área de integrações"
          description="Conexões, saúde do conector e sincronizações da loja."
          href={APP_ROUTES.integrations}
          tone="default"
        />
      </section>

      <SurfaceCard className="overflow-hidden p-0">
        <div className="border-b border-outline px-4 py-3">
          <div className="brandops-subtabs">
            {helpTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="brandops-subtab"
                data-active={activeTab === tab.key}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 py-4">
          {activeTab === "operation" && (
            <section className="grid gap-4 xl:grid-cols-2">
              {operationCards.map((card) => (
                <HelpCallout
                  key={card.title}
                  id={
                    card.title === "Torre de Controle"
                      ? "help-dashboard"
                      : card.title === "DRE consolidado"
                        ? "help-dre"
                        : card.title === "Saneamento"
                          ? "help-sanitization"
                          : card.title === "CMV e lançamentos"
                            ? "help-cmv"
                            : undefined
                  }
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
                    id={card.title === "Origem por loja" ? "help-integrations" : undefined}
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
                    <AnalyticsCalloutCard
                      key={provider.title}
                      eyebrow={provider.eyebrow}
                      title={provider.title}
                      description={
                        <ul className="atlas-component-stack-tight text-[13px] leading-6 text-on-surface-variant">
                          {provider.items.map((item) => (
                            <li key={item} className="flex gap-2">
                              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-secondary/80" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      }
                      tone="default"
                    />
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
                  <Link href={APP_ROUTES.integrationsTutorialGemini} prefetch={false} className="brandops-button brandops-button-ghost">
                    Tutorial Gemini
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
                    id={card.title === "Preparo da plataforma" ? "help-security" : undefined}
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
                    id={card.title === "Configurações" ? "help-settings" : undefined}
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
                    Manter conexão, comportamento, governança e resultado em lugares separados
                    reduz ruído e deixa o Atlas mais pronto para escalar como SaaS.
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
                      Definir modelo, temperatura, skill, aprendizado e contexto do Atlas.
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
