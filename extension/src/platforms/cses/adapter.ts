import type { PlatformAdapter } from '../base'
import { sanitizeFilename } from '../../utils/sanitize'
import type { SubmissionMetadata } from '../../types'

export const isCsesAccepted = (url: string, html: string): boolean =>
  /cses\.fi\/.+submission/i.test(url) &&
  /(ACCEPTED|Accepted|Your submission was accepted)/.test(html)

const getText = (document: Document, selector: string): string =>
  document.querySelector(selector)?.textContent?.trim() ?? ''

export const csesAdapter: PlatformAdapter = {
  platform: 'CSES',

  detectAccepted: ({ url, html }) => isCsesAccepted(url, html),

  extractCode(document) {
    return getText(document, 'pre') || null
  },

  extractMetadata(document, url): SubmissionMetadata | null {
    const submissionId = url.match(/submission\/(\d+)/)?.[1]

    if (!submissionId) {
      return null
    }

    const problemName = getText(document, 'h1') || 'Unknown Problem'
    const problemId = sanitizeFilename(problemName)
    const language = getText(document, '.language') || 'Unknown'
    const extension = language.includes('Python') ? 'py' : 'cpp'
    const problemUrl =
      document.querySelector('a[href*="/problemset/task/"]')?.getAttribute('href') ?? url

    return {
      submissionId,
      platform: 'CSES',
      problemId,
      problemName,
      language,
      submittedAt: new Date().toISOString(),
      runtime: getText(document, '.runtime'),
      memory: getText(document, '.memory'),
      tags: [],
      problemUrl,
      filename: `${sanitizeFilename(problemName)}.${extension}`,
      folderPath: 'CSES/Introductory_Problems',
    }
  },
}
