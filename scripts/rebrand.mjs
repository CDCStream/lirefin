// One-shot rebrand script: rename user-facing strings from "FNI" /
// "Financial News Interpreter" to "Lirefin". Internal package names
// (@fni/*) are intentionally left unchanged — renaming them touches
// every import in the monorepo for no user-visible benefit.

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");

const edits = [
  // ----- i18n: app name in every locale -----
  {
    file: "packages/extension/src/lib/i18n.ts",
    replacements: [
      [/appName: "Financial News Interpreter"/g, 'appName: "Lirefin"'],
      [/appName: "Finansal Haber Yorumlayıcı"/g, 'appName: "Lirefin"'],
    ],
  },
  // ----- HTML <title> tags -----
  {
    file: "packages/extension/src/sidepanel/index.html",
    replacements: [[/FNI · Side Panel/g, "Lirefin · Side Panel"]],
  },
  {
    file: "packages/extension/src/options/index.html",
    replacements: [[/FNI · Settings/g, "Lirefin · Settings"]],
  },
  {
    file: "packages/extension/src/popup/index.html",
    replacements: [[/<title>FNI<\/title>/g, "<title>Lirefin</title>"]],
  },
  // ----- Content-script FAB brand chip -----
  {
    file: "packages/extension/src/content/index.ts",
    replacements: [[/<span>FNI<\/span>/g, "<span>lirefin</span>"]],
  },
  // ----- Background service worker user-facing strings -----
  {
    file: "packages/extension/src/background/service-worker.ts",
    replacements: [
      [/Analyze selection with FNI/g, "Analyze selection with Lirefin"],
      [/Pick text to analyze with FNI/g, "Pick text to analyze with Lirefin"],
      [
        /right-click → 'Analyze selection with FNI'/g,
        "right-click → 'Analyze selection with Lirefin'",
      ],
      [/\[FNI\]/g, "[Lirefin]"],
    ],
  },
  {
    file: "packages/extension/src/lib/supabase.ts",
    replacements: [[/\[FNI\]/g, "[Lirefin]"]],
  },
];

let totalChanges = 0;

for (const { file, replacements } of edits) {
  const path = resolve(ROOT, file);
  let body = readFileSync(path, "utf8");
  let fileChanges = 0;
  for (const [pattern, replacement] of replacements) {
    const matches = body.match(pattern)?.length ?? 0;
    body = body.replace(pattern, replacement);
    fileChanges += matches;
  }
  if (fileChanges > 0) {
    writeFileSync(path, body);
    console.log(`✓ ${file}  (${fileChanges} change${fileChanges > 1 ? "s" : ""})`);
    totalChanges += fileChanges;
  } else {
    console.log(`· ${file}  (no changes)`);
  }
}

console.log(`\nTotal edits: ${totalChanges}`);
