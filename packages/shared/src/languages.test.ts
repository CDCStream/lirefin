import { describe, expect, it } from "vitest";
import {
  SUPPORTED_LANGUAGES,
  SUPPORTED_LANGUAGE_CODES,
  defaultLanguageFromBrowser,
  getLanguageEnglishName,
  isSupportedLanguage,
} from "./languages";

describe("supported languages list", () => {
  it("has 13 entries with unique codes", () => {
    expect(SUPPORTED_LANGUAGES.length).toBe(13);
    const codes = SUPPORTED_LANGUAGES.map((l) => l.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("SUPPORTED_LANGUAGE_CODES mirrors SUPPORTED_LANGUAGES", () => {
    expect(SUPPORTED_LANGUAGE_CODES).toEqual(
      SUPPORTED_LANGUAGES.map((l) => l.code),
    );
  });
});

describe("isSupportedLanguage", () => {
  it("returns true for known codes", () => {
    expect(isSupportedLanguage("tr")).toBe(true);
    expect(isSupportedLanguage("en")).toBe(true);
    expect(isSupportedLanguage("ja")).toBe(true);
  });

  it("returns false for unknown codes", () => {
    expect(isSupportedLanguage("xx")).toBe(false);
    expect(isSupportedLanguage("")).toBe(false);
  });
});

describe("getLanguageEnglishName", () => {
  it("returns the English label for known codes", () => {
    expect(getLanguageEnglishName("tr")).toBe("Turkish");
    expect(getLanguageEnglishName("ja")).toBe("Japanese");
  });
});

describe("defaultLanguageFromBrowser", () => {
  it("falls back to 'en' when undefined", () => {
    expect(defaultLanguageFromBrowser(undefined)).toBe("en");
  });

  it("strips region tag and matches the short code", () => {
    expect(defaultLanguageFromBrowser("tr-TR")).toBe("tr");
    expect(defaultLanguageFromBrowser("en-US")).toBe("en");
    expect(defaultLanguageFromBrowser("DE")).toBe("de");
  });

  it("falls back to 'en' for unknown short codes", () => {
    expect(defaultLanguageFromBrowser("xx-XX")).toBe("en");
  });
});
