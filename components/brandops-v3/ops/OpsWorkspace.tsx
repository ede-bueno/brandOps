"use client";

import Link from "next/link";
import { CircleAlert, CircleCheck } from "lucide-react";
import { useBrandOps } from "@/components/BrandOpsProvider";
import {
  buildOpsFocusItems,
  buildOpsMetrics,
  buildStudioHref,
  makeModuleFallback,
  type OpsStudioSurface,
  type StudioModuleContext,
} from "@/lib/brandops-v3/view-models";
import { integerFormatter } from "@/lib/brandops/format";
import { V3ModuleChrome } from "../BrandOpsShellV3";
import { FocusList, InlineEmpty, MetricRibbon, TrendBars } from "../StudioPrimitives";
import { resolveOpsWorkspaceMeta } from "./resolveOpsWorkspaceMeta";

export function OpsWorkspace({ context }: { context: StudioModuleContext }) {
  const requestedSurface = context.surface as OpsStudioSurface;
  const { activeBrand } = useBrandOps();
  const focus = buildOpsFocusItems(activeBrand);
  const integrations = activeBrand?.integrations ?? [];
  const files = Object.values(activeBrand?.files ?? {}).sort((left, right) =>
    right.lastImportedAt.localeCompare(left.lastImportedAt),
  );
  const featureFlags = Object.entries(activeBrand?.governance.featureFlags ?? {});
  const opsMeta = resolveOpsWorkspaceMeta(context);

  return (
    <V3ModuleChrome
      eyebrow="Operação"
      title={opsMeta.title}
      description={opsMeta.description}
      aside={
        <Link className="v3-primary-link" href={opsMeta.actionHref}>
          {opsMeta.actionLabel}
        </Link>
      }
    >
      <MetricRibbon metrics={buildOpsMetrics(activeBrand)} />
      {opsMeta.banner ? (
        <div className="v3-note">
          <strong>Sinal do recorte</strong>
          <p>{opsMeta.banner}</p>
        </div>
      ) : null}

      <section className="v3-command-grid">
        <div className="v3-panel v3-brief-panel">
          <span>Estado operacional</span>
          <h2>{activeBrand?.name ?? "Módulo operacional"}</h2>
          <p>
            Use esta área para manter fontes, catálogo e governança previsíveis enquanto a leitura
            executiva continua no Comando.
          </p>
          <FocusList items={focus.length ? focus : makeModuleFallback("ops")} />
        </div>
        <div className="v3-panel v3-panel-quiet">
          <TrendBars
            title="Últimas cargas"
            items={files.slice(0, 5).map((file) => ({
              label: file.kind,
              value: file.totalInserted,
              detail: file.lastImportedAt.slice(0, 10),
              tone: "info" as const,
            }))}
            formatValue={(value) => `${integerFormatter.format(value)} linhas`}
          />
        </div>
      </section>

      <section className="v3-panel v3-panel-quiet">
        <div className="v3-panel-heading">
          <span>Operação da marca</span>
          <strong>{activeBrand?.governance.planTier ?? "starter"}</strong>
        </div>
        {requestedSurface === "overview" ? (
          <div className="v3-section-grid">
            <div className="v3-panel-body">
              <div className="v3-subsection-head">
                <span>Frentes do módulo</span>
              </div>
              <FocusList
                items={[
                  {
                    label: "Integrações",
                    title: "Conectar e revisar fontes",
                    detail:
                      "Abra o console de integrações para validar provedores, status e sincronizações.",
                    href: buildStudioHref("ops", { surface: "integrations" }),
                    tone: "info",
                  },
                  {
                    label: "Importação",
                    title: "Acompanhar cargas recentes",
                    detail:
                      "Use imports para revisar arquivos, linhas processadas e próximos envios.",
                    href: buildStudioHref("ops", { surface: "imports" }),
                    tone: "good",
                  },
                  {
                    label: "Saneamento",
                    title: "Resolver ruído da base",
                    detail:
                      "Abra governança com foco em saneamento para tratar pendências antes da análise.",
                    href: buildStudioHref("ops", { surface: "governance", focus: "sanitization" }),
                    tone: "warn",
                  },
                  {
                    label: "Ajuda",
                    title: "Abrir tutoriais e suporte",
                    detail:
                      "Centralize setup guiado, documentação e acessos administrativos em um só lugar.",
                    href: buildStudioHref("ops", { surface: "support" }),
                    tone: "info",
                  },
                ]}
              />
            </div>
            <div className="v3-panel-body">
              <TrendBars
                title="Últimas cargas"
                items={files.slice(0, 5).map((file) => ({
                  label: file.kind,
                  value: file.totalInserted,
                  detail: file.lastImportedAt.slice(0, 10),
                  tone: "info" as const,
                }))}
                formatValue={(value) => `${integerFormatter.format(value)} linhas`}
              />
            </div>
          </div>
        ) : null}
        {requestedSurface === "integrations" ? (
          <div className="v3-panel-body">
            {context.provider ? (
              <div className="v3-note">
                <strong>Provedor em foco</strong>
                <p>
                  O console foi aberto já com o provedor <strong>{context.provider.toUpperCase()}</strong> em foco.
                </p>
              </div>
            ) : null}
            <div className="v3-ops-grid">
              {integrations.length ? (
                integrations.map((integration) => (
                  <Link
                    key={integration.id}
                    href={buildStudioHref("ops", {
                      surface: "integrations",
                      provider: integration.provider,
                    })}
                    data-status={integration.lastSyncStatus}
                  >
                    {integration.lastSyncStatus === "error" ? (
                      <CircleAlert size={18} />
                    ) : (
                      <CircleCheck size={18} />
                    )}
                    <span>{integration.provider.toUpperCase()}</span>
                    <strong>{integration.mode}</strong>
                    <small>{integration.lastSyncAt?.slice(0, 10) ?? "sem sync"}</small>
                  </Link>
                ))
              ) : (
                <InlineEmpty
                  title="Sem integrações conectadas"
                  description="Conecte Meta, GA4, INK ou feed para ativar a camada operacional."
                />
              )}
            </div>
          </div>
        ) : null}
        {requestedSurface === "imports" ? (
          <div className="v3-panel-body">
            <div className="v3-data-list">
              {files.length ? (
                files.map((file) => (
                  <Link key={file.kind} href={buildStudioHref("ops", { surface: "imports", focus: file.kind })}>
                    <span>{file.kind}</span>
                    <strong>{integerFormatter.format(file.totalInserted)} linhas</strong>
                    <small>{file.runs[0]?.fileName ?? file.lastImportedAt.slice(0, 10)}</small>
                  </Link>
                ))
              ) : (
                <InlineEmpty
                  title="Nenhum arquivo recente"
                  description="As últimas cargas aparecem aqui assim que a operação começar a importar arquivos."
                />
              )}
            </div>
          </div>
        ) : null}
        {requestedSurface === "governance" ? (
          <div className="v3-section-grid">
            <div className="v3-panel-body">
              <div className="v3-subsection-head">
                <span>Flags do módulo</span>
              </div>
              <div className="v3-flag-grid">
                {featureFlags.map(([key, enabled]) => (
                  <article key={key} data-enabled={enabled}>
                    <span>{key}</span>
                    <strong>{enabled ? "Ativo" : "Desligado"}</strong>
                  </article>
                ))}
              </div>
            </div>
            <div className="v3-panel-body">
              <div className="v3-subsection-head">
                <span>Revisões pendentes</span>
              </div>
              <FocusList items={focus.length ? focus : makeModuleFallback("ops")} />
            </div>
          </div>
        ) : null}
        {requestedSurface === "support" ? (
          <div className="v3-section-grid">
            <div className="v3-panel-body">
              <div className="v3-subsection-head">
                <span>Atalhos de conhecimento</span>
              </div>
              <FocusList
                items={[
                  {
                    label: "Tutoriais",
                    title: context.provider
                      ? `Setup ${context.provider.toUpperCase()}`
                      : "Guias de integração",
                    detail:
                      context.provider
                        ? "Abra o passo a passo do provedor já no contexto operacional da marca."
                        : "Centralize onboarding, setup e troubleshooting sem sair do Studio.",
                    href: buildStudioHref("ops", {
                      surface: "support",
                      provider: context.provider ?? undefined,
                    }),
                    tone: "info",
                  },
                  {
                    label: "Ajuda",
                    title: "Central de suporte",
                    detail: "Documente perguntas frequentes, atalhos operacionais e contexto de uso.",
                    href: buildStudioHref("ops", { surface: "support" }),
                    tone: "good",
                  },
                  {
                    label: "Administração",
                    title: "Marcas e governança",
                    detail: "Ajustes administrativos e organização de marcas agora ficam no mesmo console.",
                    href: buildStudioHref("ops", { surface: "governance", focus: "stores" }),
                    tone: "warn",
                  },
                ]}
              />
            </div>
            <div className="v3-panel-body">
              <div className="v3-subsection-head">
                <span>Estado do módulo</span>
              </div>
              <FocusList items={focus.length ? focus : makeModuleFallback("ops")} />
            </div>
          </div>
        ) : null}
      </section>
    </V3ModuleChrome>
  );
}
