export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  content: string;
  author: string;
  image: string;
  tags: string[];
  publishedAt: string;
  updatedAt: string;
  readingTime: number;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function calcReadingTime(html: string): number {
  const words = stripHtml(html).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

export function parseBlogPost(row: Record<string, unknown>): BlogPost {
  const content = (row.content as string) || "";
  return {
    slug: (row.slug as string) || "",
    title: (row.title as string) || "",
    description: (row.description as string) || "",
    content,
    author: (row.author as string) || "Outrank",
    image: (row.image as string) || "",
    tags: (row.tags as string[]) || [],
    publishedAt: (row.published_at as string) || new Date().toISOString(),
    updatedAt: (row.updated_at as string) || new Date().toISOString(),
    readingTime: calcReadingTime(content),
  };
}
