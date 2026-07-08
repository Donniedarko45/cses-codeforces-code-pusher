import { SecureStorage } from '../../storage/secureStorage'

const GITHUB_AUTH_ENDPOINT = 'https://github.com/login/oauth/authorize'

export class GitHubAuthService {
  static async login(): Promise<void> {
    const redirectUrl = chrome.identity.getRedirectURL('github')
    const authUrl = `${GITHUB_AUTH_ENDPOINT}?client_id=REPLACE_WITH_GITHUB_OAUTH_APP_CLIENT_ID&scope=repo%20read:user&redirect_uri=${encodeURIComponent(redirectUrl)}`

    await chrome.identity.launchWebAuthFlow({
      url: authUrl,
      interactive: true,
    })

    // In production this code should exchange auth code via secure backend.
    // For local-first extension architecture we only persist PAT entered by user.
  }

  static async savePersonalAccessToken(token: string): Promise<void> {
    await SecureStorage.setToken(token)
  }

  static async logout(): Promise<void> {
    await SecureStorage.clearToken()
  }

  static async getToken(): Promise<string | null> {
    return SecureStorage.getToken()
  }
}
