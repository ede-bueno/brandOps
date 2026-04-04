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
      "GA4 só fica ativo quando a propriedade e a credencial existem.",
    ],
  },
  {
    title: "Meta Ads",
    icon: Sparkles,
    items: [
      "Guarde apenas ID da conta e modo de sincronização.",
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
    title: "Variáveis seguras",
    icon: KeyRound,
    items: [
      "GA4_SERVICE_ACCOUNT_JSON para a service account do Analytics.",
      "META_ACCESS_TOKEN com permissão de leitura.",
      "META_API_VERSION definido no backend.",
    ],
  },
  {
    title: "Boas práticas",
    icon: ShieldCheck,
    items: [
      "Backend manda; frontend só renderiza e opera.",
      "Cálculo canônico não deve nascer no navegador.",
      "Views materializadas ajudam performance sem mudar a regra.",
    ],
  },
  {
    title: "Leitura rápida",
    icon: AlertCircle,
    items: [
      "Se a loja não tem dados, o sistema mostra vazio operacional, não erro técnico.",
      "Se o dado parece fora da curva, o saneamento decide o que entra no cálculo.",
      "Se a integração não existe, deixe o modo desabilitado.",
    ],
  },
];

function cardDescription(title: string) {
  if (title === "Control Tower") return "Leitura rápida para receita, margem e pressão de custo.";
  if (title === "DRE consolidado") return "Separação clara entre série histórica e recorte filtrado.";
  if (title === "Saneamento") return "Trilha auditável para manter, ignorar ou devolver decisões.";
  if (title === "CMV e lançamentos") return "Base gerencial para custo histórico e competência mensal.";
  if (title === "Origem por loja") return "Cada fonte opera no modo certo por marca.";
  if (title === "Meta Ads") return "Sincronização segura com fallback manual preservado.";
  if (title === "GA4") return "Ativo só quando propriedade e credencial estiverem corretas.";
  if (title === "Catálogo") return "Feed manual e Meta Catalog podem coexistir.";
  if (title === "Variáveis seguras") return "Segredos sensíveis ficam fora do navegador.";
  if (title === "Boas práticas") return "Backend manda; frontend só opera e apresenta.";
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
          value="Híbrida"
          description="INK, Meta e GA4 entram por origem definida e fallback controlado."
          tone="default"
        />
        <AnalyticsKpiCard
          label="Confiança"
          value="Auditável"
          description="Saneamento, histórico e credenciais ficam consistentes e rastreáveis."
          tone="positive"
        />
      </section>

      <SurfaceCard className="p-0 overflow-hidden">
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
