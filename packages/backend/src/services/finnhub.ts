import { request } from "undici";
import { regionFromExchange, type Region, type TickerSearchResult } from "@fni/shared";
import { config } from "../config.js";

const FINNHUB_BASE = "https://finnhub.io/api/v1";

interface FinnhubSearchResponse {
  count: number;
  result: Array<{
    description: string;
    displaySymbol: string;
    symbol: string;
    type: string;
  }>;
}

interface FinnhubProfile {
  country?: string;
  currency?: string;
  exchange?: string;
  name?: string;
  ticker?: string;
  finnhubIndustry?: string;
  logo?: string;
}

interface FinnhubQuote {
  c: number;
  d: number | null;
  dp: number | null;
  h: number;
  l: number;
  o: number;
  pc: number;
  t: number;
}

function parseExchangeFromSymbol(symbol: string): string {
  const dot = symbol.lastIndexOf(".");
  if (dot === -1) return "US";
  return symbol.slice(dot + 1).toUpperCase();
}

export async function searchTickers(
  q: string,
  region: Region | undefined,
  limit: number,
): Promise<TickerSearchResult[]> {
  const url = new URL(`${FINNHUB_BASE}/search`);
  url.searchParams.set("q", q);
  url.searchParams.set("token", config.finnhubApiKey);

  const res = await request(url.toString(), { method: "GET" });
  if (res.statusCode >= 400) {
    const body = await res.body.text();
    throw Object.assign(new Error(`Finnhub search failed: ${body}`), {
      statusCode: res.statusCode,
    });
  }
  const data = (await res.body.json()) as FinnhubSearchResponse;

  const mapped: TickerSearchResult[] = (data.result ?? []).map((r) => {
    const exchange = parseExchangeFromSymbol(r.symbol);
    return {
      symbol: r.symbol,
      displaySymbol: r.displaySymbol,
      description: r.description,
      type: r.type,
      exchange,
      region: regionFromExchange(exchange),
    };
  });

  const filtered =
    region && region !== "global"
      ? mapped.filter((m) => m.region === region)
      : mapped;

  return filtered.slice(0, limit);
}

export async function getProfile(symbol: string): Promise<FinnhubProfile | null> {
  const url = new URL(`${FINNHUB_BASE}/stock/profile2`);
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("token", config.finnhubApiKey);

  const res = await request(url.toString(), { method: "GET" });
  if (res.statusCode >= 400) return null;
  const data = (await res.body.json()) as FinnhubProfile;
  if (!data || Object.keys(data).length === 0) return null;
  return data;
}

export async function getQuote(symbol: string): Promise<FinnhubQuote | null> {
  const url = new URL(`${FINNHUB_BASE}/quote`);
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("token", config.finnhubApiKey);

  const res = await request(url.toString(), { method: "GET" });
  if (res.statusCode >= 400) return null;
  const data = (await res.body.json()) as FinnhubQuote;
  if (!data || typeof data.c !== "number") return null;
  return data;
}
