import { platformAdapters } from "../platforms";

const detectAndSend = async (): Promise<void> => {
  const html = document.documentElement.outerHTML;
  const adapter = platformAdapters.find((candidate) =>
    candidate.detectAccepted({ url: location.href, html }),
  );

  if (!adapter) {
    return;
  }

  const metadata = await adapter.extractMetadata(document, location.href);
  const sourceCode = await adapter.extractCode(document, location.href);

  if (!metadata || !sourceCode) {
    return;
  }

  let readmeContent: string | undefined;
  if (adapter.fetchProblemStatement) {
    readmeContent = await adapter.fetchProblemStatement(metadata.problemUrl);
  }

  chrome.runtime.sendMessage({
    type: "NEW_ACCEPTED_SUBMISSION",
    payload: { metadata, sourceCode, readmeContent },
  });
};

let debounceTimer: number | null = null;
const observer = new MutationObserver(() => {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = window.setTimeout(() => {
    detectAndSend();
  }, 750);
});

observer.observe(document.documentElement, {
  childList: true,
  subtree: true,
});

detectAndSend();
