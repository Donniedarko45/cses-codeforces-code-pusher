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

  async commitFiles(
    files: Array<{ path: string; content: string }>,
    commitMessage: string,
    retryCount = 0,
  ): Promise<void> {
    try {
      // 1. Get latest commit SHA of the branch
      const refResponse = await fetch(
        `${GITHUB_API}/repos/${this.repository.owner}/${this.repository.repo}/git/ref/heads/${this.repository.branch}`,
        { headers: this.headers() },
      )
      if (!refResponse.ok) {
        throw new Error(`Failed to get ref: ${refResponse.status}`)
      }
      const refData = await refResponse.json()
      const parentSha = refData.object.sha

      // 2. Get the commit info to retrieve its tree SHA
      const commitResponse = await fetch(
        `${GITHUB_API}/repos/${this.repository.owner}/${this.repository.repo}/git/commits/${parentSha}`,
        { headers: this.headers() },
      )
      if (!commitResponse.ok) {
        throw new Error(`Failed to get commit info: ${commitResponse.status}`)
      }
      const commitData = await commitResponse.json()
      const baseTreeSha = commitData.tree.sha

      // 3. Create a new tree on top of the base tree
      const treeResponse = await fetch(
        `${GITHUB_API}/repos/${this.repository.owner}/${this.repository.repo}/git/trees`,
        {
          method: 'POST',
          headers: this.headers(),
          body: JSON.stringify({
            base_tree: baseTreeSha,
            tree: files.map((file) => ({
              path: file.path,
              mode: '100644',
              type: 'blob',
              content: file.content,
            })),
          }),
        },
      )
      if (!treeResponse.ok) {
        throw new Error(`Failed to create tree: ${treeResponse.status}`)
      }
      const treeData = await treeResponse.json()
      const newTreeSha = treeData.sha

      // 4. Create the commit object
      const newCommitResponse = await fetch(
        `${GITHUB_API}/repos/${this.repository.owner}/${this.repository.repo}/git/commits`,
        {
          method: 'POST',
          headers: this.headers(),
          body: JSON.stringify({
            message: commitMessage,
            tree: newTreeSha,
            parents: [parentSha],
          }),
        },
      )
      if (!newCommitResponse.ok) {
        throw new Error(`Failed to create commit: ${newCommitResponse.status}`)
      }
      const newCommitData = await newCommitResponse.json()
      const newCommitSha = newCommitData.sha

      // 5. Update the branch reference to point to the new commit
      const updateRefResponse = await fetch(
        `${GITHUB_API}/repos/${this.repository.owner}/${this.repository.repo}/git/refs/heads/${this.repository.branch}`,
        {
          method: 'PATCH',
          headers: this.headers(),
          body: JSON.stringify({
            sha: newCommitSha,
            force: false,
          }),
        },
      )
      if (!updateRefResponse.ok) {
        throw new Error(`Failed to update ref: ${updateRefResponse.status}`)
      }
    } catch (error) {
      if (retryCount < 3) {
        // Wait and retry
        await new Promise((resolve) => setTimeout(resolve, 1500))
        return this.commitFiles(files, commitMessage, retryCount + 1)
      }
      throw error
    }
  }

  static buildCommitMessage(metadata: SubmissionMetadata): string {
    return `Solved ${metadata.platform} ${metadata.problemId}`
  }
}
