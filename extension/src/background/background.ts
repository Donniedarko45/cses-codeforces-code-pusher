import { SyncQueueService } from "../services/sync/syncQueueService";
import { GitHubAuthService } from "../services/github/githubAuthService";
import type { SubmissionMetadata } from "../types";
import { processPendingSync } from "./syncProcessor";

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create("sync-pending-solutions", { periodInMinutes: 1 });
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "sync-pending-solutions") {
    await processPendingSync();
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "NEW_ACCEPTED_SUBMISSION") {
    const { metadata, sourceCode, readmeContent } = message.payload as {
      metadata: SubmissionMetadata;
      sourceCode: string;
      readmeContent?: string;
    };

    void SyncQueueService.enqueue(metadata, sourceCode, readmeContent).then((enqueued) => {
      sendResponse({ enqueued });
      if (enqueued) {
        void processPendingSync();
      }
    });

    return true;
  }

  if (message?.type === "SYNC_ALL_PENDING") {
    void processPendingSync().then(() => sendResponse({ ok: true }));
    return true;
  }

  // Handle GitHub Device Flow polling in the background so it survives popup close
  if (message?.type === "GITHUB_DEVICE_POLL") {
    const { deviceCode, interval } = message.payload as {
      deviceCode: string;
      interval: number;
    };

    void (async () => {
      try {
        const token = await GitHubAuthService.pollForToken(deviceCode, interval);
        await GitHubAuthService.saveTokenAndFetchUser(token);
        // Show a notification so the user knows it worked
        chrome.notifications.create("github-connected", {
          type: "basic",
          iconUrl: "https://github.githubassets.com/favicons/favicon.png",
          title: "CP Auto Sync",
          message: "Successfully connected to GitHub! Open the extension popup to continue.",
        });
        sendResponse({ ok: true });
      } catch (err: any) {
        chrome.notifications.create("github-error", {
          type: "basic",
          iconUrl: "https://github.githubassets.com/favicons/favicon.png",
          title: "CP Auto Sync",
          message: `GitHub connection failed: ${err?.message ?? err}`,
        });
        sendResponse({ ok: false, error: String(err?.message ?? err) });
      }
    })();

    return true;
  }

  return false;
});
