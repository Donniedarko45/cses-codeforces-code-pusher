import { SecureStorage } from "../../storage/secureStorage";

const DEVICE_CODE_ENDPOINT = "https://github.com/login/device/code";
const ACCESS_TOKEN_ENDPOINT = "https://github.com/login/oauth/access_token";
const GITHUB_API = "https://api.github.com";

type DeviceCodeResponse = {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval?: number;
};

export interface GitHubUser {
  login: string;
  avatar_url: string;
  name: string | null;
}

export class GitHubAuthService {
  /**
   * Get the OAuth client ID from extension storage (not the manifest).
   * Returns null if not yet configured by the user.
   */
  static async getClientId(): Promise<string | null> {
    return SecureStorage.getClientId();
  }

  /**
   * Start GitHub Device Flow.
   * Returns device info (user_code, verification_uri) so the UI can guide the user.
   */
  static async startDeviceFlow(scope = "repo"): Promise<DeviceCodeResponse> {
    const clientId = await GitHubAuthService.getClientId();
    if (!clientId) {
      throw new Error(
        "OAuth Client ID not configured. Go to Settings to set it up.",
      );
    }

    const body = new URLSearchParams({ client_id: clientId, scope });

    const resp = await fetch(DEVICE_CODE_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: body.toString(),
    });

    if (!resp.ok) {
      throw new Error(`Device flow initialization failed: ${resp.status}`);
    }

    return (await resp.json()) as DeviceCodeResponse;
  }

  /**
   * Poll GitHub for the access token after the user has entered their device code.
   * Resolves to the access_token string or throws on error/expiry.
   */
  static async pollForToken(
    deviceCode: string,
    interval = 5,
  ): Promise<string> {
    const clientId = await GitHubAuthService.getClientId();
    if (!clientId) throw new Error("Missing client id");

    const params = new URLSearchParams({
      client_id: clientId,
      device_code: deviceCode,
      grant_type: "urn:ietf:params:oauth:grant-type:device_code",
    });

    while (true) {
      await new Promise((r) => setTimeout(r, interval * 1000));

      const resp = await fetch(ACCESS_TOKEN_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: params.toString(),
      });

      if (!resp.ok) {
        throw new Error(`Token polling failed: ${resp.status}`);
      }

      const json = await resp.json();

      if (json.error) {
        const err = json.error as string;
        if (err === "authorization_pending") {
          continue;
        }
        if (err === "slow_down") {
          interval += 5;
          continue;
        }
        throw new Error(`Device flow error: ${err}`);
      }

      if (json.access_token) {
        return json.access_token as string;
      }
    }
  }

  /**
   * Fetch the authenticated user's profile from GitHub API.
   */
  static async fetchAuthenticatedUser(
    token: string,
  ): Promise<GitHubUser> {
    const resp = await fetch(`${GITHUB_API}/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
    });

    if (!resp.ok) {
      throw new Error(`Failed to fetch GitHub user: ${resp.status}`);
    }

    return (await resp.json()) as GitHubUser;
  }

  /**
   * Save a token (from OAuth or PAT) and fetch+store the username.
   */
  static async saveTokenAndFetchUser(token: string): Promise<GitHubUser> {
    await SecureStorage.setToken(token);
    const user = await GitHubAuthService.fetchAuthenticatedUser(token);
    await SecureStorage.setGithubUsername(user.login);
    return user;
  }

  /**
   * Full logout — clears token, username, and repository.
   */
  static async logout(): Promise<void> {
    await SecureStorage.clearToken();
    await SecureStorage.clearGithubUsername();
    await SecureStorage.clearRepository();
  }

  static async getToken(): Promise<string | null> {
    return SecureStorage.getToken();
  }
}
