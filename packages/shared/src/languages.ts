export const SUPPORTED_LANGUAGES = [
  { code: "tr", name: "Türkçe", englishName: "Turkish" },
  { code: "en", name: "English", englishName: "English" },
  { code: "de", name: "Deutsch", englishName: "German" },
  { code: "fr", name: "Français", englishName: "French" },
  { code: "es", name: "Español", englishName: "Spanish" },
  { code: "it", name: "Italiano", englishName: "Italian" },
  { code: "pt", name: "Português", englishName: "Portuguese" },
  { code: "nl", name: "Nederlands", englishName: "Dutch" },
  { code: "ja", name: "日本語", englishName: "Japanese" },
  { code: "zh", name: "中文", englishName: "Chinese" },
  { code: "ko", name: "한국어", englishName: "Korean" },
  { code: "ar", name: "العربية", englishName: "Arabic" },
  { code: "ru", name: "Русский", englishName: "Russian" },
] as const;

export type SupportedLanguageCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];

export const SUPPORTED_LANGUAGE_CODES = SUPPORTED_LANGUAGES.map(
  (l) => l.code,
) as SupportedLanguageCode[];

export function isSupportedLanguage(code: string): code is SupportedLanguageCode {
  return (SUPPORTED_LANGUAGE_CODES as string[]).includes(code);
}

export function getLanguageEnglishName(code: SupportedLanguageCode): string {
  return SUPPORTED_LANGUAGES.find((l) => l.code === code)?.englishName ?? "English";
}

export function defaultLanguageFromBrowser(navigatorLanguage?: string): SupportedLanguageCode {
  if (!navigatorLanguage) return "en";
  const short = navigatorLanguage.toLowerCase().split("-")[0];
  return short && isSupportedLanguage(short) ? short : "en";
}
