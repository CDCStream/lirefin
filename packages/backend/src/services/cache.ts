import { createHash } from "node:crypto";

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class TtlCache<T> {
  private store = new Map<string, CacheEntry<T>>();
  private maxEntries: number;

  constructor(maxEntries = 500) {
    this.maxEntries = maxEntries;
  }

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T, ttlSeconds: number): void {
    if (this.store.size >= this.maxEntries) {
      const firstKey = this.store.keys().next().value;
      if (firstKey !== undefined) this.store.delete(firstKey);
    }
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  clear(): void {
    this.store.clear();
  }
}

export const analyzeCache = new TtlCache<unknown>(500);

export function buildAnalyzeCacheKey(input: {
  url: string;
  outputLanguage: string;
  portfolio: Array<{ symbol: string; exchange: string }>;
  articleHash: string;
}): string {
  const portfolioKey = input.portfolio
    .map((p) => `${p.symbol}@${p.exchange}`)
    .sort()
    .join(",");
  const raw = `${input.url}|${input.outputLanguage}|${portfolioKey}|${input.articleHash}`;
  return createHash("sha256").update(raw).digest("hex");
}

export function hashArticle(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}
