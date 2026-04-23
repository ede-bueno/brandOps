"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { ArrowUpRight, Loader2 } from "lucide-react";
import { updateExecutiveActionQueueItem } from "@/lib/brandops/database";
import { currencyFormatter } from "@/lib/brandops/format";
import type {
  ExecutiveActionItem,
  ExecutiveActionStatus,
  ManagementEvidenceLink,
  ManagementSourceHealthItem,
} from "@/lib/brandops/types";
import {
  makeModuleFallback,
  normalizeStudioHref,
  type StudioFocusItem,
  type StudioMetric,
  type StudioModule,
} from "@/lib/brandops-v3/view-models";

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

export function V3LoadingPanel({ label = "Carregando visão" }: { label?: string }) {
  return (
    <div className="v3-panel v3-loading-panel">
      <Loader2 className="animate-spin" size={18} />
      <span>{label}</span>
    </div>
  );
}

export function InlineEmpty({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="v3-note">
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}

export function MetricRibbon({ metrics }: { metrics: StudioMetric[] }) {
  return (
    <section className="v3-metric-ribbon" aria-label="Indicadores do recorte">
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

export function WorkspaceTabs({
  active,
  tabs,
}: {
  active: string;
  tabs: Array<{ key: string; label: string; href: string }>;
}) {
  return (
    <div className="v3-tabs" role="tablist">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          className="v3-tab"
          data-active={tab.key === active}
          href={tab.href}
          role="tab"
          aria-selected={tab.key === active}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}

export function FocusList({ items }: { items: StudioFocusItem[] }) {
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

export function SourceHealth({ sources }: { sources: ManagementSourceHealthItem[] }) {
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

export function EvidenceList({ links }: { links: ManagementEvidenceLink[] }) {
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

export function TrendBars({
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

export function ExecutiveQueueBoard({
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
