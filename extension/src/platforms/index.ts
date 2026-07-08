import type { PlatformAdapter } from './base'
import { codeforcesAdapter } from './codeforces/adapter'
import { csesAdapter } from './cses/adapter'

export const platformAdapters: PlatformAdapter[] = [
  codeforcesAdapter,
  csesAdapter,
]
