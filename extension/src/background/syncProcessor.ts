import { GitHubRepoService } from '../services/github/githubRepoService'
import { SecureStorage } from '../storage/secureStorage'
import { SyncQueueService } from '../services/sync/syncQueueService'
import type { SyncItem } from '../types'

const makeReadme = (history: SyncItem[]): string => {
  const uploaded = history.filter(item => item.status === 'uploaded')
  const totalCount = uploaded.length
  const cfCount = uploaded.filter(item => item.metadata.platform === 'Codeforces').length
  const csesCount = uploaded.filter(item => item.metadata.platform === 'CSES').length

  // Languages count
  const langCounts: Record<string, number> = {}
  uploaded.forEach(item => {
    const lang = item.metadata.language || 'Unknown'
    let canonical = 'Other'
    const lLower = lang.toLowerCase()
    if (lLower.includes('c++')) canonical = 'C++'
    else if (lLower.includes('python')) canonical = 'Python'
    else if (lLower.includes('java') && !lLower.includes('javascript')) canonical = 'Java'
    else if (lLower.includes('rust')) canonical = 'Rust'
    else if (lLower.includes('go')) canonical = 'Go'
    else if (lLower.includes('kotlin')) canonical = 'Kotlin'
    else if (lLower.includes('javascript')) canonical = 'JavaScript'
    
    langCounts[canonical] = (langCounts[canonical] || 0) + 1
  })

  const langList = Object.entries(langCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([lang, count]) => `- **${lang}**: ${count} solutions`)
    .join('\n')

  // Recent Submissions (last 5)
  const recent = uploaded.slice(0, 5).map(item => {
    const time = item.metadata.submittedAt ? new Date(item.metadata.submittedAt).toLocaleDateString() : 'N/A'
    return `- **[${item.metadata.platform} - ${item.metadata.problemName}](${item.metadata.problemUrl})** (Solved in ${item.metadata.language} on ${time})`
  }).join('\n')

  return `# 🏆 Competitive Programming Portfolio

Welcome to my competitive programming solutions repository! This repository is automatically synced and updated by the [CP Auto Sync](https://github.com/Donniedarko45/cses-codeforces-code-pusher) extension.

## 📊 Statistics

| Platform | Solved | Badge |
| :--- | :---: | :--- |
| **Codeforces** | **${cfCount}** | ![Codeforces](https://img.shields.io/badge/Codeforces-FF5722?style=flat-square&logo=codeforces&logoColor=white) |
| **CSES** | **${csesCount}** | ![CSES](https://img.shields.io/badge/CSES-4CAF50?style=flat-square&logo=leetcode&logoColor=white) |
| **Total** | **${totalCount}** | — |

### 🛠️ Languages Used

${langList || '- None'}

---

## 📅 Recent Submissions

${recent || '*No recent submissions found.*'}

---
*Last updated on: ${new Date().toLocaleDateString()}*
`
}

export const processPendingSync = async (): Promise<void> => {
  const queue = await SecureStorage.getSyncQueue()
  const itemsToProcess = queue.filter(
    (item) => item.status === 'pending' || (item.status === 'failed' && (item.retryCount || 0) < 3)
  )

  if (!itemsToProcess.length) {
    return
  }

  const token = await SecureStorage.getToken()
  const repository = await SecureStorage.getRepository()

  if (!token || !repository) {
    return
  }

  const github = new GitHubRepoService(token, repository)
  const allowed = await github.testPermissions()

  if (!allowed) {
    return
  }

  for (const item of itemsToProcess) {
    const path = `${item.metadata.folderPath}/${item.metadata.filename}`
    try {
      if (item.readmeContent) {
        await github.upsertFile(
          `${item.metadata.folderPath}/README.md`,
          item.readmeContent,
          `Add problem statement for ${item.metadata.problemName}`,
        )
      }

      await github.upsertFile(
        path,
        item.sourceCode,
        GitHubRepoService.buildCommitMessage(item.metadata),
      )
      await SyncQueueService.markUploaded(item.metadata.submissionId)
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Unknown sync error'
      const retries = item.retryCount || 0
      if (retries < 3) {
        await SyncQueueService.markRetry(item.metadata.submissionId, errMsg)
      } else {
        await SyncQueueService.markFailed(item.metadata.submissionId, errMsg)
      }
    }
  }

  const history = await SecureStorage.getSyncHistory()
  await github.upsertFile('README.md', makeReadme(history), 'Updated README statistics')
}
