import { useState } from "react";
import { GitHubAuthService } from "../services/github/githubAuthService";

interface GitHubConnectProps {
  connected: boolean;
  username: string;
  clientIdConfigured: boolean;
  onConnected: () => void;
}

export const GitHubConnect = ({
  connected,
  username,
  clientIdConfigured,
  onConnected,
}: GitHubConnectProps) => {
  const [loading, setLoading] = useState(false);
  const [userCode, setUserCode] = useState<string | null>(null);
  const [verificationUrl, setVerificationUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startConnect = async () => {
    setLoading(true);
    setError(null);
    setCopied(false);
    try {
      const device = await GitHubAuthService.startDeviceFlow("repo");
      setUserCode(device.user_code);
      setVerificationUrl(
        device.verification_uri_complete ?? device.verification_uri,
      );

      // Kick off polling in the background service worker (survives popup close)
      chrome.runtime.sendMessage({
        type: "GITHUB_DEVICE_POLL",
        payload: {
          deviceCode: device.device_code,
          interval: device.interval ?? 5,
        },
      });
    } catch (err: any) {
      setError(String(err?.message ?? err));
    } finally {
      setLoading(false);
    }
  };

  const copyCode = async () => {
    if (!userCode) return;
    try {
      await navigator.clipboard.writeText(userCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select text
    }
  };

  const openGitHub = () => {
    if (!verificationUrl) return;
    // Opening in a new tab will close this popup — that's fine,
    // the background script is already polling for the token.
    chrome.tabs.create({ url: verificationUrl });
  };

  const disconnect = async () => {
    setLoading(true);
    await GitHubAuthService.logout();
    onConnected();
  };

  if (connected) {
    return (
      <div className="gh-connect">
        <div className="gh-connected-info">
          <div className="gh-avatar-placeholder">
            {username.charAt(0).toUpperCase()}
          </div>
          <div className="gh-user-details">
            <span className="gh-username">{username}</span>
            <span className="gh-status gh-status--connected">
              <span className="gh-status-dot" />
              Connected
            </span>
          </div>
        </div>
        <button
          type="button"
          className="btn btn--danger btn--sm"
          onClick={disconnect}
          disabled={loading}
        >
          Disconnect
        </button>
      </div>
    );
  }

  if (!clientIdConfigured) {
    return (
      <div className="gh-connect">
        <div className="gh-setup-needed">
          <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
          </svg>
          <div>
            <p className="gh-setup-title">GitHub not configured</p>
            <p className="gh-setup-desc">
              Go to <strong>Settings</strong> to enter your OAuth Client ID or
              paste a Personal Access Token.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show the device code flow UI
  if (userCode) {
    return (
      <div className="gh-connect">
        <div className="gh-device-code">
          <p className="gh-device-step">Step 1: Copy your code</p>
          <div className="gh-code-row">
            <code className="gh-code-display">{userCode}</code>
            <button
              type="button"
              className="btn btn--sm btn--secondary"
              onClick={copyCode}
            >
              {copied ? "✓ Copied" : "Copy"}
            </button>
          </div>

          <p className="gh-device-step" style={{ marginTop: 12 }}>
            Step 2: Open GitHub & paste the code
          </p>
          <button
            type="button"
            className="btn btn--github btn--sm"
            onClick={openGitHub}
          >
            Open GitHub Verification
          </button>

          <p className="gh-hint">
            After authorizing, reopen this popup — you'll be connected
            automatically.
          </p>
        </div>

        {error && <div className="gh-error">{error}</div>}
      </div>
    );
  }

  return (
    <div className="gh-connect">
      <button
        type="button"
        className="btn btn--github"
        onClick={startConnect}
        disabled={loading}
      >
        <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
        </svg>
        {loading ? "Getting code…" : "Connect with GitHub"}
      </button>

      {error && <div className="gh-error">{error}</div>}
    </div>
  );
};
