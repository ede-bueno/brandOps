"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  ArrowUpRight,
  CircleAlert,
  CircleCheck,
  Database,
  Loader2,
  PackageSearch,
} from "lucide-react";
import { useBrandOps } from "@/components/BrandOpsProvider";
import {
  fetchAcquisitionHubReport,
  fetchCommandCenterReport,
  fetchFinanceHubReport,
  fetchOfferHubReport,
  updateExecutiveActionQueueItem,
} from "@/lib/brandops/database";
import {
  currencyFormatter,
  integerFormatter,
  percentFormatter,
} from "@/lib/brandops/format";
import type {
  AcquisitionHubReport,
  ExecutiveActionItem,
  ExecutiveActionStatus,
  FinanceHubReport,
  ManagementEvidenceLink,
  ManagementSnapshotV2,
  ManagementSourceHealthItem,
  OfferHubReport,
} from "@/lib/brandops/types";
import {
  buildStudioHref,
  buildCommandMetrics,
  buildFinanceLedgerRows,
  buildFinanceMetrics,
  buildGrowthMetrics,
  buildOfferMetrics,
  buildOpsFocusItems,
  buildOpsMetrics,
  getStudioModuleContext,
  getStudioNavItem,
  makeModuleFallback,
  mapActionsToFocus,
  normalizeStudioHref,
  type FinanceStudioSurface,
  type GrowthStudioSurface,
  type OfferStudioSurface,
  type OpsStudioSurface,
  type StudioFocusItem,
  type StudioMetric,
  type StudioModuleContext,
  type StudioModule,
} from "@/lib/brandops-v3/view-models";
import { V3EmptyState, V3ModuleChrome } from "./BrandOpsShellV3";

type StudioReport =
  | ManagementSnapshotV2
  | FinanceHubReport
  | AcquisitionHubReport
  | OfferHubReport
  | null;

type StudioPageSearchParams = Record<string, string | string[] | undefined>;

const actionStatusOptions: Array<{
  value: ExecutiveActionStatus;
  label: string;
}> = [
  { value: "new", label: "Novo" },
  { value: "in_progress", label: "Em andamento" },
  { value: "deferred", label: "Adiado" },
  { value: "resolved", label: "Resolvido" },
];

function formatSourceStatus(status: ManagementSourceHealthItem["status"]) {
  if (status === "healthy") return "OK";
  if (status === "warning") return "Atenção";
  if (status === "error") return "Erro";
  return "Ausente";
}

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

function V3LoadingPanel({ label = "Carregando workspace" }: { label?: string }) {
  return (
    <div className="v3-panel v3-loading-panel">
      <Loader2 className="animate-spin" size={18} />
      <span>{label}</span>
    </div>
  );
}

function MetricRibbon({ metrics }: { metrics: StudioMetric[] }) {
  return (
    <section className="v3-metric-ribbon" aria-label="Métricas do workspace">
      {metrics.map((metric) => (
        <article key={metric.label} data-tone={metric.tone}>
          <span>{metric.label}</span>
          <strong>{metric.value}</strong>
          <p>{metric.detail}</p>
        </article>
      ))}
    </section>
  );
}

function WorkspaceTabs({
  active,
  tabs,
  onChange,
}: {
  active: string;
  tabs: Array<{ key: string; label: string }>;
  onChange: (tab: string) => void;
}) {
  return (
    <div className="v3-tabs" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          className="v3-tab"
          data-active={tab.key === active}
          onClick={() => onChange(tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function FocusList({ items }: { items: StudioFocusItem[] }) {
  return (
    <div className="v3-focus-list">
      {items.map((item) => {
        const content = (
          <>
            <div>
              <span>{item.label}</span>
              <strong>{item.title}</strong>
              <p>{item.detail}</p>
            </div>
            {item.href ? <ArrowUpRight size={16} /> : null}
          </>
        );

        if (item.href) {
          return (
            <Link
              key={`${item.label}-${item.title}`}
              href={normalizeStudioHref(item.href)}
              data-tone={item.tone}
            >
              {content}
            </Link>
          );
        }

        return (
          <article key={`${item.label}-${item.title}`} data-tone={item.tone}>
            {content}
          </article>
        );
      })}
    </div>
  );
}

function EvidenceList({ links }: { links: ManagementEvidenceLink[] }) {
  if (!links.length) {
    return (
      <div className="v3-note">
        <strong>Sem evidências adicionais</strong>
        <p>Quando houver reconciliação suficiente, o Atlas expõe fontes e trilhas nesta área.</p>
      </div>
    );
  }

  return (
    <div className="v3-evidence-list">
      {links.map((link) => (
        <Link key={link.href} href={normalizeStudioHref(link.href)}>
          <span>{link.label}</span>
          <strong>{link.summary}</strong>
          <small>{link.href}</small>
        </Link>
      ))}
    </div>
  );
}

function SourceHealth({ sources }: { sources: ManagementSourceHealthItem[] }) {
  return (
    <section className="v3-source-grid">
      {sources.map((source) => (
        <Link key={source.key} href={normalizeStudioHref(source.href)} data-status={source.status}>
          <span>{source.label}</span>
          <strong>{formatSourceStatus(source.status)}</strong>
          <p>{source.detail}</p>
          <small>{source.freshnessLabel}</small>
        </Link>
      ))}
    </section>
  );
}

function TrendBars({
  title,
  items,
  formatValue,
}: {
  title: string;
  items: Array<{
    label: string;
    value: number;
    detail?: string;
    tone?: "good" | "warn" | "bad" | "info";
  }>;
  formatValue?: (value: number) => string;
}) {
  if (!items.length) {
    return null;
  }

  const maxValue = Math.max(...items.map((item) => Math.abs(item.value)), 1);

  return (
    <div className="v3-panel-body">
      <div className="v3-subsection-head">
        <span>{title}</span>
      </div>
      <div className="v3-trend-list">
        {items.map((item) => (
          <article key={`${title}-${item.label}`} data-tone={item.tone ?? "info"}>
            <header>
              <span>{item.label}</span>
              <strong>{formatValue ? formatValue(item.value) : currencyFormatter.format(item.value)}</strong>
            </header>
            <div className="v3-trend-meter">
              <div
                className="v3-trend-fill"
                style={{ width: `${Math.max((Math.abs(item.value) / maxValue) * 100, 6)}%` }}
              />
            </div>
            {item.detail ? <p>{item.detail}</p> : null}
          </article>
        ))}
      </div>
    </div>
  );
}

function ExecutiveQueueBoard({
  brandId,
  from,
  to,
  actions,
  fallbackModule,
}: {
  brandId: string;
  from: string | null;
  to: string | null;
  actions: ExecutiveActionItem[];
  fallbackModule: StudioModule;
}) {
  const [queue, setQueue] = useState(actions);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setQueue(actions);
  }, [actions]);

  if (!queue.length) {
    return <FocusList items={makeModuleFallback(fallbackModule)} />;
  }

  const updateStatus = (action: ExecutiveActionItem, status: ExecutiveActionStatus) => {
    if (status === action.status) {
      return;
    }

    const previousQueue = queue;
    const nextQueue = queue.map((item) =>
      item.actionKey === action.actionKey ? { ...item, status } : item,
    );

    setPendingKey(action.actionKey);
    setQueue(nextQueue);

    startTransition(() => {
      void updateExecutiveActionQueueItem(brandId, {
        actionKey: action.actionKey,
        status,
        reviewAt: action.reviewAt,
        domain: action.domain,
        from,
        to,
      })
        .catch(() => {
          setQueue(previousQueue);
        })
        .finally(() => {
          setPendingKey(null);
        });
    });
  };

  return (
    <div className="v3-queue-board">
      {queue.map((action) => (
        <article key={action.actionKey} data-priority={action.priority}>
          <div className="v3-queue-main">
            <div className="v3-queue-copy">
              <span>{action.domain}</span>
              <strong>{action.title}</strong>
              <p>{action.summary}</p>
            </div>
            <div className="v3-chip-cluster">
              <small>{action.impact}</small>
              <small>Confiança {action.confidence}</small>
              {action.reviewAt ? <small>Revisão {action.reviewAt.slice(0, 10)}</small> : null}
            </div>
          </div>
          <div className="v3-queue-footer">
            <div className="v3-queue-links">
              {action.sourceRefs.slice(0, 2).map((ref) => (
                <Link key={`${action.actionKey}-${ref.href}`} href={normalizeStudioHref(ref.href)}>
                  {ref.label}
                </Link>
              ))}
              <Link href={normalizeStudioHref(action.drilldownHref)}>Abrir análise</Link>
            </div>
            <label className="v3-status-select">
              <span>Status</span>
              <select
                value={action.status}
                onChange={(event) =>
                  updateStatus(action, event.target.value as ExecutiveActionStatus)
                }
                disabled={isPending && pendingKey === action.actionKey}
              >
                {actionStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </article>
      ))}
    </div>
  );
}

function FinanceLedger({ report }: { report: FinanceHubReport }) {
  const months = report.financial.months.slice(-8);
  const monthKeys = new Set(months.map((month) => month.monthKey));
  const filteredReport = {
    ...report.financial,
    months: report.financial.months.filter((month) => monthKeys.has(month.monthKey)),
  };
  const rows = buildFinanceLedgerRows(filteredReport);

  return (
    <div className="v3-ledger">
      <div className="v3-ledger-row v3-ledger-head">
        <span>Indicador</span>
        {months.map((month) => (
          <strong key={month.monthKey}>{month.label}</strong>
        ))}
      </div>
      {rows.map((row) => (
        <div key={row.label} className="v3-ledger-row">
          <span>{row.label}</span>
          {row.values.map((value, index) => (
            <strong key={`${row.label}-${months[index]?.monthKey ?? index}`}>
              {currencyFormatter.format(value)}
            </strong>
          ))}
        </div>
      ))}
    </div>
  );
}

function CommandWorkspace({ snapshot }: { snapshot: ManagementSnapshotV2 }) {
  const [activeTab, setActiveTab] = useState("decisions");
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
        <div className="v3-panel">
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
          <span>Atlas workspace</span>
          <strong>{snapshot.context.brandName}</strong>
        </div>
        <WorkspaceTabs
          active={activeTab}
          onChange={setActiveTab}
          tabs={[
            { key: "decisions", label: "Decisões" },
            { key: "drivers", label: "Drivers" },
            { key: "sources", label: "Fontes" },
          ]}
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

function FinanceWorkspace({
  report,
  context,
}: {
  report: FinanceHubReport;
  context: StudioModuleContext;
}) {
  const requestedSurface = context.surface as FinanceStudioSurface;
  const nextActiveTab: FinanceStudioSurface =
    requestedSurface === "sales" ||
    requestedSurface === "operations" ||
    requestedSurface === "evidence"
      ? requestedSurface
      : "dre";
  const [activeTab, setActiveTab] = useState<FinanceStudioSurface>(nextActiveTab);
  const topProducts = report.sales.topProducts.slice(0, 6);
  const financeMeta =
    requestedSurface === "operations"
      ? {
          title:
            context.focus === "cmv" ? "Custos, CMV e composição" : "Lançamentos e categorias",
          description:
            context.focus === "cmv"
              ? "Use este recorte para validar custo aplicado, cobertura de CMV e pressão dos itens vendidos."
              : "Organize competência, despesas e categorias sem perder o contexto financeiro da marca.",
          actionLabel: "Voltar ao DRE",
          actionHref: buildStudioHref("finance", { surface: "dre" }),
          banner:
            context.focus === "cmv"
              ? "Foco em CMV: esta entrada veio de uma rota legacy de custo e abre a camada operacional dentro de Finanças."
              : "Foco em lançamentos: a rotina operacional foi absorvida pelo workbench financeiro do BrandOps.",
        }
      : requestedSurface === "sales"
        ? {
            title: "Vendas que sustentam caixa",
            description:
              "Cruze receita real, produtos líderes e playbook comercial sem sair do ambiente financeiro.",
            actionLabel: "Abrir DRE",
            actionHref: buildStudioHref("finance", { surface: "dre" }),
            banner: "Foco em vendas: esta entrada veio da leitura comercial ligada ao financeiro.",
          }
        : requestedSurface === "evidence"
          ? {
              title: "Evidências e reconciliação financeira",
              description:
                "Fontes, evidências e confiança da leitura financeira em uma única superfície secundária.",
              actionLabel: "Abrir DRE",
              actionHref: buildStudioHref("finance", { surface: "dre" }),
              banner: "Foco em evidências: use esta área para validar fonte, consistência e reconciliação.",
            }
          : {
              title: "Workbench financeiro",
              description:
                "DRE, custos e vendas em uma mesa de leitura operacional, com Atlas como explicador contextual.",
              actionLabel: "Abrir lançamentos",
              actionHref: buildStudioHref("finance", { surface: "operations" }),
              banner: null,
            };

  useEffect(() => {
    setActiveTab(nextActiveTab);
  }, [nextActiveTab]);

  return (
    <V3ModuleChrome
      eyebrow="Finanças"
      title={financeMeta.title}
      description={financeMeta.description}
      aside={<Link className="v3-primary-link" href={financeMeta.actionHref}>{financeMeta.actionLabel}</Link>}
    >
      <MetricRibbon metrics={buildFinanceMetrics(report)} />
      {financeMeta.banner ? (
        <div className="v3-note">
          <strong>Contexto preservado</strong>
          <p>{financeMeta.banner}</p>
        </div>
      ) : null}

      <section className="v3-command-grid">
        <div className="v3-panel v3-brief-panel">
          <span>Leitura dominante</span>
          <h2>{report.overview.headline}</h2>
          <p>{report.overview.summary}</p>
          <FocusList
            items={[
              ...report.overview.drivers.map((item) => ({
                label: item.label,
                title: item.value,
                detail: item.summary,
                href: item.href,
                tone: mapManagementToneToFocusTone(item.tone),
              })),
              ...mapActionsToFocus(report.priorities),
            ].slice(0, 5)}
          />
        </div>
        <div className="v3-panel">
          <div className="v3-panel-heading">
            <span>Resumo Atlas</span>
            <strong>{report.context.brandName}</strong>
          </div>
          <TrendBars
            title="Resultado por competência"
            items={report.financial.months.slice(-6).map((month) => ({
              label: month.label,
              value: month.metrics.netResult,
              detail: `RLD ${currencyFormatter.format(month.metrics.rld)}`,
              tone: month.metrics.netResult >= 0 ? "good" : "bad",
            }))}
          />
        </div>
      </section>

      <section className="v3-panel">
        <div className="v3-panel-heading">
          <span>Mesa financeira</span>
          <strong>{report.financial.months.length} competências</strong>
        </div>
        <WorkspaceTabs
          active={activeTab}
          onChange={(tab) => setActiveTab(tab as FinanceStudioSurface)}
          tabs={[
            { key: "dre", label: "DRE" },
            { key: "operations", label: "Operação" },
            { key: "sales", label: "Vendas" },
            { key: "evidence", label: "Evidências" },
          ]}
        />
        {activeTab === "dre" ? (
          <div className="v3-section-grid">
            <div className="v3-panel-shell">
              <FinanceLedger report={report} />
            </div>
            <div className="v3-section-stack">
              <ExecutiveQueueBoard
                brandId={report.context.brandId}
                from={report.context.from}
                to={report.context.to}
                actions={report.priorities}
                fallbackModule="finance"
              />
            </div>
          </div>
        ) : null}
        {activeTab === "operations" ? (
          <div className="v3-section-grid">
            <div className="v3-panel-body">
              <div className="v3-subsection-head">
                <span>{context.focus === "cmv" ? "Custos e CMV" : "Rotina financeira"}</span>
              </div>
              <FocusList
                items={[
                  {
                    label: "Lançamentos",
                    title: "Registrar competência, categoria e despesa",
                    detail:
                      "A rotina operacional de despesas agora fica dentro do workbench financeiro, sem abrir outra interface.",
                    href: buildStudioHref("finance", { surface: "operations" }),
                    tone: "info",
                  },
                  {
                    label: "CMV",
                    title: currencyFormatter.format(report.financial.total.cmvTotal),
                    detail:
                      "Valide o custo dos itens vendidos e a pressão do recorte antes de escalar mídia ou catálogo.",
                    href: buildStudioHref("finance", { surface: "operations", focus: "cmv" }),
                    tone: "warn",
                  },
                  {
                    label: "Fechamento",
                    title: `${report.financial.months.length} competências reconciliadas`,
                    detail: "Volte ao DRE para consolidar leitura e decisões do período.",
                    href: buildStudioHref("finance", { surface: "dre" }),
                    tone: "good",
                  },
                ]}
              />
            </div>
            <div className="v3-panel-body">
              <div className="v3-subsection-head">
                <span>Prioridades do Atlas</span>
              </div>
              <FocusList
                items={[
                  ...mapActionsToFocus(report.priorities),
                  {
                    label: "Produto com maior custo",
                    title: topProducts[0]?.productName ?? "Sem item dominante",
                    detail: topProducts[0]
                      ? `${currencyFormatter.format(topProducts[0].grossRevenue)} em venda real no recorte.`
                      : "Quando houver venda consolidada, o BrandOps destaca o item que mais sustenta caixa.",
                    href: buildStudioHref("offer", { surface: "sales" }),
                    tone: "info" as const,
                  },
                ].slice(0, 4)}
              />
            </div>
          </div>
        ) : null}
        {activeTab === "sales" ? (
          <div className="v3-section-grid">
            <div className="v3-panel-body">
              <div className="v3-subsection-head">
                <span>Produtos que sustentam caixa</span>
              </div>
              <div className="v3-data-list">
                {topProducts.map((product) => (
                  <Link key={product.productKey} href={buildStudioHref("offer", { surface: "sales" })}>
                    <span>{product.productName}</span>
                    <strong>{currencyFormatter.format(product.grossRevenue)}</strong>
                    <small>{integerFormatter.format(product.quantity)} itens</small>
                  </Link>
                ))}
              </div>
            </div>
            <div className="v3-panel-body">
              <div className="v3-subsection-head">
                <span>Playbook de venda</span>
              </div>
              <FocusList
                items={[
                  {
                    label: report.sales.playbook.protect.title,
                    title: `${report.sales.playbook.protect.count} itens para proteger`,
                    detail: report.sales.playbook.protect.description,
                    href: buildStudioHref("offer", { surface: "sales" }),
                    tone: "warn",
                  },
                  {
                    label: report.sales.playbook.grow.title,
                    title: `${report.sales.playbook.grow.count} itens para crescer`,
                    detail: report.sales.playbook.grow.description,
                    href: buildStudioHref("offer", { surface: "sales" }),
                    tone: "good",
                  },
                  {
                    label: report.sales.playbook.review.title,
                    title: `${report.sales.playbook.review.count} itens para revisar`,
                    detail: report.sales.playbook.review.description,
                    href: buildStudioHref("offer", { surface: "sales" }),
                    tone: "info",
                  },
                ]}
              />
            </div>
          </div>
        ) : null}
        {activeTab === "evidence" ? (
          <div className="v3-section-stack">
            <SourceHealth sources={report.sourceHealth} />
            <EvidenceList links={report.evidenceLinks} />
          </div>
        ) : null}
      </section>
    </V3ModuleChrome>
  );
}

function GrowthWorkspace({
  report,
  context,
}: {
  report: AcquisitionHubReport;
  context: StudioModuleContext;
}) {
  const requestedSurface = context.surface as GrowthStudioSurface;
  const nextActiveTab: GrowthStudioSurface =
    requestedSurface === "traffic" || requestedSurface === "evidence" ? requestedSurface : "media";
  const [activeTab, setActiveTab] = useState<GrowthStudioSurface>(nextActiveTab);
  const focus = [
    ...mapActionsToFocus(report.priorities),
    {
      label: "Campanha",
      title: report.media.commandRoom.bestScale?.campaignName ?? "Sem campanha de escala",
      detail: report.media.commandRoom.bestScaleSummary ?? report.media.analysis.narrativeBody,
      tone: "info" as const,
      href: buildStudioHref("growth", { surface: "media", mode: "campaigns" }),
    },
    {
      label: "Tráfego",
      title: report.traffic.highlights.topSource?.label ?? "Sem fonte dominante",
      detail: report.traffic.story,
      tone: "info" as const,
      href: buildStudioHref("growth", { surface: "traffic" }),
    },
  ].slice(0, 5);
  const growthMeta =
    requestedSurface === "traffic"
      ? {
          title: "Diagnóstico de tráfego",
          description:
            "Fontes, gargalos de conversão e fricção do funil em uma superfície de trabalho única.",
          actionLabel: "Abrir mídia",
          actionHref: buildStudioHref("growth", { surface: "media" }),
          banner:
            "Foco em tráfego: esta entrada preserva a intenção da análise micro sem reabrir a UI antiga.",
        }
      : requestedSurface === "evidence"
        ? {
            title: "Evidências de aquisição",
            description:
              "Confiança, filas executivas e saúde das fontes de aquisição reunidas em uma camada secundária.",
            actionLabel: "Voltar ao diagnóstico",
            actionHref: buildStudioHref("growth", { surface: "media" }),
            banner:
              "Foco em evidências: valide a leitura reconciliada antes de decidir escala ou revisão.",
          }
        : context.mode === "campaigns"
          ? {
              title: "Campanhas e mídia",
              description:
                "Mesa operacional para localizar verba dominante, prioridade de revisão e leitura por campanha.",
              actionLabel: "Abrir tráfego",
              actionHref: buildStudioHref("growth", { surface: "traffic" }),
              banner:
                "Foco em campanhas: a rota antiga de mídia agora abre diretamente o workbench de crescimento.",
            }
          : context.mode === "radar"
            ? {
                title: "Radar de mídia",
                description:
                  "Use o recorte para acompanhar eficiência do gasto, pressão diária e resposta do período.",
                actionLabel: "Abrir campanhas",
                actionHref: buildStudioHref("growth", { surface: "media", mode: "campaigns" }),
                banner:
                  "Foco em radar: esta visão prioriza curva e eficiência sem separar mídia do restante da aquisição.",
              }
            : context.mode === "executive"
              ? {
                  title: "Sala de comando de aquisição",
                  description:
                    "Leia mídia, risco e próximo passo operacional como uma única camada decisória.",
                  actionLabel: "Abrir campanhas",
                  actionHref: buildStudioHref("growth", { surface: "media", mode: "campaigns" }),
                  banner:
                    "Foco executivo: a antiga visão executiva de mídia foi absorvida pelo BrandOps Studio.",
                }
              : {
                  title: "Aquisição e conversão",
                  description:
                    "Diagnóstico operacional de mídia, tráfego e funil sem transformar a tela em mural de indicadores.",
                  actionLabel: "Abrir mídia",
                  actionHref: buildStudioHref("growth", { surface: "media" }),
                  banner: null,
                };

  useEffect(() => {
    setActiveTab(nextActiveTab);
  }, [nextActiveTab]);

  return (
    <V3ModuleChrome
      eyebrow="Crescimento"
      title={growthMeta.title}
      description={growthMeta.description}
      aside={<Link className="v3-primary-link" href={growthMeta.actionHref}>{growthMeta.actionLabel}</Link>}
    >
      <MetricRibbon metrics={buildGrowthMetrics(report)} />
      {growthMeta.banner ? (
        <div className="v3-note">
          <strong>Contexto preservado</strong>
          <p>{growthMeta.banner}</p>
        </div>
      ) : null}

      <section className="v3-command-grid">
        <div className="v3-panel v3-brief-panel">
          <span>Leitura dominante</span>
          <h2>{report.overview.headline}</h2>
          <p>{report.overview.summary}</p>
          <FocusList items={focus.length ? focus : makeModuleFallback("growth")} />
        </div>
        <div className="v3-panel">
          <TrendBars
            title="Receita e gasto"
            items={report.overview.trend.slice(-6).map((point) => ({
              label: point.date,
              value: point.purchaseRevenue - point.spend,
              detail: `Sessões ${integerFormatter.format(point.sessions)}`,
              tone: point.purchaseRevenue >= point.spend ? "good" : "warn",
            }))}
          />
        </div>
      </section>

      <section className="v3-panel">
        <div className="v3-panel-heading">
          <span>Workbench de aquisição</span>
          <strong>{report.context.brandName}</strong>
        </div>
        <WorkspaceTabs
          active={activeTab}
          onChange={(tab) => setActiveTab(tab as GrowthStudioSurface)}
          tabs={[
            { key: "media", label: "Mídia" },
            { key: "traffic", label: "Tráfego" },
            { key: "evidence", label: "Evidências" },
          ]}
        />
        {activeTab === "media" ? (
          <div className="v3-section-grid">
            <div className="v3-panel-body">
              <div className="v3-subsection-head">
                <span>
                  {context.mode === "campaigns"
                    ? "Campanhas em foco"
                    : context.mode === "radar"
                      ? "Curva e gasto em foco"
                      : "Campanhas em foco"}
                </span>
              </div>
              {context.mode === "radar" ? (
                <TrendBars
                  title="Receita e gasto"
                  items={report.overview.trend.slice(-6).map((point) => ({
                    label: point.date,
                    value: point.purchaseRevenue - point.spend,
                    detail: `Sessões ${integerFormatter.format(point.sessions)}`,
                    tone: point.purchaseRevenue >= point.spend ? "good" : "warn",
                  }))}
                />
              ) : null}
              <div className="v3-data-list">
                {report.media.campaigns.slice(0, 8).map((campaign) => (
                  <Link
                    key={campaign.campaignName}
                    href={buildStudioHref("growth", { surface: "media", mode: "campaigns" })}
                  >
                    <span>{campaign.campaignName}</span>
                    <strong>{currencyFormatter.format(campaign.spend)}</strong>
                    <small>{campaign.roas.toFixed(2)}x ROAS</small>
                  </Link>
                ))}
              </div>
            </div>
            <div className="v3-section-stack">
              <FocusList
                items={[
                  {
                    label: "Escala",
                    title: report.media.commandRoom.bestScale?.campaignName ?? "Sem campanha líder",
                    detail:
                      report.media.commandRoom.bestScaleSummary ?? report.media.analysis.narrativeBody,
                    href: buildStudioHref("growth", { surface: "media", mode: "campaigns" }),
                    tone: "good",
                  },
                  {
                    label: "Revisão",
                    title:
                      report.media.commandRoom.priorityReview?.campaignName ??
                      "Sem campanha crítica",
                    detail:
                      report.media.commandRoom.priorityReviewSummary ??
                      report.media.analysis.topRisk ??
                      "Sem revisão prioritária sinalizada.",
                    href: buildStudioHref("growth", { surface: "media", mode: "campaigns" }),
                    tone: "warn",
                  },
                ]}
              />
              <FocusList
                items={Object.entries(report.media.signals).map(([key, signal]) => ({
                  label: key,
                  title: signal.title,
                  detail: signal.description,
                  tone:
                    signal.tone === "positive"
                      ? "good"
                      : signal.tone === "warning"
                        ? "warn"
                        : "info",
                }))}
              />
            </div>
          </div>
        ) : null}
        {activeTab === "traffic" ? (
          <div className="v3-section-grid">
            <div className="v3-panel-body">
              <div className="v3-subsection-head">
                <span>Gargalos do tráfego</span>
              </div>
              <FocusList
                items={[
                  report.traffic.highlights.topSource
                    ? {
                        label: "Fonte",
                        title: report.traffic.highlights.topSource.label,
                        detail:
                          report.traffic.highlights.topSource.summary ?? report.traffic.story,
                        href: buildStudioHref("growth", { surface: "traffic" }),
                        tone: "info" as const,
                      }
                    : null,
                  report.traffic.highlights.topCampaign
                    ? {
                        label: "Campanha",
                        title: report.traffic.highlights.topCampaign.label,
                        detail:
                          report.traffic.highlights.topCampaign.summary ?? report.traffic.frictionSignal,
                        href: buildStudioHref("growth", { surface: "traffic" }),
                        tone: "info" as const,
                      }
                    : null,
                  report.traffic.highlights.topLanding
                    ? {
                        label: "Landing",
                        title: report.traffic.highlights.topLanding.label,
                        detail:
                          report.traffic.highlights.topLanding.summary ?? report.traffic.story,
                        href: buildStudioHref("growth", { surface: "traffic" }),
                        tone: "warn" as const,
                      }
                    : null,
                ].filter(Boolean) as StudioFocusItem[]}
              />
            </div>
            <div className="v3-section-stack">
              <TrendBars
                title="Eficiência do funil"
                items={[
                  {
                    label: "Sessão → carrinho",
                    value: report.traffic.summary.sessionToCartRate,
                    detail: report.traffic.signals.sessionToCartRate.description,
                    tone:
                      report.traffic.signals.sessionToCartRate.tone === "positive"
                        ? "good"
                        : report.traffic.signals.sessionToCartRate.tone === "warning"
                          ? "warn"
                          : "info",
                  },
                  {
                    label: "Checkout",
                    value: report.traffic.summary.checkoutRate,
                    detail: report.traffic.signals.checkoutRate.description,
                    tone:
                      report.traffic.signals.checkoutRate.tone === "positive"
                        ? "good"
                        : report.traffic.signals.checkoutRate.tone === "warning"
                          ? "warn"
                          : "info",
                  },
                  {
                    label: "Compra",
                    value: report.traffic.summary.purchaseRate,
                    detail: report.traffic.signals.purchaseRate.description,
                    tone:
                      report.traffic.signals.purchaseRate.tone === "positive"
                        ? "good"
                        : report.traffic.signals.purchaseRate.tone === "warning"
                          ? "warn"
                          : "info",
                  },
                ]}
                formatValue={(value) => percentFormatter.format(value)}
              />
              <div className="v3-note">
                <strong>Fricção em leitura</strong>
                <p>{report.traffic.frictionSignal}</p>
              </div>
            </div>
          </div>
        ) : null}
        {activeTab === "evidence" ? (
          <div className="v3-section-stack">
            <ExecutiveQueueBoard
              brandId={report.context.brandId}
              from={report.context.from}
              to={report.context.to}
              actions={report.priorities}
              fallbackModule="growth"
            />
            <SourceHealth sources={report.sourceHealth} />
            <EvidenceList links={report.evidenceLinks} />
          </div>
        ) : null}
      </section>
    </V3ModuleChrome>
  );
}

function OfferWorkspace({
  report,
  context,
}: {
  report: OfferHubReport;
  context: StudioModuleContext;
}) {
  const requestedSurface = context.surface as OfferStudioSurface;
  const nextActiveTab: OfferStudioSurface =
    requestedSurface === "sales" ||
    requestedSurface === "catalog" ||
    requestedSurface === "evidence"
      ? requestedSurface
      : "products";
  const [activeTab, setActiveTab] = useState<OfferStudioSurface>(nextActiveTab);
  const topProducts = report.catalog.highlights.topSellers.length
    ? report.catalog.highlights.topSellers
    : report.catalog.rows.slice(0, 6);
  const offerMeta =
    requestedSurface === "sales"
      ? {
          title: "Vendas e demanda real",
          description:
            "Receita, unidades e playbook comercial tratados como leitura operacional do portfólio.",
          actionLabel: "Abrir portfólio",
          actionHref: buildStudioHref("offer", { surface: "products" }),
          banner: "Foco em vendas: a antiga superfície comercial agora desembarca no workbench de oferta.",
        }
      : requestedSurface === "catalog"
        ? {
            title: "Catálogo operacional",
            description:
              "Cobertura visual, produtos ativos e itens descobertos em uma única superfície de manutenção comercial.",
            actionLabel: "Abrir vendas",
            actionHref: buildStudioHref("offer", { surface: "sales" }),
            banner: "Foco em catálogo: a antiga tela de feed foi absorvida pelo BrandOps Studio.",
          }
        : requestedSurface === "evidence"
          ? {
              title: "Evidências de oferta",
              description:
                "Fila executiva, fontes e reconciliação do portfólio sem poluir a leitura principal.",
              actionLabel: "Abrir portfólio",
              actionHref: buildStudioHref("offer", { surface: "products" }),
              banner: "Foco em evidências: use esta camada para validar a confiança dos sinais de produto.",
            }
          : context.mode === "executive"
            ? {
                title: "Portfólio executivo",
                description:
                  "Foco, momentum e próxima decisão comercial em uma leitura curta de produtos.",
                actionLabel: "Abrir radar",
                actionHref: buildStudioHref("offer", { surface: "products", mode: "radar" }),
                banner: "Foco executivo: a visão executiva antiga foi incorporada ao workbench de oferta.",
              }
            : context.mode === "radar"
              ? {
                  title: "Radar do portfólio",
                  description:
                    "Use esta camada para localizar escala, perda de força e itens que pedem revisão.",
                  actionLabel: "Abrir catálogo",
                  actionHref: buildStudioHref("offer", { surface: "catalog" }),
                  banner: "Foco em radar: a antiga rota de radar agora reaproveita a mesma base de produto.",
                }
              : context.mode === "detail"
                ? {
                    title: "Detalhamento de produtos",
                    description:
                      "Mesa operacional para auditar item, decisão e contexto comercial sem voltar ao front legado.",
                    actionLabel: "Abrir vendas",
                    actionHref: buildStudioHref("offer", { surface: "sales" }),
                    banner:
                      "Foco em detalhe: a antiga tabela operacional foi incorporada ao módulo de oferta.",
                  }
                : {
                    title: "Portfólio e venda real",
                    description:
                      "Catálogo, produtos e sinais comerciais tratados como inventário ativo da marca.",
                    actionLabel: "Abrir catálogo",
                    actionHref: buildStudioHref("offer", { surface: "catalog" }),
                    banner: null,
                  };

  useEffect(() => {
    setActiveTab(nextActiveTab);
  }, [nextActiveTab]);

  return (
    <V3ModuleChrome
      eyebrow="Oferta"
      title={offerMeta.title}
      description={offerMeta.description}
      aside={<Link className="v3-primary-link" href={offerMeta.actionHref}>{offerMeta.actionLabel}</Link>}
    >
      <MetricRibbon metrics={buildOfferMetrics(report)} />
      {offerMeta.banner ? (
        <div className="v3-note">
          <strong>Contexto preservado</strong>
          <p>{offerMeta.banner}</p>
        </div>
      ) : null}

      <section className="v3-command-grid">
        <div className="v3-panel v3-brief-panel">
          <span>Leitura dominante</span>
          <h2>{report.productInsights.hero.title}</h2>
          <p>{report.productInsights.hero.description}</p>
          <FocusList
            items={
              mapActionsToFocus(report.priorities).length
                ? mapActionsToFocus(report.priorities)
                : report.productInsights.featured.slice(0, 4).map((product) => ({
                    label: product.productType,
                    title: product.decisionTitle,
                    detail: product.decisionSummary,
                    href: buildStudioHref("offer", { surface: "products" }),
                    tone: "info" as const,
                  }))
            }
          />
        </div>
        <div className="v3-panel">
          <TrendBars
            title="Produtos em destaque"
            items={report.overview.topProducts.slice(0, 5).map((item) => ({
              label: item.label,
              value: Number(item.value.replace(/[^\d,-]/g, "").replace(/\./g, "").replace(",", ".")) || 0,
              detail: item.summary,
              tone: "good",
            }))}
          />
        </div>
      </section>

      <section className="v3-panel">
        <div className="v3-panel-heading">
          <span>Workbench de oferta</span>
          <strong>{report.context.brandName}</strong>
        </div>
        <WorkspaceTabs
          active={activeTab}
          onChange={(tab) => setActiveTab(tab as OfferStudioSurface)}
          tabs={[
            { key: "products", label: "Produtos" },
            { key: "sales", label: "Vendas" },
            { key: "catalog", label: "Catálogo" },
            { key: "evidence", label: "Evidências" },
          ]}
        />
        {activeTab === "products" ? (
          <div className="v3-section-grid">
            <div className="v3-panel-body">
              <div className="v3-subsection-head">
                <span>{context.mode === "radar" ? "Radar de momentum" : "Playbook Atlas"}</span>
              </div>
              <FocusList
                items={report.productInsights.playbook.slice(0, 4).map((group) => ({
                  label: group.title,
                  title: `${group.count} decisões`,
                  detail: group.description,
                  href: buildStudioHref("offer", { surface: "products", mode: context.mode ?? "executive" }),
                  tone:
                    group.decision === "scale_now"
                      ? "good"
                      : group.decision === "review_listing"
                        ? "warn"
                        : "info",
                }))}
              />
            </div>
            <div className="v3-panel-body">
              <div className="v3-subsection-head">
                <span>Momentum</span>
              </div>
              <FocusList
                items={[
                  ...report.productInsights.momentum.gaining.slice(0, 2).map((item) => ({
                    label: "Ganhos",
                    title: item.decisionTitle,
                    detail: item.decisionSummary,
                    href: buildStudioHref("offer", { surface: "products", mode: "radar" }),
                    tone: "good" as const,
                  })),
                  ...report.productInsights.momentum.losing.slice(0, 2).map((item) => ({
                    label: "Queda",
                    title: item.decisionTitle,
                    detail: item.decisionSummary,
                    href: buildStudioHref("offer", { surface: "products", mode: "radar" }),
                    tone: "warn" as const,
                  })),
                ]}
              />
            </div>
          </div>
        ) : null}
        {activeTab === "sales" ? (
          <div className="v3-section-grid">
            <div className="v3-panel-body">
              <div className="v3-subsection-head">
                <span>Receita que puxa o recorte</span>
              </div>
              <div className="v3-data-list">
                {report.sales.topProducts.slice(0, 8).map((product) => (
                  <Link
                    key={product.productKey}
                    href={buildStudioHref("offer", { surface: "sales" })}
                  >
                    <span>{product.productName}</span>
                    <strong>{currencyFormatter.format(product.grossRevenue)}</strong>
                    <small>{integerFormatter.format(product.quantity)} itens</small>
                  </Link>
                ))}
              </div>
            </div>
            <div className="v3-panel-body">
              <div className="v3-subsection-head">
                <span>Leitura comercial</span>
              </div>
              <FocusList
                items={report.overview.topProducts.slice(0, 4).map((item) => ({
                  label: item.label,
                  title: item.value,
                  detail: item.summary,
                  href: buildStudioHref("offer", { surface: "sales" }),
                  tone: "good" as const,
                }))}
              />
            </div>
          </div>
        ) : null}
        {activeTab === "catalog" ? (
          <div className="v3-section-grid">
            <div className="v3-panel-body">
              <div className="v3-subsection-head">
                <span>Produtos em operação</span>
              </div>
              <div className="v3-product-strip">
                {topProducts.slice(0, 6).map((product) => (
                  <Link key={product.id} href={buildStudioHref("offer", { surface: "catalog" })}>
                    {product.imageUrl ? (
                      <Image src={product.imageUrl} alt="" width={96} height={96} unoptimized />
                    ) : (
                      <PackageSearch size={22} />
                    )}
                    <span>{product.title}</span>
                    <small>{integerFormatter.format(product.unitsSold)} unidades</small>
                  </Link>
                ))}
              </div>
            </div>
            <div className="v3-panel-body">
              <div className="v3-subsection-head">
                <span>Cobertura do catálogo</span>
              </div>
              <FocusList
                items={report.catalog.highlights.uncovered.slice(0, 4).map((product) => ({
                  label: product.productType ?? "Sem tipo",
                  title: product.title,
                  detail: `${product.galleryCount} imagem(ns) e ${integerFormatter.format(product.unitsSold)} unidade(s).`,
                  href: buildStudioHref("offer", { surface: "catalog" }),
                  tone: "warn" as const,
                }))}
              />
            </div>
          </div>
        ) : null}
        {activeTab === "evidence" ? (
          <div className="v3-section-stack">
            <ExecutiveQueueBoard
              brandId={report.context.brandId}
              from={report.context.from}
              to={report.context.to}
              actions={report.priorities}
              fallbackModule="offer"
            />
            <SourceHealth sources={report.sourceHealth} />
            <EvidenceList links={report.evidenceLinks} />
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
  const [activeTab, setActiveTab] = useState<OpsStudioSurface>(nextActiveTab);
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
          banner: "Foco em importação: esta entrada substitui a antiga tela de ETL e importação.",
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
                ? "Foco em saneamento: a fila operacional antiga agora vive dentro do BrandOps Studio."
                : "Foco em governança: configurações e administração foram absorvidas pelo console operacional.",
          }
        : requestedSurface === "support"
          ? {
              title: "Ajuda, tutoriais e administração",
              description:
                "Conhecimento operacional, setup guiado e atalhos administrativos reunidos numa camada discreta.",
              actionLabel: "Abrir integrações",
              actionHref: buildStudioHref("ops", { surface: "integrations" }),
              banner:
                "Foco em suporte: ajuda, tutoriais e administração deixaram de ser telas soltas no shell antigo.",
            }
          : {
              title: "Console de manutenção",
              description:
                "Imports, saneamento, integrações e governança reunidos para manter o BrandOps confiável.",
              actionLabel: "Importar",
              actionHref: buildStudioHref("ops", { surface: "imports" }),
              banner: null,
            };

  useEffect(() => {
    setActiveTab(nextActiveTab);
  }, [nextActiveTab]);

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
          <strong>Contexto preservado</strong>
          <p>{opsMeta.banner}</p>
        </div>
      ) : null}

      <section className="v3-command-grid">
        <div className="v3-panel v3-brief-panel">
          <span>Estado operacional</span>
          <h2>{activeBrand?.name ?? "Workspace operacional"}</h2>
          <p>
            Use esta área para manter fontes, catálogo e governança previsíveis enquanto a leitura
            executiva continua no Comando.
          </p>
          <FocusList items={focus.length ? focus : makeModuleFallback("ops")} />
        </div>
        <div className="v3-panel">
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

      <section className="v3-panel">
        <div className="v3-panel-heading">
          <span>Console operacional</span>
          <strong>{activeBrand?.governance.planTier ?? "starter"}</strong>
        </div>
        <WorkspaceTabs
          active={activeTab}
          onChange={(tab) => setActiveTab(tab as OpsStudioSurface)}
          tabs={[
            { key: "integrations", label: "Integrações" },
            { key: "imports", label: "Imports" },
            { key: "governance", label: "Governança" },
            { key: "support", label: "Suporte" },
          ]}
        />
        {activeTab === "integrations" ? (
          <div className="v3-panel-body">
            {context.provider ? (
              <div className="v3-note">
                <strong>Provedor em foco</strong>
                <p>
                  O atalho legado preservou o provedor <strong>{context.provider.toUpperCase()}</strong> dentro do console
                  de integrações.
                </p>
              </div>
            ) : null}
            <div className="v3-ops-grid">
              {integrations.map((integration) => (
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
              ))}
            </div>
          </div>
        ) : null}
        {activeTab === "imports" ? (
          <div className="v3-panel-body">
            <div className="v3-data-list">
              {files.map((file) => (
                <Link key={file.kind} href={buildStudioHref("ops", { surface: "imports", focus: file.kind })}>
                  <span>{file.kind}</span>
                  <strong>{integerFormatter.format(file.totalInserted)} linhas</strong>
                  <small>{file.runs[0]?.fileName ?? file.lastImportedAt.slice(0, 10)}</small>
                </Link>
              ))}
            </div>
          </div>
        ) : null}
        {activeTab === "governance" ? (
          <div className="v3-section-grid">
            <div className="v3-panel-body">
              <div className="v3-subsection-head">
                <span>Flags do workspace</span>
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
                        ? "A rota antiga abriu o tutorial do provedor dentro do módulo operacional."
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
                <span>Estado do workspace</span>
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
        title="Workspace sem relatório"
        description="O BrandOps não recebeu dados suficientes para montar esta superfície ainda."
      />
    );
  }

  if (module === "command") {
    return <CommandWorkspace snapshot={report as ManagementSnapshotV2} />;
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
            error instanceof Error ? error.message : "Não foi possível carregar o workspace V3.",
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
