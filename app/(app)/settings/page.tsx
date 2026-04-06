"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  BrainCircuit,
  BookOpen,
  CircleHelp,
  PlugZap,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { AtlasBusinessLearningPanel } from "@/components/AtlasBusinessLearningPanel";
import { AtlasAnalystSettingsPanel } from "@/components/AtlasAnalystSettingsPanel";
import { AtlasContextWorkspace } from "@/components/AtlasContextWorkspace";
import { EmptyState } from "@/components/EmptyState";
import { useBrandOps } from "@/components/BrandOpsProvider";
import {
  InfoHint,
  PageHeader,
  SectionHeading,
  StackItem,
  SurfaceCard,
} from "@/components/ui-shell";
import { BRAND_PLAN_LABELS } from "@/lib/brandops/governance";
import { APP_ROUTES } from "@/lib/brandops/routes";

type SettingsModule = {
  href: string;
  label: string;
  description: string;
  icon: typeof PlugZap;
  tone?: "default" | "positive" | "warning" | "negative" | "info";
  aside?: string;
};

function getIntegrationStateLabel(status: string | null | undefined) {
  if (status === "success") {
    return "Saudável";
  }

  if (status === "error") {
    return "Com erro";
  }

  if (status === "running") {
    return "Sincronizando";
  }

  return "Aguardando";
}

function getIntegrationTone(status: string | null | undefined) {
  if (status === "success") {
    return "positive" as const;
  }

  if (status === "error") {
    return "warning" as const;
  }

  if (status === "running") {
    return "info" as const;
  }

  return "default" as const;
}

export default function SettingsPage() {
  const { activeBrand, activeBrandId, brands } = useBrandOps();

  const selectedBrandName =
    activeBrand?.name ??
    brands.find((brand) => brand.id === activeBrandId)?.name ??
    "Loja";

  if (!activeBrandId && !activeBrand) {
    return (
      <EmptyState
        title="Nenhuma marca em foco"
        description="Selecione uma marca para abrir as configurações da operação."
      />
    );
  }

  if (!activeBrand) {
    return (
      <EmptyState
        title="Configurações indisponíveis"
        description="Não foi possível carregar a marca ativa no momento."
      />
    );
  }

  const metaIntegration =
    activeBrand.integrations.find((integration) => integration.provider === "meta") ?? null;
  const ga4Integration =
    activeBrand.integrations.find((integration) => integration.provider === "ga4") ?? null;
  const geminiIntegration =
    activeBrand.integrations.find((integration) => integration.provider === "gemini") ?? null;

  const healthyIntegrations = [metaIntegration, ga4Integration, geminiIntegration].filter(
    (integration) => integration?.lastSyncStatus === "success" || integration?.mode === "api",
  ).length;
  const governance = activeBrand.governance;

  const modules: SettingsModule[] = [
    {
      href: APP_ROUTES.integrations,
      label: "Integrações",
      description: "Conectar Meta, GA4 e Gemini por loja.",
      icon: PlugZap,
      tone:
        metaIntegration?.lastSyncStatus === "error" || ga4Integration?.lastSyncStatus === "error"
          ? "warning"
          : "default",
      aside: "Fontes",
    },
    {
      href: APP_ROUTES.adminStores,
      label: "Acessos",
      description: "Convidar usuários e revisar permissões da marca.",
      icon: UserRound,
      aside: "Equipe",
    },
    {
      href: APP_ROUTES.settingsGovernance,
      label: "Governança",
      description: "Papéis, planos, limites e liberação de recursos por grupo.",
      icon: ShieldCheck,
      aside: "SaaS",
    },
    {
      href: APP_ROUTES.help,
      label: "Ajuda",
      description: "Guias de operação, integração e segurança da plataforma.",
      icon: CircleHelp,
      aside: "Guias",
    },
    {
      href: APP_ROUTES.integrationsTutorials,
      label: "Tutoriais",
      description: "Passo a passo detalhado de Meta, GA4 e Gemini com links para os painéis corretos.",
      icon: BookOpen,
      aside: "Passo a passo",
    },
    {
      href: APP_ROUTES.settingsAtlasAi,
      label: "Atlas IA",
      description:
        geminiIntegration?.mode === "api"
          ? "Modelo, temperatura, skill padrão e aprendizado da marca."
          : "Deixar a camada analítica pronta antes da ativação.",
      icon: BrainCircuit,
      tone: geminiIntegration?.mode === "api" ? "info" : "default",
      aside: geminiIntegration?.mode === "api" ? "Estratégia" : "Opcional",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Configurações"
        title={selectedBrandName}
        description="Central estratégica da plataforma: integre fontes, controle acessos, organize governança SaaS e defina como o Atlas deve pensar, ler e aprender com a marca."
      />

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
        <SurfaceCard className="p-4">
          <SectionHeading
            title={
              <span className="flex items-center gap-2">
                Central da plataforma
                <InfoHint label="Como usar esta central">
                  Tudo que configura, orienta ou controla acesso sai da Torre e fica concentrado aqui.
                </InfoHint>
              </span>
            }
            description="Use esta central para separar operação, estratégia do Atlas e infraestrutura da plataforma."
          />

          <div className="mt-4 space-y-2">
            {modules.map((module) => {
              const Icon = module.icon;
              return (
                <Link key={module.href} href={module.href} prefetch={false} className="relative z-10 block">
                  <StackItem
                    title={
                      <span className="flex items-center gap-2">
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-outline bg-surface-container-low text-primary">
                          <Icon size={14} />
                        </span>
                        <span>{module.label}</span>
                      </span>
                    }
                    description={module.description}
                    aside={
                      <span className="inline-flex items-center gap-1.5">
                        {module.aside ?? "Abrir"}
                        <ArrowUpRight size={12} />
                      </span>
                    }
                    tone={module.tone ?? "default"}
                    className="transition hover:border-secondary/30"
                  />
                </Link>
              );
            })}
          </div>
        </SurfaceCard>

        <SurfaceCard className="p-4">
          <SectionHeading
            title="Leitura rápida"
            description="Saúde atual das fontes e da camada Atlas."
            aside={<ShieldCheck size={14} className="text-primary" />}
          />

          <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
            <span className="rounded-full border border-primary/20 bg-primary-container px-2.5 py-1 text-on-primary-container">
              {healthyIntegrations}/3 frentes prontas
            </span>
            <span className="rounded-full border border-outline px-2.5 py-1">
              {BRAND_PLAN_LABELS[governance.planTier]}
            </span>
            <span className="rounded-full border border-outline px-2.5 py-1">
              {governance.featureFlags.atlasAi ? "Atlas IA liberado" : "Atlas IA bloqueado"}
            </span>
          </div>

          <div className="mt-4 space-y-2">
            <StackItem
              title="Plano da marca"
              description="Camada de governança que define o teto de recursos liberados nesta operação."
              aside={BRAND_PLAN_LABELS[governance.planTier]}
              tone="info"
            />
            <StackItem
              title="Meta"
              description={metaIntegration?.lastSyncError || "Credencial, sync e leitura de mídia por loja."}
              aside={getIntegrationStateLabel(metaIntegration?.lastSyncStatus)}
              tone={getIntegrationTone(metaIntegration?.lastSyncStatus)}
            />
            <StackItem
              title="GA4"
              description={ga4Integration?.lastSyncError || "Propriedade, service account e leitura de tráfego."}
              aside={getIntegrationStateLabel(ga4Integration?.lastSyncStatus)}
              tone={getIntegrationTone(ga4Integration?.lastSyncStatus)}
            />
            <StackItem
              title="Gemini"
              description={
                !governance.featureFlags.atlasAi
                  ? "O plano atual ainda nao libera a camada Atlas IA."
                  : geminiIntegration?.mode === "api"
                  ? "Pronto para diagnósticos e memória da marca."
                  : "Mantém a marca em modo sem IA até ativação."
              }
              aside={
                !governance.featureFlags.atlasAi
                  ? "Bloqueado"
                  : geminiIntegration?.mode === "api"
                    ? "Ativo"
                    : "Opcional"
              }
              tone={
                !governance.featureFlags.atlasAi
                  ? "warning"
                  : geminiIntegration?.mode === "api"
                    ? "positive"
                    : "default"
              }
            />
            <StackItem
              title="Ajuda operacional"
              description="Guias práticos de integração, operação e segurança."
              aside={
                <Link href={APP_ROUTES.help} prefetch={false} className="relative z-10 text-secondary hover:underline">
                  Abrir
                </Link>
              }
              tone="default"
            />
          </div>
        </SurfaceCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,0.96fr)_minmax(0,1.04fr)]">
        <SurfaceCard id="platform-governance" className="p-4">
          <SectionHeading
            title={
              <span className="flex items-center gap-2">
                Governança SaaS
                <InfoHint label="O que centralizar aqui">
                  Este bloco concentra a evolução de papéis, grupos, planos e
                  liberação da camada Atlas IA para o produto ficar distribuível
                  para outras empresas sem misturar configuração operacional com
                  estratégia da plataforma.
                </InfoHint>
              </span>
            }
            description="A camada de plataforma está saindo do implícito e ganhando forma própria."
            aside={<ShieldCheck size={14} className="text-primary" />}
          />

          <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
            <span className="rounded-full border border-outline px-2.5 py-1">
              {BRAND_PLAN_LABELS[governance.planTier]}
            </span>
            <span className="rounded-full border border-outline px-2.5 py-1">
              IA por plano
            </span>
            <span className="rounded-full border border-outline px-2.5 py-1">
              grupos e marcas
            </span>
          </div>

          <div className="mt-4 space-y-2">
            <StackItem
              title="Papéis"
              description="Separar superadmin da plataforma, admin do grupo e gestor de marca sem perder simplicidade operacional."
              aside="Hierarquia"
              tone="default"
            />
            <StackItem
              title="Planos e limites"
              description="A marca já carrega plano e capacidades para liberar IA, Torre com IA e catálogo de modelos por governança."
              aside={BRAND_PLAN_LABELS[governance.planTier]}
              tone="info"
            />
            <StackItem
              title="Capacidades liberadas"
              description={`Atlas IA: ${governance.featureFlags.atlasAi ? "sim" : "não"} · Torre IA: ${governance.featureFlags.atlasCommandCenter ? "sim" : "não"} · Aprender negócio: ${governance.featureFlags.brandLearning ? "sim" : "não"}`}
              aside={governance.featureFlags.geminiModelCatalog ? "Catálogo Gemini on" : "Catálogo Gemini off"}
              tone="default"
            />
          </div>
        </SurfaceCard>

        <SurfaceCard className="p-4">
          <SectionHeading
            title="Camadas do produto"
            description="O sidebar passa a refletir como o Atlas está sendo desenhado."
            aside={<BrainCircuit size={14} className="text-primary" />}
          />

          <div className="mt-4 space-y-2">
            <StackItem
              title="Controle"
              description="A Torre de Controle permanece como casa de leitura executiva e diagnóstico."
              aside="Dashboard"
              tone="default"
            />
            <StackItem
              title="Negócio e aquisição"
              description="Receita, DRE, produto, mídia e tráfego ficam agrupados por decisão e performance."
              aside="Decisão"
              tone="default"
            />
            <StackItem
              title="Operação e plataforma"
              description="Catálogo, ETL, saneamento, integrações, acessos e estratégia do Atlas ganham fronteiras mais claras."
              aside="Estrutura"
              tone="default"
            />
          </div>
        </SurfaceCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <SurfaceCard className="p-4">
          <AtlasAnalystSettingsPanel />
        </SurfaceCard>

        <SurfaceCard className="p-4">
          <AtlasContextWorkspace mode="settings" limit={8} />
        </SurfaceCard>
      </section>

      <SurfaceCard className="p-4">
        <AtlasBusinessLearningPanel />
      </SurfaceCard>
    </div>
  );
}
