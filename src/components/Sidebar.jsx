import { useState } from "react";

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
    </svg>
  );
}

function NewChatIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path
        d="M10.3 4.3c.4-1.1 2-1.1 2.4 0l.3 1a1.7 1.7 0 0 0 2 1.1l1-.3c1.1-.4 2.2.7 1.8 1.8l-.3 1a1.7 1.7 0 0 0 1.1 2l1 .3c1.1.4 1.1 2 0 2.4l-1 .3a1.7 1.7 0 0 0-1.1 2l.3 1c.4 1.1-.7 2.2-1.8 1.8l-1-.3a1.7 1.7 0 0 0-2 1.1l-.3 1c-.4 1.1-2 1.1-2.4 0l-.3-1a1.7 1.7 0 0 0-2-1.1l-1 .3c-1.1.4-2.2-.7-1.8-1.8l.3-1a1.7 1.7 0 0 0-1.1-2l-1-.3c-1.1-.4-1.1-2 0-2.4l1-.3a1.7 1.7 0 0 0 1.1-2l-.3-1c-.4-1.1.7-2.2 1.8-1.8l1 .3a1.7 1.7 0 0 0 2-1.1l.3-1Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function getChatLabel(chat) {
  const title = chat.title?.trim();
  if (title) return title;
  return `Chat ${chat.id}`;
}

export default function Sidebar({
  chats,
  activeChatId,
  onNewChat,
  onSelectChat,
  onDeleteChat,
  onOpenSettings,
  onRenameChat,
  collapsed,
  onToggleCollapse,
}) {
  const sortedChats = [...chats].sort((a, b) => Number(b.id) - Number(a.id));
  const [editingChatId, setEditingChatId] = useState(null);
  const [titleDraft, setTitleDraft] = useState("");

  const startRenaming = (chat) => {
    setEditingChatId(chat.id);
    setTitleDraft(chat.title || "");
  };

  const stopRenaming = () => {
    setEditingChatId(null);
    setTitleDraft("");
  };

  const submitRename = async (chatId) => {
    await onRenameChat(chatId, titleDraft);
    stopRenaming();
  };

  return (
    <div
      className={`hidden bg-[#1b2230] text-white md:flex md:flex-col ${
        collapsed ? "w-[88px] items-center px-3 py-5" : "w-[290px] px-4 py-5"
      }`}
    >
      <div
        className={`mb-6 flex w-full ${
          collapsed ? "flex-col items-center gap-4" : "items-center justify-between gap-3"
        }`}
      >
        {!collapsed && <div className="text-[15px] font-semibold tracking-tight">Callens AI</div>}

        <button
          type="button"
          onClick={onToggleCollapse}
          className="flex h-11 w-11 items-center justify-center rounded-full text-gray-300 transition hover:bg-white/10 hover:text-white"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <MenuIcon />
        </button>
      </div>

      <button
        type="button"
        onClick={onNewChat}
        className={`flex items-center rounded-2xl bg-white/6 text-gray-100 transition hover:bg-white/10 ${
          collapsed ? "h-12 w-12 justify-center" : "mb-5 gap-3 px-4 py-3"
        }`}
        title="New chat"
      >
        <NewChatIcon />
        {!collapsed && <span className="text-sm font-medium">New Chat</span>}
      </button>

      {!collapsed && (
        <div className="flex-1 overflow-y-auto space-y-2">
          {sortedChats.length === 0 ? (
            <div className="px-1 text-sm text-gray-500">No history yet</div>
          ) : (
            sortedChats.map((chat) => {
              const isActive = chat.id === activeChatId;
              const preview = getChatLabel(chat);

              return (
                <div
                  key={chat.id}
                  className={`group rounded-2xl transition ${
                    isActive ? "bg-white/10" : "bg-transparent hover:bg-white/6"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      {editingChatId === chat.id ? (
                        <div className="space-y-2">
                          <input
                            autoFocus
                            value={titleDraft}
                            onChange={(e) => setTitleDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") submitRename(chat.id);
                              if (e.key === "Escape") stopRenaming();
                            }}
                            className="w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm text-white outline-none"
                            placeholder="Rename chat"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => submitRename(chat.id)}
                              className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-black"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={stopRenaming}
                              className="rounded-lg bg-white/8 px-3 py-1.5 text-xs text-gray-300"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button type="button" onClick={() => onSelectChat(chat)} className="w-full text-left">
                          <div className="truncate text-sm font-medium text-white">{preview}</div>
                          <div className="mt-1 text-xs text-gray-400">
                            {chat.title_mode === "manual" ? "Custom name" : `Auto name - Chat ${chat.id}`}
                          </div>
                        </button>
                      )}
                    </div>

                    {editingChatId !== chat.id && (
                      <div className="flex flex-col items-end gap-2 opacity-0 transition group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => startRenaming(chat)}
                          className="text-xs text-gray-400 hover:text-white"
                          title="Rename chat"
                        >
                          Rename
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteChat(chat.id)}
                          className="text-xs text-gray-400 hover:text-red-400"
                          title="Delete chat"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      <button
        type="button"
        onClick={onOpenSettings}
        className={`mt-4 flex items-center rounded-full text-gray-400 transition hover:bg-white/10 hover:text-white ${
          collapsed ? "h-12 w-12 justify-center" : "gap-3 px-3 py-2"
        }`}
        title="Settings"
      >
        <SettingsIcon />
        {!collapsed && <span className="text-sm">Settings</span>}
      </button>
    </div>
  );
}
