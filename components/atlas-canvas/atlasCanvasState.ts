import type { AtlasAnalystHistoryItem } from "@/lib/brandops/ai/types";
import { APP_ROUTES } from "@/lib/brandops/routes";

export type AtlasCanvasDomain = "financeiro" | "midia" | "trafego" | "produtos" | "operacao";
export type AtlasCanvasNodeKind = "domain" | "insight" | "signal" | "memory" | "next" | "report";
export type AtlasCanvasTone = "neutral" | "primary" | "secondary" | "warning";

export type AtlasCanvasNode = {
  id: string;
  kind: AtlasCanvasNodeKind;
  label: string;
  detail: string;
  x: number;
  y: number;
  tone: AtlasCanvasTone;
  size?: "sm" | "md" | "lg";
  prompt?: string;
  href?: string;
};

export type AtlasCanvasState = {
  status: "idle" | "awakening";
  domain: AtlasCanvasDomain;
  nodes: AtlasCanvasNode[];
  traces: string[];
  focusNodeId: string;
};

const DOMAIN_META: Record<
  AtlasCanvasDomain,
  {
    label: string;
    idleHint: string;
    prompt: string;
    position: { x: number; y: number };
  }
> = {
  financeiro: {
    label: "Financeiro",
    idleHint: "margem, resultado e caixa",
    prompt: "Abra financeiro e me diga onde agir primeiro.",
    position: { x: 22, y: 22 },
  },
  midia: {
    label: "Mídia",
    idleHint: "verba, campanhas e criativos",
    prompt: "Abra mídia e me diga onde mexer agora.",
    position: { x: 38, y: 13 },
  },
  trafego: {
    label: "Tráfego",
    idleHint: "funil, sessão e conversão",
    prompt: "Abra tráfego e me diga onde o funil perde força.",
    position: { x: 24, y: 74 },
  },
  produtos: {
    label: "Produtos",
    idleHint: "mix, catálogo e demanda",
    prompt: "Abra produtos e me diga onde existe oportunidade real.",
    position: { x: 76, y: 22 },
  },
  operacao: {
    label: "Operação",
    idleHint: "base, integração e rotina",
    prompt: "Abra operação e me diga o que pode distorcer a leitura.",
    position: { x: 73, y: 76 },
  },
};

const REPORT_ROUTES: Record<string, { label: string; href: string }> = {
  financial: { label: "DRE", href: APP_ROUTES.dre },
  media: { label: "Mídia", href: APP_ROUTES.media },
  traffic: { label: "Tráfego", href: APP_ROUTES.traffic },
  "product-insights": { label: "Produtos", href: APP_ROUTES.productInsights },
  sales: { label: "Vendas", href: APP_ROUTES.sales },
  catalog: { label: "Catálogo", href: APP_ROUTES.feed },
  sanitization: { label: "Base", href: APP_ROUTES.sanitization },
};

function createNode(node: AtlasCanvasNode): AtlasCanvasNode {
  return node;
}

function normalizeText(value?: string | null) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function compactAtlasLine(value?: string | null, maxLength = 92) {
  const normalized = value?.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "";
  }

  const firstSentence = normalized.split(/(?<=[.!?])\s+/)[0]?.trim() ?? normalized;
  const candidate = firstSentence.length >= 36 ? firstSentence : normalized;

  if (candidate.length <= maxLength) {
    return candidate;
  }

  return `${candidate.slice(0, Math.max(maxLength - 1, 28)).trimEnd()}…`;
}

function uniqueItems(items: string[]) {
  return Array.from(new Set(items.filter(Boolean)));
}

export function classifyAtlasCanvasDomain(text: string, fallback: AtlasCanvasDomain): AtlasCanvasDomain {
  const normalized = normalizeText(text);

  if (/(margem|resultado|receita|cmv|despesa|financeir|dre|fatur|custo|caixa)/.test(normalized)) {
    return "financeiro";
  }

  if (/(midia|meta|campanha|roas|criativ|anuncio|ads|verba|publico)/.test(normalized)) {
    return "midia";
  }

  if (/(trafego|funil|sessao|checkout|clique|conversao|landing|origem)/.test(normalized)) {
    return "trafego";
  }

  if (/(produto|catalogo|estampa|sku|mix|vitrine|colecao)/.test(normalized)) {
    return "produtos";
  }

  if (/(integracao|base|importacao|saneamento|rotina|processo|competencia)/.test(normalized)) {
    return "operacao";
  }

  return fallback;
}

export function getAtlasCanvasDefaultState(domain: AtlasCanvasDomain): AtlasCanvasState {
  const nodes: AtlasCanvasNode[] = (Object.entries(DOMAIN_META) as Array<
    [AtlasCanvasDomain, (typeof DOMAIN_META)[AtlasCanvasDomain]]
  >).map(([key, meta]) =>
    createNode({
      id: `domain-${key}`,
      kind: "domain",
      label: meta.label,
      detail: meta.idleHint,
      x: meta.position.x,
      y: meta.position.y,
      tone: key === domain ? "primary" : "neutral",
      size: key === domain ? "lg" : "md",
      prompt: meta.prompt,
    }),
  );

  return {
    status: "idle",
    domain,
    nodes,
    traces: [],
    focusNodeId: `domain-${domain}`,
  };
}

export function buildAtlasCanvasState({
  fallbackDomain,
  latestRun,
}: {
  fallbackDomain: AtlasCanvasDomain;
  latestRun: AtlasAnalystHistoryItem | null;
}): AtlasCanvasState {
  if (!latestRun) {
    return getAtlasCanvasDefaultState(fallbackDomain);
  }

  const domain = classifyAtlasCanvasDomain(`${latestRun.summary} ${latestRun.answer}`, fallbackDomain);
  const base = getAtlasCanvasDefaultState(domain);
  const primaryReading = compactAtlasLine(latestRun.summary || latestRun.answer, 74) || "Sem leitura dominante no momento.";
  const signalItems = uniqueItems(
    [...latestRun.evidence.slice(0, 2), ...latestRun.risks.slice(0, 1), ...latestRun.warnings.slice(0, 1)].map((item) =>
      compactAtlasLine(item, 54),
    ),
  ).slice(0, 4);
  const nextItems = uniqueItems(
    [...latestRun.actions.slice(0, 2), ...latestRun.followUps.slice(0, 1)].map((item) => compactAtlasLine(item, 56)),
  ).slice(0, 3);
  const nextMove = nextItems[0] || "Sem próximo movimento explícito.";
  const memory = compactAtlasLine(latestRun.question, 64) || "Sem memória recente disponível.";

  const nodes: AtlasCanvasNode[] = [
    ...base.nodes.map((node) =>
      node.id === `domain-${domain}`
        ? createNode({
            ...node,
            tone: "primary",
            size: "lg",
            detail: compactAtlasLine(latestRun.answer || latestRun.summary, 40) || node.detail,
          })
        : node,
    ),
    createNode({
      id: "insight-primary",
      kind: "insight",
      label: "Leitura",
      detail: primaryReading,
      x: 68,
      y: 18,
      tone: "primary",
      size: "lg",
    }),
    createNode({
      id: "memory-primary",
      kind: "memory",
      label: "Memória",
      detail: memory,
      x: 35,
      y: 76,
      tone: "neutral",
      size: "md",
      prompt: memory,
    }),
    createNode({
      id: "next-primary",
      kind: "next",
      label: "Próximo",
      detail: nextMove,
      x: 66,
      y: 82,
      tone: "secondary",
      size: "md",
      prompt: "Transforme esse próximo passo em ação objetiva.",
    }),
  ];

  const signalPositions = [
    { x: 83, y: 28 },
    { x: 90, y: 43 },
    { x: 82, y: 58 },
    { x: 72, y: 64 },
  ];

  signalItems.forEach((signal, index) => {
    const position = signalPositions[index];
    if (!position) {
      return;
    }

    nodes.push(
      createNode({
        id: `signal-${index}`,
        kind: "signal",
        label: index === 0 ? "Sinal" : `Sinal ${index + 1}`,
        detail: signal,
        x: position.x,
        y: position.y,
        tone: latestRun.risks.length || latestRun.warnings.length ? "warning" : "secondary",
        size: index === 0 ? "md" : "sm",
        prompt: signal,
      }),
    );
  });

  const nextPositions = [
    { x: 78, y: 78 },
    { x: 54, y: 88 },
  ];

  nextItems.slice(1).forEach((item, index) => {
    const position = nextPositions[index];
    if (!position) {
      return;
    }

    nodes.push(
      createNode({
        id: `next-${index + 1}`,
        kind: "next",
        label: "Movimento",
        detail: item,
        x: position.x,
        y: position.y,
        tone: "secondary",
        size: "sm",
        prompt: item,
      }),
    );
  });

  latestRun.usedReports.slice(0, 3).forEach((reportId, index) => {
    const report = REPORT_ROUTES[reportId];
    if (!report) {
      return;
    }

    nodes.push(
      createNode({
        id: `report-${reportId}`,
        kind: "report",
        label: report.label,
        detail: "abrir base",
        x: 95,
        y: 18 + index * 13,
        tone: "neutral",
        size: "sm",
        href: report.href,
      }),
    );
  });

  const traces = uniqueItems(
    [...latestRun.evidence.slice(0, 2), ...latestRun.actions.slice(0, 1), ...latestRun.risks.slice(0, 1)].map((item) =>
      compactAtlasLine(item, 88),
    ),
  ).slice(0, 4);

  return {
    status: "awakening",
    domain,
    nodes,
    traces,
    focusNodeId: "insight-primary",
  };
}
