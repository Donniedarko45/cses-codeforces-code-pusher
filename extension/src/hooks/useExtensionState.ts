import { useCallback, useEffect, useState } from 'react'
import type { DashboardStats, SyncItem } from '../types'
import { SecureStorage } from '../storage/secureStorage'

const emptyStats: DashboardStats = {
  githubConnected: false,
  githubUsername: '',
  clientIdConfigured: false,
  repository: 'Not selected',
  syncedCount: 0,
  todayUploads: 0,
  pendingUploads: 0,
  latestCommitMessage: 'N/A',
}

export const useExtensionState = () => {
  const [stats, setStats] = useState<DashboardStats>(emptyStats)
  const [history, setHistory] = useState<SyncItem[]>([])

  const loadState = useCallback(async () => {
    const [token, clientId, username, repo, queue, historyItems] = await Promise.all([
      SecureStorage.getToken(),
      SecureStorage.getClientId(),
      SecureStorage.getGithubUsername(),
      SecureStorage.getRepository(),
      SecureStorage.getSyncQueue(),
      SecureStorage.getSyncHistory(),
    ])

    setHistory(historyItems)
    setStats({
      githubConnected: Boolean(token),
      githubUsername: username ?? '',
      clientIdConfigured: Boolean(clientId),
      repository: repo ? `${repo.owner}/${repo.repo}` : 'Not selected',
      syncedCount: historyItems.filter((item) => item.status === 'uploaded').length,
      todayUploads: historyItems.filter((item) =>
        item.metadata.submittedAt.startsWith(new Date().toISOString().slice(0, 10)),
      ).length,
      pendingUploads: queue.length,
      latestCommitMessage:
        historyItems[0]?.metadata.problemName
          ? `Solved ${historyItems[0].metadata.platform} ${historyItems[0].metadata.problemName}`
          : 'N/A',
    })
  }, [])

  useEffect(() => {
    void loadState()
  }, [loadState])

  const refresh = useCallback(() => {
    void loadState()
  }, [loadState])

  return { stats, history, refresh }
}
