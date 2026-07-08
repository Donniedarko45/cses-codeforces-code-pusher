import { describe, expect, it } from 'vitest'
import { isCodeforcesAccepted } from './codeforces/adapter'
import { isCsesAccepted } from './cses/adapter'
import { sanitizeFilename } from '../utils/sanitize'

describe('platform acceptance detection', () => {
  it('detects codeforces accepted submissions', () => {
    expect(
      isCodeforcesAccepted(
        'https://codeforces.com/contest/71/submission/123456',
        '<span>Accepted</span>',
      ),
    ).toBe(true)
  })

  it('detects cses accepted submissions', () => {
    expect(
      isCsesAccepted('https://cses.fi/problemset/submission/111', 'Your submission was accepted'),
    ).toBe(true)
  })

  it('sanitizes filenames for repository-safe paths', () => {
    expect(sanitizeFilename('71A. Way Too Long Words!')).toBe('71A._Way_Too_Long_Words')
  })
})
