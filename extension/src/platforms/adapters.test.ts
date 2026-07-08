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

  it('detects cses accepted submissions on result pages', () => {
    expect(
      isCsesAccepted(
        'https://cses.fi/problemset/result/17860155/',
        '<span class="accepted">ACCEPTED</span>',
      ),
    ).toBe(true)
  })

  it('detects cses accepted submissions on submission pages', () => {
    expect(
      isCsesAccepted('https://cses.fi/problemset/submission/111', 'Your submission was accepted'),
    ).toBe(true)
  })

  it('rejects non-accepted cses pages', () => {
    expect(
      isCsesAccepted('https://cses.fi/problemset/result/111', 'WRONG ANSWER'),
    ).toBe(false)
  })

  it('sanitizes filenames for repository-safe paths', () => {
    expect(sanitizeFilename('71A. Way Too Long Words!')).toBe('71A._Way_Too_Long_Words')
  })
})
