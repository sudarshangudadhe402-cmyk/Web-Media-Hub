import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronLeft, Send, MessageCircle, Loader2, Search, X } from "lucide-react";

interface Conversation {
  id: string;
  customerId: string;
  customerName: string;
  lastMessage: string;
  lastMessageAt: string;
  adminUnread: number;
  customerUnread: number;
}

interface ChatMessage {
  id: string;
  text: string;
  senderRole: "admin" | "customer";
  readAt: string | null;
  createdAt: string;
}

function getToken() {
  return localStorage.getItem("wmh_token") ?? "";
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  if (diffMs < 86_400_000) {
    return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  }
  if (diffMs < 7 * 86_400_000) {
    return d.toLocaleDateString("en-IN", { weekday: "short" });
  }
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// ── Double-tick SVG ───────────────────────────────────────────────────────────
function DoubleTick({ read, light }: { read: boolean; light?: boolean }) {
  const color = read
    ? light ? "rgba(196,181,253,1)" : "#53bdeb"
    : light ? "rgba(196,181,253,0.45)" : "#aaa";
  return (
    <svg width="16" height="10" viewBox="0 0 22 14" fill="none">
      <path d="M1 7L5.5 11.5L13 3" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 7L11.5 11.5L19 3" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Conversation view ─────────────────────────────────────────────────────────
function ConversationView({
  conv,
  onBack,
}: {
  conv: Conversation;
  onBack: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [msgText, setMsgText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [longPressId, setLongPressId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/chat/messages/${conv.id}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        const data: ChatMessage[] = await res.json();
        setMessages(data);
      }
    } catch {}
  }, [conv.id]);

  // Poll only when tab is visible
  useEffect(() => {
    fetchMessages().finally(() => setLoading(false));
    const interval = setInterval(() => {
      if (document.visibilityState !== "hidden") {
        fetchMessages();
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 100) + "px";
  }, [msgText]);

  async function sendMessage() {
    if (!msgText.trim() || sending) return;
    const text = msgText.trim();
    setSending(true);
    setSendError(null);
    setMsgText("");
    try {
      const res = await fetch("/api/chat/message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ conversationId: conv.id, text }),
      });
      if (res.ok) {
        const msg: ChatMessage = await res.json();
        // Deduplicate in case polling already brought this message in
        setMessages((prev) =>
          prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]
        );
      } else {
        const err = await res.json().catch(() => ({}));
        setSendError((err as any).error ?? "Failed to send. Try again.");
        setMsgText(text);
      }
    } catch {
      setSendError("Network error. Please try again.");
      setMsgText(text);
    } finally {
      setSending(false);
    }
  }

  async function deleteMessage(msgId: string) {
    setLongPressId(null);
    try {
      const res = await fetch(`/api/chat/message/${msgId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.deletedForAll) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === msgId ? { ...m, text: "This message was deleted" } : m
            )
          );
        } else {
          setMessages((prev) => prev.filter((m) => m.id !== msgId));
        }
      }
    } catch {}
  }

  function startLongPress(id: string) {
    longPressTimer.current = setTimeout(() => setLongPressId(id), 500);
  }

  function cancelLongPress() {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }

  return (
    <div className="flex flex-col" style={{ height: "calc(100dvh - 130px)", minHeight: 480 }}>
      {/* Header */}
      <div className="flex items-center gap-3 pb-3 border-b border-gray-100 flex-shrink-0">
        <button
          onClick={onBack}
          className="p-1.5 rounded-full hover:bg-gray-100 flex-shrink-0"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold text-white"
          style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}
        >
          {getInitials(conv.customerName)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-gray-900 truncate">{conv.customerName}</p>
          <p className="text-[10px] text-gray-400">Customer</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-3 space-y-2 px-0.5">
        {loading ? (
          <div className="flex justify-center pt-10">
            <Loader2 className="w-6 h-6 text-gray-300 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-12">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(124,58,237,0.08)" }}
            >
              <MessageCircle className="w-7 h-7 text-purple-400" />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-gray-700">No messages yet</p>
              <p className="text-xs text-gray-400 mt-0.5">Say hello to {conv.customerName}</p>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isAdmin = msg.senderRole === "admin";
            const isDeleted = msg.text === "This message was deleted";
            const isLongPressed = longPressId === msg.id;

            return (
              <div
                key={msg.id}
                className={`flex ${isAdmin ? "justify-end" : "justify-start"} relative`}
              >
                <div
                  className={`max-w-[75%] relative`}
                  onMouseDown={() => startLongPress(msg.id)}
                  onMouseUp={cancelLongPress}
                  onMouseLeave={cancelLongPress}
                  onTouchStart={() => startLongPress(msg.id)}
                  onTouchEnd={cancelLongPress}
                >
                  <div
                    className={`px-3.5 py-2.5 text-sm ${
                      isAdmin
                        ? "rounded-2xl rounded-br-sm text-white"
                        : "rounded-2xl rounded-bl-sm bg-white text-gray-900 border border-gray-100"
                    } ${isDeleted ? "opacity-60 italic" : ""}`}
                    style={
                      isAdmin
                        ? {
                            background: "linear-gradient(135deg, #7c3aed, #a855f7)",
                            boxShadow: "0 2px 8px rgba(124,58,237,0.2)",
                          }
                        : { boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }
                    }
                  >
                    <p className="leading-relaxed break-words">{msg.text}</p>
                    <div
                      className={`flex items-center gap-1 mt-1 ${
                        isAdmin ? "justify-end" : "justify-start"
                      }`}
                    >
                      <span
                        className={`text-[9px] ${
                          isAdmin ? "text-purple-200" : "text-gray-300"
                        }`}
                      >
                        {new Date(msg.createdAt).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </span>
                      {isAdmin && !isDeleted && (
                        <DoubleTick read={!!msg.readAt} light />
                      )}
                    </div>
                  </div>

                  {/* Long-press delete menu — only for admin's own messages */}
                  {isLongPressed && isAdmin && !isDeleted && (
                    <div
                      className="absolute bottom-full right-0 mb-1 z-10"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden min-w-[130px]">
                        <button
                          onClick={() => deleteMessage(msg.id)}
                          className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-red-500 hover:bg-red-50 w-full"
                        >
                          Delete message
                        </button>
                        <button
                          onClick={() => setLongPressId(null)}
                          className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-gray-500 hover:bg-gray-50 w-full border-t border-gray-100"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Close long-press menu on outside click */}
      {longPressId && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setLongPressId(null)}
        />
      )}

      {/* Send error */}
      {sendError && (
        <div className="pb-1">
          <p className="text-xs text-red-500 text-center">{sendError}</p>
        </div>
      )}

      {/* Send box */}
      <div className="pt-3 border-t border-gray-100 flex-shrink-0">
        <div className="flex items-end gap-2">
          <div
            className="flex-1 rounded-2xl border border-gray-200 bg-white px-3.5 py-2.5 flex items-end gap-2"
            style={{ minHeight: 44 }}
          >
            <textarea
              ref={textareaRef}
              value={msgText}
              onChange={(e) => {
                setSendError(null);
                setMsgText(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Type a message…"
              className="flex-1 text-sm text-gray-900 placeholder-gray-400 focus:outline-none resize-none bg-transparent w-full"
              rows={1}
              maxLength={1000}
            />
          </div>
          <button
            onClick={sendMessage}
            disabled={!msgText.trim() || sending}
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
            style={{
              background:
                msgText.trim() && !sending
                  ? "linear-gradient(135deg, #7c3aed, #a855f7)"
                  : "#e5e7eb",
            }}
          >
            {sending ? (
              <Loader2 className="w-4 h-4 text-white animate-spin" />
            ) : (
              <Send
                className="w-4 h-4"
                style={{ color: msgText.trim() ? "white" : "#9ca3af" }}
              />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main AdminChatView ────────────────────────────────────────────────────────
export default function AdminChatView() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [search, setSearch] = useState("");

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/chat/conversations", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        const data: Conversation[] = await res.json();
        setConversations(data);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchConversations().finally(() => setLoading(false));
    const interval = setInterval(() => {
      if (document.visibilityState !== "hidden") {
        fetchConversations();
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  // Keep selectedConv in sync as the list refreshes
  useEffect(() => {
    if (!selectedConv) return;
    const updated = conversations.find((c) => c.id === selectedConv.id);
    if (updated) setSelectedConv(updated);
  }, [conversations]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync unread to 0 when conversation is opened
  function openConversation(conv: Conversation) {
    setConversations((prev) =>
      prev.map((c) => (c.id === conv.id ? { ...c, adminUnread: 0 } : c))
    );
    setSelectedConv(conv);
  }

  // ── Conversation view ──
  if (selectedConv) {
    return (
      <ConversationView
        conv={selectedConv}
        onBack={() => {
          setSelectedConv(null);
          fetchConversations(); // refresh unread counts
        }}
      />
    );
  }

  // ── Conversation list ──
  const filtered = conversations.filter(
    (c) =>
      !search.trim() ||
      c.customerName.toLowerCase().includes(search.toLowerCase()) ||
      c.lastMessage.toLowerCase().includes(search.toLowerCase())
  );

  const totalUnread = conversations.reduce((s, c) => s + c.adminUnread, 0);

  return (
    <div className="space-y-3">
      {/* Search */}
      <div
        className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border-2 bg-white"
        style={{ borderColor: search ? "#7c3aed" : "#e5e7eb" }}
      >
        <Search
          className="w-4 h-4 flex-shrink-0"
          style={{ color: search ? "#7c3aed" : "#9ca3af" }}
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or message"
          className="flex-1 text-sm text-gray-800 placeholder-gray-400 focus:outline-none bg-transparent"
        />
        {search && (
          <button onClick={() => setSearch("")} className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Unread summary */}
      {totalUnread > 0 && (
        <div
          className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold"
          style={{ background: "rgba(124,58,237,0.08)", color: "#7c3aed" }}
        >
          <span
            className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
            style={{ background: "#7c3aed" }}
          >
            {totalUnread > 99 ? "99+" : totalUnread}
          </span>
          unread message{totalUnread !== 1 ? "s" : ""} from customers
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center gap-3 bg-white rounded-2xl p-3.5 border border-gray-100"
            >
              <div className="w-11 h-11 rounded-full bg-gray-100 animate-pulse flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-100 rounded animate-pulse w-1/2" />
                <div className="h-3 bg-gray-50 rounded animate-pulse w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: "rgba(124,58,237,0.08)" }}
          >
            <MessageCircle className="w-8 h-8 text-purple-300" />
          </div>
          <p className="text-sm font-bold text-gray-700">
            {search ? `No chats matching "${search}"` : "No customer chats yet"}
          </p>
          {!search && (
            <p className="text-xs text-gray-400 mt-1">
              Customers who start a chat will appear here
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-1.5">
          {filtered.map((conv) => (
            <button
              key={conv.id}
              onClick={() => openConversation(conv)}
              className="w-full flex items-center gap-3 bg-white rounded-2xl p-3.5 border text-left transition-all active:bg-gray-50"
              style={{
                borderColor:
                  conv.adminUnread > 0 ? "rgba(124,58,237,0.2)" : "#f3f4f6",
                boxShadow:
                  conv.adminUnread > 0
                    ? "0 2px 8px rgba(124,58,237,0.08)"
                    : "none",
              }}
            >
              {/* Avatar */}
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold text-white"
                style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}
              >
                {getInitials(conv.customerName)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <p
                    className={`text-sm truncate ${
                      conv.adminUnread > 0
                        ? "font-bold text-gray-900"
                        : "font-semibold text-gray-800"
                    }`}
                  >
                    {conv.customerName}
                  </p>
                  {conv.lastMessageAt && (
                    <p className="text-[10px] text-gray-400 flex-shrink-0 ml-2">
                      {formatTime(conv.lastMessageAt)}
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p
                    className={`text-xs truncate flex-1 ${
                      conv.adminUnread > 0
                        ? "text-gray-700 font-medium"
                        : "text-gray-400"
                    }`}
                  >
                    {conv.lastMessage || "No messages yet"}
                  </p>
                  {conv.adminUnread > 0 && (
                    <span
                      className="flex-shrink-0 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-bold text-white px-1"
                      style={{ background: "#7c3aed" }}
                    >
                      {conv.adminUnread > 99 ? "99+" : conv.adminUnread}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
