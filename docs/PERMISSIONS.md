# Extension Permissions Explanation

## Requested Permissions
- `storage`: persist token, settings, queue, history
- `identity`: GitHub OAuth flow
- `alarms`: retry pending sync operations
- `notifications`: success/failure notifications
- `scripting`: future runtime script injection and diagnostics

## Host Permissions
- `https://codeforces.com/*`
- `https://cses.fi/*`
- `https://api.github.com/*`

These are minimum-required domains for platform detection and GitHub sync.
