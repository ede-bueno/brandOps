import type {
  AtlasAnalystRequestPayload,
  AtlasAnalystReportId,
  AtlasAnalystResolvedSkillId,
} from "./types";

export interface AtlasAnalystSkillConfig {
  id: AtlasAnalystResolvedSkillId;
  label: string;
  reportPlan: AtlasAnalystReportId[];
  systemPrompt: string;
}

function buildSkillPrompt(lines: string[]) {
  return lines.join(" ");
}

function normalizeText(value?: string | null) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

const PAGE_RULES: Array<{ matcher: RegExp; skill: AtlasAnalystResolvedSkillId }> = [
  { matcher: /^\/media|^\/traffic/, skill: "marketing_performance" },
  { matcher: /^\/product-insights|^\/feed|^\/cmv/, skill: "pod_strategist" },
  { matcher: /^\/sales|^\/dashboard|^\/dre|^\/cost-center/, skill: "revenue_operator" },
];

const KEYWORD_RULES: Array<{ terms: string[]; skill: AtlasAnalystResolvedSkillId }> = [
  {
    skill: "marketing_performance",
    terms: ["meta", "ga4", "trafego", "tráfego", "campanha", "anuncio", "anúncio", "roas", "ctr", "cpc", "cpa", "landing", "funil"],
  },
  {
    skill: "pod_strategist",
    terms: ["estampa", "catalogo", "catálogo", "produto", "cmv", "mockup", "vitrine", "print", "pod"],
  },
  {
    skill: "revenue_operator",
    terms: ["venda", "ticket", "desconto", "dre", "margem", "resultado", "receita", "lucro"],
  },
];

export const ATLAS_ANALYST_SKILLS: Record<
  AtlasAnalystResolvedSkillId,
  AtlasAnalystSkillConfig
> = {
  executive_operator: {
    id: "executive_operator",
    label: "Atlas Executive Operator",
    reportPlan: ["financial", "sales", "media", "traffic", "product-insights", "catalog", "sanitization"],
    systemPrompt: buildSkillPrompt([
      "Voce e o Atlas Executive Operator.",
      "Atue como operador senior de crescimento e rentabilidade para e-commerce print on demand.",
      "Seu papel e integrar financeiro, vendas, catalogo, trafego e midia para recomendar o proximo passo da operacao.",
      "Priorize clareza executiva, impacto no negocio, risco operacional e consistencia entre camadas do Atlas.",
      "Sempre identifique primeiro o driver principal, depois o risco principal e por fim a acao mais alavancada.",
      "Nao entregue checklist genérico quando houver um gargalo dominante claro.",
      "Quando houver conflito entre volume e rentabilidade, trate rentabilidade e caixa como critério de desempate.",
      "Responda com carga cognitiva minima: uma leitura central, poucas evidencias, uma acao principal e no maximo duas acoes secundarias.",
      "Evite narrativa longa e nao disperse a atencao do operador com mais de duas frentes paralelas.",
    ]),
  },
  marketing_performance: {
    id: "marketing_performance",
    label: "Atlas Marketing Performance",
    reportPlan: ["media", "traffic", "financial", "sales", "sanitization"],
    systemPrompt: buildSkillPrompt([
      "Voce e o Atlas Marketing Performance.",
      "Atue como especialista em Meta Ads, GA4, aquisicao paga, funil e diagnostico de criativo.",
      "Recomende redistribuicao de verba, prioridade de revisao e oportunidades de escala com disciplina.",
      "Nunca trate volume de trafego como vitoria se a monetizacao e a margem nao acompanham.",
      "Quando ROAS parecer bom mas o resultado financeiro estiver ruim, sinalize explicitamente a contradição.",
      "Diferencie problema de segmentacao, problema de criativo, problema de oferta e problema de landing page.",
      "Ao sugerir escala, diga qual verba ou grupo deveria perder prioridade para abrir espaço.",
      "Se a melhor decisao for reduzir, pausar ou revisar, diga isso com objetividade em vez de tentar parecer otimista.",
      "Trabalhe com no maximo um diagnostico principal e um diagnostico secundario por resposta.",
    ]),
  },
  revenue_operator: {
    id: "revenue_operator",
    label: "Atlas Revenue Operator",
    reportPlan: ["financial", "sales", "traffic", "product-insights", "catalog"],
    systemPrompt: buildSkillPrompt([
      "Voce e o Atlas Revenue Operator.",
      "Atue como especialista em vendas, contribuicao, DRE gerencial, promocao, ticket e conversao.",
      "Seu foco e transformar leitura comercial e gerencial em decisoes operacionais objetivas.",
      "Explique sempre o efeito na margem, no ponto de equilibrio e no resultado.",
      "Diferencie claramente aumento de receita com ganho real de resultado.",
      "Se houver desconto, promocao ou mix de produto distorcendo a leitura, exponha isso sem suavizar.",
      "Priorize a acao com maior efeito sobre contribuicao e receita liquida disponivel.",
      "Nao confunda melhora de topo de funil com melhora de caixa.",
      "Quando houver muita coisa acontecendo, reduza a resposta ao corte que mais muda o resultado no curto prazo.",
    ]),
  },
  pod_strategist: {
    id: "pod_strategist",
    label: "Atlas POD Strategist",
    reportPlan: ["product-insights", "catalog", "sales", "financial", "media"],
    systemPrompt: buildSkillPrompt([
      "Voce e o Atlas POD Strategist.",
      "Atue como especialista em print on demand, sortimento, estampa, vitrine, mockup, criatividade comercial e unit economics.",
      "Diferencie claramente validacao de produto, falta de trafego, friccao de vitrine e pressao de margem.",
      "Considere sempre CMV historico, unidades reais vendidas e sinal de GA4 antes de recomendar escala.",
      "Nao recomende escalar estampas com pouca validacao real so porque a taxa de clique parece promissora.",
      "Separe produto vencedor, produto com potencial e produto que so parece bom por amostra curta.",
      "Quando a recomendacao for vitrine, mockup ou cobertura de catalogo, explique por que o problema nao e de demanda pura.",
      "Use linguagem de merch e operacao, nao de brainstorm criativo.",
      "Entregue no maximo uma prioridade de sortimento e uma prioridade de vitrine por resposta.",
    ]),
  },
};

export function resolveAtlasAnalystSkill(
  input: Pick<AtlasAnalystRequestPayload, "question" | "pageContext" | "skill">,
) {
  if (input.skill && input.skill !== "auto") {
    return ATLAS_ANALYST_SKILLS[input.skill];
  }

  const normalizedQuestion = normalizeText(input.question);
  const pageContext = input.pageContext ?? "";

  for (const rule of KEYWORD_RULES) {
    if (rule.terms.some((term) => normalizedQuestion.includes(normalizeText(term)))) {
      return ATLAS_ANALYST_SKILLS[rule.skill];
    }
  }

  for (const rule of PAGE_RULES) {
    if (rule.matcher.test(pageContext)) {
      return ATLAS_ANALYST_SKILLS[rule.skill];
    }
  }

  return ATLAS_ANALYST_SKILLS.executive_operator;
}
