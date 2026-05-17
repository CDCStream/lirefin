export const SITE = {
  name: "Lirefin",
  url: "https://lirefin.com",
  description:
    "AI Chrome extension that reads financial news and tells you what it means for your portfolio.",
  email: "hello@lirefin.com",
  supportEmail: "support@lirefin.com",
  legalEmail: "legal@lirefin.com",
  webStoreUrl:
    "https://chromewebstore.google.com/detail/lirefin-%E2%80%94-ai-financial-ne/elpiafniahnjnmoodadceifmapnclpjj",
  github: "https://github.com/CDCStream/lirefin",
} as const;

export const NAV_LINKS = [
  { href: "/#features", label: "Features" },
  { href: "/#gallery", label: "Screenshots" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" },
] as const;

export const FOOTER_LINKS = {
  product: [
    { href: "/#features", label: "Features" },
    { href: "/#gallery", label: "Screenshots" },
    { href: "/#pricing", label: "Pricing" },
    { href: "/#faq", label: "FAQ" },
  ],
  legal: [
    { href: "/privacy", label: "Privacy Policy" },
    { href: "/terms", label: "Terms of Service" },
    { href: "/refund", label: "Refund Policy" },
    { href: "/contact", label: "Contact" },
  ],
} as const;

export const SUPPORTED_LANGUAGES = [
  "English",
  "Türkçe",
  "Deutsch",
  "Français",
  "Español",
  "Italiano",
  "Português",
  "Nederlands",
  "日本語",
  "中文",
  "한국어",
  "العربية",
  "Русский",
] as const;

export const SUPPORTED_NEWS_SITES = [
  "Reuters",
  "Bloomberg",
  "CNBC",
  "Wall Street Journal",
  "Financial Times",
  "MarketWatch",
  "Yahoo Finance",
  "Seeking Alpha",
  "Investing.com",
  "Barron's",
  "Forbes",
  "The Motley Fool",
  "Benzinga",
  "ZeroHedge",
  "Investopedia",
] as const;
