import { SyncQueueService } from "../services/sync/syncQueueService";
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
    const { metadata, sourceCode } = message.payload as {
      metadata: SubmissionMetadata;
      sourceCode: string;
    };

    void SyncQueueService.enqueue(metadata, sourceCode).then((enqueued) => {
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

  return false;
});
