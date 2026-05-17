import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120)
    .replace(/^-|-$/g, "");
}

function extractArticles(payload: Record<string, unknown>): Record<string, unknown>[] {
  if (Array.isArray(payload.articles)) return payload.articles;
  if (payload.data && Array.isArray((payload.data as Record<string, unknown>).articles))
    return (payload.data as Record<string, unknown>).articles as Record<string, unknown>[];
  if (payload.article && typeof payload.article === "object")
    return [payload.article as Record<string, unknown>];
  if (payload.data && typeof (payload.data as Record<string, unknown>).article === "object")
    return [(payload.data as Record<string, unknown>).article as Record<string, unknown>];
  if (payload.title) return [payload];
  return [];
}

function pickField(obj: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    if (obj[k] && typeof obj[k] === "string") return obj[k] as string;
  }
  return "";
}

async function pingSitemaps(siteUrl: string) {
  const sitemapUrl = `${siteUrl}/sitemap.xml`;
  const urls = [
    `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`,
    `https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`,
  ];
  await Promise.allSettled(urls.map((u) => fetch(u, { method: "GET" })));
}

export async function POST(req: NextRequest) {
  const secret = process.env.OUTRANK_WEBHOOK_SECRET;
  if (secret) {
    const sig = req.headers.get("x-webhook-signature") || "";
    const auth = req.headers.get("authorization") || "";
    if (sig !== secret && auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const articles = extractArticles(payload);
  if (articles.length === 0) {
    return NextResponse.json({ error: "No articles found in payload" }, { status: 400 });
  }

  const results: { slug: string; status: string }[] = [];
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://lirefin.com";

  for (const article of articles) {
    const title = pickField(article, "title", "name", "headline");
    if (!title) continue;

    const content = pickField(article, "content_html", "content", "html", "body", "text");
    const slug = pickField(article, "slug", "url_slug") || slugify(title);
    const description = pickField(article, "description", "excerpt", "summary", "meta_description");
    const image = pickField(article, "image", "featured_image", "thumbnail", "cover_image", "og_image");
    const author = pickField(article, "author", "author_name") || "Outrank";
    const status = content ? "published" : "draft";

    let tags: string[] = [];
    if (Array.isArray(article.tags)) {
      tags = article.tags.map((t: unknown) =>
        typeof t === "string" ? t : (t as Record<string, string>)?.name || ""
      ).filter(Boolean);
    } else if (typeof article.tags === "string") {
      tags = (article.tags as string).split(",").map((t) => t.trim()).filter(Boolean);
    }

    const row = {
      slug,
      title,
      content,
      description,
      image,
      author,
      status,
      tags,
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("blog_posts")
      .upsert(row, { onConflict: "slug" });

    if (error) {
      results.push({ slug, status: `error: ${error.message}` });
    } else {
      results.push({ slug, status });
      if (status === "published") {
        await pingSitemaps(siteUrl);
      }
    }
  }

  return NextResponse.json({ ok: true, processed: results.length, results });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const challenge = searchParams.get("challenge") || searchParams.get("hub.challenge");
  if (challenge) {
    return new NextResponse(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  return NextResponse.json({
    status: "active",
    endpoint: "/api/outrank/webhook",
    method: "POST",
  });
}
