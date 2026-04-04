"use client";

import type { ElementType } from "react";
import { useState } from "react";
import { AlertCircle, DatabaseZap, KeyRound, Link2, ShieldCheck, Sparkles } from "lucide-react";
import {
  AnalyticsCalloutCard,
  AnalyticsKpiCard,
} from "@/components/analytics/AnalyticsPrimitives";
import { PageHeader, SurfaceCard } from "@/components/ui-shell";

type HelpTab = "operation" | "integrations" | "security";

const helpTabs: Array<{ key: HelpTab; label: string }> = [
  { key: "operation", label: "Operação" },
  { key: "integrations", label: "Integrações" },
  { key: "security", label: "Segurança" },
];

const operationCards = [
  {
    title: "Control Tower",
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
    title: "Infraestrutura mínima",
    icon: KeyRound,
    items: [
      "NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY precisam existir no ambiente.",
      "BRANDOPS_SECRET_ENCRYPTION_KEY é obrigatória para salvar segredos por marca.",
      "A mesma BRANDOPS_SECRET_ENCRYPTION_KEY precisa ser mantida entre deploys.",
    ],
  },
  {
    title: "Boas práticas",
    icon: ShieldCheck,
    items: [
      "Backend manda; frontend só renderiza e opera.",
      "Segredo por loja não deve depender de variável global da plataforma.",
      "Cálculo canônico não deve nascer no navegador.",
    ],
  },
  {
    title: "Diagnóstico rápido",
    icon: AlertCircle,
    items: [
      "Erro com BRANDOPS_SECRET_ENCRYPTION_KEY indica problema de infraestrutura, não da loja.",
      "Erro (#100) da Meta indica token ou app sem permissão para a API do catálogo.",
      "Se a integração não existe, deixe o modo desabilitado.",
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
  if (title === "Control Tower") return "Leitura rápida para receita, margem e pressão de custo.";
  if (title === "DRE consolidado") return "Separação clara entre série histórica e recorte filtrado.";
  if (title === "Saneamento") return "Trilha auditável para manter, ignorar ou devolver decisões.";
  if (title === "CMV e lançamentos") return "Base gerencial para custo histórico e competência mensal.";
  if (title === "Origem por loja") return "Cada fonte opera no modo certo por marca.";
  if (title === "Meta Ads") return "Sincronização segura por loja, com fallback manual preservado.";
  if (title === "GA4") return "Ativo só quando propriedade e credencial estiverem corretas.";
  if (title === "Catálogo") return "Feed manual e Meta Catalog podem coexistir.";
  if (title === "Infraestrutura mínima") return "Sem a base certa no ambiente, nenhum segredo por loja persiste.";
  if (title === "Boas práticas") return "Backend manda; frontend só opera e apresenta.";
  if (title === "Diagnóstico rápido") return "Separar erro de infraestrutura de erro real do provedor reduz retrabalho.";
  return "Leitura curta para agir sem abrir código nem documentação técnica.";
}

function HelpCallout({
  title,
  icon: Icon,
  items,
}: {
  title: string;
  icon: ElementType;
  items: string[];
}) {
  return (
    <AnalyticsCalloutCard
      eyebrow={title}
      title={cardDescription(title)}
      description={
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-secondary-container/70 text-secondary">
            <Icon size={16} />
          </span>
          <ul className="space-y-1.5 text-[13px] leading-6 text-on-surface-variant">
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
  );
}

export default function HelpPage() {
  const [activeTab, setActiveTab] = useState<HelpTab>("operation");

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Central de ajuda"
        title="Atlas em operação"
        description="Resumo curto para orientar cálculo, integração e segurança sem abrir o código."
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

        <div className="p-4 sm:p-5">
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
            <div className="space-y-4">
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
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                    Tutorial rápido
                  </p>
                  <h2 className="text-lg font-semibold text-on-surface">
                    Ordem recomendada para configurar uma loja
                  </h2>
                  <p className="text-sm leading-6 text-on-surface-variant">
                    O Atlas funciona melhor quando a configuração operacional vem antes da
                    credencial. Isso evita erro falso de sincronização e facilita o diagnóstico.
                  </p>
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

              <section className="grid gap-4 xl:grid-cols-3">
                {providerTutorials.map((provider) => (
                  <AnalyticsCalloutCard
                    key={provider.title}
                    eyebrow={provider.eyebrow}
                    title={provider.title}
                    description={
                      <ul className="space-y-1.5 text-[13px] leading-6 text-on-surface-variant">
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
        </div>
      </SurfaceCard>
    </div>
  );
}
