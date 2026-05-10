export const REGIONS = ["us", "eu", "asia", "global"] as const;
export type Region = (typeof REGIONS)[number];

/**
 * Mapping of regions to Finnhub exchange codes.
 * Reference: https://finnhub.io/docs/api/stock-symbols
 */
export const REGION_EXCHANGES: Record<Region, string[]> = {
  us: ["US"],
  eu: ["L", "DE", "PA", "AS", "SW", "MI", "MC", "BR", "VI", "ST", "OL", "HE", "CO", "IS"],
  asia: ["T", "HK", "SS", "SZ", "KS", "KQ", "TW", "BO", "NS", "SI"],
  global: [],
};

export function regionFromExchange(exchange: string | undefined | null): Region {
  if (!exchange) return "global";
  const upper = exchange.toUpperCase();
  for (const region of ["us", "eu", "asia"] as const) {
    if (REGION_EXCHANGES[region].includes(upper)) return region;
  }
  return "global";
}
