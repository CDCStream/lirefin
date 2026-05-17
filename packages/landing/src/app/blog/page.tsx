import Link from "next/link";
import Image from "next/image";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getSupabase } from "@/lib/supabase";
import { parseBlogPost } from "@/lib/blog-parser";
import type { Metadata } from "next";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Financial news analysis tips, AI investing insights, and product updates from the Lirefin team.",
};

async function getPosts() {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  return (data || []).map((row) => parseBlogPost(row));
}

export default async function BlogPage() {
  const posts = await getPosts();

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-6xl px-6 py-16">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Blog</h1>
        <p className="mt-2 text-muted-foreground">
          Financial news analysis tips, AI insights, and product updates.
        </p>

        {posts.length === 0 ? (
          <div className="mt-16 text-center text-muted-foreground">
            <p>No posts yet. Check back soon!</p>
          </div>
        ) : (
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-lg"
              >
                {post.image && (
                  <div className="relative aspect-video w-full overflow-hidden bg-muted">
                    <Image
                      src={post.image}
                      alt={post.title}
                      fill
                      className="object-cover transition-transform group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  </div>
                )}
                <div className="flex flex-1 flex-col p-5">
                  <h2 className="text-lg font-semibold leading-snug text-card-foreground group-hover:text-navy-600 dark:group-hover:text-navy-200">
                    {post.title}
                  </h2>
                  {post.description && (
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                      {post.description}
                    </p>
                  )}
                  <div className="mt-auto flex items-center gap-3 pt-4 text-xs text-muted-foreground">
                    <span>{post.author}</span>
                    <span>·</span>
                    <time dateTime={post.publishedAt}>
                      {new Date(post.publishedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </time>
                    <span>·</span>
                    <span>{post.readingTime} min read</span>
                  </div>
                  {post.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {post.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
