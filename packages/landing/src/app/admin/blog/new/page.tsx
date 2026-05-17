"use client";

import { useState } from "react";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120)
    .replace(/^-|-$/g, "");
}

export default function AdminBlogNewPage() {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [image, setImage] = useState("");
  const [author, setAuthor] = useState("Lirefin");
  const [tags, setTags] = useState("");
  const [status, setStatus] = useState("published");
  const [secret, setSecret] = useState("");
  const [message, setMessage] = useState("");
  const [tab, setTab] = useState<"edit" | "preview">("edit");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("Saving...");

    const res = await fetch("/api/blog/save", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-secret": secret,
      },
      body: JSON.stringify({
        title,
        slug: slug || slugify(title),
        description,
        content,
        image,
        author,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        status,
      }),
    });

    const data = await res.json();
    if (res.ok) {
      setMessage(`Saved: /blog/${data.slug} (${data.status})`);
    } else {
      setMessage(`Error: ${data.error}`);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="text-2xl font-bold">Blog Editor</h1>

      <div className="mt-6 flex gap-4 border-b border-border pb-2">
        <button
          onClick={() => setTab("edit")}
          className={`text-sm font-medium ${tab === "edit" ? "text-navy-800 dark:text-white" : "text-muted-foreground"}`}
        >
          Edit
        </button>
        <button
          onClick={() => setTab("preview")}
          className={`text-sm font-medium ${tab === "preview" ? "text-navy-800 dark:text-white" : "text-muted-foreground"}`}
        >
          Preview
        </button>
      </div>

      {tab === "preview" ? (
        <div className="mt-6">
          <h2 className="text-2xl font-bold">{title || "Untitled"}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
          <div
            className="blog-content mt-6"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium">Title *</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                required
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">Slug</span>
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder={slugify(title) || "auto-generated"}
                className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-medium">Description</span>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium">Content (HTML) *</span>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={16}
              className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-sm"
              required
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block">
              <span className="text-sm font-medium">Image URL</span>
              <input
                value={image}
                onChange={(e) => setImage(e.target.value)}
                className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">Author</span>
              <input
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">Tags (comma-separated)</span>
              <input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium">Status</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium">Admin Secret</span>
              <input
                type="password"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </label>
          </div>

          <button
            type="submit"
            className="rounded-md bg-navy-800 px-4 py-2 text-sm font-medium text-white hover:bg-navy-900 dark:bg-white dark:text-navy-900"
          >
            Save Post
          </button>

          {message && (
            <p className="mt-2 text-sm text-muted-foreground">{message}</p>
          )}
        </form>
      )}
    </div>
  );
}
