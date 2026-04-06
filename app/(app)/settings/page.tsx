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
import { AnalyticsCalloutCard } from "@/components/analytics/AnalyticsPrimitives";
import { AtlasBusinessLearningPanel } from "@/components/AtlasBusinessLearningPanel";
import { AtlasAnalystSettingsPanel } from "@/components/AtlasAnalystSettingsPanel";
import { AtlasContextWorkspace } from "@/components/AtlasContextWorkspace";
import { EmptyState } from "@/components/EmptyState";
import { IntegrationAutomationSettingsPanel } from "@/components/IntegrationAutomationSettingsPanel";
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
  const atlasEnabled = governance.featureFlags.atlasAi;
  const atlasReady = atlasEnabled && geminiIntegration?.mode === "api";
  const strategicFocus =
    metaIntegration?.lastSyncStatus === "error"
      ? {
          title: "Corrigir mídia primeiro",
          description: metaIntegration.lastSyncError ?? "A leitura da Meta travou nesta marca.",
          href: `${APP_ROUTES.integrations}?provider=meta&section=sync`,
          cta: "Abrir Meta",
          tone: "warning" as const,
        }
      : ga4Integration?.lastSyncStatus === "error"
        ? {
            title: "Tráfego pede revisão",
            description: ga4Integration.lastSyncError ?? "A leitura do GA4 precisa de ajuste.",
            href: `${APP_ROUTES.integrations}?provider=ga4&section=sync`,
            cta: "Abrir GA4",
            tone: "warning" as const,
          }
        : !atlasEnabled
          ? {
              title: "Atlas IA bloqueado",
              description: "O plano atual ainda não libera a camada inteligente da marca.",
              href: APP_ROUTES.settingsGovernance,
              cta: "Rever governança",
              tone: "default" as const,
            }
          : !atlasReady
            ? {
                title: "Atlas pronto para ativação",
                description: "A governança já libera IA. Falta concluir a conexão Gemini desta loja.",
                href: `${APP_ROUTES.integrations}?provider=gemini&section=config`,
                cta: "Ativar Gemini",
                tone: "info" as const,
              }
            : {
                title: "Base pronta para evoluir",
                description: "As frentes principais estão conectadas. Agora vale refinar comportamento e aprendizado.",
                href: APP_ROUTES.settingsAtlasAi,
                cta: "Ajustar Atlas",
                tone: "positive" as const,
              };

  const modules: SettingsModule[] = [
    {
      href: APP_ROUTES.integrations,
      label: "Integrações",
      description: "Conectar fontes por loja.",
      icon: PlugZap,
      tone:
        metaIntegration?.lastSyncStatus === "error" || ga4Integration?.lastSyncStatus === "error"
          ? "warning"
          : "default",
      aside: "Fontes",
    },
    {
      href: APP_ROUTES.settingsAutomation,
      label: "Automação",
      description: "Cadência de Meta e GA4.",
      icon: PlugZap,
      aside: "Agenda",
    },
    {
      href: APP_ROUTES.adminStores,
      label: "Acessos",
      description: "Equipe e permissões.",
      icon: UserRound,
      aside: "Equipe",
    },
    {
      href: APP_ROUTES.settingsGovernance,
      label: "Governança",
      description: "Plano, limites e recursos.",
      icon: ShieldCheck,
      aside: "SaaS",
    },
    {
      href: APP_ROUTES.help,
      label: "Ajuda",
      description: "Guias curtos de operação.",
      icon: CircleHelp,
      aside: "Guias",
    },
    {
      href: APP_ROUTES.integrationsTutorials,
      label: "Tutoriais",
      description: "Passo a passo por conector.",
      icon: BookOpen,
      aside: "Passo a passo",
    },
    {
      href: APP_ROUTES.settingsAtlasAi,
      label: "Atlas IA",
      description:
        geminiIntegration?.mode === "api"
          ? "Modelo, skill e aprendizado."
          : "Preparar a camada analítica.",
      icon: BrainCircuit,
      tone: geminiIntegration?.mode === "api" ? "info" : "default",
      aside: geminiIntegration?.mode === "api" ? "Estratégia" : "Opcional",
    },
  ];

  return (
    <div className="atlas-settings-room space-y-6">
      <PageHeader
        eyebrow="Configurações"
        title={selectedBrandName}
        description="Ajustes estratégicos da marca, sem poluir a Torre."
      />

      <section className="grid gap-3 md:grid-cols-3">
        <AnalyticsCalloutCard
          eyebrow="Próximo clique"
          title={strategicFocus.title}
          description={strategicFocus.description}
          href={strategicFocus.href}
          tone={strategicFocus.tone}
        />
        <AnalyticsCalloutCard
          eyebrow="Plano"
          title={BRAND_PLAN_LABELS[governance.planTier]}
          description={atlasEnabled ? "Atlas IA liberado nesta marca." : "IA ainda bloqueada para esta marca."}
          href={APP_ROUTES.settingsGovernance}
          tone={atlasEnabled ? "positive" : "default"}
        />
        <AnalyticsCalloutCard
          eyebrow="Aprendizado"
          title={governance.featureFlags.brandLearning ? "Aprender negócio liberado" : "Aprender negócio bloqueado"}
          description="Memória, contexto curado e comportamento do Atlas ficam aqui."
          href={APP_ROUTES.settingsAtlasAi}
          tone={governance.featureFlags.brandLearning ? "info" : "default"}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
        <SurfaceCard className="atlas-settings-hub p-4">
          <SectionHeading
            title="Abrir agora"
            description="Escolha o bloco certo e siga."
          />

          <div className="mt-4 grid gap-2 md:grid-cols-2">
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
                    className="h-full transition hover:border-secondary/30"
                  />
                </Link>
              );
            })}
          </div>
        </SurfaceCard>

        <SurfaceCard className="atlas-settings-focus p-4">
          <SectionHeading
            title="O que pede ajuste"
            description="Um relance para decidir o próximo clique."
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
              title={strategicFocus.title}
              description={strategicFocus.description}
              aside={
                <Link
                  href={strategicFocus.href}
                  prefetch={false}
                  className="relative z-10 text-secondary hover:underline"
                >
                  {strategicFocus.cta}
                </Link>
              }
              tone={strategicFocus.tone}
            />
            <StackItem
              title="Meta"
              description={metaIntegration?.lastSyncError || "Mídia e catálogo da loja."}
              aside={getIntegrationStateLabel(metaIntegration?.lastSyncStatus)}
              tone={getIntegrationTone(metaIntegration?.lastSyncStatus)}
            />
            <StackItem
              title="GA4"
              description={ga4Integration?.lastSyncError || "Tráfego e propriedade da marca."}
              aside={getIntegrationStateLabel(ga4Integration?.lastSyncStatus)}
              tone={getIntegrationTone(ga4Integration?.lastSyncStatus)}
            />
            <StackItem
              title="Atlas"
              description={
                !atlasEnabled
                  ? "IA ainda bloqueada pelo plano."
                  : atlasReady
                    ? "Pronto para leitura e aprendizado."
                    : "Ligação Gemini ainda pendente."
              }
              aside={!atlasEnabled ? "Bloqueado" : atlasReady ? "Ativo" : "Pendente"}
              tone={!atlasEnabled ? "warning" : atlasReady ? "positive" : "info"}
            />
          </div>
        </SurfaceCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,0.96fr)_minmax(0,1.04fr)]">
        <SurfaceCard id="platform-governance" className="atlas-settings-focus p-4">
          <SectionHeading
            title="Governança e limites"
            description="O que esta marca pode usar agora."
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
              title="Plano"
              description="Camada que libera IA, aprendizado e catálogo de modelos."
              aside={BRAND_PLAN_LABELS[governance.planTier]}
              tone="info"
            />
            <StackItem
              title="Atlas IA"
              description={governance.featureFlags.atlasAi ? "Camada inteligente liberada." : "Camada inteligente ainda bloqueada."}
              aside={governance.featureFlags.atlasAi ? "Ligado" : "Bloqueado"}
              tone={governance.featureFlags.atlasAi ? "positive" : "warning"}
            />
            <StackItem
              title="Aprender negócio"
              description={governance.featureFlags.brandLearning ? "Marca pode consolidar histórico e memória." : "Modo de aprendizagem ainda indisponível."}
              aside={governance.featureFlags.brandLearning ? "Liberado" : "Off"}
              tone={governance.featureFlags.brandLearning ? "positive" : "default"}
            />
            <StackItem
              title="Catálogo Gemini"
              description={governance.featureFlags.geminiModelCatalog ? "A marca pode escolher modelos suportados." : "Modelo fixado pela plataforma."}
              aside={governance.featureFlags.geminiModelCatalog ? "Catálogo on" : "Catálogo off"}
              tone="default"
            />
          </div>
        </SurfaceCard>

        <SurfaceCard className="atlas-settings-focus p-4">
          <SectionHeading
            title="Apoio rápido"
            description="Atalhos que destravam operação sem poluir a Torre."
            aside={
              <InfoHint label="Como usar">
                Tutoriais e ajuda ficam fora do fluxo operacional principal, mas continuam acessíveis daqui.
              </InfoHint>
            }
          />

          <div className="mt-4 space-y-2">
            <StackItem
              title="Tutoriais"
              description="Passos guiados para Meta, GA4 e Gemini."
              aside={
                <Link href={APP_ROUTES.integrationsTutorials} prefetch={false} className="relative z-10 text-secondary hover:underline">
                  Abrir
                </Link>
              }
              tone="info"
            />
            <StackItem
              title="Ajuda"
              description="Guias rápidos de operação e segurança."
              aside={
                <Link href={APP_ROUTES.help} prefetch={false} className="relative z-10 text-secondary hover:underline">
                  Abrir
                </Link>
              }
              tone="default"
            />
            <StackItem
              title="Acessos"
              description="Convidar pessoas e revisar o alcance da marca."
              aside={
                <Link href={APP_ROUTES.adminStores} prefetch={false} className="relative z-10 text-secondary hover:underline">
                  Abrir
                </Link>
              }
              tone="default"
            />
          </div>
        </SurfaceCard>
      </section>

      <SurfaceCard className="p-4">
        <IntegrationAutomationSettingsPanel />
      </SurfaceCard>

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
