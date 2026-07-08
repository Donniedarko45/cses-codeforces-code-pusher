# Deployment Guide

## Production Checklist
- Replace OAuth client IDs with production values
- Validate manifest permissions and privacy policy
- Run lint, test, build
- Package build output from `/extension/dist`
- Publish to Chrome Web Store

## Security Notes
- No third-party telemetry
- No source code upload to external services (except GitHub API)
- Token stored only in extension local storage
