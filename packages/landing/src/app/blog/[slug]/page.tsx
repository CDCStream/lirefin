import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getSupabase } from "@/lib/supabase";
import { parseBlogPost } from "@/lib/blog-parser";

export const revalidate = 60;

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://lirefin.com";

interface Props {
  params: Promise<{ slug: string }>;
}

async function getPost(slug: string) {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  return data ? parseBlogPost(data) : null;
}

export async function generateStaticParams() {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data } = await supabase
    .from("blog_posts")
    .select("slug")
    .eq("status", "published");

  return (data || []).map((row) => ({ slug: row.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: "Post Not Found" };

  return {
    title: post.title,
    description: post.description || post.title,
    openGraph: {
      type: "article",
      title: post.title,
      description: post.description || post.title,
      url: `${siteUrl}/blog/${post.slug}`,
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      authors: [post.author],
      ...(post.image && { images: [{ url: post.image, width: 1200, height: 630 }] }),
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description || post.title,
      ...(post.image && { images: [post.image] }),
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        headline: post.title,
        description: post.description,
        image: post.image || undefined,
        author: { "@type": "Person", name: post.author },
        datePublished: post.publishedAt,
        dateModified: post.updatedAt,
        publisher: {
          "@type": "Organization",
          name: "Lirefin",
          url: siteUrl,
        },
        mainEntityOfPage: `${siteUrl}/blog/${post.slug}`,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
          { "@type": "ListItem", position: 2, name: "Blog", item: `${siteUrl}/blog` },
          { "@type": "ListItem", position: 3, name: post.title, item: `${siteUrl}/blog/${post.slug}` },
        ],
      },
    ],
  };

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-3xl px-6 py-16">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        <nav className="mb-8 text-sm text-muted-foreground">
          <Link href="/blog" className="hover:text-navy-700 dark:hover:text-navy-200">
            ← Back to Blog
          </Link>
        </nav>

        <article>
          <header className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {post.title}
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span>{post.author}</span>
              <span>·</span>
              <time dateTime={post.publishedAt}>
                {new Date(post.publishedAt).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </time>
              <span>·</span>
              <span>{post.readingTime} min read</span>
            </div>
            {post.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </header>

          {post.image && (
            <div className="relative mb-10 aspect-video w-full overflow-hidden rounded-xl">
              <Image
                src={post.image}
                alt={post.title}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 768px) 100vw, 768px"
              />
            </div>
          )}

          <div
            className="blog-content"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        </article>
      </main>
      <Footer />
    </>
  );
}
