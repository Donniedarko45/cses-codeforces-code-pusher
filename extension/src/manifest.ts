import { defineManifest } from '@crxjs/vite-plugin'

export default defineManifest({
  manifest_version: 3,
  name: 'CP Auto Sync',
  description:
    'Automatically sync accepted Codeforces and CSES submissions to GitHub.',
  version: '0.1.0',
  action: {
    default_popup: 'index.html',
    default_title: 'CP Auto Sync',
  },
  permissions: ['storage', 'identity', 'alarms', 'notifications', 'scripting'],
  host_permissions: [
    'https://codeforces.com/*',
    'https://cses.fi/*',
    'https://api.github.com/*',
  ],
  oauth2: {
    client_id: 'REPLACE_WITH_GITHUB_OAUTH_APP_CLIENT_ID',
    scopes: ['repo', 'read:user'],
  },
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  content_scripts: [
    {
      matches: ['https://codeforces.com/*', 'https://cses.fi/*'],
      js: ['src/content/index.ts'],
      run_at: 'document_idle',
    },
  ],
})
