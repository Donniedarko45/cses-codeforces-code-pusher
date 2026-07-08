import type { PlatformAdapter } from '../base'
import { sanitizeFilename } from '../../utils/sanitize'
import type { SubmissionMetadata } from '../../types'

const acceptedSignals = ['Accepted', 'verdict-accepted']

/**
 * Codeforces submission URLs:
 *   https://codeforces.com/contest/71/submission/123456
 *   https://codeforces.com/problemset/submission/71/123456
 *   https://codeforces.com/gym/12345/submission/123456
 */
export const isCodeforcesAccepted = (url: string, html: string): boolean =>
  /codeforces\.com\/.+(?:submission|status)/i.test(url) &&
  acceptedSignals.some((signal) => html.includes(signal))

const getText = (document: Document, selector: string): string => {
  const el = document.querySelector(selector)
  if (!el) return ''
  return ((el as HTMLElement).innerText || el.textContent || '').trim()
}

export const codeforcesAdapter: PlatformAdapter = {
  platform: 'Codeforces',

  detectAccepted: ({ url, html }) => isCodeforcesAccepted(url, html),

  extractCode(document) {
    // Primary selector for submission source code
    return (
      getText(document, 'pre#program-source-text') ||
      getText(document, 'pre.program-source') ||
      getText(document, '.source-code pre') ||
      null
    )
  },

  extractMetadata(document, url): SubmissionMetadata | null {
    const submissionId = url.match(/submission\/(\d+)/)?.[1]
    const contestId = url.match(/(?:contest|gym)\/(\d+)/)?.[1]

    if (!submissionId) {
      return null
    }

    // Problem ID from the title (e.g. "A. Watermelon" → "A")
    const titleText = getText(document, '.problem-statement .header .title')
    const problemId = titleText.split('.').at(0)?.trim() ?? 'unknown'
    const problemName = titleText || 'Unknown Problem'

    // Language from the submission info table
    const language =
      getText(document, '.datatable tr:nth-child(2) td:nth-child(5)') ||
      getText(document, '.info-line td:nth-child(4)') ||
      'Unknown'

    const runtime = getText(document, '.verdict-time') || getText(document, '.time-consumed-cell')
    const memory = getText(document, '.memory-consumed-cell')

    // Determine file extension from language string
    let extension = 'cpp'
    const langLower = language.toLowerCase()
    if (langLower.includes('python')) extension = 'py'
    else if (langLower.includes('java') && !langLower.includes('javascript')) extension = 'java'
    else if (langLower.includes('rust')) extension = 'rs'
    else if (langLower.includes('kotlin')) extension = 'kt'
    else if (langLower.includes('javascript')) extension = 'js'
    else if (langLower.includes('go ') || langLower === 'go') extension = 'go'

    return {
      submissionId,
      platform: 'Codeforces',
      problemId,
      contestId,
      problemName,
      language,
      submittedAt: new Date().toISOString(),
      runtime,
      memory,
      tags: [],
      problemUrl: url,
      filename: `${sanitizeFilename(problemId)}_${sanitizeFilename(problemName)}.${extension}`,
      folderPath: contestId ? `Codeforces/${contestId}` : 'Codeforces',
    }
  },
}
