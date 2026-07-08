import { platformAdapters } from "../platforms";

const detectAndSend = (): void => {
  const html = document.documentElement.outerHTML;
  const adapter = platformAdapters.find((candidate) =>
    candidate.detectAccepted({ url: location.href, html }),
  );

  if (!adapter) {
    return;
  }

  const metadata = adapter.extractMetadata(document, location.href);
  const sourceCode = adapter.extractCode(document);

  if (!metadata || !sourceCode) {
    return;
  }

  chrome.runtime.sendMessage({
    type: "NEW_ACCEPTED_SUBMISSION",
    payload: { metadata, sourceCode },
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
