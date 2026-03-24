"use client";

import { CheckCircle2, Clock3, KeyRound, PlugZap, Radar, ShieldCheck } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { useBrandOps } from "@/components/BrandOpsProvider";
import { PageHeader, SectionHeading, SurfaceCard } from "@/components/ui-shell";

const ga4Requirements = [
  "Property ID do GA4 da loja",
  "Conta Google com acesso de leitura à propriedade",
  "Credencial OAuth ou service account com escopo controlado",
  "Mapeamento dos eventos de funil: add_to_cart, begin_checkout e purchase",
];

const metaRequirements = [
  "ID da conta de anúncios da loja",
  "App Meta configurado para Marketing API",
  "Token com permissão ads_read",
  "Preferência por usuário do sistema para sincronizações de longa duração",
];

const roadmap = [
  {
    phase: "Fase 1",
    title: "Estrutura de integrações por loja",
    body: "Cadastrar credenciais por marca, status da conexão e rotina de sincronização sem misturar acessos entre lojas.",
  },
  {
    phase: "Fase 2",
    title: "Conector GA4",
    body: "Importar tráfego, sessões, origem/mídia e eventos de funil para complementar a leitura comercial da INK.",
  },
  {
    phase: "Fase 3",
    title: "Conector Meta Ads",
    body: "Automatizar a coleta de Insights por conta, campanha, conjunto e anúncio, respeitando atribuição e histórico de saneamento.",
  },
  {
    phase: "Fase 4",
    title: "Consolidação gerencial",
    body: "Cruzar INK, Meta e GA4 para enriquecer dashboard, mídia, DRE e trilha de conversão por marca.",
  },
];

export default function IntegrationsPage() {
  const { activeBrand } = useBrandOps();

  if (!activeBrand) {
    return (
      <EmptyState
        title="Nenhuma marca selecionada"
        description="Selecione uma marca para preparar as integrações de tráfego e mídia desta operação."
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Configurações avançadas"
        title="Integrações"
        description="Preparação da camada de integrações por loja. Esta área organiza o que cada marca precisa para conectar GA4 e Meta Ads sem misturar credenciais entre operações."
        badge={`Escopo atual: ${activeBrand.name}`}
      />

      <section className="grid gap-6 xl:grid-cols-2">
        <SurfaceCard>
          <SectionHeading
            title="Google Analytics 4"
            description="Tráfego, origem/mídia e eventos de funil para complementar a visão comercial e financeira."
          />
          <div className="mt-5 space-y-4">
            <div className="panel-muted flex items-start gap-3 p-4">
              <Radar className="mt-0.5 text-secondary" size={18} />
              <div className="space-y-2 text-sm text-on-surface-variant">
                <p className="font-semibold text-on-surface">O que a integração pode entregar</p>
                <p>
                  Sessões, usuários, origem/mídia, campanhas, landing pages e eventos como
                  <span className="font-medium text-on-surface"> add_to_cart</span>,
                  <span className="font-medium text-on-surface"> begin_checkout</span> e
                  <span className="font-medium text-on-surface"> purchase</span>.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {ga4Requirements.map((item) => (
                <div key={item} className="flex items-start gap-3 text-sm text-on-surface-variant">
                  <CheckCircle2 size={16} className="mt-1 text-secondary" />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-outline bg-surface-container/60 p-4 text-sm text-on-surface-variant">
              <p className="font-semibold text-on-surface">Estado atual</p>
              <p className="mt-2">
                Estrutura funcional preparada por marca. A etapa seguinte é persistir credenciais e
                sincronização server-side.
              </p>
            </div>
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <SectionHeading
            title="Meta Ads"
            description="Automação da importação de mídia para reduzir dependência dos CSVs exportados manualmente."
          />
          <div className="mt-5 space-y-4">
            <div className="panel-muted flex items-start gap-3 p-4">
              <PlugZap className="mt-0.5 text-secondary" size={18} />
              <div className="space-y-2 text-sm text-on-surface-variant">
                <p className="font-semibold text-on-surface">O que a integração pode entregar</p>
                <p>
                  Insights por conta, campanha, conjunto e anúncio com métricas como spend,
                  impressions, clicks, CTR, CPC, CPM, compras e receita atribuída.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {metaRequirements.map((item) => (
                <div key={item} className="flex items-start gap-3 text-sm text-on-surface-variant">
                  <CheckCircle2 size={16} className="mt-1 text-secondary" />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-outline bg-surface-container/60 p-4 text-sm text-on-surface-variant">
              <p className="font-semibold text-on-surface">Cuidados de implementação</p>
              <p className="mt-2">
                O conector deve usar atribuição unificada, registrar a última sincronização por
                loja e preservar as decisões de saneamento já salvas no banco.
              </p>
            </div>
          </div>
        </SurfaceCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <SurfaceCard>
          <SectionHeading
            title="Segurança operacional"
            description="As integrações precisam nascer isoladas por marca."
          />
          <div className="mt-5 space-y-4 text-sm text-on-surface-variant">
            <div className="flex items-start gap-3">
              <ShieldCheck size={16} className="mt-1 text-secondary" />
              <p>Credenciais separadas por loja, com acesso restrito ao ambiente correto.</p>
            </div>
            <div className="flex items-start gap-3">
              <KeyRound size={16} className="mt-1 text-secondary" />
              <p>Armazenamento server-side de tokens e segredos; nada sensível no cliente.</p>
            </div>
            <div className="flex items-start gap-3">
              <Clock3 size={16} className="mt-1 text-secondary" />
              <p>Registro de última sincronização, falhas e status de conexão por marca.</p>
            </div>
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <SectionHeading
            title="Roadmap recomendado"
            description="Sequência segura para evoluir o sistema sem quebrar os fluxos já fechados."
          />
          <div className="mt-5 grid gap-3">
            {roadmap.map((step) => (
              <article key={step.phase} className="panel-muted p-4">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-secondary">
                  {step.phase}
                </p>
                <h3 className="mt-2 font-semibold text-on-surface">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-on-surface-variant">{step.body}</p>
              </article>
            ))}
          </div>
        </SurfaceCard>
      </section>
    </div>
  );
}
