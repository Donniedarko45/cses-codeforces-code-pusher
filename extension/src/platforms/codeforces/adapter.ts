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

const getText = (document: Document | Element, selector: string): string => {
  const el = document.querySelector(selector)
  if (!el) return ''
  return ((el as HTMLElement).innerText || el.textContent || '').trim()
}

export const codeforcesAdapter: PlatformAdapter = {
  platform: 'Codeforces',

  detectAccepted: ({ url, html }) => isCodeforcesAccepted(url, html),

  async extractCode(document, url?: string): Promise<string | null> {
    // Primary selector for submission source code
    let code =
      getText(document, 'pre#program-source-text') ||
      getText(document, 'pre.program-source') ||
      getText(document, '.source-code pre') ||
      null

    // If code is not found in the DOM, but we are on a status page with an accepted submission, fetch it!
    if (!code && url && url.includes('/status')) {
      // Find the first accepted row or the one corresponding to the open popup
      let targetRow: Element | null | undefined = document.querySelector('tr[data-submission-id] span.verdict-accepted')?.closest('tr')
      const popupTitle = getText(document, '#facebox .title') || getText(document, '.popup .title')
      const popupMatch = popupTitle.match(/submission\s+(\d+)/i)
      if (popupMatch) {
        const popupRow = document.querySelector(`tr[data-submission-id="${popupMatch[1]}"]`)
        if (popupRow) targetRow = popupRow
      }

      if (targetRow) {
        const subId = targetRow.getAttribute('data-submission-id')
        const submissionLink = targetRow.querySelector<HTMLAnchorElement>('a.view-source') || targetRow.querySelector<HTMLAnchorElement>(`a[href*="/submission/${subId}"]`)
        
        if (submissionLink) {
          try {
            const resp = await fetch(submissionLink.href)
            const html = await resp.text()
            const parser = new DOMParser()
            const doc = parser.parseFromString(html, 'text/html')
            
            code = getText(doc, 'pre#program-source-text') ||
                   getText(doc, 'pre.program-source') ||
                   getText(doc, '.source-code pre') ||
                   null
          } catch (e) {
            console.error('Failed to fetch code automatically:', e)
          }
        }
      }
    }
    return code
  },

  async extractMetadata(document, url): Promise<SubmissionMetadata | null> {
    let submissionId = url.match(/submission\/(\d+)/)?.[1]
    let contestId = url.match(/(?:contest|gym)\/(\d+)/)?.[1]

    if (!submissionId) {
      // Try to extract the real submission ID from the popup title
      const popupTitle = getText(document, '#facebox .title') || getText(document, '.popup .title')
      const popupMatch = popupTitle.match(/submission\s+(\d+)/i)
      if (popupMatch) {
        submissionId = popupMatch[1]
      } else if (url.includes('/status')) {
        // Automatically find the first accepted row
        const acceptedRow = document.querySelector('tr[data-submission-id] span.verdict-accepted')?.closest('tr')
        if (acceptedRow) {
           submissionId = acceptedRow.getAttribute('data-submission-id') || undefined
        }
      }
      
      if (!submissionId) {
        const code = await this.extractCode(document, url)
        if (!code) return null
        submissionId = `popup-${code.length}`
      }
    }

    // Problem ID from the title (e.g. "A. Watermelon" → "A")
    let problemId = 'unknown'
    let problemName = 'Unknown Problem'
    let problemUrl = url

    const titleText = getText(document, '.problem-statement .header .title')
    if (titleText) {
      problemId = titleText.split('.').at(0)?.trim() ?? 'unknown'
      problemName = titleText
    } else if (url.includes('/status')) {
      // If we are on the status page, extract info from the exact row the user clicked on
      let acceptedRow = document.querySelector(`tr[data-submission-id="${submissionId}"]`)
      // Fallback to the first accepted row if we can't find it (unlikely if popup works)
      if (!acceptedRow) {
        acceptedRow = document.querySelector('tr[data-submission-id] span.verdict-accepted')?.closest('tr') || null
      }

      if (acceptedRow) {
        // Find any link in the row that goes to a problem page
        const problemLink = acceptedRow.querySelector<HTMLAnchorElement>('td a[href*="/problem/"]')
        if (problemLink) {
          problemUrl = problemLink.href
          
          if (!contestId) {
            const cMatch = problemUrl.match(/\/(?:contest|problem|gym)\/(\d+)/)
            if (cMatch) contestId = cMatch[1]
          }

          const linkText = problemLink.textContent?.trim() || ''
          const match = linkText.match(/^([A-Z0-9]+)\s*-\s*(.+)$/)
          if (match) {
            problemId = match[1]
            problemName = match[2]
          } else {
            problemName = linkText
          }
        }
      }
    }

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
    const folderPath = contestId
      ? `Codeforces/${contestId}/${sanitizeFilename(problemName)}`
      : `Codeforces/${sanitizeFilename(problemName)}`

    return {
      submissionId: submissionId ?? 'unknown',
      platform: 'Codeforces',
      problemId,
      contestId,
      problemName,
      language,
      submittedAt: new Date().toISOString(),
      runtime,
      memory,
      tags: [],
      problemUrl,
      filename: `${sanitizeFilename(problemId)}_${sanitizeFilename(problemName)}.${extension}`,
      folderPath,
    }
  },

  async fetchProblemStatement(url: string): Promise<string> {
    try {
      const resp = await fetch(url)
      const html = await resp.text()
      const parser = new DOMParser()
      const doc = parser.parseFromString(html, 'text/html')
      const problemNode = doc.querySelector('.problem-statement')
      
      if (!problemNode) {
        return `# Problem Statement\n\nCould not extract problem statement. Please view it at: ${url}`
      }

      // Remove unwanted script and style tags
      const scripts = problemNode.querySelectorAll('script, style')
      scripts.forEach(s => s.remove())

      // We dynamically import turndown so it's only loaded when needed
      const TurndownService = (await import('turndown')).default
      const turndownService = new TurndownService({ headingStyle: 'atx' })
      let markdown = turndownService.turndown(problemNode.innerHTML)
      
      // Clean up multiple newlines
      markdown = markdown.replace(/\n{3,}/g, '\n\n')
      return markdown
    } catch (err) {
      console.error('Failed to fetch problem statement:', err)
      return `# Problem Statement\n\nFailed to fetch problem statement. URL: ${url}`
    }
  },
}
