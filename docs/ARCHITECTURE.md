# Architecture (HLD + LLD)

## High-Level Design

### Components
1. **Popup App (React)**
   - Dashboard + settings + sync history + manual sync trigger.
2. **Background Service Worker**
   - Queue processing, GitHub uploads, alarm-driven retries.
3. **Content Scripts**
   - Detect accepted submissions in supported platforms.
4. **Platform Adapter Layer**
   - Plugin contract for each coding platform.
5. **Storage Layer**
   - Token, repo config, queue, settings, history.
6. **GitHub Service Layer**
   - Permission checks, file upload, commit messages.

## Low-Level Design

### Platform Adapter Contract
```ts
interface PlatformAdapter {
  platform: 'Codeforces' | 'CSES'
  detectAccepted(context: { url: string; html: string }): boolean
  extractCode(document: Document): string | null
  extractMetadata(document: Document, url: string): SubmissionMetadata | null
}
```

### Sync Queue Flow
1. Content script detects accepted verdict.
2. Extract metadata + source code.
3. Send `NEW_ACCEPTED_SUBMISSION` message.
4. Background deduplicates and enqueues.
5. Background pushes pending files to GitHub.
6. README stats regenerated and committed.

### Authentication Flow
1. Extension opens GitHub OAuth flow via `chrome.identity`.
2. User authorizes app.
3. Access token is stored in local extension storage.
4. Logout clears token.

### GitHub API Integration Flow
- `GET /repos/{owner}/{repo}` for permission test
- `PUT /repos/{owner}/{repo}/contents/{path}` for source + README updates

### File Organization Strategy
- `Competitive Programming/Codeforces/<problem>.cpp`
- `Competitive Programming/CSES/Introductory_Problems/<problem>.cpp`

### Sequence Diagram
```text
User submits -> Platform page updates -> Content Script observer fires
-> Adapter detectAccepted=true -> extractMetadata/extractCode
-> runtime.sendMessage(NEW_ACCEPTED_SUBMISSION)
-> Background enqueue + processPendingSync
-> GitHub API PUT file
-> mark uploaded
-> GitHub API PUT README
```

### Scalability Plan
- Add adapter-per-platform in `src/platforms/<platform>/adapter.ts`
- Keep background orchestration unchanged
- Future backend option for secure OAuth code exchange + encrypted token vault
- Add offline-first retry backoff + exponential scheduling
