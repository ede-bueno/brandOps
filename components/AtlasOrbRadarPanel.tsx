"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  ArrowUpRight,
  BrainCircuit,
  CircleHelp,
  LayoutDashboard,
  PlugZap,
  Search,
  Settings2,
  ShieldAlert,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface AtlasOrbRadarTelemetry {
  pendingSanitizationCount: number;
  hasGa4Data: boolean;
  hasCatalogData: boolean;
  mediaIntegrationError: boolean;
  ga4IntegrationError: boolean;
  geminiEnabled: boolean;
  contributionAfterMedia: number | null;
  netResult: number | null;
  variableCostShare: number | null;
  grossRoas: number | null;
}

type RadarItem = {
  href: string;
  label: string;
  description: string;
  kind: "screen" | "setup" | "atlas";
  keywords: string[];
};

type RadarAlert = {
  id: string;
  title: string;
  description: string;
  href: string;
  tone: "alert" | "notice" | "idle";
};

type RadarShortcut = {
  id: string;
  title: string;
  description: string;
  href: string;
  tone: "fix" | "guide" | "atlas" | "screen";
};

function buildRadarAlerts(pathname: string, telemetry: AtlasOrbRadarTelemetry): RadarAlert[] {
  const alerts: RadarAlert[] = [];

  if (telemetry.pendingSanitizationCount > 0) {
    alerts.push({
      id: "sanitization",
      title: "Base pede saneamento",
      description: `${telemetry.pendingSanitizationCount} pendência(s) ainda podem distorcer a leitura do período.`,
      href: "/sanitization",
      tone: "alert",
    });
  }

  if (telemetry.mediaIntegrationError || telemetry.ga4IntegrationError) {
    alerts.push({
      id: "integration",
      title: "Fonte com erro recente",
      description: "Meta ou GA4 reportou falha recente. Vale revisar a saúde das integrações antes de confiar no corte.",
      href: "/integrations",
      tone: "alert",
    });
  }

  if (telemetry.contributionAfterMedia !== null && telemetry.contributionAfterMedia < 0) {
    alerts.push({
      id: "contribution",
      title: "Margem pós-mídia negativa",
      description: "A contribuição depois de mídia virou no recorte atual e pede leitura prioritária.",
      href: pathname.startsWith("/dashboard") ? "/dashboard/contribution-margin" : "/dashboard",
      tone: "alert",
    });
  }

  if (telemetry.netResult !== null && telemetry.netResult < 0) {
    alerts.push({
      id: "net-result",
      title: "Resultado operacional negativo",
      description: "O período fechou no vermelho. A prioridade agora é localizar o driver que está corroendo o caixa.",
      href: "/dre",
      tone: "alert",
    });
  }

  if (telemetry.variableCostShare !== null && telemetry.variableCostShare > 0.7) {
    alerts.push({
      id: "variable-cost",
      title: "Custo variável pressionando a receita",
      description: "CMV + mídia estão consumindo uma fatia alta da RLD disponível.",
      href: "/dre",
      tone: "notice",
    });
  }

  if (telemetry.grossRoas !== null && telemetry.grossRoas > 0 && telemetry.grossRoas < 2) {
    alerts.push({
      id: "roas",
      title: "Mídia com retorno curto",
      description: "O ROAS bruto do período está baixo para sustentar expansão sem revisão.",
      href: "/media",
      tone: "notice",
    });
  }

  if (!telemetry.hasGa4Data && pathname.startsWith("/traffic")) {
    alerts.push({
      id: "traffic-data",
      title: "Tráfego ainda incompleto",
      description: "Não há dados suficientes de GA4 neste recorte para uma leitura robusta.",
      href: "/integrations",
      tone: "notice",
    });
  }

  if (!telemetry.hasGa4Data && pathname.startsWith("/dashboard")) {
    alerts.push({
      id: "dashboard-funnel-gap",
      title: "Leitura de funil ainda incompleta",
      description: "Sem GA4 suficiente, a explicação entre sessão, checkout e compra fica parcial neste corte.",
      href: "/integrations",
      tone: "notice",
    });
  }

  if (!telemetry.hasCatalogData && (pathname.startsWith("/feed") || pathname.startsWith("/product-insights"))) {
    alerts.push({
      id: "catalog-data",
      title: "Catálogo ainda raso",
      description: "O Atlas ainda não enxerga massa suficiente para levantar sinais de cobertura e escala.",
      href: "/feed",
      tone: "idle",
    });
  }

  if (!telemetry.geminiEnabled && (pathname.startsWith("/dashboard") || pathname.startsWith("/settings"))) {
    alerts.push({
      id: "atlas-disabled",
      title: "Camada Atlas IA ainda opcional",
      description: "A marca segue operando sem a leitura inteligente ativada nesta camada.",
      href: "/settings#atlas-ai-settings",
      tone: "idle",
    });
  }

  return alerts.slice(0, 4);
}

function buildRadarShortcuts(pathname: string, telemetry: AtlasOrbRadarTelemetry) {
  const shortcuts: RadarShortcut[] = [];

  if (pathname.startsWith("/integrations")) {
    shortcuts.push(
      {
        id: "tutorial-meta",
        title: "Configurar Meta",
        description: "Conta, catálogo, token e checklist de validação.",
        href: "/integrations/tutorials/meta",
        tone: "guide",
      },
      {
        id: "tutorial-ga4",
        title: "Configurar GA4",
        description: "Property ID, JSON e leitura de tráfego por loja.",
        href: "/integrations/tutorials/ga4",
        tone: "guide",
      },
    );
  }

  if (pathname.startsWith("/settings")) {
    shortcuts.push(
      {
        id: "atlas-settings",
        title: "Ajustar Atlas IA",
        description: "Modelo, temperatura, skill e janela da marca.",
        href: "/settings#atlas-ai-settings",
        tone: "atlas",
      },
      {
        id: "brand-learning",
        title: "Aprender negócio",
        description: "Consolidar histórico e focos persistentes da marca.",
        href: "/settings#atlas-learning",
        tone: "atlas",
      },
    );
  }

  if (telemetry.mediaIntegrationError) {
    shortcuts.push({
      id: "fix-meta",
      title: "Corrigir Meta",
      description: "Ir para a saúde da integração e revisar a credencial da loja.",
      href: "/integrations",
      tone: "fix",
    });
  }

  if (telemetry.ga4IntegrationError || !telemetry.hasGa4Data) {
    shortcuts.push({
      id: "fix-ga4",
      title: "Restaurar GA4",
      description: "Revisar a origem de tráfego e o tutorial da propriedade.",
      href: telemetry.ga4IntegrationError ? "/integrations" : "/integrations/tutorials/ga4",
      tone: "fix",
    });
  }

  if (telemetry.pendingSanitizationCount > 0) {
    shortcuts.push({
      id: "fix-sanitization",
      title: "Fechar saneamento",
      description: "Remover ruído da base antes de aprofundar diagnóstico.",
      href: "/sanitization",
      tone: "fix",
    });
  }

  if (!telemetry.hasCatalogData) {
    shortcuts.push({
      id: "catalog-coverage",
      title: "Fortalecer catálogo",
      description: "Abrir a camada de catálogo e revisar cobertura da marca.",
      href: "/feed",
      tone: "screen",
    });
  }

  if (!telemetry.geminiEnabled) {
    shortcuts.push({
      id: "enable-atlas",
      title: "Preparar Atlas IA",
      description: "Voltar para a central e liberar a leitura inteligente da marca.",
      href: "/settings#atlas-ai-settings",
      tone: "atlas",
    });
  } else {
    shortcuts.push({
      id: "atlas-home",
      title: "Abrir casa do Atlas",
      description: "Entrar na base nativa de diagnóstico e decisão na Torre.",
      href: "/dashboard#atlas-ai-home",
      tone: "atlas",
    });
  }

  if (pathname.startsWith("/dashboard")) {
    shortcuts.push(
      {
        id: "open-dre",
        title: "Abrir DRE",
        description: "Checar o driver financeiro por trás do sinal atual.",
        href: "/dre",
        tone: "screen",
      },
      {
        id: "open-media",
        title: "Abrir mídia",
        description: "Ir direto para campanhas e retorno atribuído.",
        href: "/media",
        tone: "screen",
      },
    );
  }

  if (pathname.startsWith("/media")) {
    shortcuts.push({
      id: "media-to-tower",
      title: "Levar para a Torre",
      description: "Cruzar mídia com margem e resultado no centro de comando.",
      href: "/dashboard",
      tone: "screen",
    });
  }

  if (pathname.startsWith("/traffic")) {
    shortcuts.push({
      id: "traffic-to-ga4-guide",
      title: "Guia do GA4",
      description: "Abrir o passo a passo completo para a integração de tráfego.",
      href: "/integrations/tutorials/ga4",
      tone: "guide",
    });
  }

  if (pathname.startsWith("/feed") || pathname.startsWith("/product-insights")) {
    shortcuts.push({
      id: "catalog-to-media",
      title: "Levar catálogo para mídia",
      description: "Conectar produto, cobertura visual e decisão de aquisição.",
      href: "/media",
      tone: "screen",
    });
  }

  const seen = new Set<string>();
  return shortcuts.filter((item) => {
    if (seen.has(item.href)) {
      return false;
    }
    seen.add(item.href);
    return true;
  }).slice(0, 5);
}

function getItemIcon(item: RadarItem) {
  if (item.kind === "atlas") {
    return <BrainCircuit size={14} />;
  }

  if (item.kind === "setup") {
    if (item.href === "/settings") {
      return <Settings2 size={14} />;
    }

    if (item.href === "/help") {
      return <CircleHelp size={14} />;
    }

    if (item.href.includes("/tutorials")) {
      return <CircleHelp size={14} />;
    }

    return <PlugZap size={14} />;
  }

  if (item.href === "/sanitization") {
    return <ShieldAlert size={14} />;
  }

  if (item.href === "/dashboard") {
    return <LayoutDashboard size={14} />;
  }

  return <TrendingUp size={14} />;
}

function getShortcutToneClass(tone: RadarShortcut["tone"]) {
  if (tone === "fix") {
    return "bg-warning/12 text-warning";
  }

  if (tone === "guide") {
    return "bg-surface-container text-on-surface-variant";
  }

  if (tone === "atlas") {
    return "bg-primary-container text-primary";
  }

  return "bg-surface-container text-on-surface-variant";
}

export function AtlasOrbRadarPanel({
  telemetry,
  status,
  hoverAlert,
}: {
  telemetry: AtlasOrbRadarTelemetry;
  status: string;
  hoverAlert: string;
}) {
  const pathname = usePathname() ?? "/";
  const [query, setQuery] = useState("");

  const radarAlerts = useMemo(
    () => buildRadarAlerts(pathname, telemetry),
    [pathname, telemetry],
  );
  const radarShortcuts = useMemo(
    () => buildRadarShortcuts(pathname, telemetry),
    [pathname, telemetry],
  );
  const radarItems = useMemo<RadarItem[]>(() => {
    const items: RadarItem[] = [
      {
        href: "/dashboard",
        label: "Torre de Controle",
        description: "Executivo, diagnóstico e casa nativa do Atlas.",
        kind: "screen",
        keywords: ["dashboard", "torre", "controle", "atlas", "executivo"],
      },
      {
        href: "/dre",
        label: "DRE Consolidado",
        description: "Resultado, pressão de custo e equilíbrio.",
        kind: "screen",
        keywords: ["dre", "resultado", "margem", "financeiro", "equilibrio"],
      },
      {
        href: "/media",
        label: "Performance Mídia",
        description: "Campanhas, gasto, retorno e sinais de escala.",
        kind: "screen",
        keywords: ["media", "meta", "campanha", "roas", "criativo"],
      },
      {
        href: "/traffic",
        label: "Tráfego Digital",
        description: "GA4, funil e origens com mais atrito.",
        kind: "screen",
        keywords: ["trafego", "ga4", "funil", "landing", "origem"],
      },
      {
        href: "/feed",
        label: "Catálogo",
        description: "Cobertura visual, feed e estampa pronta para escala.",
        kind: "screen",
        keywords: ["catalogo", "feed", "produto", "estampa", "vitrine"],
      },
      {
        href: "/sanitization",
        label: "Saneamento",
        description: "Pendências e ruído que afetam a leitura da base.",
        kind: "screen",
        keywords: ["saneamento", "anomalia", "outlier", "pendencia", "base"],
      },
      {
        href: "/integrations",
        label: "Integrações",
        description: "Saúde de Meta, GA4 e Gemini por loja.",
        kind: "setup",
        keywords: ["integracoes", "meta", "ga4", "gemini", "token"],
      },
      {
        href: "/settings",
        label: "Central estratégica",
        description: "Acessos, Atlas IA, ajuda e ajustes gerais da plataforma.",
        kind: "setup",
        keywords: ["configuracoes", "acessos", "atlas", "contexto", "ajustes"],
      },
      {
        href: "/help",
        label: "Ajuda e guias",
        description: "Passos de integração, operação e segurança da plataforma.",
        kind: "setup",
        keywords: ["ajuda", "guia", "tutorial", "seguranca", "operacao"],
      },
      {
        href: "/integrations/tutorials",
        label: "Tutoriais de integração",
        description: "Passo a passo guiado de Meta, GA4 e Gemini com links externos oficiais.",
        kind: "setup",
        keywords: ["tutorial", "meta", "ga4", "gemini", "painel", "configurar"],
      },
      {
        href: "/integrations/tutorials/meta",
        label: "Tutorial Meta",
        description: "Conta de anúncios, catálogo, token e validação da sincronização.",
        kind: "setup",
        keywords: ["meta", "ads", "catalogo", "token", "business manager"],
      },
      {
        href: "/integrations/tutorials/ga4",
        label: "Tutorial GA4",
        description: "Property ID, service account, JSON e validação da leitura de tráfego.",
        kind: "setup",
        keywords: ["ga4", "analytics", "property id", "service account", "json"],
      },
      {
        href: "/integrations/tutorials/gemini",
        label: "Tutorial Gemini",
        description: "Ativação da IA da marca, chave da loja e parâmetros do Atlas.",
        kind: "setup",
        keywords: ["gemini", "atlas ia", "modelo", "temperatura", "skill"],
      },
      {
        href: "/settings#atlas-ai-settings",
        label: "Parâmetros do Atlas",
        description: "Janela, skill padrão e guia operacional da marca.",
        kind: "atlas",
        keywords: ["atlas", "janela", "skill", "playbook", "parametros"],
      },
    ];

    if (telemetry.geminiEnabled) {
      items.unshift({
        href: "/dashboard#atlas-ai-home",
        label: "Casa do Atlas IA",
        description: "Abra a base fixa do Atlas na Torre de Controle.",
        kind: "atlas",
        keywords: ["atlas ia", "analyst", "diagnostico", "ia", "orb"],
      });
      items.push({
        href: "/settings#atlas-learning",
        label: "Aprender negócio",
        description: "Ensine o Atlas a consolidar o nicho, padrões e oportunidades da marca.",
        kind: "atlas",
        keywords: ["aprender negocio", "learning", "atlas", "memoria", "contexto"],
      });
      items.push({
        href: "/settings#atlas-context",
        label: "Memória operacional",
        description: "Registrar fatos que devem influenciar a leitura do Atlas.",
        kind: "atlas",
        keywords: ["memoria", "contexto", "campanha", "promocao", "incidente"],
      });
    }

    return items;
  }, [telemetry.geminiEnabled]);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredItems = normalizedQuery
    ? radarItems.filter((item) => {
        const haystack = `${item.label} ${item.description} ${item.keywords.join(" ")}`.toLowerCase();
        return haystack.includes(normalizedQuery);
      })
    : radarItems.slice(0, 6);

  const primaryAlert = radarAlerts[0] ?? null;
  const shortcutPreview = radarShortcuts.slice(0, 2);

  return (
    <div className="space-y-4">
      <div className="atlas-soft-section px-3 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
              Radar do Atlas
            </p>
            <p className="mt-1 text-[11px] font-semibold leading-5 text-on-surface">
              {primaryAlert?.title ?? `Atlas atento em ${status}`}
            </p>
            <p className="mt-1 text-[11px] leading-5 text-on-surface-variant">
              {primaryAlert?.description ?? hoverAlert}
            </p>
          </div>
          <span
            className={cn(
              "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border",
              primaryAlert?.tone === "alert"
                ? "border-warning/20 bg-warning/10 text-warning"
                : primaryAlert?.tone === "notice"
                  ? "border-primary/20 bg-primary-container text-primary"
                  : "border-outline bg-surface-container-low text-primary",
            )}
          >
            {primaryAlert?.tone === "alert" ? <AlertTriangle size={16} /> : <Sparkles size={16} />}
          </span>
        </div>

      </div>

      <label className="brandops-field-stack">
        <span className="brandops-field-label">Pesquisa global</span>
        <span className="brandops-input-with-icon">
          <Search size={14} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="brandops-input"
            placeholder="Buscar tela, ajuste ou foco..."
          />
        </span>
      </label>

      {radarAlerts.length ? (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
            Alerta principal
          </p>
          <div className="space-y-2">
            {radarAlerts.slice(0, 1).map((alert) => (
              <Link
                key={alert.id}
                href={alert.href}
                className="atlas-analytics-card"
                data-tone={alert.tone === "alert" ? "warning" : alert.tone === "notice" ? "info" : "default"}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="atlas-analytics-eyebrow">Foco</p>
                    <p className="mt-2 text-sm font-semibold leading-5 text-on-surface">{alert.title}</p>
                    <p className="atlas-analytics-copy mt-2">{alert.description}</p>
                  </div>
                  <span className="atlas-analytics-action shrink-0">
                    Abrir
                    <ArrowUpRight size={12} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {!normalizedQuery && shortcutPreview.length ? (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
            Próximos cliques
          </p>
          <div className="space-y-2">
            {shortcutPreview.map((shortcut) => (
              <Link
                key={shortcut.id}
                href={shortcut.href}
                className="atlas-soft-subcard flex items-start justify-between gap-3 px-3 py-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex h-6 w-6 items-center justify-center rounded-full",
                        getShortcutToneClass(shortcut.tone),
                      )}
                    >
                      {shortcut.tone === "atlas" ? (
                        <BrainCircuit size={12} />
                      ) : shortcut.tone === "fix" ? (
                        <ShieldAlert size={12} />
                      ) : shortcut.tone === "guide" ? (
                        <CircleHelp size={12} />
                      ) : (
                        <TrendingUp size={12} />
                      )}
                    </span>
                    <p className="text-[11px] font-semibold text-on-surface">{shortcut.title}</p>
                  </div>
                  <p className="mt-1 text-[11px] leading-5 text-on-surface-variant">
                    {shortcut.description}
                  </p>
                </div>
                <ArrowUpRight size={13} className="shrink-0 text-on-surface-variant" />
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {normalizedQuery ? (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
            Resultados da busca
          </p>
          <div className="space-y-2">
            {filteredItems.slice(0, 6).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="atlas-soft-subcard flex items-center justify-between gap-3 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-on-surface">{getItemIcon(item)}</span>
                    <p className="text-[11px] font-semibold text-on-surface">{item.label}</p>
                  </div>
                  <p className="mt-1 text-[11px] leading-5 text-on-surface-variant">
                    {item.description}
                  </p>
                </div>
                <ArrowUpRight size={13} className="shrink-0 text-on-surface-variant" />
              </Link>
            ))}
          </div>

          {!filteredItems.length ? (
            <div className="atlas-soft-subcard border-dashed px-3 py-3 text-[11px] leading-5 text-on-surface-variant">
              Nada bateu com essa busca ainda. Tente nome de tela, integração, contexto ou foco operacional.
            </div>
          ) : null}
        </div>
      ) : (
        <div className="atlas-soft-subcard border-dashed px-3 py-3 text-[11px] leading-5 text-on-surface-variant">
          O Orb existe para interromper com utilidade. Quando quiser navegar mais fundo, use a busca global.
        </div>
      )}
    </div>
  );
}
