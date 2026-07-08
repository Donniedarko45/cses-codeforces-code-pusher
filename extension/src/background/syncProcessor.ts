import { GitHubRepoService } from '../services/github/githubRepoService'
import { SecureStorage } from '../storage/secureStorage'
import { SyncQueueService } from '../services/sync/syncQueueService'

const makeReadme = (syncedCount: number): string => `# Competitive Programming

Problems Solved: ${syncedCount}

Platforms
- Codeforces
- CSES

Last Updated
${new Date().toLocaleDateString()}
`

export const processPendingSync = async (): Promise<void> => {
  const queue = await SecureStorage.getSyncQueue()
  if (!queue.length) {
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

  for (const item of queue) {
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
      await SyncQueueService.markFailed(
        item.metadata.submissionId,
        error instanceof Error ? error.message : 'Unknown sync error',
      )
    }
  }

  const history = await SecureStorage.getSyncHistory()
  await github.upsertFile('README.md', makeReadme(history.length), 'Updated README statistics')
}
