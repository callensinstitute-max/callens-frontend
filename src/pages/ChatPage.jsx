import { useEffect, useRef, useState } from "react";
import {
  API_URL,
  IS_CUSTOM_API_CONFIGURED,
  addMemoryFact,
  clearMemory,
  createChat,
  deleteMemoryEpisode,
  deleteMemoryFact,
  deleteChat,
  getMemory,
  getChats,
  getWorkspaces,
  pickWorkspace,
  renameChat,
  streamMessage,
  uploadFile,
  updateMemoryFact,
} from "../api/api";
import MessageBubble from "../components/MessageBubble";
import Sidebar from "../components/Sidebar";

const INTERNAL_MODEL = "auto";
const WORKSPACE_STORAGE_KEY = "callens-selected-workspace";
const isProduction = import.meta.env.PROD;
const isDevelopment = import.meta.env.DEV;
const backendConfigured = !isProduction || IS_CUSTOM_API_CONFIGURED;
const backendStatusLabel = backendConfigured
  ? `Connected backend: ${API_URL}`
  : "Backend not configured";
const STARTER_TILES = [
  {
    title: "Explain This Project",
    description: "Understand a project",
    prompt: "Tell me what this project does. Start by inspecting the selected workspace and explain the main files and purpose clearly.",
    accent: "bg-blue-500/10 text-blue-200 border-blue-500/20",
  },
  {
    title: "Fix A Bug",
    description: "Debug an issue",
    prompt: "Help me debug an issue in this project. Search the workspace, find the likely cause, and explain the fix step by step.",
    accent: "bg-emerald-500/10 text-emerald-200 border-emerald-500/20",
  },
  {
    title: "Read A File",
    description: "Explain a file",
    prompt: "Read the relevant file from this workspace and explain what it does in simple terms.",
    accent: "bg-cyan-500/10 text-cyan-200 border-cyan-500/20",
  },
  {
    title: "Analyze An Image",
    description: "Inspect an image",
    prompt: "Analyze this image clearly and tell me the most important details.",
    accent: "bg-violet-500/10 text-violet-200 border-violet-500/20",
  },
  {
    title: "Plan A Feature",
    description: "Plan the next step",
    prompt: "I want to add a new feature to this project. Inspect the workspace and give me a clean implementation plan.",
    accent: "bg-amber-500/10 text-amber-200 border-amber-500/20",
  },
  {
    title: "Search The Workspace",
    description: "Find the right files",
    prompt: "Search this workspace for the files and code related to my request, then tell me where I should look first.",
    accent: "bg-rose-500/10 text-rose-200 border-rose-500/20",
  },
];

function DotsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
      <circle cx="5" cy="12" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="19" cy="12" r="1.8" />
    </svg>
  );
}

function normalizeChat(chat) {
  return {
    ...chat,
    id: String(chat.id ?? ""),
    title: String(chat.title ?? "").trim(),
    title_mode: String(chat.title_mode ?? "auto"),
    messages: Array.isArray(chat.messages) ? chat.messages : [],
  };
}

function isImageFile(file) {
  return file?.type?.startsWith("image/");
}

function buildAttachmentMessage(file, prompt) {
  const label = isImageFile(file) ? "Attached image" : "Attached file";
  const cleanPrompt = prompt.trim();

  if (!cleanPrompt) {
    return `${label}: ${file.name}`;
  }

  return `${label}: ${file.name}\nPrompt: ${cleanPrompt}`;
}

function getDefaultAttachmentPrompt(file) {
  if (isImageFile(file)) {
    return "Describe this image clearly and helpfully.";
  }

  return "Analyze the uploaded file and summarize its important content.";
}

export default function ChatPage() {
  const [chats, setChats] = useState([]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatId, setChatId] = useState(null);
  const [error, setError] = useState("");
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState(null);
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState("");
  const [pickingWorkspace, setPickingWorkspace] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [memory, setMemory] = useState({ facts: [], episodes: [] });
  const [memoryDraft, setMemoryDraft] = useState("");
  const [memoryLoading, setMemoryLoading] = useState(false);
  const [memorySaving, setMemorySaving] = useState(false);
  const [editingFactId, setEditingFactId] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showTopMenu, setShowTopMenu] = useState(false);

  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const activeRequestRef = useRef(null);
  const topMenuRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!textareaRef.current) return;

    textareaRef.current.style.height = "0px";
    const nextHeight = Math.min(textareaRef.current.scrollHeight, 180);
    textareaRef.current.style.height = `${nextHeight}px`;
  }, [input, pendingAttachment]);

  useEffect(() => {
    const loadChats = async () => {
      try {
        const data = await getChats();
        if (!data || !Array.isArray(data.chats)) {
          setChats([]);
          return;
        }
        setChats(data.chats || []);
      } catch (err) {
        console.error(err);
        setError("Couldn't load chat history.");
      }
    };

    loadChats();
  }, []);

  useEffect(() => {
    if (!showSettings) return;

    const loadMemoryState = async () => {
      try {
        setMemoryLoading(true);
        const data = await getMemory();
        setMemory({
          facts: Array.isArray(data.facts) ? data.facts : [],
          episodes: Array.isArray(data.episodes) ? data.episodes : [],
        });
      } catch (err) {
        console.error(err);
        setError("Couldn't load memory.");
      } finally {
        setMemoryLoading(false);
      }
    };

    loadMemoryState();
  }, [showSettings]);

  useEffect(() => {
    const loadWorkspaces = async () => {
      try {
        const data = await getWorkspaces();
        const storedWorkspace = window.localStorage.getItem(WORKSPACE_STORAGE_KEY);
        const availablePaths = data.items.map((item) => item.path);
        const nextWorkspace = availablePaths.includes(storedWorkspace)
          ? storedWorkspace
          : data.current;

        setWorkspaces(data.items);
        setSelectedWorkspace(nextWorkspace || "");
      } catch (err) {
        console.error(err);
        setError("Couldn't load workspaces.");
      }
    };

    loadWorkspaces();
  }, []);

  useEffect(() => {
    if (!selectedWorkspace) return;
    window.localStorage.setItem(WORKSPACE_STORAGE_KEY, selectedWorkspace);
  }, [selectedWorkspace]);

  useEffect(() => {
    return () => {
      if (pendingAttachment?.previewUrl) {
        URL.revokeObjectURL(pendingAttachment.previewUrl);
      }
    };
  }, [pendingAttachment]);

  useEffect(() => {
    return () => {
      activeRequestRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!topMenuRef.current?.contains(event.target)) {
        setShowTopMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const startRequest = () => {
    activeRequestRef.current?.abort();
    const controller = new AbortController();
    activeRequestRef.current = controller;
    return controller;
  };

  const clearActiveRequest = (controller) => {
    if (activeRequestRef.current === controller) {
      activeRequestRef.current = null;
    }
  };

  const markLastAssistantMessageStopped = () => {
    setMessages((prev) => {
      if (!prev.length) return prev;

      const updated = [...prev];
      const lastIndex = updated.length - 1;
      const lastMessage = updated[lastIndex];

      if (lastMessage?.role !== "assistant") {
        updated.push({ role: "assistant", content: "Stopped." });
        return updated;
      }

      updated[lastIndex] = {
        ...lastMessage,
        content: lastMessage.content?.trim() ? `${lastMessage.content}\n\n[Stopped]` : "Stopped.",
      };

      return updated;
    });
  };

  const refreshChats = async (preferredChatId = chatId) => {
    const data = await getChats();
    const normalizedChats = !data || !Array.isArray(data.chats)
      ? []
      : (data.chats || []).map(normalizeChat);
    setChats(normalizedChats);

    if (!preferredChatId) return;

    const matchingChat = normalizedChats.find((chat) => chat.id === preferredChatId);
    if (matchingChat) {
      setChatId(matchingChat.id);
      setMessages(matchingChat.messages || []);
    }
  };

  const addOrUpdateChat = (chat) => {
    const normalizedChat = normalizeChat(chat);

    setChats((prev) => {
      const existingIndex = prev.findIndex((item) => item.id === normalizedChat.id);
      if (existingIndex === -1) return [normalizedChat, ...prev];

      const updated = [...prev];
      updated[existingIndex] = normalizedChat;
      return updated;
    });

    return normalizedChat;
  };

  const clearPendingAttachment = () => {
    setPendingAttachment((prev) => {
      if (prev?.previewUrl) {
        URL.revokeObjectURL(prev.previewUrl);
      }
      return null;
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const stageAttachment = (file) => {
    if (!file || loading) return;

    setError("");
    setPendingAttachment((prev) => {
      if (prev?.previewUrl) {
        URL.revokeObjectURL(prev.previewUrl);
      }

      return {
        file,
        previewUrl: isImageFile(file) ? URL.createObjectURL(file) : "",
      };
    });
  };

  const startNewChat = () => {
    activeRequestRef.current?.abort();
    clearPendingAttachment();
    setChatId(null);
    setMessages([]);
    setInput("");
    setError("");
    setLoading(false);
  };

  const openChat = (chat) => {
    activeRequestRef.current?.abort();
    const normalizedChat = normalizeChat(chat);
    clearPendingAttachment();
    setChatId(normalizedChat.id);
    setMessages(normalizedChat.messages || []);
    setError("");
  };

  const ensureChat = async () => {
    if (chatId) return chatId;

    const newChat = normalizeChat(await createChat());

    if (!newChat.id) {
      throw new Error("Backend did not return a valid chat id");
    }

    addOrUpdateChat(newChat);
    setChatId(newChat.id);
    return newChat.id;
  };

  const appendOptimisticMessages = (userMessage) => {
    setMessages((prev) => [
      ...prev,
      { role: "user", content: userMessage },
      { role: "assistant", content: "" },
    ]);
  };

  const appendMessages = (...nextMessages) => {
    setMessages((prev) => [...prev, ...nextMessages]);
  };

  const updateLastAssistantMessage = (content) => {
    setMessages((prev) => {
      if (!prev.length) return prev;

      const updated = [...prev];
      const lastIndex = updated.length - 1;

      if (updated[lastIndex]?.role !== "assistant") {
        updated.push({ role: "assistant", content });
        return updated;
      }

      updated[lastIndex] = {
        ...updated[lastIndex],
        content,
      };

      return updated;
    });
  };

  const handleDeleteChat = async (targetChatId) => {
    try {
      await deleteChat(targetChatId);
      setChats((prev) => prev.filter((chat) => chat.id !== targetChatId));

      if (chatId === targetChatId) {
        startNewChat();
      }
    } catch (err) {
      console.error(err);
      setError("Couldn't delete that chat.");
    }
  };

  const handleRenameChat = async (targetChatId, title) => {
    try {
      const updatedChat = normalizeChat(await renameChat(targetChatId, title));
      addOrUpdateChat(updatedChat);

      if (chatId === targetChatId) {
        setChatId(updatedChat.id);
      }
    } catch (err) {
      console.error(err);
      setError("Couldn't rename that chat.");
    }
  };

  const handlePickWorkspace = async () => {
    try {
      setPickingWorkspace(true);
      setError("");
      const data = await pickWorkspace();

      if (!data.picked) return;

      setWorkspaces(data.items || []);
      setSelectedWorkspace(data.picked.path);
    } catch (err) {
      console.error(err);
      setError("Couldn't open folder picker.");
    } finally {
      setPickingWorkspace(false);
    }
  };

  const refreshMemory = async () => {
    const data = await getMemory();
    setMemory({
      facts: Array.isArray(data.facts) ? data.facts : [],
      episodes: Array.isArray(data.episodes) ? data.episodes : [],
    });
  };

  const handleOpenSettings = () => {
    setError("");
    setShowSettings(true);
  };

  const handleCloseSettings = () => {
    setShowSettings(false);
    setMemoryDraft("");
    setEditingFactId(null);
  };

  const handleSaveMemoryFact = async () => {
    const text = memoryDraft.trim();
    if (!text || memorySaving) return;

    try {
      setMemorySaving(true);
      setError("");
      if (editingFactId) {
        await updateMemoryFact(editingFactId, text, "manual");
      } else {
        await addMemoryFact(text, "manual");
      }
      await refreshMemory();
      setMemoryDraft("");
      setEditingFactId(null);
    } catch (err) {
      console.error(err);
      setError("Couldn't save memory.");
    } finally {
      setMemorySaving(false);
    }
  };

  const handleEditFact = (fact) => {
    setEditingFactId(fact.id);
    setMemoryDraft(fact.text || "");
  };

  const handleDeleteFact = async (factId) => {
    try {
      setError("");
      await deleteMemoryFact(factId);
      if (editingFactId === factId) {
        setEditingFactId(null);
        setMemoryDraft("");
      }
      await refreshMemory();
    } catch (err) {
      console.error(err);
      setError("Couldn't delete memory.");
    }
  };

  const handleDeleteEpisode = async (episodeId) => {
    try {
      setError("");
      await deleteMemoryEpisode(episodeId);
      await refreshMemory();
    } catch (err) {
      console.error(err);
      setError("Couldn't delete memory episode.");
    }
  };

  const handleClearAllMemory = async () => {
    try {
      setError("");
      await clearMemory();
      setMemory({ facts: [], episodes: [] });
      setMemoryDraft("");
      setEditingFactId(null);
    } catch (err) {
      console.error(err);
      setError("Couldn't clear memory.");
    }
  };

  const sendPendingAttachment = async (id, file, userPrompt, controller) => {
    const prompt = userPrompt.trim() || getDefaultAttachmentPrompt(file);
    const displayMessage = buildAttachmentMessage(file, userPrompt);

    appendOptimisticMessages(displayMessage);

    const res = await uploadFile(
      file,
      id,
      INTERNAL_MODEL,
      prompt,
      displayMessage,
      selectedWorkspace,
      controller.signal
    );

    if (res.kind === "image") {
      updateLastAssistantMessage(res.analysis || "No image analysis returned.");
      return;
    }

    let fullResponse = "";
    await streamMessage(
      `Please analyze the uploaded file "${res.filename}" according to this prompt:\n${prompt}\n\nFile content:\n${res.content}`,
      id,
      INTERNAL_MODEL,
      (token) => {
        fullResponse += token;
        updateLastAssistantMessage(fullResponse);
      },
      displayMessage,
      selectedWorkspace,
      controller.signal
    );
  };

  const handleSend = async () => {
    const trimmedInput = input.trim();
    const attachment = pendingAttachment?.file;

    if ((!trimmedInput && !attachment) || loading) return;
    if (!backendConfigured) {
      setError("Set VITE_API_URL before sending messages.");
      return;
    }

    setLoading(true);
    setError("");
    const controller = startRequest();

    try {
      if (attachment) {
        const id = await ensureChat();
        await sendPendingAttachment(id, attachment, trimmedInput, controller);
        clearPendingAttachment();
        setInput("");
        await refreshChats(id);
      } else {
        setInput("");
        appendOptimisticMessages(trimmedInput);
        const id = await ensureChat();

        let fullResponse = "";
        await streamMessage(
          trimmedInput,
          id,
          INTERNAL_MODEL,
          (token) => {
            fullResponse += token;
            updateLastAssistantMessage(fullResponse);
          },
          undefined,
          selectedWorkspace,
          controller.signal
        );

        await refreshChats(id);
      }
    } catch (err) {
      if (err.name === "AbortError") {
        markLastAssistantMessageStopped();
        return;
      }
      console.error(err);
      setError(attachment ? "Attachment failed to send." : "Message failed to send.");
      updateLastAssistantMessage(
        `Sorry, something went wrong. ${err.message || ""}`.trim()
      );
    } finally {
      clearActiveRequest(controller);
      setLoading(false);
    }
  };

  const handleStop = () => {
    if (!loading) return;
    activeRequestRef.current?.abort();
  };

  const handleComposerKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileInputChange = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      stageAttachment(file);
    }
  };

  const handleComposerPaste = async (e) => {
    const items = Array.from(e.clipboardData?.items || []);
    const imageItem = items.find((item) => item.type.startsWith("image/"));

    if (!imageItem) return;

    e.preventDefault();

    const blob = imageItem.getAsFile();
    if (!blob) return;

    const extension = blob.type.split("/")[1] || "png";
    const pastedImage = new File(
      [blob],
      `pasted-image-${Date.now()}.${extension}`,
      { type: blob.type }
    );

    stageAttachment(pastedImage);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDraggingFile(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      stageAttachment(file);
    }
  };

  const handleStarterPrompt = (prompt) => {
    setInput(prompt);
    textareaRef.current?.focus();
  };

  return (
    <div className="h-screen flex bg-gray-950 text-white">
      <Sidebar
        chats={chats}
        activeChatId={chatId}
        onNewChat={startNewChat}
        onSelectChat={openChat}
        onDeleteChat={handleDeleteChat}
        onOpenSettings={handleOpenSettings}
        onRenameChat={handleRenameChat}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
      />

      <div className="flex-1 flex flex-col">
        <div className="px-6 pt-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-[15px] font-semibold tracking-tight text-white/95">Callens AI</div>
              <div
                className="mt-1 max-w-xl truncate text-xs text-gray-500"
                title={selectedWorkspace || ""}
              >
                {selectedWorkspace || "Loading workspace..."}
              </div>
              {isDevelopment && (
                <div
                  className={`mt-2 inline-flex max-w-xl items-center rounded-full px-3 py-1 text-[11px] font-medium ${
                    backendConfigured
                      ? "bg-emerald-500/10 text-emerald-200"
                      : "bg-amber-500/10 text-amber-200"
                  }`}
                  title={backendStatusLabel}
                >
                  {backendStatusLabel}
                </div>
              )}
            </div>

            <div className="relative" ref={topMenuRef}>
              <button
                type="button"
                onClick={() => setShowTopMenu((prev) => !prev)}
                className="flex h-11 w-11 items-center justify-center rounded-full text-gray-300 transition hover:bg-white/10 hover:text-white"
                title="More"
              >
                <DotsIcon />
              </button>

              {showTopMenu && (
                <div className="absolute right-0 top-12 z-20 w-72 rounded-2xl border border-white/10 bg-[#1f1f1f] p-3 shadow-2xl">
                  <button
                    type="button"
                    onClick={handlePickWorkspace}
                    disabled={pickingWorkspace || loading}
                    className="w-full rounded-xl bg-white/8 px-4 py-3 text-left text-sm text-white transition hover:bg-white/12 disabled:opacity-60"
                  >
                    {pickingWorkspace ? "Opening..." : "Open Folder"}
                  </button>

                  <div className="mt-3 text-xs uppercase tracking-[0.18em] text-gray-500">
                    Workspace
                  </div>
                  <select
                    value={selectedWorkspace}
                    onChange={(e) => setSelectedWorkspace(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-white/20 bg-[#111827] px-4 py-3 text-sm font-medium text-white shadow-[0_0_0_1px_rgba(255,255,255,0.03)] outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                    title={selectedWorkspace}
                  >
                    {workspaces.map((workspace) => (
                      <option key={workspace.path} value={workspace.path}>
                        {workspace.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>

        <div
          className={`flex-1 overflow-y-auto px-4 py-6 flex flex-col items-center transition ${
            isDraggingFile ? "bg-blue-950/20" : ""
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDraggingFile(true);
          }}
          onDragLeave={(e) => {
            if (e.currentTarget.contains(e.relatedTarget)) return;
            setIsDraggingFile(false);
          }}
          onDrop={handleDrop}
        >
          <div className={`w-full ${messages.length ? "max-w-3xl" : "max-w-5xl"}`}>
            {messages.map((msg, i) => (
              <MessageBubble key={i} role={msg.role} content={msg.content} />
            ))}

            {loading && (
              <MessageBubble role="assistant" content="Callens is thinking..." />
            )}
            {!loading && !messages.length && (
              <div className="mx-auto flex min-h-[48vh] w-full flex-col items-center justify-center px-4 py-8 text-center">
                <div className="inline-flex items-center rounded-full bg-white/5 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.26em] text-blue-200">
                  Callens AI
                </div>
                <h1 className="mt-2 text-4xl font-semibold tracking-tight text-white md:text-6xl">
                  Where should we start?
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-gray-400 md:text-base">
                  Pick a suggestion to fill the prompt box, or type your own message below.
                </p>

                <div className="mt-10 flex max-w-4xl flex-wrap items-center justify-center gap-3">
                  {STARTER_TILES.map((tile) => (
                    <button
                      key={tile.title}
                      type="button"
                      onClick={() => handleStarterPrompt(tile.prompt)}
                      className={`rounded-full border px-5 py-3 text-sm font-medium transition hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/10 ${tile.accent}`}
                      title={tile.description}
                    >
                      {tile.title}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {isDraggingFile && (
              <div className="mt-4 rounded-xl border border-dashed border-blue-500 bg-blue-500/10 px-4 py-6 text-center text-sm text-blue-200">
                Drop your file or image here to attach it to this chat.
              </div>
            )}
            {error && <div className="text-red-400 text-sm mt-4">{error}</div>}

            <div ref={bottomRef} />
          </div>
        </div>

        <div className={`px-4 pb-4 ${messages.length ? "pt-3" : "pt-0"}`}>
          {pendingAttachment && (
            <div className="mb-3 rounded-xl border border-gray-700 bg-gray-900 px-3 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex items-start gap-3">
                  {pendingAttachment.previewUrl ? (
                    <img
                      src={pendingAttachment.previewUrl}
                      alt={pendingAttachment.file.name}
                      className="h-14 w-14 rounded-lg object-cover border border-gray-700"
                    />
                  ) : (
                    <div className="h-14 w-14 rounded-lg border border-gray-700 bg-gray-800 flex items-center justify-center text-xs text-gray-400">
                      File
                    </div>
                  )}

                  <div className="min-w-0">
                    <div className="text-sm text-white truncate">
                      {pendingAttachment.file.name}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {isImageFile(pendingAttachment.file)
                        ? "Image attached. Add a prompt and click Send."
                        : "File attached. Add instructions and click Send."}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={clearPendingAttachment}
                  className="text-xs text-gray-400 hover:text-red-400"
                >
                  Remove
                </button>
              </div>
            </div>
          )}

          <div className={`mx-auto flex w-full items-end gap-2 ${messages.length ? "max-w-[52rem]" : "max-w-[58rem]"}`}>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileInputChange}
              accept=".txt,.py,.js,.jsx,.ts,.json,.html,.css,.pdf,.png,.jpg,.jpeg,.webp,.bmp,.gif"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading || !backendConfigured}
              className="shrink-0 rounded-full bg-white/10 px-3.5 py-2.5 text-lg text-white hover:bg-white/14 disabled:opacity-60"
              title="Upload file"
              aria-label="Upload file"
            >
              +
            </button>

            <div className="flex-1 rounded-[28px] bg-white/10 px-4 py-2.5 backdrop-blur-sm">
              <textarea
                ref={textareaRef}
                className="min-h-[44px] max-h-[160px] w-full resize-none overflow-y-auto bg-transparent text-white outline-none"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onPaste={handleComposerPaste}
                placeholder={
                  pendingAttachment
                    ? "Add a prompt for the attachment..."
                    : "Ask Callens AI"
                }
                onKeyDown={handleComposerKeyDown}
                rows={1}
              />

              <div className="mt-2 flex items-center justify-end gap-3">
                <div className="text-xs text-gray-500">
                  {pendingAttachment ? "Attachment ready" : "Press Enter to send"}
                </div>
              </div>
            </div>

            <button
              onClick={loading ? handleStop : handleSend}
              disabled={!backendConfigured && !loading}
              className={`shrink-0 rounded-full px-4 py-2.5 ${
                loading ? "bg-red-600 hover:bg-red-500" : "bg-blue-600"
              } disabled:opacity-60`}
            >
              {loading ? "Stop" : "Send"}
            </button>
          </div>

          <div className={`mx-auto mt-2 w-full text-xs text-gray-500 ${messages.length ? "max-w-3xl" : "max-w-5xl"}`}>
            Shift+Enter for a new line, or use +, drag and drop, or Ctrl+V to attach a file or image before sending.
          </div>
        </div>
      </div>

      {showSettings && (
        <div className="fixed inset-0 z-40 flex justify-end bg-black/50">
          <div className="h-full w-full max-w-xl overflow-y-auto border-l border-gray-800 bg-gray-950 p-6 text-white shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xl font-semibold">Settings</div>
                <div className="mt-1 text-sm text-gray-400">
                  Manage what Callens remembers across chats.
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseSettings}
                className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-200 hover:bg-gray-800"
              >
                Close
              </button>
            </div>

            <div className="mt-6 rounded-2xl border border-gray-800 bg-gray-900/70 p-4">
              <div className="text-sm font-semibold text-white">
                Add Memory
              </div>
              <div className="mt-1 text-xs text-gray-400">
                Save a durable preference, fact, or instruction.
              </div>
              <textarea
                className="mt-3 min-h-[110px] w-full rounded-xl border border-gray-700 bg-gray-950 px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
                value={memoryDraft}
                onChange={(e) => setMemoryDraft(e.target.value)}
                placeholder="Example: I prefer concise answers and I am building Callens AI."
              />
              <div className="mt-3 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSaveMemoryFact}
                  disabled={memorySaving || !memoryDraft.trim()}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-60"
                >
                  {memorySaving
                    ? "Saving..."
                    : editingFactId
                    ? "Update Memory"
                    : "Save Memory"}
                </button>
                {editingFactId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingFactId(null);
                      setMemoryDraft("");
                    }}
                    className="rounded-lg border border-gray-700 bg-gray-950 px-4 py-2 text-sm text-gray-300 hover:bg-gray-900"
                  >
                    Cancel Edit
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleClearAllMemory}
                  className="rounded-lg border border-red-800 bg-red-950/40 px-4 py-2 text-sm text-red-300 hover:bg-red-950/70"
                >
                  Clear All Memory
                </button>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-gray-800 bg-gray-900/70 p-4">
              <div className="text-sm font-semibold text-white">
                Saved Facts
              </div>
              <div className="mt-1 text-xs text-gray-400">
                These are long-term memories Callens can reuse later.
              </div>
              <div className="mt-4 space-y-3">
                {memoryLoading ? (
                  <div className="text-sm text-gray-400">Loading memory...</div>
                ) : memory.facts.length === 0 ? (
                  <div className="text-sm text-gray-400">No saved facts yet.</div>
                ) : (
                  memory.facts.map((fact) => (
                    <div
                      key={fact.id}
                      className="rounded-xl border border-gray-800 bg-gray-950 px-4 py-3"
                    >
                      <div className="text-sm text-gray-100 whitespace-pre-wrap break-words">
                        {fact.text}
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                        <span>{fact.category || "manual"}</span>
                        <span>•</span>
                        <span>{fact.times_seen || 1} saves</span>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditFact(fact)}
                          className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-gray-200 hover:bg-gray-800"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteFact(fact.id)}
                          className="rounded-lg border border-red-800 bg-red-950/40 px-3 py-2 text-xs text-red-300 hover:bg-red-950/70"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-gray-800 bg-gray-900/70 p-4">
              <div className="text-sm font-semibold text-white">
                Recent Memory Episodes
              </div>
              <div className="mt-1 text-xs text-gray-400">
                Compact summaries of recent chat moments.
              </div>
              <div className="mt-4 space-y-3">
                {memoryLoading ? (
                  <div className="text-sm text-gray-400">Loading episodes...</div>
                ) : memory.episodes.length === 0 ? (
                  <div className="text-sm text-gray-400">No recent episodes yet.</div>
                ) : (
                  memory.episodes.slice(0, 20).map((episode) => (
                    <div
                      key={episode.id}
                      className="rounded-xl border border-gray-800 bg-gray-950 px-4 py-3"
                    >
                      <div className="text-sm text-gray-100 whitespace-pre-wrap break-words">
                        {episode.text}
                      </div>
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={() => handleDeleteEpisode(episode.id)}
                          className="rounded-lg border border-red-800 bg-red-950/40 px-3 py-2 text-xs text-red-300 hover:bg-red-950/70"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
