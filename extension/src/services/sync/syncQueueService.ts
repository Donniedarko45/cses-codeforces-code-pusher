import { SecureStorage } from '../../storage/secureStorage'
import type { SubmissionMetadata, SyncItem } from '../../types'

export class SyncQueueService {
  static async enqueue(metadata: SubmissionMetadata, sourceCode: string): Promise<boolean> {
    const [queue, history] = await Promise.all([
      SecureStorage.getSyncQueue(),
      SecureStorage.getSyncHistory(),
    ])
    const duplicate = [...queue, ...history].some(
      (item) =>
        item.metadata.submissionId === metadata.submissionId ||
        item.metadata.problemId === metadata.problemId ||
        item.metadata.filename === metadata.filename,
    )

    if (duplicate) {
      return false
    }

    queue.push({
      metadata,
      sourceCode,
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
}
