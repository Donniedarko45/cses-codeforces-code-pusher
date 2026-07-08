import { useState } from "react";
import { SectionTabs, type SectionKey } from "../components/layout/SectionTabs";
import { Card } from "../components/ui/Card";
import { useExtensionState } from "../hooks/useExtensionState";
import { GitHubConnect } from "./GitHubConnect";
import { RepoSelector } from "./RepoSelector";
import { SettingsPanel } from "./SettingsPanel";

export const AppShell = () => {
  const [section, setSection] = useState<SectionKey>("Dashboard");
  const { stats, history, queue, refresh } = useExtensionState();

  return (
    <main className="app-shell">
      <header>
        <h1>CP Auto Sync</h1>
        <p>Codeforces + CSES → GitHub automation</p>
      </header>

      <SectionTabs selected={section} onSelect={setSection} />

      {/* ─── Dashboard ─── */}
      {section === "Dashboard" && (
        <div className="dashboard">
          <Card title="GitHub Account">
            <GitHubConnect
              connected={stats.githubConnected}
              username={stats.githubUsername}
              clientIdConfigured={stats.clientIdConfigured}
              onConnected={refresh}
            />
          </Card>

          <Card title="Repository">
            <RepoSelector
              connected={stats.githubConnected}
              currentRepo={stats.repository}
              onRepoSelected={refresh}
            />
          </Card>

          <div className="grid">
            <Card title="Problems Synced">
              <strong>{stats.syncedCount}</strong>
            </Card>
            <Card title="Pending Uploads">
              <strong>{stats.pendingUploads}</strong>
            </Card>
            <Card title="Today Uploads">
              <strong>{stats.todayUploads}</strong>
            </Card>
            <Card title="Latest Commit">
              <strong className="truncate">{stats.latestCommitMessage}</strong>
            </Card>
          </div>

          {queue.length > 0 && (
            <Card title="Sync Queue Details">
              <ul className="queue-list">
                {queue.map((item) => (
                  <li key={item.metadata.submissionId} className="queue-item">
                    <div className="queue-item-header">
                      <span className="queue-bullet">⏳</span>
                      <strong style={{ minWidth: '80px', color: 'var(--text-muted)' }}>
                        {item.metadata.platform}
                      </strong>
                      <span className="truncate" style={{ flex: 1, marginRight: '8px' }}>
                        {item.metadata.problemName}
                      </span>
                      {item.retryCount !== undefined && item.retryCount > 0 && (
                        <span style={{ fontSize: '0.7rem', opacity: 0.7, marginLeft: 'auto', whiteSpace: 'nowrap' }}>
                          (Attempt {item.retryCount + 1}/4)
                        </span>
                      )}
                    </div>
                    {item.status === "failed" && item.error && (
                      <div className="queue-error">
                        {item.error}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}

      {/* ─── Sync History ─── */}
      {section === "Sync History" && (
        <Card title="Recent Sync Results">
          <ul className="history">
            {history.length === 0 && <li>Nothing synced yet.</li>}
            {history.slice(0, 20).map((item) => (
              <li key={item.metadata.submissionId} className="history-item">
                <span
                  className={`history-status history-status--${item.status}`}
                >
                  {item.status === "uploaded"
                    ? "✓"
                    : item.status === "pending"
                      ? "⏳"
                      : "✗"}
                </span>
                <span className="history-platform">
                  {item.metadata.platform}
                </span>
                <span className="history-name">
                  {item.metadata.problemName}
                </span>
                {item.error && (
                  <span className="history-error">{item.error}</span>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* ─── Settings ─── */}
      {section === "Settings" && (
        <SettingsPanel onSettingsChanged={refresh} />
      )}

      {/* ─── Account ─── */}
      {section === "Account" && (
        <Card title="GitHub Account">
          <GitHubConnect
            connected={stats.githubConnected}
            username={stats.githubUsername}
            clientIdConfigured={stats.clientIdConfigured}
            onConnected={refresh}
          />
        </Card>
      )}

      {/* ─── Repositories ─── */}
      {section === "Repositories" && (
        <Card title="Repository Configuration">
          <RepoSelector
            connected={stats.githubConnected}
            currentRepo={stats.repository}
            onRepoSelected={refresh}
          />
        </Card>
      )}

      {/* ─── Statistics ─── */}
      {section === "Statistics" && (
        <div className="stats-panel">
          <Card title="Overview">
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-value">{stats.syncedCount}</span>
                <span className="stat-label">Total Synced</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{stats.todayUploads}</span>
                <span className="stat-label">Today</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{stats.pendingUploads}</span>
                <span className="stat-label">Pending</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">
                  {history.filter((i) => i.status === "failed").length}
                </span>
                <span className="stat-label">Failed</span>
              </div>
            </div>
          </Card>
          <Card title="Platform Breakdown">
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-value">
                  {
                    history.filter(
                      (i) => i.metadata.platform === "Codeforces",
                    ).length
                  }
                </span>
                <span className="stat-label">Codeforces</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">
                  {
                    history.filter((i) => i.metadata.platform === "CSES")
                      .length
                  }
                </span>
                <span className="stat-label">CSES</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      <footer>
        <button
          type="button"
          className="btn btn--primary btn--full"
          onClick={() =>
            chrome.runtime.sendMessage({ type: "SYNC_ALL_PENDING" })
          }
        >
          Sync All Pending Solutions
        </button>
      </footer>
    </main>
  );
};
