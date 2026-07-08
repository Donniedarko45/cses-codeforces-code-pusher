import type {
  ExtensionSettings,
  RepositoryConfig,
  SyncItem,
} from '../types'

const STORAGE_KEYS = {
  token: 'github_token',
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

  static async setRepository(config: RepositoryConfig): Promise<void> {
    await chrome.storage.local.set({ [STORAGE_KEYS.repository]: config })
  }

  static async getRepository(): Promise<RepositoryConfig | null> {
    const stored = await chrome.storage.local.get(STORAGE_KEYS.repository)
    return (stored[STORAGE_KEYS.repository] as RepositoryConfig | undefined) ?? null
  }

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

  static async getSyncQueue(): Promise<SyncItem[]> {
    const stored = await chrome.storage.local.get(STORAGE_KEYS.syncQueue)
    return (stored[STORAGE_KEYS.syncQueue] as SyncItem[] | undefined) ?? []
  }

  static async setSyncQueue(items: SyncItem[]): Promise<void> {
    await chrome.storage.local.set({ [STORAGE_KEYS.syncQueue]: items })
  }

  static async getSyncHistory(): Promise<SyncItem[]> {
    const stored = await chrome.storage.local.get(STORAGE_KEYS.syncHistory)
    return (stored[STORAGE_KEYS.syncHistory] as SyncItem[] | undefined) ?? []
  }

  static async setSyncHistory(items: SyncItem[]): Promise<void> {
    await chrome.storage.local.set({ [STORAGE_KEYS.syncHistory]: items })
  }
}
