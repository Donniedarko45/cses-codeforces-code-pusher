import type { PlatformAdapter } from '../base'
import { sanitizeFilename } from '../../utils/sanitize'
import type { SubmissionMetadata } from '../../types'

const acceptedSignals = ['Accepted', 'OK']

export const isCodeforcesAccepted = (url: string, html: string): boolean =>
  /codeforces\.com\/.+submission/i.test(url) &&
  acceptedSignals.some((signal) => html.includes(signal))

const getText = (document: Document, selector: string): string =>
  document.querySelector(selector)?.textContent?.trim() ?? ''

export const codeforcesAdapter: PlatformAdapter = {
  platform: 'Codeforces',

  detectAccepted: ({ url, html }) => isCodeforcesAccepted(url, html),

  extractCode(document) {
    return getText(document, 'pre#program-source-text') || null
  },

  extractMetadata(document, url): SubmissionMetadata | null {
    const submissionId = url.match(/submission\/(\d+)/)?.[1]
    const contestId = url.match(/contest\/(\d+)/)?.[1]
    const problemId = getText(document, '.problem-statement .header .title')
      .split('.')
      .at(0)
      ?.trim() ?? 'unknown'

    if (!submissionId) {
      return null
    }

    const problemName =
      getText(document, '.problem-statement .header .title') || 'Unknown Problem'

    const language = getText(document, '.datatable tr:nth-child(2) td:nth-child(5)') || 'Unknown'
    const runtime = getText(document, '.verdict-time')
    const memory = getText(document, '.memory-consumed-cell')
    const extension = language.includes('Python') ? 'py' : 'cpp'

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
      folderPath: 'Codeforces',
    }
  },
}
