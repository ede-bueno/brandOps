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
import { useBrandOps } from "./BrandOpsProvider";
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

type RadarMove = {
  id: string;
  title: string;
  reason: string;
  href: string;
  tone: "critical" | "focus" | "assist";
};

type RadarShortcut = {
  id: string;
  title: string;
  description: string;
  href: string;
  tone: "fix" | "guide" | "atlas" | "screen";
};

type AtlasQuestion = {
  id: string;
  question: string;
  href: string;
  tone: "atlas" | "focus";
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

function buildRadarMoves(pathname: string, telemetry: AtlasOrbRadarTelemetry) {
  const moves: RadarMove[] = [];

  if (telemetry.pendingSanitizationCount > 0) {
    moves.push({
      id: "move-sanitization",
      title: "Fechar pendencias de base",
      reason: "Saneie a base antes de escalar qualquer leitura de performance.",
      href: "/sanitization",
      tone: "critical",
    });
  }

  if (telemetry.contributionAfterMedia !== null && telemetry.contributionAfterMedia < 0) {
    moves.push({
      id: "move-contribution",
      title: "Atacar margem depois da midia",
      reason: "A operacao ja perdeu contribuicao apos investimento em midia neste corte.",
      href: pathname.startsWith("/dashboard") ? "/dashboard/contribution-margin" : "/dre",
      tone: "critical",
    });
  }

  if (telemetry.netResult !== null && telemetry.netResult < 0) {
    moves.push({
      id: "move-result",
      title: "Revisar o driver do prejuizo",
      reason: "O resultado operacional esta negativo e pede uma restricao principal clara.",
      href: "/dre",
      tone: "critical",
    });
  }

  if (telemetry.mediaIntegrationError || telemetry.ga4IntegrationError) {
    moves.push({
      id: "move-integration",
      title: "Corrigir a fonte quebrada",
      reason: "Sem fonte saudavel, o Atlas fica cego ou inconsistene no periodo.",
      href: "/integrations",
      tone: "focus",
    });
  }

  if (telemetry.grossRoas !== null && telemetry.grossRoas > 0 && telemetry.grossRoas < 2) {
    moves.push({
      id: "move-media",
      title: "Repriorizar verba de aquisicao",
      reason: "O retorno de midia esta curto para sustentar expansao sem revisao.",
      href: "/media",
      tone: "focus",
    });
  }

  if (!telemetry.hasGa4Data) {
    moves.push({
      id: "move-ga4",
      title: "Restaurar leitura de funil",
      reason: "Sem GA4 suficiente, o Atlas perde explicacao de atrito entre sessao e compra.",
      href: "/integrations",
      tone: "assist",
    });
  }

  if (!telemetry.hasCatalogData) {
    moves.push({
      id: "move-catalog",
      title: "Fortalecer a camada de catalogo",
      reason: "Cobertura fraca de catalogo limita leitura de produto, criativo e escala.",
      href: "/feed",
      tone: "assist",
    });
  }

  if (!telemetry.geminiEnabled) {
    moves.push({
      id: "move-learning",
      title: "Liberar leitura inteligente da marca",
      reason: "Ative o Atlas IA e configure os parâmetros estratégicos para começar a acumular contexto.",
      href: "/settings#atlas-ai-settings",
      tone: "assist",
    });
  }

  if (telemetry.geminiEnabled) {
    moves.push({
      id: "move-atlas",
      title: "Abrir a casa do Atlas",
      reason: "Use a Torre para consolidar a leitura executiva quando o radar acender.",
      href: "/dashboard#atlas-ai-home",
      tone: "assist",
    });
  } else {
    moves.push({
      id: "move-settings",
      title: "Preparar camada inteligente",
      reason: "Ajuste parametros e governanca antes de liberar o Atlas IA para a marca.",
      href: "/settings#atlas-ai-settings",
      tone: "assist",
    });
  }

  return moves.slice(0, 4);
}

function buildFocusSeeds(pathname: string, telemetry: AtlasOrbRadarTelemetry) {
  const seeds = new Set<string>();

  if (pathname.startsWith("/dashboard")) {
    seeds.add("margem");
    seeds.add("resultado");
  }

  if (pathname.startsWith("/media") || (telemetry.grossRoas !== null && telemetry.grossRoas < 2)) {
    seeds.add("midia");
    seeds.add("roas");
  }

  if (pathname.startsWith("/traffic") || !telemetry.hasGa4Data) {
    seeds.add("ga4");
    seeds.add("funil");
  }

  if (pathname.startsWith("/feed") || !telemetry.hasCatalogData) {
    seeds.add("catalogo");
    seeds.add("vitrine");
  }

  if (!telemetry.geminiEnabled) {
    seeds.add("atlas ia");
    seeds.add("configuracao");
  }

  if (telemetry.pendingSanitizationCount > 0) {
    seeds.add("saneamento");
  }

  if (telemetry.geminiEnabled) {
    seeds.add("atlas ia");
  }

  seeds.add("integracoes");

  return Array.from(seeds).slice(0, 6);
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

function buildAtlasQuestions(pathname: string, radar: AtlasOrbRadarTelemetry): AtlasQuestion[] {
  const questions: AtlasQuestion[] = [];

  if (pathname.startsWith("/dashboard")) {
    questions.push(
      {
        id: "q-dashboard-result",
        question: "O que mais está comprimindo o resultado neste período?",
        href: "/dashboard#atlas-ai-home",
        tone: "focus",
      },
      {
        id: "q-dashboard-margin",
        question: "Quais 3 decisões mais impactam a margem agora?",
        href: "/dashboard#atlas-ai-home",
        tone: "atlas",
      },
    );
  }

  if (pathname.startsWith("/media")) {
    questions.push(
      {
        id: "q-media-budget",
        question: "Onde eu deveria cortar ou mover verba agora?",
        href: "/dashboard#atlas-ai-home",
        tone: "focus",
      },
      {
        id: "q-media-creative",
        question: "Qual campanha pede revisão criativa primeiro?",
        href: "/dashboard#atlas-ai-home",
        tone: "atlas",
      },
    );
  }

  if (pathname.startsWith("/traffic") || !radar.hasGa4Data) {
    questions.push({
      id: "q-traffic-funnel",
      question: "Onde o funil está perdendo mais intenção?",
      href: "/dashboard#atlas-ai-home",
      tone: "atlas",
    });
  }

  if (pathname.startsWith("/feed") || pathname.startsWith("/product-insights")) {
    questions.push({
      id: "q-catalog-scale",
      question: "Quais produtos merecem mais tráfego ou revisão de vitrine?",
      href: "/dashboard#atlas-ai-home",
      tone: "atlas",
    });
  }

  if (radar.pendingSanitizationCount > 0) {
    questions.push({
      id: "q-sanitization-risk",
      question: "O que pode estar distorcendo minha leitura hoje?",
      href: "/dashboard#atlas-ai-home",
      tone: "focus",
    });
  }

  const seen = new Set<string>();
  return questions.filter((item) => {
    if (seen.has(item.question)) {
      return false;
    }
    seen.add(item.question);
    return true;
  }).slice(0, 4);
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
  const { activeBrand, selectedPeriodLabel } = useBrandOps();
  const [query, setQuery] = useState("");

  const radarAlerts = useMemo(
    () => buildRadarAlerts(pathname, telemetry),
    [pathname, telemetry],
  );
  const radarMoves = useMemo(
    () => buildRadarMoves(pathname, telemetry),
    [pathname, telemetry],
  );
  const radarShortcuts = useMemo(
    () => buildRadarShortcuts(pathname, telemetry),
    [pathname, telemetry],
  );
  const atlasQuestions = useMemo(
    () => (telemetry.geminiEnabled ? buildAtlasQuestions(pathname, telemetry) : []),
    [pathname, telemetry],
  );
  const focusSeeds = useMemo(
    () => buildFocusSeeds(pathname, telemetry),
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

        <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
          <span className="atlas-soft-pill">{activeBrand?.name ?? "Loja ativa"}</span>
          <span className="atlas-soft-pill">{selectedPeriodLabel}</span>
          <span className="atlas-soft-pill">
            {telemetry.geminiEnabled ? "IA ativa" : "IA opcional"}
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

      {!normalizedQuery ? (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
            Focos rapidos
          </p>
          <div className="flex flex-wrap gap-2">
            {focusSeeds.map((seed) => (
              <button
                key={seed}
                type="button"
                onClick={() => setQuery(seed)}
                className="atlas-soft-pill text-[11px] normal-case tracking-[0.02em]"
                data-interactive="true"
              >
                {seed}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {radarAlerts.length ? (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
            Alertas e focos
          </p>
          <div className="space-y-2">
            {radarAlerts.slice(0, normalizedQuery ? 1 : 3).map((alert) => (
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

      {!normalizedQuery && radarShortcuts.length ? (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
            Atalhos contextuais
          </p>
          <div className="space-y-2">
            {radarShortcuts.map((shortcut) => (
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

      {!normalizedQuery && radarMoves.length ? (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
            Proximos movimentos
          </p>
          <div className="space-y-2">
            {radarMoves.map((move) => (
              <Link
                key={move.id}
                href={move.href}
                className="atlas-soft-subcard flex items-start justify-between gap-3 px-3 py-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex h-6 w-6 items-center justify-center rounded-full",
                        move.tone === "critical"
                          ? "bg-warning/12 text-warning"
                          : move.tone === "focus"
                            ? "bg-primary-container text-primary"
                            : "bg-surface-container text-on-surface-variant",
                      )}
                    >
                      {move.tone === "critical" ? (
                        <ShieldAlert size={12} />
                      ) : move.tone === "focus" ? (
                        <TrendingUp size={12} />
                      ) : (
                        <BrainCircuit size={12} />
                      )}
                    </span>
                    <p className="text-[11px] font-semibold text-on-surface">{move.title}</p>
                  </div>
                  <p className="mt-1 text-[11px] leading-5 text-on-surface-variant">
                    {move.reason}
                  </p>
                </div>
                <ArrowUpRight size={13} className="shrink-0 text-on-surface-variant" />
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {!normalizedQuery && atlasQuestions.length ? (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
            Perguntas prontas
          </p>
          <div className="space-y-2">
            {atlasQuestions.map((question) => (
              <Link
                key={question.id}
                href={question.href}
                className="atlas-soft-subcard flex items-start justify-between gap-3 px-3 py-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex h-6 w-6 items-center justify-center rounded-full",
                        question.tone === "focus"
                          ? "bg-warning/12 text-warning"
                          : "bg-primary-container text-primary",
                      )}
                    >
                      <BrainCircuit size={12} />
                    </span>
                    <p className="text-[11px] font-semibold text-on-surface">{question.question}</p>
                  </div>
                  <p className="mt-1 text-[11px] leading-5 text-on-surface-variant">
                    Abrir a camada do Atlas ja na Torre para investigar essa pergunta.
                  </p>
                </div>
                <ArrowUpRight size={13} className="shrink-0 text-on-surface-variant" />
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
          {normalizedQuery ? "Resultados da busca" : "Mapa rapido"}
        </p>
        <div className="space-y-2">
          {(normalizedQuery ? filteredItems.slice(0, 6) : filteredItems.slice(0, 3)).map((item) => (
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

        {normalizedQuery && !filteredItems.length ? (
          <div className="atlas-soft-subcard border-dashed px-3 py-3 text-[11px] leading-5 text-on-surface-variant">
            Nada bateu com essa busca ainda. Tente nome de tela, integração, contexto ou foco operacional.
          </div>
        ) : null}

        {!normalizedQuery ? (
          <div className="atlas-soft-subcard border-dashed px-3 py-3 text-[11px] leading-5 text-on-surface-variant">
            O Orb fica melhor quando aponta caminho curto. Use a busca global para navegar pelo mapa completo da plataforma.
          </div>
        ) : null}
      </div>
    </div>
  );
}
