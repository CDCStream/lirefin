import { describe, expect, it } from "vitest";
import {
  REGION_EXCHANGES,
  REGIONS,
  regionFromExchange,
} from "./regions.js";

describe("regionFromExchange", () => {
  it("maps US exchange codes to 'us'", () => {
    expect(regionFromExchange("US")).toBe("us");
    expect(regionFromExchange("us")).toBe("us");
  });

  it("maps a sample of European exchange codes to 'eu'", () => {
    expect(regionFromExchange("L")).toBe("eu");
    expect(regionFromExchange("DE")).toBe("eu");
    expect(regionFromExchange("PA")).toBe("eu");
  });

  it("maps a sample of Asian exchange codes to 'asia'", () => {
    expect(regionFromExchange("T")).toBe("asia");
    expect(regionFromExchange("HK")).toBe("asia");
    expect(regionFromExchange("KS")).toBe("asia");
  });

  it("returns 'global' for unknown / null / empty inputs", () => {
    expect(regionFromExchange("ZZ")).toBe("global");
    expect(regionFromExchange(null)).toBe("global");
    expect(regionFromExchange(undefined)).toBe("global");
    expect(regionFromExchange("")).toBe("global");
  });
});

describe("REGIONS / REGION_EXCHANGES integrity", () => {
  it("every region (except 'global') has at least one exchange", () => {
    for (const region of REGIONS) {
      if (region === "global") continue;
      expect(REGION_EXCHANGES[region].length).toBeGreaterThan(0);
    }
  });

  it("no duplicate exchange across regions", () => {
    const seen = new Set<string>();
    for (const region of REGIONS) {
      for (const ex of REGION_EXCHANGES[region]) {
        expect(seen.has(ex)).toBe(false);
        seen.add(ex);
      }
    }
  });
});
