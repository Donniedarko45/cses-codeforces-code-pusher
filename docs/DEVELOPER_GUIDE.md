# Developer Guide

## Commands
```bash
npm run lint
npm run test
npm run build
```

## Extension Layers
- `src/content`: DOM detection and extraction
- `src/background`: orchestration + queue processor
- `src/services`: GitHub + sync logic
- `src/storage`: typed Chrome storage wrapper
- `src/platforms`: plugin adapters
- `src/popup`: React UI shell

## Adding a New Platform
1. Create `src/platforms/<platform>/adapter.ts`
2. Implement `PlatformAdapter`
3. Register in `src/platforms/index.ts`
4. Add host permissions + match patterns in manifest
5. Add tests for acceptance detection
