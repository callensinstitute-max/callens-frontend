const rawApiUrl = import.meta.env.VITE_API_URL?.trim() || "";
const USER_ID_STORAGE_KEY = "callens-user-id";

function normalizeApiUrl(url) {
  return url.replace(/\/+$/, "");
}

export const API_URL = normalizeApiUrl(rawApiUrl);

export const IS_CUSTOM_API_CONFIGURED = Boolean(API_URL);

console.log(API_URL);

function getOrCreateUserId() {
  const existing = window.localStorage.getItem(USER_ID_STORAGE_KEY);
  if (existing) return existing;

  const next =
    window.crypto?.randomUUID?.() ||
    `user-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  window.localStorage.setItem(USER_ID_STORAGE_KEY, next);
  return next;
}

function buildMemoryUrl() {
  const userId = encodeURIComponent(getOrCreateUserId());
  return `${API_URL}/memory?userId=${userId}`;
}

async function readErrorDetails(res) {
  let details = `Request failed with status ${res.status}`;

  try {
    const errorBody = await res.json();
    details = errorBody.detail
      ? JSON.stringify(errorBody.detail)
      : errorBody.error || errorBody.message || JSON.stringify(errorBody);
  } catch {
    const errorText = await res.text();
    if (errorText) details = errorText;
  }

  return details;
}

// ===============================
// 💬 STREAM MESSAGE
// ===============================
export async function streamMessage(
  message,
  chatId,
  model,
  onToken,
  displayMessage,
  workspaceRoot,
  signal
) {
  const userId = getOrCreateUserId();
  const res = await fetch(`${API_URL}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    signal,
    body: JSON.stringify({
      message,
      chat_id: chatId,
      userId,
      stream: true,
      model,
      display_message: displayMessage,
      workspace_root: workspaceRoot,
    }),
  });

  if (!res.ok) {
    throw new Error(await readErrorDetails(res));
  }

  const contentType = res.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const payload = await res.json();
    const finalMessage =
      payload?.message || payload?.reply || "No message returned.";

    if (onToken) onToken(finalMessage);
    return finalMessage;
  }

  if (!res.body) throw new Error("No response body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let fullText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    fullText += chunk;

    if (onToken) onToken(chunk);
  }

  return fullText;
}

// ===============================
// 📁 FILE UPLOAD
// ===============================
export async function uploadFile(
  file,
  chatId,
  model = "auto",
  prompt = "",
  displayMessage = "",
  workspaceRoot = "",
  signal
) {
  const formData = new FormData();
  formData.append("file", file);
  if (chatId) formData.append("chat_id", chatId);
  formData.append("model", model);
  if (prompt) formData.append("prompt", prompt);
  if (displayMessage) formData.append("display_message", displayMessage);
  if (workspaceRoot) formData.append("workspace_root", workspaceRoot);

  const res = await fetch(`${API_URL}/upload`, {
    method: "POST",
    signal,
    body: formData,
  });

  if (!res.ok) {
    throw new Error(`Upload failed: ${res.status}`);
  }

  return res.json();
}

// ===============================
// 🧠 CREATE CHAT
// ===============================
export async function createChat() {
  const res = await fetch(`${API_URL}/chats`, {
    method: "POST",
  });

  if (!res.ok) {
    throw new Error(`Failed to create chat: ${res.status}`);
  }

  return res.json();
}

// ===============================
// 📜 GET CHATS (Sidebar)
// ===============================
export async function getChats() {
  const res = await fetch(`${API_URL}/chats`);
  if (res.status === 404) {
    return [];
  }
  if (!res.ok) {
    throw new Error(`Failed to load chats: ${res.status}`);
  }
  return res.json();
}

export async function getWorkspaces() {
  const res = await fetch(`${API_URL}/workspaces`);
  if (res.status === 404) {
    return {
      current: "",
      items: [],
    };
  }
  if (!res.ok) {
    throw new Error(`Failed to load workspaces: ${res.status}`);
  }
  return res.json();
}

export async function pickWorkspace() {
  const res = await fetch(`${API_URL}/workspaces/pick`, {
    method: "POST",
  });
  if (!res.ok) {
    throw new Error(`Failed to pick workspace: ${res.status}`);
  }
  return res.json();
}

export async function deleteChat(chatId) {
  const res = await fetch(`${API_URL}/chats/${chatId}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    throw new Error(`Failed to delete chat: ${res.status}`);
  }

  return res.json();
}

export async function renameChat(chatId, title) {
  const res = await fetch(`${API_URL}/chats/${chatId}/title`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title }),
  });

  if (!res.ok) {
    throw new Error(`Failed to rename chat: ${res.status}`);
  }

  return res.json();
}

export async function getMemory() {
  const res = await fetch(buildMemoryUrl());
  if (!res.ok) {
    throw new Error(`Failed to load memory: ${res.status}`);
  }
  const data = await res.json();

  if (Array.isArray(data.items)) {
    return {
      facts: data.items.map((item) => ({
        id: item.memoryId || item.id || `${item.userId}-${item.key}`,
        text: item.text || item.value || "",
        category: item.category || "memory",
        times_seen: item.timesSeen || 1,
      })),
      episodes: [],
    };
  }

  return data;
}

export async function clearMemory() {
  const res = await fetch(buildMemoryUrl(), {
    method: "DELETE",
  });

  if (!res.ok) {
    throw new Error(`Failed to clear memory: ${res.status}`);
  }

  return res.json();
}

export async function addMemoryFact(text, category = "manual") {
  const res = await fetch(buildMemoryUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userId: getOrCreateUserId(),
      text,
      category,
      message: text,
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to add memory: ${res.status}`);
  }

  const data = await res.json();

  if (Array.isArray(data.saved) && data.saved[0]) {
    return data.saved[0];
  }

  return data;
}

export async function updateMemoryFact(factId, text, category = "manual") {
  return addMemoryFact(text, category || "manual");
}

export async function deleteMemoryFact(factId) {
  throw new Error(`Delete memory is not supported by the cloud worker yet: ${factId}`);
}

export async function deleteMemoryEpisode(episodeId) {
  throw new Error(`Delete memory episode is not supported by the cloud worker yet: ${episodeId}`);
}
