import type {
  ExtensionSettings,
  RepositoryConfig,
  SyncItem,
} from '../types'

const STORAGE_KEYS = {
  token: 'github_token',
  clientId: 'github_client_id',
  githubUsername: 'github_username',
  githubAvatarUrl: 'github_avatar_url',
  settings: 'settings',
  repository: 'repository',
  syncHistory: 'sync_history',
  syncQueue: 'sync_queue',
} as const

const defaultSettings: ExtensionSettings = {
  autoSync: true,
  languageFilters: [],
  enabledPlatforms: ['Codeforces', 'CSES'],
  commitTemplate: 'Solved {platform} {problem}',
  defaultBranch: 'main',
  rootFolder: 'Competitive Programming',
}

export class SecureStorage {
  // --- Token ---
  static async setToken(token: string): Promise<void> {
    await chrome.storage.local.set({ [STORAGE_KEYS.token]: token })
  }

  static async getToken(): Promise<string | null> {
    const stored = await chrome.storage.local.get(STORAGE_KEYS.token)
    return (stored[STORAGE_KEYS.token] as string | undefined) ?? null
  }

  static async clearToken(): Promise<void> {
    await chrome.storage.local.remove(STORAGE_KEYS.token)
  }

  // --- OAuth Client ID ---
  static async setClientId(clientId: string): Promise<void> {
    await chrome.storage.local.set({ [STORAGE_KEYS.clientId]: clientId })
  }

  static async getClientId(): Promise<string | null> {
    const stored = await chrome.storage.local.get(STORAGE_KEYS.clientId)
    return (stored[STORAGE_KEYS.clientId] as string | undefined) ?? null
  }

  static async clearClientId(): Promise<void> {
    await chrome.storage.local.remove(STORAGE_KEYS.clientId)
  }

  // --- GitHub Username ---
  static async setGithubUsername(username: string): Promise<void> {
    await chrome.storage.local.set({ [STORAGE_KEYS.githubUsername]: username })
  }

  static async getGithubUsername(): Promise<string | null> {
    const stored = await chrome.storage.local.get(STORAGE_KEYS.githubUsername)
    return (stored[STORAGE_KEYS.githubUsername] as string | undefined) ?? null
  }

  static async clearGithubUsername(): Promise<void> {
    await chrome.storage.local.remove(STORAGE_KEYS.githubUsername)
  }

  // --- GitHub Avatar URL ---
  static async setGithubAvatarUrl(avatarUrl: string): Promise<void> {
    await chrome.storage.local.set({ [STORAGE_KEYS.githubAvatarUrl]: avatarUrl })
  }

  static async getGithubAvatarUrl(): Promise<string | null> {
    const stored = await chrome.storage.local.get(STORAGE_KEYS.githubAvatarUrl)
    return (stored[STORAGE_KEYS.githubAvatarUrl] as string | undefined) ?? null
  }

  static async clearGithubAvatarUrl(): Promise<void> {
    await chrome.storage.local.remove(STORAGE_KEYS.githubAvatarUrl)
  }

  // --- Repository ---
  static async setRepository(config: RepositoryConfig): Promise<void> {
    await chrome.storage.local.set({ [STORAGE_KEYS.repository]: config })
  }

  static async getRepository(): Promise<RepositoryConfig | null> {
    const stored = await chrome.storage.local.get(STORAGE_KEYS.repository)
    return (stored[STORAGE_KEYS.repository] as RepositoryConfig | undefined) ?? null
  }

  static async clearRepository(): Promise<void> {
    await chrome.storage.local.remove(STORAGE_KEYS.repository)
  }

  // --- Settings ---
  static async getSettings(): Promise<ExtensionSettings> {
    const stored = await chrome.storage.local.get(STORAGE_KEYS.settings)
    return {
      ...defaultSettings,
      ...(stored[STORAGE_KEYS.settings] ?? {}),
    }
  }

  static async updateSettings(settings: Partial<ExtensionSettings>): Promise<void> {
    const current = await SecureStorage.getSettings()
    await chrome.storage.local.set({
      [STORAGE_KEYS.settings]: {
        ...current,
        ...settings,
      },
    })
  }

  // --- Sync Queue ---
  static async getSyncQueue(): Promise<SyncItem[]> {
    const stored = await chrome.storage.local.get(STORAGE_KEYS.syncQueue)
    return (stored[STORAGE_KEYS.syncQueue] as SyncItem[] | undefined) ?? []
  }

  static async setSyncQueue(items: SyncItem[]): Promise<void> {
    await chrome.storage.local.set({ [STORAGE_KEYS.syncQueue]: items })
  }

  // --- Sync History ---
  static async getSyncHistory(): Promise<SyncItem[]> {
    const stored = await chrome.storage.local.get(STORAGE_KEYS.syncHistory)
    return (stored[STORAGE_KEYS.syncHistory] as SyncItem[] | undefined) ?? []
  }

  static async setSyncHistory(items: SyncItem[]): Promise<void> {
    await chrome.storage.local.set({ [STORAGE_KEYS.syncHistory]: items })
  }
}
