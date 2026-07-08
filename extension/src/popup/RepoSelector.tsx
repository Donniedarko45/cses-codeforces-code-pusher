import { useEffect, useState } from "react";
import {
  GitHubRepoService,
  type GitHubRepo,
} from "../services/github/githubRepoService";
import { SecureStorage } from "../storage/secureStorage";
import type { RepositoryConfig } from "../types";

interface RepoSelectorProps {
  connected: boolean;
  currentRepo: string;
  onRepoSelected: () => void;
}

export const RepoSelector = ({
  connected,
  currentRepo,
  onRepoSelected,
}: RepoSelectorProps) => {
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newRepoName, setNewRepoName] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRepos = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await SecureStorage.getToken();
      if (!token) return;
      const userRepos = await GitHubRepoService.listUserRepos(token);
      setRepos(userRepos);
    } catch (err: any) {
      setError(String(err?.message ?? err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (showPicker && connected) {
      void fetchRepos();
    }
  }, [showPicker, connected]);

  const selectRepo = async (repo: GitHubRepo) => {
    const config: RepositoryConfig = {
      owner: repo.owner.login,
      repo: repo.name,
      branch: repo.default_branch,
    };
    await SecureStorage.setRepository(config);
    setShowPicker(false);
    onRepoSelected();
  };

  const saveManualRepo = async () => {
    const parts = manualInput.trim().split("/");
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      setError("Enter in format: owner/repo");
      return;
    }
    const config: RepositoryConfig = {
      owner: parts[0],
      repo: parts[1],
      branch: "main",
    };
    await SecureStorage.setRepository(config);
    setShowManual(false);
    setManualInput("");
    onRepoSelected();
  };

  const createNewRepo = async () => {
    if (!newRepoName.trim()) {
      setError("Enter a repo name");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const token = await SecureStorage.getToken();
      if (!token) throw new Error("Not connected");
      const repo = await GitHubRepoService.createRepo(
        token,
        newRepoName.trim(),
      );
      await selectRepo(repo);
      setShowCreate(false);
      setNewRepoName("");
    } catch (err: any) {
      setError(String(err?.message ?? err));
    } finally {
      setCreating(false);
    }
  };

  if (!connected) {
    return (
      <div className="repo-selector">
        <p className="repo-hint">Connect to GitHub first</p>
      </div>
    );
  }

  return (
    <div className="repo-selector">
      <div className="repo-current">
        <span className="repo-label">Target repo:</span>
        <strong className="repo-name">
          {currentRepo === "Not selected" ? "—" : currentRepo}
        </strong>
      </div>

      <div className="repo-actions">
        <button
          type="button"
          className="btn btn--sm btn--secondary"
          onClick={() => {
            setShowPicker(!showPicker);
            setShowManual(false);
            setShowCreate(false);
          }}
        >
          {showPicker ? "Cancel" : "Choose Repo"}
        </button>
        <button
          type="button"
          className="btn btn--sm btn--secondary"
          onClick={() => {
            setShowManual(!showManual);
            setShowPicker(false);
            setShowCreate(false);
          }}
        >
          Enter Manually
        </button>
        <button
          type="button"
          className="btn btn--sm btn--accent"
          onClick={() => {
            setShowCreate(!showCreate);
            setShowPicker(false);
            setShowManual(false);
          }}
        >
          + New Repo
        </button>
      </div>

      {showPicker && (
        <div className="repo-list">
          {loading && <p className="repo-hint">Loading repos…</p>}
          {!loading && repos.length === 0 && (
            <p className="repo-hint">No repos found</p>
          )}
          {repos.map((repo) => (
            <button
              key={repo.full_name}
              type="button"
              className="repo-item"
              onClick={() => selectRepo(repo)}
            >
              <span className="repo-item-name">{repo.full_name}</span>
              {repo.private && <span className="repo-badge">Private</span>}
            </button>
          ))}
        </div>
      )}

      {showManual && (
        <div className="repo-manual">
          <input
            type="text"
            className="input"
            placeholder="owner/repo"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && saveManualRepo()}
          />
          <button
            type="button"
            className="btn btn--sm btn--primary"
            onClick={saveManualRepo}
          >
            Save
          </button>
        </div>
      )}

      {showCreate && (
        <div className="repo-manual">
          <input
            type="text"
            className="input"
            placeholder="my-cp-solutions"
            value={newRepoName}
            onChange={(e) => setNewRepoName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createNewRepo()}
          />
          <button
            type="button"
            className="btn btn--sm btn--primary"
            onClick={createNewRepo}
            disabled={creating}
          >
            {creating ? "Creating…" : "Create"}
          </button>
        </div>
      )}

      {error && <div className="gh-error">{error}</div>}
    </div>
  );
};
