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

async function pingSitemaps(siteUrl: string) {
  const sitemapUrl = `${siteUrl}/sitemap.xml`;
  const urls = [
    `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`,
    `https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`,
  ];
  await Promise.allSettled(urls.map((u) => fetch(u, { method: "GET" })));
}

export async function POST(req: NextRequest) {
  const adminSecret = process.env.BLOG_ADMIN_SECRET;
  if (adminSecret) {
    const header = req.headers.get("x-admin-secret") || "";
    if (header !== adminSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const title = body.title as string;
  const content = body.content as string;
  const slug = (body.slug as string) || slugify(title || "");

  if (!slug || !title || !content) {
    return NextResponse.json(
      { error: "slug, title, and content are required" },
      { status: 400 }
    );
  }

  const row = {
    slug,
    title,
    content,
    description: (body.description as string) || "",
    image: (body.image as string) || "",
    author: (body.author as string) || "Lirefin",
    status: (body.status as string) || "published",
    tags: Array.isArray(body.tags) ? body.tags : [],
    published_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("blog_posts")
    .upsert(row, { onConflict: "slug" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (row.status === "published") {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://lirefin.com";
    await pingSitemaps(siteUrl);
  }

  return NextResponse.json({ ok: true, slug: row.slug, status: row.status });
}
