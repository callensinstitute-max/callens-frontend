import { getCurrentIdToken } from "../auth/firebase";

const DEFAULT_API_URL = "https://callens-ai-worker.callens-institute.workers.dev";
const rawApiUrl = import.meta.env.VITE_API_URL?.trim() || DEFAULT_API_URL;
const inFlightRequests = new Map();

function normalizeApiUrl(url) {
  return String(url || "").replace(/\/+$/, "");
}

function normalizeForRequestKey(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ");
}

export const API_URL = normalizeApiUrl(rawApiUrl);
export const IS_CUSTOM_API_CONFIGURED = Boolean(API_URL);

export async function streamMessage(message, _chatId, _model, onToken, _displayMessage, _workspaceRoot, signal) {
  const idToken = await getCurrentIdToken();

  if (!idToken) {
    throw new Error("Your session has expired. Please sign in again.");
  }

  const requestBody = { message };
  const requestKey = `stream:${normalizeForRequestKey(message)}`;

  if (inFlightRequests.has(requestKey)) {
    return inFlightRequests.get(requestKey);
  }

  const requestPromise = (async () => {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      signal,
      body: JSON.stringify(requestBody),
    });

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      throw new Error(String(payload?.error || "Something went wrong"));
    }

    const payload = await res.json();
    const finalMessage = String(payload?.reply || "").trim();
    if (!finalMessage) {
      throw new Error("Something went wrong");
    }

    if (typeof onToken === "function") onToken(finalMessage);
    return finalMessage;
  })();

  inFlightRequests.set(requestKey, requestPromise);
  try {
    return await requestPromise;
  } finally {
    inFlightRequests.delete(requestKey);
  }
}
