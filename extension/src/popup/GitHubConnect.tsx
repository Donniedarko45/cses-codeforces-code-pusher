import { useEffect, useState } from "react";
import { GitHubAuthService } from "../services/github/githubAuthService";

export const GitHubConnect = ({ connected }: { connected: boolean }) => {
  const [loading, setLoading] = useState(false);
  const [userCode, setUserCode] = useState<string | null>(null);
  const [verificationUri, setVerificationUri] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      setLoading(false);
    };
  }, []);

  const startConnect = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const device = await GitHubAuthService.startDeviceFlow("repo");
      setUserCode(device.user_code);
      setVerificationUri(device.verification_uri);

      // Open the verification URL so the user can enter the code
      chrome.tabs.create({ url: device.verification_uri });

      setMessage(
        "Waiting for you to complete verification in the opened tab...",
      );

      const token = await GitHubAuthService.pollForToken(
        device.device_code,
        device.interval ?? 5,
      );
      await GitHubAuthService.savePersonalAccessToken(token);
      setMessage("Connected to GitHub — token saved.");
      // refresh popup state
      setTimeout(() => location.reload(), 500);
    } catch (err: any) {
      setMessage(String(err?.message ?? err));
    } finally {
      setLoading(false);
    }
  };

  const connectWithPAT = async () => {
    const token = window
      .prompt("Paste your GitHub Personal Access Token (repo scope):")
      ?.trim();
    if (!token) return;
    setLoading(true);
    try {
      await GitHubAuthService.savePersonalAccessToken(token);
      setMessage("Token saved — connected.");
      setTimeout(() => location.reload(), 300);
    } catch (err: any) {
      setMessage(String(err?.message ?? err));
    } finally {
      setLoading(false);
    }
  };

  const disconnect = async () => {
    setLoading(true);
    await GitHubAuthService.logout();
    location.reload();
  };

  return (
    <div>
      {connected ? (
        <div>
          <div>Connected to GitHub</div>
          <button type="button" onClick={disconnect} disabled={loading}>
            Disconnect GitHub
          </button>
        </div>
      ) : (
        <div>
          <button type="button" onClick={startConnect} disabled={loading}>
            Connect with GitHub (OAuth Device Flow)
          </button>
          <button
            type="button"
            onClick={connectWithPAT}
            disabled={loading}
            style={{ marginLeft: 8 }}
          >
            Paste Personal Access Token
          </button>
          {userCode && (
            <div style={{ marginTop: 8 }}>
              <div>
                Enter code: <strong>{userCode}</strong>
              </div>
              <div>
                Verification URL:{" "}
                <a
                  href={verificationUri ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                >
                  {verificationUri}
                </a>
              </div>
            </div>
          )}
        </div>
      )}
      {message && <div style={{ marginTop: 8 }}>{message}</div>}
    </div>
  );
};
