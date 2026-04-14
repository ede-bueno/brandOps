import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

const INK_HELP_HINT_TERMS = [
  "ink",
  "loja",
  "plataforma",
  "configurar",
  "configuracao",
  "configuração",
  "como",
  "onde",
  "categoria",
  "categorias",
  "banner",
  "banners",
  "dominio",
  "domínio",
  "pixel",
  "merchant",
  "google ads",
  "meta",
  "facebook",
  "instagram",
  "frete",
  "troca",
  "devolucao",
  "devolução",
  "saque",
  "assinatura",
  "catalogo",
  "catálogo",
  "produto",
  "produtos",
  "shopify",
  "nuvemshop",
  "cartpanda",
  "hotmart",
];

export interface InkHelpArticleMatch {
  id: string;
  title: string;
  categoryTitle: string;
  url: string;
  excerpt: string;
  articleUpdatedLabel: string | null;
  score: number;
  matchedTerms: string[];
}

type InkHelpArticleRow = {
  id: string;
  title: string;
  category_title: string;
  summary: string | null;
  content_excerpt: string;
  search_text: string;
  source_url: string;
  article_updated_label: string | null;
};

type PostgrestLikeError = {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
};

function asPostgrestLikeError(value: unknown): PostgrestLikeError | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const source = value as Record<string, unknown>;
  return {
    code: typeof source.code === "string" ? source.code : undefined,
    message: typeof source.message === "string" ? source.message : undefined,
    details: typeof source.details === "string" ? source.details : null,
    hint: typeof source.hint === "string" ? source.hint : null,
  };
}

function isInkHelpSchemaMissing(error: unknown) {
  const postgrestError = asPostgrestLikeError(error);
  const haystack = `${postgrestError?.message ?? ""} ${postgrestError?.details ?? ""} ${postgrestError?.hint ?? ""}`.toLowerCase();
  return (
    postgrestError?.code === "42P01" ||
    postgrestError?.code === "PGRST205" ||
    haystack.includes("atlas_ink_help_articles")
  );
}

function normalizeText(value?: string | null) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function tokenize(value: string) {
  return Array.from(
    new Set(
      normalizeText(value)
        .split(/[^a-z0-9]+/)
        .map((token) => token.trim())
        .filter((token) => token.length >= 3),
    ),
  );
}

function shouldUseInkKnowledge(query: string, pageContext?: string | null) {
  const normalizedQuery = normalizeText(query);
  const normalizedPage = normalizeText(pageContext);

  if (
    INK_HELP_HINT_TERMS.some((term) => normalizedQuery.includes(normalizeText(term))) ||
    normalizedQuery.startsWith("como ") ||
    normalizedQuery.startsWith("onde ") ||
    normalizedQuery.startsWith("qual ")
  ) {
    return true;
  }

  return (
    normalizedPage.includes("/integrations") ||
    normalizedPage.includes("/settings") ||
    normalizedPage.includes("/help") ||
    normalizedPage.includes("/catalog") ||
    normalizedPage.includes("/feed") ||
    normalizedPage.includes("/product-insights")
  );
}

function scoreInkHelpArticle(
  row: InkHelpArticleRow,
  normalizedQuery: string,
  queryTerms: string[],
) {
  const normalizedTitle = normalizeText(row.title);
  const normalizedCategory = normalizeText(row.category_title);
  const normalizedSummary = normalizeText(row.summary);
  const normalizedSearchText = normalizeText(row.search_text);
  const matchedTerms: string[] = [];
  let score = 0;

  for (const term of queryTerms) {
    let termScore = 0;
    if (normalizedTitle.includes(term)) {
      termScore = Math.max(termScore, 6);
    }
    if (normalizedCategory.includes(term)) {
      termScore = Math.max(termScore, 4);
    }
    if (normalizedSummary.includes(term)) {
      termScore = Math.max(termScore, 3);
    }
    if (normalizedSearchText.includes(term)) {
      termScore = Math.max(termScore, 2);
    }
    if (termScore > 0) {
      matchedTerms.push(term);
      score += termScore;
    }
  }

  if (normalizedQuery && normalizedTitle.includes(normalizedQuery)) {
    score += 12;
  } else if (normalizedQuery && normalizedSearchText.includes(normalizedQuery)) {
    score += 6;
  }

  if (matchedTerms.length >= 2) {
    score += 4;
  }

  return {
    score,
    matchedTerms,
  };
}

export async function searchInkHelpArticles(
  supabase: SupabaseClient,
  input: {
    query: string;
    pageContext?: string | null;
    limit?: number;
  },
): Promise<InkHelpArticleMatch[]> {
  const query = input.query.trim();
  if (!query || !shouldUseInkKnowledge(query, input.pageContext)) {
    return [];
  }

  const queryTerms = tokenize(query);
  if (!queryTerms.length) {
    return [];
  }

  const { data, error } = await supabase
    .from("atlas_ink_help_articles")
    .select(
      "id, title, category_title, summary, content_excerpt, search_text, source_url, article_updated_label",
    )
    .order("article_updated_at", { ascending: false, nullsFirst: false })
    .limit(400);

  if (error) {
    if (isInkHelpSchemaMissing(error)) {
      return [];
    }
    throw error;
  }

  const rows = (data ?? []) as InkHelpArticleRow[];
  const limit = Math.max(1, Math.min(5, input.limit ?? 3));
  const normalizedQuery = normalizeText(query);

  return rows
    .map((row) => {
      const { score, matchedTerms } = scoreInkHelpArticle(row, normalizedQuery, queryTerms);
      return {
        id: row.id,
        title: row.title,
        categoryTitle: row.category_title,
        url: row.source_url,
        excerpt: (row.summary?.trim() || row.content_excerpt || "").trim().slice(0, 420),
        articleUpdatedLabel: row.article_updated_label,
        score,
        matchedTerms,
      };
    })
    .filter((row) => row.score >= 8)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);
}
