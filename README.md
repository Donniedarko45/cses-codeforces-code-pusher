# CP Auto Sync Extension

Production-ready Manifest V3 browser extension that auto-detects accepted submissions on **Codeforces** and **CSES** and syncs them to GitHub.

## Tech Stack

- React + TypeScript + Vite
- Chrome Extension Manifest V3 (background service worker + content scripts)
- GitHub REST API integration
- Local-first storage with `chrome.storage`

## Implemented Product Scope

- GitHub authentication service abstraction + secure token storage wrapper
- Repository configuration + permission test support
- Accepted-submission detection for Codeforces and CSES
- Metadata extraction + platform adapter plugin interface
- Duplicate detection (submission ID + problem ID + filename)
- Queue-based sync with manual **Sync All Pending Solutions** action
- Sync history statuses: uploaded / pending / failed
- Auto README statistics update after uploads
- Dark-first dashboard UI with sections: Dashboard, Repositories, Settings, Sync History, Account, Statistics

## Project Structure

- `/extension`: Browser extension source
- `/docs`: HLD, LLD, architecture, setup, permissions, deployment, contributing

## Quick Start

```bash
cd /home/runner/work/cses-codeforces-code-pusher/cses-codeforces-code-pusher/extension
npm install
npm run test
npm run build
```

Then load `/extension/dist` as an unpacked extension in Chrome.

## Important Setup

Update OAuth client id in:

- `/home/runner/work/cses-codeforces-code-pusher/cses-codeforces-code-pusher/extension/src/manifest.ts`
- `/home/runner/work/cses-codeforces-code-pusher/cses-codeforces-code-pusher/extension/src/services/github/githubAuthService.ts`

Connect from the extension:

- Open the extension popup and use the "Connect GitHub" button on the Dashboard to authenticate. You can either paste a Personal Access Token (recommended for local-first workflows) or attempt an OAuth flow if you have a backend configured to exchange codes securely.

## Documentation Index

- [Architecture (HLD + LLD)](/docs/ARCHITECTURE.md)
- [Installation Guide](/docs/INSTALLATION.md)
- [Developer Guide](/docs/DEVELOPER_GUIDE.md)
- [Extension Permissions Explanation](/docs/PERMISSIONS.md)
- [Deployment Guide](/docs/DEPLOYMENT.md)
- [Contributing Guide](/docs/CONTRIBUTING.md)
