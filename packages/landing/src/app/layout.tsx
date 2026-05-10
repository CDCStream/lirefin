import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://lirefin.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Lirefin — AI Financial News Interpreter for Chrome",
    template: "%s · Lirefin",
  },
  description:
    "Lirefin reads any financial news article in your browser and tells you what it means for the assets in your portfolio — bullish, neutral, or bearish — with cited reasoning, powered by Claude.",
  keywords: [
    "financial news AI",
    "stock news summary",
    "AI portfolio analysis",
    "Chrome extension finance",
    "bullish bearish analysis",
    "Claude finance",
    "earnings news AI",
    "investing assistant",
  ],
  authors: [{ name: "Lirefin" }],
  creator: "Lirefin",
  publisher: "Lirefin",
  applicationName: "Lirefin",
  category: "finance",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "Lirefin",
    title: "Lirefin — AI Financial News Interpreter for Chrome",
    description:
      "AI explains all financial news — instantly. Lirefin is a Chrome extension that turns any financial news article into a portfolio-aware bullish, neutral, or bearish breakdown with cited reasoning.",
    images: [
      {
        url: "/lirefin-banner.png",
        width: 1200,
        height: 630,
        alt: "Lirefin — AI explains all financial news, instantly.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Lirefin — AI Financial News Interpreter",
    description:
      "AI Chrome extension that reads financial news and tells you what it means for your portfolio.",
    images: ["/lirefin-banner.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: [
      { url: "/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-128.png", sizes: "128x128", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/icon-128.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#050507" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
