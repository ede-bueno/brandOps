"use client";

import Link from "next/link";
import { useDeferredValue } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowUpRight,
  CalendarDays,
  CircleAlert,
  CircleCheck,
  CircleDashed,
  Loader2,
} from "lucide-react";
import { PageHeader, SectionHeading, SurfaceCard } from "@/components/ui-shell";
import { cn } from "@/lib/utils";
import {
  currencyFormatter,
  formatCompactDate,
  formatLongDateTime,
} from "@/lib/brandops/format";
import type {
  AcquisitionHubReport,
  ExecutiveActionItem,
  ExecutiveActionStatus,
  FinanceHubReport,
  ManagementAcquisitionSnapshot,
  ManagementEvidenceLink,
  ManagementInsightItem,
  ManagementKpiDockItem,
  ManagementOfferSnapshot,
  ManagementSnapshotV2,
  ManagementSourceHealthItem,
  ManagementStatusCard,
  ManagementTone,
  OfferHubReport,
} from "@/lib/brandops/types";
import { normalizeStudioHref } from "@/lib/brandops-v3/view-models";

function toneDataTone(tone: ManagementTone): "positive" | "warning" | "negative" | undefined {
  switch (tone) {
    case "positive":
      return "positive";
    case "warning":
      return "warning";
    case "negative":
      return "negative";
    default:
      return undefined;
  }
}

function sourceStatusClasses(status: ManagementSourceHealthItem["status"]) {
  switch (status) {
    case "healthy":
      return "border-primary/20 bg-primary-container/16 text-primary";
    case "warning":
      return "border-tertiary/25 bg-tertiary-container/20 text-tertiary";
    case "error":
      return "border-error/25 bg-error-container/22 text-error";
    default:
      return "border-outline/75 bg-surface-container-low/72 text-on-surface-variant";
  }
}

function priorityDataTone(
  priority: ExecutiveActionItem["priority"],
): "negative" | "warning" | "positive" | undefined {
  switch (priority) {
    case "critical":
      return "negative";
    case "high":
      return "warning";
    case "medium":
      return "positive";
    default:
      return undefined;
  }
}

function SourceHealthStrip({ items }: { items: ManagementSourceHealthItem[] }) {
  return (
    <div className="grid gap-3 lg:grid-cols-5">
      {items.map((item) => (
        <Link
          key={item.key}
          href={normalizeStudioHref(item.href ?? "#")}
          prefetch={false}
          className="rounded-2xl border border-outline/65 bg-surface-container/70 p-3 transition hover:border-primary/25"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
                {item.label}
              </p>
              <p className="mt-2 text-[12px] leading-5 text-on-surface-variant">{item.detail}</p>
            </div>
            <span
              className={cn(
                "inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]",
                sourceStatusClasses(item.status),
              )}
            >
              {item.status === "healthy"
                ? "ok"
                : item.status === "warning"
                  ? "atenção"
                  : item.status === "error"
                    ? "erro"
                    : "vazio"}
            </span>
          </div>
          <p className="mt-3 text-[10px] uppercase tracking-[0.16em] text-on-surface-variant/80">
            {item.freshnessLabel}
          </p>
        </Link>
      ))}
    </div>
  );
}

function MetricDock({ items }: { items: ManagementKpiDockItem[] }) {
  return (
    <div className="grid gap-3 lg:grid-cols-6">
      {items.map((item) => (
        <Link
          key={item.key}
          href={normalizeStudioHref(item.href)}
          prefetch={false}
          data-tone={toneDataTone(item.tone)}
          className="atlas-kpi-tile rounded-[1.4rem] border transition hover:border-primary/25"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
            {item.label}
          </p>
          <p className="mt-3 font-headline text-[clamp(1.35rem,2vw,1.8rem)] font-semibold tracking-tight text-on-surface">
            {item.value}
          </p>
          <p className="mt-2 text-[12px] leading-5 text-on-surface-variant">{item.description}</p>
        </Link>
      ))}
    </div>
  );
}

function StatusHero({
  status,
  brandName,
  periodLabel,
  confidenceLabel,
  generatedAt,
}: {
  status: ManagementStatusCard;
  brandName: string;
  periodLabel: string;
  confidenceLabel: string;
  generatedAt: string;
}) {
  return (
    <SurfaceCard className="atlas-command-hero overflow-hidden p-0">
      <div className="relative p-6">
        <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.75fr)]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="atlas-status-chip" data-tone="accent">
                Centro de Comando
              </span>
              <span className="atlas-status-chip">
                {brandName}
              </span>
              <span className="atlas-status-chip">
                {periodLabel}
              </span>
            </div>
            <h2 className="mt-5 font-headline text-[clamp(1.9rem,3vw,2.8rem)] font-semibold tracking-tight text-on-surface">
              {status.title}
            </h2>
            <p className="mt-3 max-w-[64ch] text-[15px] leading-7 text-on-surface-variant">
              {status.summary}
            </p>
            <div className="mt-6 grid gap-3 lg:grid-cols-2">
              <div className="atlas-callout-card rounded-2xl border p-4" data-tone={toneDataTone(status.tone)}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
                  Status executivo
                </p>
                <p className="mt-3 text-[14px] font-semibold text-on-surface">{status.highlight}</p>
              </div>
              <div className="atlas-callout-card rounded-2xl border p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
                  Próximo movimento
                </p>
                <p className="mt-3 text-[14px] font-semibold text-on-surface">{status.nextMove}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-3">
            <div className="atlas-callout-card rounded-2xl border p-4" data-tone={toneDataTone(status.tone)}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
                Confiança do Atlas
              </p>
              <p className="mt-3 font-headline text-2xl font-semibold text-on-surface">{confidenceLabel}</p>
              <p className="mt-2 text-[12px] leading-5 text-on-surface-variant">
                O Atlas reconciliou financeiro, aquisição, oferta e operação antes de priorizar a fila.
              </p>
            </div>
            <div className="atlas-callout-card rounded-2xl border p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
                Fonte da verdade
              </p>
              <p className="mt-3 text-[13px] font-semibold text-on-surface">
                Venda real e resultado seguem pela camada financeira canônica.
              </p>
              <p className="mt-2 text-[12px] leading-5 text-on-surface-variant">
                Atualizado em {formatLongDateTime(generatedAt)}.
              </p>
            </div>
          </div>
        </div>
      </div>
    </SurfaceCard>
  );
}

function DecisionCard({ action }: { action: ExecutiveActionItem }) {
  return (
    <article
      data-tone={priorityDataTone(action.priority)}
      className="atlas-decision-card rounded-[1.4rem] border p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
            {action.domain}
          </p>
          <h3 className="mt-2 text-[15px] font-semibold tracking-tight text-on-surface">
            {action.title}
          </h3>
        </div>
        <span className="atlas-status-chip">
          {action.priority}
        </span>
      </div>
      <p className="mt-3 text-[13px] leading-6 text-on-surface-variant">{action.summary}</p>
      <p className="mt-4 text-[12px] font-medium text-on-surface">{action.impact}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {action.sourceRefs.map((source) => (
          <span
            key={`${action.id}-${source.label}`}
            className="atlas-status-chip"
          >
            {source.label}
          </span>
        ))}
      </div>
      <Link
        href={normalizeStudioHref(action.drilldownHref)}
        prefetch={false}
        className="mt-5 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary"
      >
        Abrir drill-down
        <ArrowUpRight size={12} />
      </Link>
    </article>
  );
}

function InsightsRail({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: ManagementInsightItem[];
}) {
  return (
    <SurfaceCard>
      <SectionHeading title={title} description={description} />
      <div className="mt-5 grid gap-3">
        {items.map((item) => (
          <Link
            key={item.key}
            href={normalizeStudioHref(item.href ?? "#")}
            prefetch={false}
            data-tone={toneDataTone(item.tone)}
            className="atlas-callout-card rounded-2xl border p-4 transition hover:border-primary/25"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
                  {item.label}
                </p>
                <p className="mt-3 text-[13px] leading-6 text-on-surface-variant">{item.summary}</p>
              </div>
              <p className="text-[14px] font-semibold text-on-surface">{item.value}</p>
            </div>
          </Link>
        ))}
      </div>
    </SurfaceCard>
  );
}

function CashTrendPanel({
  title,
  description,
  data,
}: {
  title: string;
  description: string;
  data: Array<{ label: string; contributionAfterMedia: number; netResult: number }>;
}) {
  const deferred = useDeferredValue(data);

  return (
    <SurfaceCard>
      <SectionHeading title={title} description={description} />
      <div className="mt-5 h-[320px] min-w-0">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={260}>
          <AreaChart data={deferred}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-outline-variant)" vertical={false} />
            <XAxis
              dataKey="label"
              stroke="var(--color-on-surface-variant)"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11 }}
            />
            <YAxis
              stroke="var(--color-on-surface-variant)"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11 }}
            />
            <Tooltip
              formatter={(value, name) => [
                currencyFormatter.format(Number(value ?? 0)),
                name === "contributionAfterMedia" ? "Contribuição pós-mídia" : "Resultado",
              ]}
              contentStyle={{
                borderRadius: 14,
                border: "1px solid var(--color-outline)",
                backgroundColor: "var(--color-surface)",
              }}
            />
            <Area
              type="monotone"
              dataKey="contributionAfterMedia"
              stroke="var(--color-primary)"
              fill="var(--color-primary-container)"
              fillOpacity={0.28}
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="netResult"
              stroke="var(--color-secondary)"
              fill="var(--color-secondary-container)"
              fillOpacity={0.18}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </SurfaceCard>
  );
}

function AcquisitionTrendPanel({
  title,
  description,
  data,
}: {
  title: string;
  description: string;
  data: ManagementAcquisitionSnapshot["trend"];
}) {
  const deferred = useDeferredValue(data);

  return (
    <SurfaceCard>
      <SectionHeading title={title} description={description} />
      <div className="mt-5 h-[320px] min-w-0">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={260}>
          <BarChart data={deferred}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-outline-variant)" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={formatCompactDate}
              stroke="var(--color-on-surface-variant)"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11 }}
            />
            <YAxis
              stroke="var(--color-on-surface-variant)"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11 }}
            />
            <Tooltip
              formatter={(value, name) => [
                currencyFormatter.format(Number(value ?? 0)),
                name === "spend" ? "Mídia" : "Receita",
              ]}
              labelFormatter={(label) => formatCompactDate(String(label ?? ""))}
              contentStyle={{
                borderRadius: 14,
                border: "1px solid var(--color-outline)",
                backgroundColor: "var(--color-surface)",
              }}
            />
            <Bar dataKey="spend" fill="var(--color-tertiary)" radius={[6, 6, 0, 0]} />
            <Bar
              dataKey="purchaseRevenue"
              fill="var(--color-primary)"
              radius={[6, 6, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </SurfaceCard>
  );
}

function OfferFocusPanel({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: ManagementOfferSnapshot["topProducts"];
}) {
  return (
    <SurfaceCard>
      <SectionHeading title={title} description={description} />
      <div className="mt-5 grid gap-3">
        {items.map((item) => (
          <div
            key={`${item.label}-${item.value}`}
            className="atlas-callout-card rounded-2xl border p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-on-surface">{item.label}</p>
                <p className="mt-2 text-[12px] leading-5 text-on-surface-variant">{item.summary}</p>
              </div>
              <p className="text-[12px] font-semibold text-on-surface">{item.value}</p>
            </div>
          </div>
        ))}
      </div>
    </SurfaceCard>
  );
}

function OperationalRiskPanel({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: ManagementSnapshotV2["operationalRisks"]["items"];
}) {
  return (
    <SurfaceCard>
      <SectionHeading title={title} description={description} />
      <div className="mt-5 grid gap-3">
        {items.map((item) => (
          <Link
            key={item.key}
            href={normalizeStudioHref(item.href)}
            prefetch={false}
            data-tone={toneDataTone(item.tone)}
            className="atlas-callout-card rounded-2xl border p-4 transition hover:border-primary/25"
          >
            <div className="flex items-start gap-3">
              {item.tone === "positive" ? (
                <CircleCheck size={16} className="mt-0.5 shrink-0 text-primary" />
              ) : item.tone === "negative" ? (
                <CircleAlert size={16} className="mt-0.5 shrink-0 text-error" />
              ) : (
                <CircleDashed size={16} className="mt-0.5 shrink-0 text-tertiary" />
              )}
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-on-surface">{item.title}</p>
                <p className="mt-2 text-[12px] leading-5 text-on-surface-variant">{item.summary}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </SurfaceCard>
  );
}

function EvidenceRail({ items }: { items: ManagementEvidenceLink[] }) {
  return (
    <SurfaceCard>
      <SectionHeading
        title="Trilho de auditoria"
        description="Quando você quiser abrir a fonte, o caminho começa daqui. A análise principal continua centralizada no Atlas."
      />
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <Link
            key={item.label}
            href={normalizeStudioHref(item.href)}
            prefetch={false}
            className="atlas-callout-card rounded-2xl border p-4 transition hover:border-primary/25"
          >
            <p className="text-[12px] font-semibold text-on-surface">{item.label}</p>
            <p className="mt-2 text-[12px] leading-5 text-on-surface-variant">{item.summary}</p>
          </Link>
        ))}
      </div>
    </SurfaceCard>
  );
}

function QueueStatusSelect({
  value,
  onChange,
  disabled,
}: {
  value: ExecutiveActionStatus;
  onChange: (next: ExecutiveActionStatus) => void;
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as ExecutiveActionStatus)}
      disabled={disabled}
      className="brandops-input min-w-[10rem]"
    >
      <option value="new">Novo</option>
      <option value="in_progress">Em andamento</option>
      <option value="deferred">Adiado</option>
      <option value="resolved">Resolvido</option>
    </select>
  );
}

function ExecutiveQueueBoard({
  actions,
  periodLabel,
  onUpdateAction,
  pendingActionKey,
}: {
  actions: ExecutiveActionItem[];
  periodLabel: string;
  onUpdateAction?: (
    action: ExecutiveActionItem,
    update: { status?: ExecutiveActionStatus; reviewAt?: string | null },
  ) => void;
  pendingActionKey?: string | null;
}) {
  return (
    <SurfaceCard>
      <SectionHeading
        title="Fila executiva"
        description="A fila persiste por marca e recorte. O Atlas segura o contexto, e o gestor só acompanha decisão, andamento e revisão futura."
        aside={<span className="atlas-inline-metric">{periodLabel}</span>}
      />
      <div className="mt-5 grid gap-3">
        {actions.map((action) => {
          const isPending = pendingActionKey === action.actionKey;
          return (
            <div
              key={action.id}
              data-tone={priorityDataTone(action.priority)}
              className="atlas-decision-card rounded-[1.4rem] border p-4"
            >
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_17rem]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="atlas-status-chip">
                      {action.domain}
                    </span>
                    <span className="atlas-status-chip">
                      {action.priority}
                    </span>
                    <span className="atlas-status-chip">
                      confiança {action.confidence}
                    </span>
                  </div>
                  <p className="mt-3 text-[15px] font-semibold tracking-tight text-on-surface">
                    {action.title}
                  </p>
                  <p className="mt-2 text-[13px] leading-6 text-on-surface-variant">{action.summary}</p>
                  <div className="mt-4 grid gap-2">
                    {action.sourceRefs.map((source) => (
                      <p key={`${action.id}-${source.label}`} className="text-[12px] leading-5 text-on-surface-variant">
                        <span className="font-semibold text-on-surface">{source.label}:</span> {source.detail}
                      </p>
                    ))}
                  </div>
                </div>

                <div className="grid gap-3">
                  <QueueStatusSelect
                    value={action.status}
                    disabled={!onUpdateAction || isPending}
                    onChange={(status) => onUpdateAction?.(action, { status })}
                  />
                  <label className="grid gap-2">
                    <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
                      <CalendarDays size={12} />
                      Revisar em
                    </span>
                    <input
                      type="date"
                      value={action.reviewAt ?? ""}
                      disabled={!onUpdateAction || isPending}
                      onChange={(event) =>
                        onUpdateAction?.(action, {
                          reviewAt: event.target.value || null,
                        })
                      }
                      className="brandops-input"
                    />
                  </label>
                  <Link
                    href={normalizeStudioHref(action.drilldownHref)}
                    prefetch={false}
                    className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary"
                  >
                    Abrir trilha
                    <ArrowUpRight size={12} />
                  </Link>
                  {isPending ? (
                    <div className="inline-flex items-center gap-2 text-[11px] font-medium text-on-surface-variant">
                      <Loader2 size={12} className="animate-spin" />
                      Salvando fila
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </SurfaceCard>
  );
}

export function CommandCenterView({
  snapshot,
  selectedPeriodLabel,
  onUpdateAction,
  pendingActionKey,
}: {
  snapshot: ManagementSnapshotV2;
  selectedPeriodLabel: string;
  onUpdateAction?: (
    action: ExecutiveActionItem,
    update: { status?: ExecutiveActionStatus; reviewAt?: string | null },
  ) => void;
  pendingActionKey?: string | null;
}) {
  return (
    <div className="atlas-page-stack-compact">
      <PageHeader
        eyebrow="Centro de Comando"
        title="Atlas V2"
        description="Uma leitura única para status, prioridade, gargalo, ganho e fila executiva da marca ativa."
      />

      <StatusHero
        status={snapshot.executiveStatus}
        brandName={snapshot.context.brandName}
        periodLabel={selectedPeriodLabel}
        confidenceLabel={snapshot.context.confidenceLabel}
        generatedAt={snapshot.context.generatedAt}
      />

      <SourceHealthStrip items={snapshot.sourceHealth} />
      <MetricDock items={snapshot.kpiDock} />

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(21rem,0.85fr)]">
        <SurfaceCard>
          <SectionHeading
            title="Decisões da semana"
            description="A home já entrega a resposta gerencial. Abra a fonte só se precisar auditar a evidência."
          />
          <div className="mt-5 grid gap-3">
            {snapshot.decisionQueue.map((action) => (
              <DecisionCard key={action.id} action={action} />
            ))}
          </div>
        </SurfaceCard>

        <InsightsRail
          title="Caixa e resultado"
          description={snapshot.cashDrivers.summary}
          items={snapshot.cashDrivers.drivers}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.06fr)_minmax(21rem,0.94fr)]">
        <CashTrendPanel
          title="Caixa e resultado"
          description={snapshot.cashDrivers.headline}
          data={snapshot.cashDrivers.trend}
        />
        <InsightsRail
          title="Aquisição e conversão"
          description={snapshot.acquisitionSnapshot.summary}
          items={snapshot.acquisitionSnapshot.drivers}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.06fr)_minmax(21rem,0.94fr)]">
        <AcquisitionTrendPanel
          title="Aquisição e conversão"
          description={snapshot.acquisitionSnapshot.headline}
          data={snapshot.acquisitionSnapshot.trend}
        />
        <InsightsRail
          title="Oferta e portfólio"
          description={snapshot.offerSnapshot.summary}
          items={snapshot.offerSnapshot.drivers}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.06fr)_minmax(21rem,0.94fr)]">
        <OfferFocusPanel
          title="Oferta e portfólio"
          description={snapshot.offerSnapshot.headline}
          items={snapshot.offerSnapshot.topProducts}
        />
        <OperationalRiskPanel
          title="Riscos operacionais"
          description={snapshot.operationalRisks.summary}
          items={snapshot.operationalRisks.items}
        />
      </section>

      <ExecutiveQueueBoard
        actions={snapshot.decisionQueue}
        periodLabel={selectedPeriodLabel}
        onUpdateAction={onUpdateAction}
        pendingActionKey={pendingActionKey}
      />

      <EvidenceRail items={snapshot.evidenceLinks} />
    </div>
  );
}

function HubPageFrame({
  eyebrow,
  title,
  description,
  status,
  context,
  sourceHealth,
  kpiDock,
  priorities,
  children,
  evidenceLinks,
  selectedPeriodLabel,
}: {
  eyebrow: string;
  title: string;
  description: string;
  status: ManagementStatusCard;
  context: { brandName: string; confidenceLabel: string; generatedAt: string };
  sourceHealth: ManagementSourceHealthItem[];
  kpiDock: ManagementKpiDockItem[];
  priorities: ExecutiveActionItem[];
  children: React.ReactNode;
  evidenceLinks: ManagementEvidenceLink[];
  selectedPeriodLabel: string;
}) {
  return (
    <div className="atlas-page-stack-compact">
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        badge={
          <div className="flex flex-wrap items-center gap-2">
            <span className="atlas-inline-metric">{context.brandName}</span>
            <span className="atlas-inline-metric">{selectedPeriodLabel}</span>
          </div>
        }
      />

      <StatusHero
        status={status}
        brandName={context.brandName}
        periodLabel={selectedPeriodLabel}
        confidenceLabel={context.confidenceLabel}
        generatedAt={context.generatedAt}
      />

      <SourceHealthStrip items={sourceHealth} />
      <MetricDock items={kpiDock} />

      <SurfaceCard>
        <SectionHeading
          title="Prioridades do hub"
          description="A superfície secundária detalha a área sem disputar protagonismo com o Centro de Comando."
        />
        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          {priorities.length ? (
            priorities.map((action) => <DecisionCard key={action.id} action={action} />)
          ) : (
            <div className="atlas-callout-card rounded-2xl border p-4 text-[13px] leading-6 text-on-surface-variant lg:col-span-3">
              Nenhuma prioridade aberta para este hub no recorte atual.
            </div>
          )}
        </div>
      </SurfaceCard>

      {children}

      <EvidenceRail items={evidenceLinks} />
    </div>
  );
}

export function FinanceHubView({
  report,
  selectedPeriodLabel,
}: {
  report: FinanceHubReport;
  selectedPeriodLabel: string;
}) {
  return (
    <HubPageFrame
      eyebrow="Financeiro"
      title="Hub Financeiro"
      description="DRE, margem, CMV e vendas numa superfície única de gestão financeira."
      status={report.executiveStatus}
      context={report.context}
      sourceHealth={report.sourceHealth}
      kpiDock={report.kpiDock}
      priorities={report.priorities}
      evidenceLinks={report.evidenceLinks}
      selectedPeriodLabel={selectedPeriodLabel}
    >
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(21rem,0.92fr)]">
        <CashTrendPanel
          title="Curva de margem e resultado"
          description={report.overview.headline}
          data={report.overview.trend}
        />
        <InsightsRail
          title="Drivers financeiros"
          description={report.overview.summary}
          items={report.overview.drivers}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <div className="atlas-callout-card rounded-2xl border p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
            Melhor mês de contribuição
          </p>
          <p className="mt-3 text-[14px] font-semibold text-on-surface">
            {report.financial.analysis.bestContributionMonth?.label ?? "Sem série suficiente"}
          </p>
          <p className="mt-2 text-[12px] leading-5 text-on-surface-variant">
            {report.financial.analysis.bestContributionMonth
              ? currencyFormatter.format(report.financial.analysis.bestContributionMonth.contributionAfterMedia)
              : "Ainda não há histórico para destacar a melhor janela."}
          </p>
        </div>
        <div className="atlas-callout-card rounded-2xl border p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
            Maior despesa
          </p>
          <p className="mt-3 text-[14px] font-semibold text-on-surface">
            {report.financial.analysis.topExpenseCategory?.categoryName ?? "Sem categoria dominante"}
          </p>
          <p className="mt-2 text-[12px] leading-5 text-on-surface-variant">
            {report.financial.analysis.topExpenseCategory
              ? currencyFormatter.format(report.financial.analysis.topExpenseCategory.total)
              : "Ainda não há despesa consolidada relevante."}
          </p>
        </div>
        <div className="atlas-callout-card rounded-2xl border p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
            Produto líder em vendas
          </p>
          <p className="mt-3 text-[14px] font-semibold text-on-surface">
            {report.sales.highlights.topProduct?.productName ?? "Sem produto líder"}
          </p>
          <p className="mt-2 text-[12px] leading-5 text-on-surface-variant">
            {report.sales.highlights.topProduct
              ? currencyFormatter.format(report.sales.highlights.topProduct.grossRevenue)
              : "O recorte ainda não destacou um produto dominante em receita."}
          </p>
        </div>
      </section>
    </HubPageFrame>
  );
}

export function AcquisitionHubView({
  report,
  selectedPeriodLabel,
}: {
  report: AcquisitionHubReport;
  selectedPeriodLabel: string;
}) {
  return (
    <HubPageFrame
      eyebrow="Aquisição"
      title="Hub de Aquisição"
      description="Mídia, tráfego e funil reconciliados para decisão de escala, correção e monitoramento."
      status={report.executiveStatus}
      context={report.context}
      sourceHealth={report.sourceHealth}
      kpiDock={report.kpiDock}
      priorities={report.priorities}
      evidenceLinks={report.evidenceLinks}
      selectedPeriodLabel={selectedPeriodLabel}
    >
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.06fr)_minmax(21rem,0.94fr)]">
        <AcquisitionTrendPanel
          title="Pressão de mídia e retorno"
          description={report.overview.headline}
          data={report.overview.trend}
        />
        <InsightsRail
          title="Drivers da aquisição"
          description={report.overview.summary}
          items={report.overview.drivers}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <div className="atlas-callout-card rounded-2xl border p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
            Melhor campanha para escala
          </p>
          <p className="mt-3 text-[14px] font-semibold text-on-surface">
            {report.media.commandRoom.bestScale?.campaignName ?? "Sem campanha elegível"}
          </p>
          <p className="mt-2 text-[12px] leading-5 text-on-surface-variant">
            {report.media.commandRoom.bestScaleSummary ?? report.media.analysis.narrativeBody}
          </p>
        </div>
        <div className="atlas-callout-card rounded-2xl border p-4" data-tone="negative">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
            Maior risco de aquisição
          </p>
          <p className="mt-3 text-[14px] font-semibold text-on-surface">
            {report.overview.topRisk ?? "Sem risco dominante"}
          </p>
          <p className="mt-2 text-[12px] leading-5 text-on-surface-variant">
            {report.traffic.analysis.narrativeBody}
          </p>
        </div>
        <div className="atlas-callout-card rounded-2xl border p-4" data-tone="positive">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
            Maior oportunidade
          </p>
          <p className="mt-3 text-[14px] font-semibold text-on-surface">
            {report.overview.topOpportunity ?? "Sem oportunidade dominante"}
          </p>
          <p className="mt-2 text-[12px] leading-5 text-on-surface-variant">
            {report.media.analysis.nextActions[0] ?? report.traffic.analysis.nextActions[0] ?? "Aguardar nova janela para consolidar oportunidade."}
          </p>
        </div>
      </section>
    </HubPageFrame>
  );
}

export function OfferHubView({
  report,
  selectedPeriodLabel,
}: {
  report: OfferHubReport;
  selectedPeriodLabel: string;
}) {
  return (
    <HubPageFrame
      eyebrow="Oferta"
      title="Hub de Oferta"
      description="Vendas, produto e catálogo reunidos para leitura do portfólio que merece atenção."
      status={report.executiveStatus}
      context={report.context}
      sourceHealth={report.sourceHealth}
      kpiDock={report.kpiDock}
      priorities={report.priorities}
      evidenceLinks={report.evidenceLinks}
      selectedPeriodLabel={selectedPeriodLabel}
    >
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.02fr)_minmax(21rem,0.98fr)]">
        <OfferFocusPanel
          title="Itens em foco"
          description={report.overview.headline}
          items={report.overview.topProducts}
        />
        <InsightsRail
          title="Drivers da oferta"
          description={report.overview.summary}
          items={report.overview.drivers}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <div className="atlas-callout-card rounded-2xl border p-4" data-tone="positive">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
            Melhor vendedor
          </p>
          <p className="mt-3 text-[14px] font-semibold text-on-surface">
            {report.sales.highlights.topProduct?.productName ?? "Sem líder dominante"}
          </p>
          <p className="mt-2 text-[12px] leading-5 text-on-surface-variant">
            {report.sales.analysis.narrativeBody}
          </p>
        </div>
        <div className="atlas-callout-card rounded-2xl border p-4" data-tone="positive">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
            Estampa com melhor sinal
          </p>
          <p className="mt-3 text-[14px] font-semibold text-on-surface">
            {report.productInsights.hero.row?.stampName ?? "Sem estampa líder"}
          </p>
          <p className="mt-2 text-[12px] leading-5 text-on-surface-variant">
            {report.productInsights.hero.description}
          </p>
        </div>
        <div className="atlas-callout-card rounded-2xl border p-4" data-tone="warning">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
            Risco de catálogo
          </p>
          <p className="mt-3 text-[14px] font-semibold text-on-surface">
            {report.catalog.highlights.uncovered[0]?.printName ?? "Sem gargalo dominante"}
          </p>
          <p className="mt-2 text-[12px] leading-5 text-on-surface-variant">
            {report.catalog.analysis.narrativeBody}
          </p>
        </div>
      </section>
    </HubPageFrame>
  );
}

export function BackofficeDirectory({
  eyebrow,
  title,
  description,
  groups,
}: {
  eyebrow: string;
  title: string;
  description: string;
  groups: Array<{
    title: string;
    description: string;
    items: Array<{
      label: string;
      summary: string;
      href: string;
    }>;
  }>;
}) {
  return (
    <div className="atlas-page-stack-compact">
      <PageHeader eyebrow={eyebrow} title={title} description={description} />
      {groups.map((group) => (
        <SurfaceCard key={group.title}>
          <SectionHeading title={group.title} description={group.description} />
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {group.items.map((item) => (
              <Link
                key={item.href}
                href={normalizeStudioHref(item.href)}
                prefetch={false}
                className="atlas-callout-card rounded-2xl border p-4 transition hover:border-primary/25"
              >
                <p className="text-[13px] font-semibold text-on-surface">{item.label}</p>
                <p className="mt-2 text-[12px] leading-5 text-on-surface-variant">{item.summary}</p>
                <span className="mt-4 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                  Abrir
                  <ArrowUpRight size={12} />
                </span>
              </Link>
            ))}
          </div>
        </SurfaceCard>
      ))}
    </div>
  );
}
