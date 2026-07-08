export type SupportedPlatform = 'Codeforces' | 'CSES'

export type SyncStatus = 'uploaded' | 'pending' | 'failed'

export interface SubmissionMetadata {
  submissionId: string
  platform: SupportedPlatform
  problemId: string
  contestId?: string
  problemName: string
  language: string
  submittedAt: string
  runtime?: string
  memory?: string
  tags: string[]
  difficulty?: string
  problemUrl: string
  filename: string
  folderPath: string
}

export interface SyncItem {
  metadata: SubmissionMetadata
  sourceCode: string
  readmeContent?: string
  status: SyncStatus
  error?: string
}

export interface ExtensionSettings {
  autoSync: boolean
  languageFilters: string[]
  enabledPlatforms: SupportedPlatform[]
  commitTemplate: string
  defaultBranch: string
  rootFolder: string
}

export interface RepositoryConfig {
  owner: string
  repo: string
  branch: string
}

export interface DashboardStats {
  githubConnected: boolean
  githubUsername: string
  clientIdConfigured: boolean
  repository: string
  syncedCount: number
  todayUploads: number
  pendingUploads: number
  latestCommitMessage: string
}
