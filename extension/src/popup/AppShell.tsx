import { useState } from "react";
import { SectionTabs, type SectionKey } from "../components/layout/SectionTabs";
import { Card } from "../components/ui/Card";
import { useExtensionState } from "../hooks/useExtensionState";
import { GitHubConnect } from "./GitHubConnect";

export const AppShell = () => {
  const [section, setSection] = useState<SectionKey>("Dashboard");
  const { stats, history } = useExtensionState();

  return (
    <main className="app-shell">
      <header>
        <h1>CP Auto Sync</h1>
        <p>Codeforces + CSES GitHub automation</p>
      </header>

      <SectionTabs selected={section} onSelect={setSection} />

      {section === "Dashboard" && (
        <div className="grid">
          <Card title="GitHub Account">
            <GitHubConnect connected={stats.githubConnected} />
          </Card>
          <Card title="Repository">
            <strong>{stats.repository}</strong>
          </Card>
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
            <strong>{stats.latestCommitMessage}</strong>
          </Card>
        </div>
      )}

      {section === "Sync History" && (
        <Card title="Recent Sync Results">
          <ul className="history">
            {history.length === 0 && <li>Nothing synced yet.</li>}
            {history.slice(0, 10).map((item) => (
              <li key={item.metadata.submissionId}>
                {item.status === "uploaded"
                  ? "✓"
                  : item.status === "pending"
                    ? "⏳"
                    : "❌"}{" "}
                {item.metadata.platform} — {item.metadata.problemName}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {section !== "Dashboard" && section !== "Sync History" && (
        <Card title={section}>
          <p>This section is wired for extension settings and controls.</p>
        </Card>
      )}

      <footer>
        <button
          type="button"
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
