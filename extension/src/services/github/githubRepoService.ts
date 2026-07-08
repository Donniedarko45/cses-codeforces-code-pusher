import type { RepositoryConfig, SubmissionMetadata } from '../../types'

const GITHUB_API = 'https://api.github.com'

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
  ): Promise<void> {
    const encoded = btoa(unescape(encodeURIComponent(content)))
    const response = await fetch(
      `${GITHUB_API}/repos/${this.repository.owner}/${this.repository.repo}/contents/${path}`,
      {
        method: 'PUT',
        headers: this.headers(),
        body: JSON.stringify({
          message: commitMessage,
          content: encoded,
          branch: this.repository.branch,
        }),
      },
    )

    if (!response.ok) {
      throw new Error(`GitHub upload failed for ${path}: ${response.status}`)
    }
  }

  static buildCommitMessage(metadata: SubmissionMetadata): string {
    return `Solved ${metadata.platform} ${metadata.problemId}`
  }
}
