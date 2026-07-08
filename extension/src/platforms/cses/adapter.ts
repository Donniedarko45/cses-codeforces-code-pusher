import type { PlatformAdapter } from '../base'
import { sanitizeFilename } from '../../utils/sanitize'
import type { SubmissionMetadata } from '../../types'

/**
 * CSES result pages use URLs like:
 *   https://cses.fi/problemset/result/17860155/
 *   https://cses.fi/dt/result/12345/
 * Older or alternate URLs may use "submission" instead of "result".
 */
export const isCsesAccepted = (url: string, html: string): boolean =>
  /cses\.fi\/.+(?:result|submission)/i.test(url) &&
  /(ACCEPTED|Accepted|Your submission was accepted)/.test(html)

const getText = (document: Document, selector: string): string => {
  const el = document.querySelector(selector)
  if (!el) return ''
  return ((el as HTMLElement).innerText || el.textContent || '').trim()
}

export const csesAdapter: PlatformAdapter = {
  platform: 'CSES',

  detectAccepted: ({ url, html }) => isCsesAccepted(url, html),

  extractCode(document) {
    const pres = document.querySelectorAll('pre')
    // Find the longest <pre> — that's most likely the source code, not test output
    let bestCode = ''
    for (const pre of pres) {
      const text = pre.innerText || pre.textContent || ''
      const trimmed = text.trim()
      if (trimmed.length > bestCode.length) {
        bestCode = trimmed
      }
    }
    return bestCode || null
  },

  extractMetadata(document, url): SubmissionMetadata | null {
    // Match both /result/ID and /submission/ID URL patterns
    const submissionId = url.match(/(?:result|submission)\/(\d+)/)?.[1]

    if (!submissionId) {
      return null
    }

    const problemName = getText(document, 'h1') || 'Unknown Problem'
    const problemId = sanitizeFilename(problemName)

    // Language detection: CSES shows "Language: C++ (C++17)" in a table
    // Try multiple selectors
    const langRow = document.querySelector('td.field-title + td')
    const rows = document.querySelectorAll('tr')
    let language = 'Unknown'
    for (const row of rows) {
      const cells = row.querySelectorAll('td')
      if (cells.length >= 2 && cells[0].textContent?.includes('Language')) {
        language = cells[1].textContent?.trim() ?? 'Unknown'
        break
      }
    }
    if (language === 'Unknown' && langRow) {
      language = langRow.textContent?.trim() ?? 'Unknown'
    }

    // Determine file extension from language
    let extension = 'cpp'
    const langLower = language.toLowerCase()
    if (langLower.includes('python')) extension = 'py'
    else if (langLower.includes('java') && !langLower.includes('javascript')) extension = 'java'
    else if (langLower.includes('rust')) extension = 'rs'
    else if (langLower.includes('javascript')) extension = 'js'

    const problemUrl =
      document.querySelector('a[href*="/problemset/task/"]')?.getAttribute('href') ??
      document.querySelector('a[href*="/task/"]')?.getAttribute('href') ??
      url

    // Try to detect the CSES section from breadcrumbs or navigation
    let folderPath = 'CSES'
    const links = document.querySelectorAll('a')
    for (const link of links) {
      const href = link.getAttribute('href') ?? ''
      const text = link.textContent?.trim() ?? ''
      if (href.includes('/problemset/') && text && !text.includes('CSES') && text !== problemName) {
        folderPath = `CSES/${sanitizeFilename(text)}`
        break
      }
    }

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
      folderPath,
    }
  },
}
