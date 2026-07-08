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
      document.querySelector<HTMLAnchorElement>('a[href*="/problemset/task/"]')?.href ??
      document.querySelector<HTMLAnchorElement>('a[href*="/task/"]')?.href ??
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
      folderPath: folderPath === 'CSES' ? folderPath : `${folderPath}/${sanitizeFilename(problemName)}`,
    }
  },

  async fetchProblemStatement(url: string): Promise<string> {
    try {
      // Ensure the URL is absolute (handles older queued items that had relative URLs)
      let absoluteUrl = url
      if (url.startsWith('/')) {
        absoluteUrl = `https://cses.fi${url}`
      }

      // For CSES, the problem URL is usually https://cses.fi/problemset/task/1068
      const taskUrl = absoluteUrl.replace('/result/', '/task/').replace('/submission/', '/task/')
      const resp = await fetch(taskUrl)
      const html = await resp.text()
      const parser = new DOMParser()
      const doc = parser.parseFromString(html, 'text/html')
      
      const contentNode = doc.querySelector('.content')
      if (!contentNode) {
        return `# Problem Statement\n\nCould not extract problem statement. Please view it at: ${taskUrl}`
      }

      // Extract problem name
      const titleNode = doc.querySelector('.navigation h1')
      const problemName = titleNode ? titleNode.textContent?.trim() : 'Problem'

      // Extract metadata properties (time limit, memory limit)
      let timeLimit = ''
      let memoryLimit = ''
      const constraintItems = contentNode.querySelectorAll('.task-constraints li')
      constraintItems.forEach((item) => {
        const text = item.textContent || ''
        if (text.includes('Time limit:')) {
          timeLimit = text.replace('Time limit:', '').trim()
        } else if (text.includes('Memory limit:')) {
          memoryLimit = text.replace('Memory limit:', '').trim()
        }
      })

      // Format clean markdown header and metadata table
      let markdown = `# ${problemName}\n\n`
      markdown += `| Metric | Value |\n`
      markdown += `| :--- | :--- |\n`
      if (timeLimit) markdown += `| **Time Limit** | ${timeLimit} |\n`
      if (memoryLimit) markdown += `| **Memory Limit** | ${memoryLimit} |\n`
      markdown += `\n`

      // Remove unwanted script and style tags
      const scripts = contentNode.querySelectorAll('script, style')
      scripts.forEach(s => s.remove())

      // Format math formulas in the DOM before turndown processes them
      const inlineMathNodes = contentNode.querySelectorAll('.math.math-inline, .math-inline')
      inlineMathNodes.forEach((node) => {
        node.textContent = `$${node.textContent}$`
      })

      const displayMathNodes = contentNode.querySelectorAll('.math.math-display, .math-display')
      displayMathNodes.forEach((node) => {
        node.textContent = `$$\n${node.textContent?.trim()}\n$$`
      })

      // We dynamically import turndown so it's only loaded when needed
      const TurndownService = (await import('turndown')).default
      const turndownService = new TurndownService({ headingStyle: 'atx' })

      const mdNode = contentNode.querySelector('.md')
      let currentSection = 'description'
      const sections: Record<string, Element[]> = {
        description: [],
        input: [],
        output: [],
        constraints: [],
        example: [],
      }

      if (mdNode) {
        for (const child of Array.from(mdNode.children)) {
          const id = child.id?.toLowerCase() || ''
          if (id === 'input') {
            currentSection = 'input'
            continue
          } else if (id === 'output') {
            currentSection = 'output'
            continue
          } else if (id === 'constraints') {
            currentSection = 'constraints'
            continue
          } else if (id === 'example' || id === 'examples') {
            currentSection = 'example'
            continue
          }
          sections[currentSection].push(child)
        }
      }

      const getSectionMarkdown = (elements: Element[]): string => {
        if (!elements.length) return ''
        const temp = doc.createElement('div')
        elements.forEach(el => temp.appendChild(el.cloneNode(true)))
        return turndownService.turndown(temp.innerHTML).trim()
      }

      const descMarkdown = getSectionMarkdown(sections.description)
      if (descMarkdown) {
        markdown += `## Description\n\n${descMarkdown}\n\n`
      }

      const inputMarkdown = getSectionMarkdown(sections.input)
      if (inputMarkdown) {
        markdown += `## Input\n\n${inputMarkdown}\n\n`
      }

      const outputMarkdown = getSectionMarkdown(sections.output)
      if (outputMarkdown) {
        markdown += `## Output\n\n${outputMarkdown}\n\n`
      }

      const constraintsMarkdown = getSectionMarkdown(sections.constraints)
      if (constraintsMarkdown) {
        markdown += `## Constraints\n\n${constraintsMarkdown}\n\n`
      }

      // Parse pre elements inside the Example section
      const preElements: HTMLPreElement[] = []
      sections.example.forEach((el) => {
        if (el.tagName === 'PRE') {
          preElements.push(el as HTMLPreElement)
        } else {
          preElements.push(...Array.from(el.querySelectorAll('pre')))
        }
      })

      if (preElements.length > 0) {
        markdown += `## Examples\n\n`
        for (let i = 0; i < preElements.length; i += 2) {
          const exampleIdx = Math.floor(i / 2) + 1
          const prefix = preElements.length > 2 ? `### Example ${exampleIdx}\n\n` : ''
          markdown += prefix

          const inputPre = preElements[i]
          if (inputPre) {
            const inputText = (inputPre.textContent || '').trim()
            markdown += `**Input**\n\`\`\`text\n${inputText}\n\`\`\`\n\n`
          }

          const outputPre = preElements[i + 1]
          if (outputPre) {
            const outputText = (outputPre.textContent || '').trim()
            markdown += `**Output**\n\`\`\`text\n${outputText}\n\`\`\`\n\n`
          }
        }
      }

      // Convert LaTeX inline math \\( ... \\) to $ ... $ (fallback/safety)
      markdown = markdown.replace(/\\\\\(/g, '$').replace(/\\\\\)/g, '$')
      // Convert LaTeX block math \\[[ ... \\]] to $$ ... $$ (fallback/safety)
      markdown = markdown.replace(/\\\\\[/g, '$$').replace(/\\\\\]/g, '$$')
      
      // Fix escaped backslashes inside math blocks
      markdown = markdown.replace(/\$([^$]+)\$/g, (_, p1) => {
        return '$' + p1.replace(/\\\\/g, '\\') + '$'
      })

      // Clean up multiple newlines
      markdown = markdown.replace(/\n{3,}/g, '\n\n')
      
      return markdown
    } catch (err) {
      console.error('Failed to fetch problem statement:', err)
      return `# Problem Statement\n\nFailed to fetch problem statement. URL: ${url}`
    }
  },
}
