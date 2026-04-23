"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CircleAlert, CircleCheck, Database } from "lucide-react";
import { useBrandOps } from "@/components/BrandOpsProvider";
import {
  fetchAcquisitionHubReport,
  fetchCommandCenterReport,
  fetchFinanceHubReport,
  fetchOfferHubReport,
} from "@/lib/brandops/database";
import { currencyFormatter, integerFormatter } from "@/lib/brandops/format";
import type { AcquisitionHubReport, FinanceHubReport, ManagementSnapshotV2, OfferHubReport } from "@/lib/brandops/types";
import {
  buildStudioHref,
  buildCommandMetrics,
  buildOpsFocusItems,
  buildOpsMetrics,
  getStudioModuleContext,
  getStudioNavItem,
  getStudioWorkspaceTabs,
  makeModuleFallback,
  mapActionsToFocus,
  type OpsStudioSurface,
  type StudioFocusItem,
  type StudioModuleContext,
  type StudioModule,
} from "@/lib/brandops-v3/view-models";
import { FinanceWorkspace } from "./finance/FinanceWorkspace";
import { GrowthWorkspace } from "./growth/GrowthWorkspace";
import { OfferWorkspace } from "./offer/OfferWorkspace";
import {
  ExecutiveQueueBoard,
  FocusList,
  InlineEmpty,
  MetricRibbon,
  SourceHealth,
  EvidenceList,
  TrendBars,
  V3LoadingPanel,
  WorkspaceTabs,
} from "./StudioPrimitives";
import { V3EmptyState, V3ModuleChrome } from "./BrandOpsShellV3";

type StudioReport =
  | ManagementSnapshotV2
  | FinanceHubReport
  | AcquisitionHubReport
  | OfferHubReport
  | null;

type StudioPageSearchParams = Record<string, string | string[] | undefined>;

function mapManagementToneToFocusTone(tone: string): StudioFocusItem["tone"] {
  if (tone === "negative") return "bad";
  if (tone === "warning") return "warn";
  if (tone === "positive") return "good";
  return "info";
}

function getSearchParamValue(
  searchParams: StudioPageSearchParams | undefined,
  key: string,
) {
  const value = searchParams?.[key];
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function CommandWorkspace({
  snapshot,
  context,
}: {
  snapshot: ManagementSnapshotV2;
  context: StudioModuleContext;
}) {
  const requestedTab = context.tab;
  const activeTab =
    requestedTab === "drivers" || requestedTab === "sources" ? requestedTab : "decisions";
  const metrics = buildCommandMetrics(snapshot);
  const focus = mapActionsToFocus(snapshot.decisionQueue);
  const driverItems = [
    {
      label: "Caixa",
      title: snapshot.cashDrivers.headline,
      detail: snapshot.cashDrivers.summary,
      href: "/studio/finance",
      tone: "warn" as const,
    },
    {
      label: "Aquisição",
      title: snapshot.acquisitionSnapshot.headline,
      detail: snapshot.acquisitionSnapshot.summary,
      href: "/studio/growth",
      tone: "info" as const,
    },
    {
      label: "Oferta",
      title: snapshot.offerSnapshot.headline,
      detail: snapshot.offerSnapshot.summary,
      href: "/studio/offer",
      tone: "good" as const,
    },
    ...snapshot.operationalRisks.items.slice(0, 1).map((risk) => ({
      label: "Risco",
      title: risk.title,
      detail: risk.summary,
      href: risk.href,
      tone: "bad" as const,
    })),
  ];

  return (
    <V3ModuleChrome
      eyebrow="Comando"
      title={snapshot.executiveStatus.title}
      description={snapshot.executiveStatus.summary}
      aside={
        <div className="v3-confidence">
          <span>Confiança</span>
          <strong>{snapshot.context.confidenceLabel}</strong>
        </div>
      }
    >
      <MetricRibbon metrics={metrics} />

      <section className="v3-command-grid">
        <div className="v3-panel v3-brief-panel">
          <span>Brief operacional</span>
          <h2>{snapshot.executiveStatus.highlight}</h2>
          <p>{snapshot.executiveStatus.nextMove}</p>
          <FocusList items={focus.length ? focus : makeModuleFallback("command")} />
        </div>
        <div className="v3-panel v3-panel-quiet">
          <div className="v3-panel-heading">
            <span>Plano dominante</span>
            <strong>{snapshot.cashDrivers.dominantMetric.label}</strong>
          </div>
          <div className="v3-panel-body">
            <div className="v3-copy-block">
              <strong>{snapshot.cashDrivers.dominantMetric.value}</strong>
              <p>{snapshot.cashDrivers.dominantMetric.description}</p>
            </div>
            <FocusList items={driverItems.slice(0, 4)} />
          </div>
        </div>
      </section>

      <section className="v3-panel">
        <div className="v3-panel-heading">
            <span>Decisões Atlas</span>
          <strong>{snapshot.context.brandName}</strong>
        </div>
        <WorkspaceTabs
          active={activeTab}
          tabs={getStudioWorkspaceTabs("command", context)}
        />
        {activeTab === "decisions" ? (
          <ExecutiveQueueBoard
            brandId={snapshot.context.brandId}
            from={snapshot.context.from}
            to={snapshot.context.to}
            actions={snapshot.decisionQueue}
            fallbackModule="command"
          />
        ) : null}
        {activeTab === "drivers" ? (
          <div className="v3-section-grid">
            <TrendBars
              title="Caixa e resultado"
              items={snapshot.cashDrivers.trend.map((item) => ({
                label: item.label,
                value: item.netResult,
                detail: `Pós-mídia ${currencyFormatter.format(item.contributionAfterMedia)}`,
                tone: item.netResult >= 0 ? "good" : "bad",
              }))}
            />
            <div className="v3-panel-body">
              <div className="v3-subsection-head">
                <span>Leituras reconciliadas</span>
              </div>
              <FocusList
                items={[
                  ...snapshot.cashDrivers.drivers.map((item) => ({
                    label: item.label,
                    title: item.value,
                    detail: item.summary,
                    href: item.href,
                    tone: mapManagementToneToFocusTone(item.tone),
                  })),
                  ...snapshot.acquisitionSnapshot.drivers.slice(0, 2).map((item) => ({
                    label: item.label,
                    title: item.value,
                    detail: item.summary,
                    href: item.href,
                    tone: "info" as const,
                  })),
                  ...snapshot.offerSnapshot.drivers.slice(0, 2).map((item) => ({
                    label: item.label,
                    title: item.value,
                    detail: item.summary,
                    href: item.href,
                    tone: "good" as const,
                  })),
                ].slice(0, 6)}
              />
            </div>
          </div>
        ) : null}
        {activeTab === "sources" ? (
          <div className="v3-section-stack">
            <SourceHealth sources={snapshot.sourceHealth} />
            <EvidenceList links={snapshot.evidenceLinks} />
          </div>
        ) : null}
      </section>
    </V3ModuleChrome>
  );
}

function OpsWorkspace({ context }: { context: StudioModuleContext }) {
  const requestedSurface = context.surface as OpsStudioSurface;
  const nextActiveTab: OpsStudioSurface =
    requestedSurface === "imports" ||
    requestedSurface === "governance" ||
    requestedSurface === "support"
      ? requestedSurface
      : "integrations";
  const activeTab = nextActiveTab;
  const { activeBrand } = useBrandOps();
  const focus = buildOpsFocusItems(activeBrand);
  const integrations = activeBrand?.integrations ?? [];
  const files = Object.values(activeBrand?.files ?? {}).sort((left, right) =>
    right.lastImportedAt.localeCompare(left.lastImportedAt),
  );
  const featureFlags = Object.entries(activeBrand?.governance.featureFlags ?? {});
  const opsMeta =
    requestedSurface === "imports"
      ? {
          title: "Importação e processamento",
          description:
            "Mantenha as cargas previsíveis e acompanhe arquivos recentes sem sair do módulo operacional.",
          actionLabel: "Abrir integrações",
          actionHref: buildStudioHref("ops", { surface: "integrations" }),
          banner: "Importação em foco: acompanhe cargas recentes, previsibilidade do processamento e próximos arquivos.",
        }
      : requestedSurface === "governance"
        ? {
            title:
              context.focus === "sanitization" ? "Saneamento e revisões" : "Governança operacional",
            description:
              context.focus === "sanitization"
                ? "Acompanhe revisões pendentes e saneamento sem misturar isso com leitura executiva."
                : "Flags, consistência operacional e contexto administrativo reunidos em uma única camada.",
            actionLabel: context.focus === "sanitization" ? "Abrir imports" : "Abrir ajuda",
            actionHref:
              context.focus === "sanitization"
                ? buildStudioHref("ops", { surface: "imports" })
                : buildStudioHref("ops", { surface: "support" }),
            banner:
              context.focus === "sanitization"
                ? "Saneamento em foco: trate pendências e ruído da base antes de confiar na leitura gerencial."
                : "Governança em foco: revise flags, acessos e consistência operacional da marca.",
          }
        : requestedSurface === "support"
          ? {
              title: "Ajuda, tutoriais e administração",
              description:
                "Conhecimento operacional, setup guiado e atalhos administrativos reunidos numa camada discreta.",
              actionLabel: "Abrir integrações",
              actionHref: buildStudioHref("ops", { surface: "integrations" }),
              banner:
                "Suporte em foco: concentre setup guiado, ajuda operacional e administração sem poluir o trabalho principal.",
            }
          : {
              title: "Central operacional",
              description:
                "Imports, saneamento, integrações e governança reunidos para manter a operação previsível.",
              actionLabel: "Importar",
              actionHref: buildStudioHref("ops", { surface: "imports" }),
              banner: null,
            };

  return (
    <V3ModuleChrome
      eyebrow="Operação"
      title={opsMeta.title}
      description={opsMeta.description}
      aside={<Link className="v3-primary-link" href={opsMeta.actionHref}>{opsMeta.actionLabel}</Link>}
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
              tone: "info",
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
        <WorkspaceTabs
          active={activeTab}
          tabs={getStudioWorkspaceTabs("ops", context)}
        />
        {activeTab === "integrations" ? (
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
        {activeTab === "imports" ? (
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
        {activeTab === "governance" ? (
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
        {activeTab === "support" ? (
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

function ModuleReportView({
  module,
  report,
  context,
}: {
  module: StudioModule;
  report: StudioReport;
  context: StudioModuleContext;
}) {
  if (module === "ops") {
    return <OpsWorkspace context={context} />;
  }

  if (!report) {
    return (
      <V3EmptyState
        title="Módulo sem relatório"
        description="O BrandOps não recebeu dados suficientes para montar esta superfície ainda."
      />
    );
  }

  if (module === "command") {
    return <CommandWorkspace snapshot={report as ManagementSnapshotV2} context={context} />;
  }

  if (module === "finance") {
    return <FinanceWorkspace report={report as FinanceHubReport} context={context} />;
  }

  if (module === "growth") {
    return <GrowthWorkspace report={report as AcquisitionHubReport} context={context} />;
  }

  return <OfferWorkspace report={report as OfferHubReport} context={context} />;
}

export function StudioModulePage({
  module,
  searchParams,
}: {
  module: StudioModule;
  searchParams?: StudioPageSearchParams;
}) {
  const [report, setReport] = useState<StudioReport>(null);
  const [isReportLoading, setIsReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const { activeBrand, activeBrandId, isLoading, periodRange } = useBrandOps();
  const activeNav = getStudioNavItem(module);
  const moduleContext = useMemo(
    () =>
      getStudioModuleContext(module, {
        get: (key: string) => getSearchParamValue(searchParams, key),
      }),
    [module, searchParams],
  );
  const periodKey = useMemo(
    () => `${periodRange?.start ?? "na"}-${periodRange?.end ?? "na"}`,
    [periodRange?.end, periodRange?.start],
  );

  useEffect(() => {
    if (module === "ops") {
      setReport(null);
      setReportError(null);
      setIsReportLoading(false);
      return;
    }

    if (!activeBrandId) {
      setReport(null);
      setReportError(null);
      setIsReportLoading(false);
      return;
    }

    const brandId = activeBrandId;
    let cancelled = false;

    async function loadReport() {
      setIsReportLoading(true);
      setReportError(null);
      try {
        const from = periodRange?.start ?? null;
        const to = periodRange?.end ?? null;
        const nextReport =
          module === "command"
            ? await fetchCommandCenterReport(brandId, from, to)
            : module === "finance"
              ? await fetchFinanceHubReport(brandId, from, to)
              : module === "growth"
                ? await fetchAcquisitionHubReport(brandId, from, to)
                : await fetchOfferHubReport(brandId, from, to);

        if (!cancelled) {
          setReport(nextReport);
        }
      } catch (error) {
        if (!cancelled) {
          setReport(null);
          setReportError(
            error instanceof Error ? error.message : "Não foi possível carregar este módulo.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsReportLoading(false);
        }
      }
    }

    void loadReport();

    return () => {
      cancelled = true;
    };
  }, [activeBrandId, module, periodKey, periodRange?.end, periodRange?.start]);

  if (!activeBrandId && !activeBrand) {
    return (
      <V3EmptyState
        title="Nenhuma marca ativa"
        description="Selecione ou cadastre uma marca para abrir o BrandOps Studio."
      />
    );
  }

  if ((isLoading && !activeBrand) || isReportLoading) {
    return <V3LoadingPanel label={`Montando ${activeNav.label.toLowerCase()}`} />;
  }

  if (reportError) {
    return (
      <div className="v3-error-panel">
        <Database size={20} />
        <strong>{activeNav.label} indisponível</strong>
        <p>{reportError}</p>
      </div>
    );
  }

  return <ModuleReportView module={module} report={report} context={moduleContext} />;
}
