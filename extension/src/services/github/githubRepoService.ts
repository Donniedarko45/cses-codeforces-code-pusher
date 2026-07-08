import type { RepositoryConfig, SubmissionMetadata } from '../../types'

const GITHUB_API = 'https://api.github.com'

export interface GitHubRepo {
  full_name: string
  name: string
  owner: { login: string }
  default_branch: string
  private: boolean
  description: string | null
}

export class GitHubRepoService {
  private readonly token: string
  private readonly repository: RepositoryConfig

  constructor(token: string, repository: RepositoryConfig) {
    this.token = token
    this.repository = repository
  }

  private headers() {
    return {
      Authorization: 'Bearer ' + this.token,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    }
  }

  async testPermissions(): Promise<boolean> {
    const response = await fetch(
      `${GITHUB_API}/repos/${this.repository.owner}/${this.repository.repo}`,
      { headers: this.headers() },
    )
    return response.ok
  }

  async upsertFile(
    path: string,
    content: string,
    commitMessage: string,
    retryCount = 0,
  ): Promise<void> {
    const encoded = btoa(unescape(encodeURIComponent(content)))

    // Check if file already exists to get its SHA (needed for updates)
    let sha: string | undefined
    const existingResp = await fetch(
      `${GITHUB_API}/repos/${this.repository.owner}/${this.repository.repo}/contents/${path}?ref=${this.repository.branch}`,
      { headers: this.headers() },
    )
    if (existingResp.ok) {
      const existing = await existingResp.json()
      sha = existing.sha
    }

    const response = await fetch(
      `${GITHUB_API}/repos/${this.repository.owner}/${this.repository.repo}/contents/${path}`,
      {
        method: 'PUT',
        headers: this.headers(),
        body: JSON.stringify({
          message: commitMessage,
          content: encoded,
          branch: this.repository.branch,
          ...(sha ? { sha } : {}),
        }),
      },
    )

    if (response.status === 409 && retryCount < 3) {
      // Branch has moved or file modified concurrently. Wait and retry with a fresh SHA query.
      await new Promise((resolve) => setTimeout(resolve, 1500))
      return this.upsertFile(path, content, commitMessage, retryCount + 1)
    }

    if (!response.ok) {
      throw new Error(`GitHub upload failed for ${path}: ${response.status}`)
    }
  }

  /**
   * List repositories accessible by the authenticated user.
   * Returns up to 100 repos sorted by most recently pushed.
   */
  static async listUserRepos(token: string): Promise<GitHubRepo[]> {
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
    }

    const resp = await fetch(
      `${GITHUB_API}/user/repos?sort=pushed&per_page=100&affiliation=owner,collaborator`,
      { headers },
    )

    if (!resp.ok) {
      throw new Error(`Failed to list repos: ${resp.status}`)
    }

    return (await resp.json()) as GitHubRepo[]
  }

  /**
   * Create a new repository for the authenticated user.
   */
  static async createRepo(
    token: string,
    name: string,
    description = 'Competitive Programming solutions auto-synced by CP Auto Sync',
    isPrivate = false,
  ): Promise<GitHubRepo> {
    const resp = await fetch(`${GITHUB_API}/user/repos`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        description,
        private: isPrivate,
        auto_init: true,
      }),
    })

    if (!resp.ok) {
      const errBody = await resp.json().catch(() => ({}))
      throw new Error(
        `Failed to create repo: ${resp.status} — ${(errBody as any)?.message ?? 'Unknown error'}`,
      )
    }

    return (await resp.json()) as GitHubRepo
  }

  static buildCommitMessage(metadata: SubmissionMetadata): string {
    return `Solved ${metadata.platform} ${metadata.problemId}`
  }
}
