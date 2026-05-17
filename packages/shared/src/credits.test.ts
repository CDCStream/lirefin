import { describe, expect, it } from "vitest";
import {
  CREDIT_PACKAGES,
  CREDIT_PRICE_USD,
  SIGNUP_BONUS_CREDITS,
  creditsForUsage,
  estimateCredits,
  getPackage,
} from "./credits";

describe("creditsForUsage", () => {
  it("rounds input tokens up per 1k and weighs output 5x", () => {
    // 1500 input -> ceil(1.5) = 2 input credits
    // 800 output -> ceil(0.8) = 1 -> *5 = 5 output credits
    expect(creditsForUsage({ inputTokens: 1500, outputTokens: 800 })).toBe(7);
  });

  it("never returns less than 1 credit even for empty calls", () => {
    expect(creditsForUsage({ inputTokens: 0, outputTokens: 0 })).toBe(1);
  });

  it("clamps negative values to 0 (then minimum 1)", () => {
    expect(creditsForUsage({ inputTokens: -10, outputTokens: -10 })).toBe(1);
  });

  it("treats exactly 1000 input tokens as 1 credit", () => {
    expect(creditsForUsage({ inputTokens: 1000, outputTokens: 0 })).toBe(1);
  });

  it("treats exactly 1001 input tokens as 2 credits (ceil)", () => {
    expect(creditsForUsage({ inputTokens: 1001, outputTokens: 0 })).toBe(2);
  });

  it("output dominates the bill by design (5x multiplier)", () => {
    // 0 input + 200 output -> 1 * 5 = 5 credits
    expect(creditsForUsage({ inputTokens: 0, outputTokens: 200 })).toBe(5);
  });
});

describe("estimateCredits", () => {
  it("scales with both word count and asset count", () => {
    const small = estimateCredits(100, 1);
    const large = estimateCredits(2000, 10);
    expect(large).toBeGreaterThan(small);
  });

  it("clamps assets to a minimum of 1", () => {
    // 0 assets is non-sensical, but the helper must still return a finite number
    expect(estimateCredits(500, 0)).toBeGreaterThan(0);
    expect(estimateCredits(500, 0)).toBe(estimateCredits(500, 1));
  });

  it("clamps negative words to 0", () => {
    expect(estimateCredits(-50, 3)).toBe(estimateCredits(0, 3));
  });

  it("returns at least 1 credit for tiny inputs", () => {
    expect(estimateCredits(0, 1)).toBeGreaterThanOrEqual(1);
  });
});

describe("CREDIT_PACKAGES", () => {
  it("contains the five canonical packages in ascending price order", () => {
    expect(CREDIT_PACKAGES.map((p) => p.id)).toEqual([
      "starter",
      "standard",
      "pro",
      "power",
      "unlimited",
    ]);
    const usds = CREDIT_PACKAGES.map((p) => p.usd);
    expect([...usds].sort((a, b) => a - b)).toEqual(usds);
  });

  it("each package gives more credits per dollar than the starter (or equal for starter)", () => {
    const starter = CREDIT_PACKAGES[0]!;
    const baseRate = starter.credits / starter.usd;
    for (const p of CREDIT_PACKAGES) {
      const rate = p.credits / p.usd;
      // Bigger packs must be at least as good as starter
      expect(rate).toBeGreaterThanOrEqual(baseRate - 0.0001);
    }
  });

  it("only the unlimited pack has the unlimited flag", () => {
    const flagged = CREDIT_PACKAGES.filter((p) => p.unlimited === true).map(
      (p) => p.id,
    );
    expect(flagged).toEqual(["unlimited"]);
  });

  it("polarProductEnv keys match a strict naming scheme", () => {
    for (const p of CREDIT_PACKAGES) {
      expect(p.polarProductEnv).toMatch(/^POLAR_PRODUCT_[A-Z]+$/);
    }
  });

  it("each package exposes customer-facing descriptions", () => {
    for (const p of CREDIT_PACKAGES) {
      expect(p.description.trim().length).toBeGreaterThan(20);
      expect(p.longDescription.trim().length).toBeGreaterThan(60);
    }
  });
});

describe("getPackage", () => {
  it("returns the matching package for a known id", () => {
    expect(getPackage("pro")?.usd).toBe(25);
  });

  it("returns undefined for an unknown id", () => {
    expect(getPackage("nope")).toBeUndefined();
  });
});

describe("constants", () => {
  it("CREDIT_PRICE_USD is the documented sale price", () => {
    expect(CREDIT_PRICE_USD).toBeCloseTo(0.015);
  });

  it("SIGNUP_BONUS_CREDITS is positive", () => {
    expect(SIGNUP_BONUS_CREDITS).toBeGreaterThan(0);
  });
});
