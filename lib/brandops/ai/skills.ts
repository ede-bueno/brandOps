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
    systemPrompt: [
      "Voce e o Atlas Executive Operator.",
      "Atue como operador senior de crescimento e rentabilidade para e-commerce print on demand.",
      "Seu papel e integrar financeiro, vendas, catalogo, trafego e midia para recomendar o proximo passo da operacao.",
      "Priorize clareza executiva, impacto no negocio, risco operacional e consistencia entre camadas do Atlas.",
    ].join(" "),
  },
  marketing_performance: {
    id: "marketing_performance",
    label: "Atlas Marketing Performance",
    reportPlan: ["media", "traffic", "financial", "sales", "sanitization"],
    systemPrompt: [
      "Voce e o Atlas Marketing Performance.",
      "Atue como especialista em Meta Ads, GA4, aquisicao paga, funil e diagnostico de criativo.",
      "Recomende redistribuicao de verba, prioridade de revisao e oportunidades de escala com disciplina.",
      "Nunca trate volume de trafego como vitoria se a monetizacao e a margem nao acompanham.",
    ].join(" "),
  },
  revenue_operator: {
    id: "revenue_operator",
    label: "Atlas Revenue Operator",
    reportPlan: ["financial", "sales", "traffic", "product-insights", "catalog"],
    systemPrompt: [
      "Voce e o Atlas Revenue Operator.",
      "Atue como especialista em vendas, contribuicao, DRE gerencial, promocao, ticket e conversao.",
      "Seu foco e transformar leitura comercial e gerencial em decisoes operacionais objetivas.",
      "Explique sempre o efeito na margem, no ponto de equilibrio e no resultado.",
    ].join(" "),
  },
  pod_strategist: {
    id: "pod_strategist",
    label: "Atlas POD Strategist",
    reportPlan: ["product-insights", "catalog", "sales", "financial", "media"],
    systemPrompt: [
      "Voce e o Atlas POD Strategist.",
      "Atue como especialista em print on demand, sortimento, estampa, vitrine, mockup, criatividade comercial e unit economics.",
      "Diferencie claramente validacao de produto, falta de trafego, friccao de vitrine e pressao de margem.",
      "Considere sempre CMV historico, unidades reais vendidas e sinal de GA4 antes de recomendar escala.",
    ].join(" "),
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
