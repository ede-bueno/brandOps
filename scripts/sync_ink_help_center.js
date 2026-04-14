const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");

const HELP_CENTER_HOME =
  "https://cloudchat3.cloudhumans.com/hc/central-de-ajuda-reserva-ink/pt_BR";
const HELP_CENTER_ORIGIN = "https://cloudchat3.cloudhumans.com";
const USER_AGENT = "AtlasBrandOps/1.0 (+https://brand-ops-indol.vercel.app)";
const FETCH_TIMEOUT_MS = 15000;
const ARTICLE_CONCURRENCY = 5;

function loadEnv() {
  const envPath = path.join(process.cwd(), ".env.local");
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);

  return Object.fromEntries(
    lines
      .filter(Boolean)
      .filter((line) => !line.trim().startsWith("#"))
      .map((line) => {
        const separator = line.indexOf("=");
        return [line.slice(0, separator), line.slice(separator + 1).replace(/^"|"$/g, "")];
      }),
  );
}

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function decodeHtmlEntities(value) {
  return String(value ?? "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, code) => {
      const parsed = Number(code);
      return Number.isFinite(parsed) ? String.fromCharCode(parsed) : _;
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => {
      const parsed = Number.parseInt(code, 16);
      return Number.isFinite(parsed) ? String.fromCharCode(parsed) : _;
    });
}

function stripTagsPreservingBreaks(value) {
  return decodeHtmlEntities(
    String(value ?? "")
      .replace(/<\s*br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|section|article|li|ul|ol|h1|h2|h3|h4|h5|tr)>/gi, "$&\n")
      .replace(/<li[^>]*>/gi, "- ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function toAbsoluteUrl(value) {
  if (!value) {
    return null;
  }

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  return `${HELP_CENTER_ORIGIN}${value}`;
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": USER_AGENT,
      accept: "text/html,application/xhtml+xml",
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`Falha ao carregar ${url}: HTTP ${response.status}`);
  }

  return response.text();
}

function parseCategoryUrls(html) {
  const pattern =
    /href="(?<href>\/hc\/central-de-ajuda-reserva-ink\/pt_BR\/categories\/[^"#?]+)"/gi;
  const seen = new Set();
  const categories = [];

  for (const match of html.matchAll(pattern)) {
    const href = match.groups?.href;
    if (!href || seen.has(href)) {
      continue;
    }

    seen.add(href);
    categories.push({
      slug: href.split("/categories/")[1] ?? href,
      url: toAbsoluteUrl(href),
    });
  }

  return categories;
}

function parseCategoryPage(html, fallback) {
  const titleMatch = html.match(/<h1[^>]*>\s*([\s\S]*?)\s*<\/h1>/i);
  const title = stripTagsPreservingBreaks(titleMatch?.[1] ?? fallback.slug);
  const descriptionMatch = html.match(/<\/h1>\s*<p[^>]*>\s*([\s\S]*?)\s*<\/p>/i);
  const description = stripTagsPreservingBreaks(descriptionMatch?.[1] ?? "");
  const countMatch = html.match(/•\s*(\d+)\s+artigos/i);
  const articleCount = Number.parseInt(countMatch?.[1] ?? "0", 10) || 0;
  const articlePattern =
    /href="(?<href>\/hc\/central-de-ajuda-reserva-ink\/articles\/(?<articleId>\d+)-[^"#?]+)"/gi;
  const seen = new Set();
  const articles = [];

  for (const match of html.matchAll(articlePattern)) {
    const href = match.groups?.href;
    const articleId = match.groups?.articleId;
    if (!href || !articleId || seen.has(articleId)) {
      continue;
    }

    seen.add(articleId);
    articles.push({
      externalArticleId: articleId,
      url: toAbsoluteUrl(href),
      categorySlug: fallback.slug,
      categoryTitle: title,
    });
  }

  return {
    slug: fallback.slug,
    url: fallback.url,
    title,
    description,
    articleCount,
    articles,
  };
}

function parseUpdatedAtLabel(html) {
  const match = html.match(/Última atualização em\s*([^<\n]+)/i);
  return match?.[1]?.trim() ?? null;
}

function parseDateFromLabel(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function parseArticlePage(html, metadata) {
  const titleMatch = html.match(/<h1[^>]*>\s*([\s\S]*?)\s*<\/h1>/i);
  const articleHtmlMatch = html.match(
    /<article[^>]*id="cw-article-content"[^>]*>([\s\S]*?)<\/article>/i,
  );
  const title = stripTagsPreservingBreaks(titleMatch?.[1] ?? metadata.externalArticleId);
  const contentText = stripTagsPreservingBreaks(articleHtmlMatch?.[1] ?? "");
  const paragraphs = contentText
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const summary = paragraphs[0]?.slice(0, 420) ?? title;
  const excerpt = contentText.slice(0, 900);
  const updatedLabel = parseUpdatedAtLabel(html);
  const slug = metadata.url.split("/articles/")[1] ?? metadata.externalArticleId;
  const searchText = normalizeText(
    `${metadata.categoryTitle} ${title} ${summary} ${contentText.slice(0, 6000)}`,
  );
  const contentHash = crypto
    .createHash("sha256")
    .update(
      JSON.stringify({
        title,
        summary,
        contentText,
        updatedLabel,
      }),
    )
    .digest("hex");

  return {
    external_article_id: metadata.externalArticleId,
    slug,
    locale: "pt_BR",
    category_slug: metadata.categorySlug,
    category_title: metadata.categoryTitle,
    title,
    summary,
    content_text: contentText,
    content_excerpt: excerpt || summary,
    search_text: searchText,
    source_url: metadata.url,
    article_updated_label: updatedLabel,
    article_updated_at: parseDateFromLabel(updatedLabel),
    content_hash: contentHash,
    last_synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const current = cursor;
      cursor += 1;
      results[current] = await mapper(items[current], current);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  );

  return results;
}

function chunk(items, size = 50) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function main() {
  const env = loadEnv();
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausente em .env.local",
    );
  }

  const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );

  const startedAt = new Date().toISOString();
  const { data: syncRun, error: syncRunError } = await supabase
    .from("atlas_ink_help_sync_runs")
    .insert({
      source_url: HELP_CENTER_HOME,
      status: "running",
      started_at: startedAt,
    })
    .select("id")
    .single();

  if (syncRunError || !syncRun?.id) {
    throw syncRunError ?? new Error("Nao foi possivel iniciar o run de sync da INK.");
  }

  try {
    const homeHtml = await fetchHtml(HELP_CENTER_HOME);
    const categorySeeds = parseCategoryUrls(homeHtml);
    const categories = [];

    for (const categorySeed of categorySeeds) {
      const categoryHtml = await fetchHtml(categorySeed.url);
      categories.push(parseCategoryPage(categoryHtml, categorySeed));
    }

    const categoryRows = categories.map((category) => ({
      slug: category.slug,
      locale: "pt_BR",
      title: category.title,
      description: category.description,
      article_count: category.articleCount,
      source_url: category.url,
      last_crawled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    if (categoryRows.length) {
      const { error: categoriesError } = await supabase
        .from("atlas_ink_help_categories")
        .upsert(categoryRows, { onConflict: "slug" });

      if (categoriesError) {
        throw categoriesError;
      }
    }

    const articleSeeds = categories.flatMap((category) => category.articles);
    const { data: existingArticles, error: existingArticlesError } = await supabase
      .from("atlas_ink_help_articles")
      .select("external_article_id, content_hash");

    if (existingArticlesError) {
      throw existingArticlesError;
    }

    const existingMap = new Map(
      (existingArticles ?? []).map((row) => [String(row.external_article_id), row.content_hash]),
    );

    const articleRows = await mapWithConcurrency(
      articleSeeds,
      ARTICLE_CONCURRENCY,
      async (articleSeed) => {
        const articleHtml = await fetchHtml(articleSeed.url);
        return parseArticlePage(articleHtml, articleSeed);
      },
    );

    let changedArticles = 0;
    for (const row of articleRows) {
      const previousHash = existingMap.get(row.external_article_id);
      if (!previousHash || previousHash !== row.content_hash) {
        changedArticles += 1;
      }
    }

    for (const batch of chunk(articleRows, 40)) {
      const { error: upsertError } = await supabase
        .from("atlas_ink_help_articles")
        .upsert(batch, { onConflict: "external_article_id" });

      if (upsertError) {
        throw upsertError;
      }
    }

    const { error: completeError } = await supabase
      .from("atlas_ink_help_sync_runs")
      .update({
        status: "completed",
        categories_discovered: categories.length,
        articles_discovered: articleSeeds.length,
        articles_upserted: articleRows.length,
        articles_changed: changedArticles,
        completed_at: new Date().toISOString(),
      })
      .eq("id", syncRun.id);

    if (completeError) {
      throw completeError;
    }

    console.log(
      JSON.stringify(
        {
          syncRunId: syncRun.id,
          categories: categories.length,
          articlesDiscovered: articleSeeds.length,
          articlesUpserted: articleRows.length,
          articlesChanged: changedArticles,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    await supabase
      .from("atlas_ink_help_sync_runs")
      .update({
        status: "failed",
        error_message: error instanceof Error ? error.message : String(error),
        completed_at: new Date().toISOString(),
      })
      .eq("id", syncRun.id);

    throw error;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
