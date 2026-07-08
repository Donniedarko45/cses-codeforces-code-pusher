import { SecureStorage } from '../../storage/secureStorage'
import type { SubmissionMetadata, SyncItem } from '../../types'

export class SyncQueueService {
  static async enqueue(
    metadata: SubmissionMetadata,
    sourceCode: string,
    readmeContent?: string,
  ): Promise<boolean> {
    const queue = await SecureStorage.getSyncQueue()

    // 1. Check if we already have this specific submission in the queue
    const alreadyQueued = queue.some((item) => item.metadata.submissionId === metadata.submissionId)

    // 2. Check if it's already in the uploaded history
    const history = await SecureStorage.getSyncHistory()
    const alreadyUploaded = history.some((item) => item.metadata.submissionId === metadata.submissionId)

    if (alreadyQueued || alreadyUploaded) {
      return false
    }

    queue.push({
      metadata,
      sourceCode,
      readmeContent,
      status: 'pending',
    })

    await SecureStorage.setSyncQueue(queue)
    return true
  }

  static async markUploaded(submissionId: string): Promise<void> {
    const queue = await SecureStorage.getSyncQueue()
    const history = await SecureStorage.getSyncHistory()
    const remaining: SyncItem[] = []

    for (const item of queue) {
      if (item.metadata.submissionId === submissionId) {
        history.unshift({ ...item, status: 'uploaded' })
      } else {
        remaining.push(item)
      }
    }

    await SecureStorage.setSyncQueue(remaining)
    await SecureStorage.setSyncHistory(history.slice(0, 500))
  }

  static async markFailed(submissionId: string, error: string): Promise<void> {
    const queue = await SecureStorage.getSyncQueue()
    await SecureStorage.setSyncQueue(
      queue.map((item) =>
        item.metadata.submissionId === submissionId
          ? { ...item, status: 'failed', error }
          : item,
      ),
    )
  }

  static async markRetry(submissionId: string, error: string): Promise<void> {
    const queue = await SecureStorage.getSyncQueue()
    await SecureStorage.setSyncQueue(
      queue.map((item) =>
        item.metadata.submissionId === submissionId
          ? {
              ...item,
              status: 'pending',
              retryCount: (item.retryCount || 0) + 1,
              error,
            }
          : item,
      ),
    )
  }
}
