import { SecureStorage } from "../../storage/secureStorage";

const DEVICE_CODE_ENDPOINT = "https://github.com/login/device/code";
const ACCESS_TOKEN_ENDPOINT = "https://github.com/login/oauth/access_token";

type DeviceCodeResponse = {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval?: number;
};

export class GitHubAuthService {
  static getClientId(): string | null {
    const manifest = chrome.runtime.getManifest() as any;
    return manifest?.oauth2?.client_id ?? null;
  }

  // Start GitHub Device Flow. Returns device info (user_code, verification_uri) and begins polling.
  static async startDeviceFlow(scope = "repo"): Promise<DeviceCodeResponse> {
    const clientId = GitHubAuthService.getClientId();
    if (!clientId || clientId.includes("REPLACE_WITH")) {
      throw new Error("OAuth client id is not configured in the manifest.");
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

    const data = (await resp.json()) as DeviceCodeResponse;
    return data;
  }

  // Poll for access token using device_code. Resolves to access_token or throws.
  static async pollForToken(
    deviceCode: string,
    interval = 5,
    clientId?: string,
  ): Promise<string> {
    const cid = clientId ?? GitHubAuthService.getClientId();
    if (!cid) throw new Error("Missing client id");

    const params = new URLSearchParams({
      client_id: cid,
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

  static async login(): Promise<void> {
    // Backwards compatibility: try to run device flow and save token
    const device = await GitHubAuthService.startDeviceFlow("repo");

    // Open verification URL in a new tab for the user to authenticate
    chrome.tabs.create({ url: device.verification_uri });

    const token = await GitHubAuthService.pollForToken(
      device.device_code,
      device.interval ?? 5,
    );
    await SecureStorage.setToken(token);
  }

  static async savePersonalAccessToken(token: string): Promise<void> {
    await SecureStorage.setToken(token);
  }

  static async logout(): Promise<void> {
    await SecureStorage.clearToken();
  }

  static async getToken(): Promise<string | null> {
    return SecureStorage.getToken();
  }
}
