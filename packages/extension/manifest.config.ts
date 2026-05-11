import { defineManifest } from "@crxjs/vite-plugin";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? "";
const BACKEND_URL = process.env.VITE_BACKEND_URL ?? "http://localhost:8787";

const extraHosts: string[] = [];
if (SUPABASE_URL) extraHosts.push(`${SUPABASE_URL.replace(/\/$/, "")}/*`);
if (BACKEND_URL) extraHosts.push(`${BACKEND_URL.replace(/\/$/, "")}/*`);

export default defineManifest({
  manifest_version: 3,
  name: "Lirefin — AI Financial News & Articles Interpreter",
  short_name: "Lirefin",
  version: "0.1.6",
  description:
    "AI summarizer that labels financial news as bullish, neutral, or bearish for assets in your portfolio. Powered by Claude.",
  icons: {
    "16": "icons/icon-16.png",
    "32": "icons/icon-32.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png",
  },
  action: {
    default_title: "Lirefin — Analyze this article",
    default_popup: "src/popup/index.html",
    default_icon: {
      "16": "icons/icon-16.png",
      "32": "icons/icon-32.png",
    },
  },
  background: {
    service_worker: "src/background/service-worker.ts",
    type: "module",
  },
  side_panel: {
    default_path: "src/sidepanel/index.html",
  },
  options_page: "src/options/index.html",
  permissions: [
    "storage",
    "sidePanel",
    "scripting",
    "contextMenus",
    "identity",
  ],
  host_permissions: [
    "<all_urls>",
    "https://accounts.google.com/*",
    "https://*.supabase.co/*",
    ...extraHosts,
  ],
  content_scripts: [
    {
      matches: ["http://*/*", "https://*/*"],
      exclude_matches: [
        "*://*.google.com/*",
        "*://*.google.com.tr/*",
        "*://mail.google.com/*",
        "*://*.gmail.com/*",
        "*://*.youtube.com/*",
        "*://*.facebook.com/*",
        "*://*.instagram.com/*",
        "*://*.twitter.com/*",
        "*://*.x.com/*",
        "*://*.linkedin.com/*",
        "*://*.tiktok.com/*",
        "*://*.whatsapp.com/*",
        "*://web.whatsapp.com/*",
        "*://*.telegram.org/*",
        "*://*.discord.com/*",
        "*://*.discordapp.com/*",
        "*://*.reddit.com/*",
        "*://*.amazon.com/*",
        "*://*.amazon.com.tr/*",
        "*://*.amazon.de/*",
        "*://*.ebay.com/*",
        "*://*.netflix.com/*",
        "*://*.spotify.com/*",
        "*://*.github.com/*",
        "*://*.gitlab.com/*",
        "*://*.bitbucket.org/*",
        "*://*.stackoverflow.com/*",
        "*://*.notion.so/*",
        "*://*.slack.com/*",
        "*://*.zoom.us/*",
        "*://*.dropbox.com/*",
        "*://*.onedrive.live.com/*",
        "*://*.live.com/*",
        "*://*.microsoft.com/*",
        "*://*.office.com/*",
        "*://*.office365.com/*",
        "*://*.outlook.com/*",
        "*://*.apple.com/*",
        "*://*.icloud.com/*",
        "*://*.paypal.com/*",
      ],
      js: ["src/content/index.ts"],
      run_at: "document_idle",
    },
  ],
  web_accessible_resources: [
    {
      resources: ["icons/*.png"],
      matches: ["<all_urls>"],
    },
  ],
});
