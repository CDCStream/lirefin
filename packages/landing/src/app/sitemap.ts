import type { MetadataRoute } from "next";
import { getSupabase } from "@/lib/supabase";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://lirefin.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${siteUrl}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteUrl}/blog`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/privacy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.4,
    },
    {
      url: `${siteUrl}/terms`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.4,
    },
    {
      url: `${siteUrl}/refund`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.4,
    },
    {
      url: `${siteUrl}/contact`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.4,
    },
  ];

  let blogPages: MetadataRoute.Sitemap = [];
  const supabase = getSupabase();
  if (supabase) {
    const { data } = await supabase
      .from("blog_posts")
      .select("slug, updated_at")
      .eq("status", "published");

    if (data) {
      blogPages = data.map((row) => ({
        url: `${siteUrl}/blog/${row.slug}`,
        lastModified: new Date(row.updated_at),
        changeFrequency: "monthly" as const,
        priority: 0.7,
      }));
    }
  }

  return [...staticPages, ...blogPages];
}
