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
    <div className="atlas-settings-room atlas-page-stack">
      <PageHeader
        eyebrow="Configurações"
        title="Central estratégica"
        description="Governança, IA, fontes e equipe da marca."
        actions={
          <div className="flex flex-wrap gap-2">
            <span className="atlas-inline-metric">{selectedBrandName}</span>
            <span className="atlas-inline-metric">{BRAND_PLAN_LABELS[governance.planTier]}</span>
          </div>
        }
      />

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(20rem,0.92fr)]">
        <SurfaceCard className="atlas-settings-hub">
          <SectionHeading
            title="Direção da marca"
            description="Abra o módulo certo para destravar a operação."
            aside={<span className="atlas-inline-metric">{modules.length} frentes</span>}
          />

          <div className="mt-4 atlas-component-stack">
            <article className="panel-muted p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-on-surface-variant">
                Próximo clique
              </p>
              <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-on-surface">{strategicFocus.title}</p>
                  <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                    {strategicFocus.description}
                  </p>
                </div>
                <Link
                  href={strategicFocus.href}
                  prefetch={false}
                  className="brandops-button brandops-button-primary"
                >
                  {strategicFocus.cta}
                </Link>
              </div>
            </article>

            <div className="grid gap-2 md:grid-cols-2">
              {modules.map((module) => {
                const Icon = module.icon;
                return (
                  <Link key={module.href} href={module.href} prefetch={false} className="relative z-10 block">
                    <StackItem
                      title={
                        <span className="flex items-center gap-2">
                          <span className="inline-flex h-7 w-7 items-center justify-center border border-outline bg-surface-container-low text-primary">
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
          </div>
        </SurfaceCard>

        <SurfaceCard className="atlas-settings-focus">
          <SectionHeading
            title="Pulso da marca"
            description="Estado atual das frentes principais da marca."
            aside={<ShieldCheck size={14} className="text-primary" />}
          />

          <div className="mt-4 atlas-status-cluster">
            <span className="atlas-status-chip" data-tone="accent">
              {healthyIntegrations}/3 frentes prontas
            </span>
            <span className="atlas-status-chip">
              {BRAND_PLAN_LABELS[governance.planTier]}
            </span>
            <span className="atlas-status-chip">
              {governance.featureFlags.atlasAi ? "Atlas IA liberado" : "Atlas IA bloqueado"}
            </span>
          </div>

          <div className="mt-4 atlas-component-stack-compact">
            <StackItem
              title="Plano"
              description={atlasEnabled ? "Atlas IA já pode operar nesta marca." : "A camada Atlas ainda depende do plano."}
              aside={
                <Link
                  href={APP_ROUTES.settingsGovernance}
                  prefetch={false}
                  className="relative z-10 text-secondary hover:underline"
                >
                  Abrir governança
                </Link>
              }
              tone={atlasEnabled ? "positive" : "default"}
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
            <StackItem
              title="Aprendizado"
              description={
                governance.featureFlags.brandLearning
                  ? "Memória e comportamento do Atlas podem evoluir nesta marca."
                  : "O aprendizado do negócio ainda depende da governança."
              }
              aside={
                <Link href={APP_ROUTES.settingsAtlasAi} prefetch={false} className="relative z-10 text-secondary hover:underline">
                  Abrir Atlas
                </Link>
              }
              tone={governance.featureFlags.brandLearning ? "info" : "default"}
            />
          </div>
        </SurfaceCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,0.96fr)_minmax(0,1.04fr)]">
        <SurfaceCard id="platform-governance" className="atlas-settings-focus">
          <SectionHeading
            title="Governança e limites"
            description="O que esta marca pode usar agora."
            aside={<ShieldCheck size={14} className="text-primary" />}
          />

          <div className="mt-4 atlas-status-cluster">
            <span className="atlas-status-chip">
              {BRAND_PLAN_LABELS[governance.planTier]}
            </span>
            <span className="atlas-status-chip">
              IA por plano
            </span>
            <span className="atlas-status-chip">
              grupos e marcas
            </span>
          </div>

          <div className="mt-4 atlas-component-stack-compact">
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

        <SurfaceCard className="atlas-settings-focus">
          <SectionHeading
            title="Apoio operacional"
            description="Guias e atalhos para executar a operação."
            aside={
              <InfoHint label="Como usar">
                Use esta área para abrir ajuda, tutoriais e acessos sem sair da marca.
              </InfoHint>
            }
          />

          <div className="mt-4 atlas-component-stack-compact">
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

      <SurfaceCard>
        <IntegrationAutomationSettingsPanel />
      </SurfaceCard>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <SurfaceCard>
          <AtlasAnalystSettingsPanel />
        </SurfaceCard>

        <SurfaceCard>
          <AtlasContextWorkspace mode="settings" limit={8} />
        </SurfaceCard>
      </section>

      <SurfaceCard>
        <AtlasBusinessLearningPanel />
      </SurfaceCard>
    </div>
  );
}
