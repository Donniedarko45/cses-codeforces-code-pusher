import { useEffect, useState } from "react";
import { SecureStorage } from "../storage/secureStorage";
import { GitHubAuthService } from "../services/github/githubAuthService";
import type { ExtensionSettings } from "../types";

interface SettingsPanelProps {
  onSettingsChanged: () => void;
}

export const SettingsPanel = ({ onSettingsChanged }: SettingsPanelProps) => {
  const [clientId, setClientId] = useState("");
  const [patInput, setPatInput] = useState("");
  const [settings, setSettings] = useState<ExtensionSettings | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      const [storedClientId, storedSettings] = await Promise.all([
        SecureStorage.getClientId(),
        SecureStorage.getSettings(),
      ]);
      if (storedClientId) setClientId(storedClientId);
      setSettings(storedSettings);
    })();
  }, []);

  const saveClientId = async () => {
    const trimmed = clientId.trim();
    if (!trimmed) {
      setError("Client ID cannot be empty");
      return;
    }
    await SecureStorage.setClientId(trimmed);
    setMessage("OAuth Client ID saved");
    setError(null);
    onSettingsChanged();
    setTimeout(() => setMessage(null), 2000);
  };

  const savePatToken = async () => {
    const trimmed = patInput.trim();
    if (!trimmed) {
      setError("Token cannot be empty");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const user = await GitHubAuthService.saveTokenAndFetchUser(trimmed);
      setMessage(`Connected as ${user.login}`);
      setPatInput("");
      onSettingsChanged();
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setError(`Invalid token: ${err?.message ?? err}`);
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = async <K extends keyof ExtensionSettings>(
    key: K,
    value: ExtensionSettings[K],
  ) => {
    if (!settings) return;
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    await SecureStorage.updateSettings({ [key]: value });
  };

  if (!settings) return null;

  return (
    <div className="settings-panel">
      {/* OAuth Client ID */}
      <fieldset className="settings-group">
        <legend>GitHub OAuth App</legend>
        <p className="settings-desc">
          Create an OAuth App at{" "}
          <a
            href="https://github.com/settings/developers"
            target="_blank"
            rel="noreferrer"
            className="settings-link"
          >
            github.com/settings/developers
          </a>{" "}
          and paste the Client ID below. Set the callback URL to{" "}
          <code>https://github.com/login/device/callback</code>.
        </p>
        <div className="settings-row">
          <input
            type="text"
            className="input"
            placeholder="Ov23li..."
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && saveClientId()}
          />
          <button
            type="button"
            className="btn btn--sm btn--primary"
            onClick={saveClientId}
          >
            Save
          </button>
        </div>
      </fieldset>

      {/* PAT Fallback */}
      <fieldset className="settings-group">
        <legend>Personal Access Token (Fallback)</legend>
        <p className="settings-desc">
          Alternatively, paste a{" "}
          <a
            href="https://github.com/settings/tokens/new?scopes=repo"
            target="_blank"
            rel="noreferrer"
            className="settings-link"
          >
            GitHub PAT
          </a>{" "}
          with <code>repo</code> scope.
        </p>
        <div className="settings-row">
          <input
            type="password"
            className="input"
            placeholder="ghp_..."
            value={patInput}
            onChange={(e) => setPatInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && savePatToken()}
          />
          <button
            type="button"
            className="btn btn--sm btn--primary"
            onClick={savePatToken}
            disabled={saving}
          >
            {saving ? "Verifying…" : "Connect"}
          </button>
        </div>
      </fieldset>

      {/* Sync Settings */}
      <fieldset className="settings-group">
        <legend>Sync Preferences</legend>

        <label className="settings-toggle">
          <input
            type="checkbox"
            checked={settings.autoSync}
            onChange={(e) => updateSetting("autoSync", e.target.checked)}
          />
          <span>Auto-sync accepted submissions</span>
        </label>

        <div className="settings-field">
          <label htmlFor="commit-template">Commit message template</label>
          <input
            id="commit-template"
            type="text"
            className="input"
            value={settings.commitTemplate}
            onChange={(e) => updateSetting("commitTemplate", e.target.value)}
          />
        </div>

        <div className="settings-field">
          <label htmlFor="default-branch">Default branch</label>
          <input
            id="default-branch"
            type="text"
            className="input"
            value={settings.defaultBranch}
            onChange={(e) => updateSetting("defaultBranch", e.target.value)}
          />
        </div>

        <div className="settings-field">
          <label htmlFor="root-folder">Root folder</label>
          <input
            id="root-folder"
            type="text"
            className="input"
            value={settings.rootFolder}
            onChange={(e) => updateSetting("rootFolder", e.target.value)}
          />
        </div>
      </fieldset>

      {/* Platform toggles */}
      <fieldset className="settings-group">
        <legend>Platforms</legend>
        <label className="settings-toggle">
          <input
            type="checkbox"
            checked={settings.enabledPlatforms.includes("Codeforces")}
            onChange={(e) => {
              const platforms = e.target.checked
                ? [...settings.enabledPlatforms, "Codeforces" as const]
                : settings.enabledPlatforms.filter((p) => p !== "Codeforces");
              updateSetting("enabledPlatforms", platforms);
            }}
          />
          <span>Codeforces</span>
        </label>
        <label className="settings-toggle">
          <input
            type="checkbox"
            checked={settings.enabledPlatforms.includes("CSES")}
            onChange={(e) => {
              const platforms = e.target.checked
                ? [...settings.enabledPlatforms, "CSES" as const]
                : settings.enabledPlatforms.filter((p) => p !== "CSES");
              updateSetting("enabledPlatforms", platforms);
            }}
          />
          <span>CSES</span>
        </label>
      </fieldset>

      {message && <div className="gh-success">{message}</div>}
      {error && <div className="gh-error">{error}</div>}
    </div>
  );
};
