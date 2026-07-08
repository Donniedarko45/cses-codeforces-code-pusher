import { defineManifest } from "@crxjs/vite-plugin";

export default defineManifest({
  manifest_version: 3,
  name: "CP Auto Sync",
  description:
    "Automatically sync accepted Codeforces and CSES submissions to GitHub.",
  version: "0.1.0",
  action: {
    default_popup: "index.html",
    default_title: "CP Auto Sync",
  },
  permissions: ["storage", "identity", "alarms", "notifications", "scripting"],
  host_permissions: [
    "https://codeforces.com/*",
    "https://cses.fi/*",
    "https://api.github.com/*",
    "https://github.com/*",
  ],
  background: {
    service_worker: "src/background/background.ts",
    type: "module",
  },
  content_scripts: [
    {
      matches: ["https://codeforces.com/*", "https://cses.fi/*"],
      js: ["src/content/contentScript.ts"],
      run_at: "document_idle",
    },
  ],
});
