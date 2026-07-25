import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronLeft, Send, MessageCircle, Loader2, AlertCircle } from "lucide-react";

interface ChatMessage {
  id: string;
  text: string;
  senderRole: "admin" | "customer";
  readAt: string | null;
  createdAt: string;
  pending?: boolean; // optimistic — still sending
}

export interface CustomerChatProps {
  storeSlug: string;
  storeName: string;
  customerId: string;
  customerName: string;
  onClose: () => void;
  initialMessage?: string;
}

// ── WhatsApp-style message status ─────────────────────────────────────────────
// pending      → single dim tick  + label "Sent"  (still uploading to server)
// readAt=null  → double gray tick + label "Sent"  (server got it, not seen yet)
// readAt=set   → double GREEN tick+ label "Seen"  (recipient has opened chat)
function MessageStatus({ readAt, pending }: { readAt: string | null; pending?: boolean }) {
  if (pending) {
    return (
      <div className="flex flex-col items-center gap-[1px]">
        {/* single faint tick */}
        <svg width="13" height="9" viewBox="0 0 16 12" fill="none">
          <path d="M2 6L6 10L14 2" stroke="rgba(255,255,255,0.35)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span style={{ fontSize: 7, color: "rgba(255,255,255,0.35)", lineHeight: 1, fontFamily: "inherit" }}>Sent</span>
      </div>
    );
  }
  if (!readAt) {
    return (
      <div className="flex flex-col items-center gap-[1px]">
        {/* double gray tick — delivered to server, not seen */}
        <svg width="18" height="9" viewBox="0 0 22 12" fill="none">
          <path d="M1 6L5.5 10.5L13 2"  stroke="rgba(255,255,255,0.45)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M7 6L11.5 10.5L19 2" stroke="rgba(255,255,255,0.45)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span style={{ fontSize: 7, color: "rgba(255,255,255,0.45)", lineHeight: 1, fontFamily: "inherit" }}>Sent</span>
      </div>
    );
  }
  // double GREEN tick — seen
  return (
    <div className="flex flex-col items-center gap-[1px]">
      <svg width="18" height="9" viewBox="0 0 22 12" fill="none">
        <path d="M1 6L5.5 10.5L13 2"  stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M7 6L11.5 10.5L19 2" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span style={{ fontSize: 7, color: "#4ade80", lineHeight: 1, fontFamily: "inherit" }}>Seen</span>
    </div>
  );
}

export default function CustomerChat({
  storeSlug,
  storeName,
  customerId,
  onClose,
  initialMessage = "",
}: CustomerChatProps) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [initLoading, setInitLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const [msgText, setMsgText] = useState(initialMessage);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [longPressId, setLongPressId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Init conversation ─────────────────────────────────────────────────────
  useEffect(() => {
    fetch(`/api/public/chat/${storeSlug}/init?customerId=${encodeURIComponent(customerId)}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to connect");
        return r.json();
      })
      .then((data) => {
        if (data?.conversationId) setConversationId(data.conversationId);
        else throw new Error("No conversation ID");
      })
      .catch(() => setInitError("Could not connect to chat. Please try again."))
      .finally(() => setInitLoading(false));
  }, [storeSlug, customerId]);

  // ── Fetch messages ─────────────────────────────────────────────────────────
  const fetchMessages = useCallback(
    async (convId: string) => {
      try {
        const res = await fetch(
          `/api/public/chat/${storeSlug}/messages?customerId=${encodeURIComponent(customerId)}&conversationId=${encodeURIComponent(convId)}`
        );
        if (res.ok) {
          const data: ChatMessage[] = await res.json();
          setMessages(data);
        }
      } catch {}
    },
    [storeSlug, customerId]
  );

  // Poll when conversation is ready
  useEffect(() => {
    if (!conversationId) return;
    fetchMessages(conversationId);
    const interval = setInterval(() => {
      if (document.visibilityState !== "hidden") {
        fetchMessages(conversationId);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [conversationId, fetchMessages]);

  // ── Auto-scroll on new messages ────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // ── Auto-resize textarea ───────────────────────────────────────────────────
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 100) + "px";
  }, [msgText]);

  // ── Send message ───────────────────────────────────────────────────────────
  async function sendMessage() {
    if (!msgText.trim() || !conversationId || sending) return;
    const text = msgText.trim();
    const tempId = `pending_${Date.now()}`;
    setSending(true);
    setSendError(null);
    setMsgText("");
    // Optimistic: show message immediately with pending tick
    setMessages((prev) => [
      ...prev,
      {
        id: tempId,
        text,
        senderRole: "customer",
        readAt: null,
        createdAt: new Date().toISOString(),
        pending: true,
      },
    ]);
    try {
      const res = await fetch(`/api/public/chat/${storeSlug}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId, conversationId, text }),
      });
      if (res.ok) {
        const msg: ChatMessage = await res.json();
        // Replace temp with real message
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? msg : m))
        );
      } else {
        const err = await res.json().catch(() => ({}));
        setSendError(err.error ?? "Failed to send. Please try again.");
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setMsgText(text);
      }
    } catch {
      setSendError("Network error. Please try again.");
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setMsgText(text);
    } finally {
      setSending(false);
    }
  }

  // ── Delete message ─────────────────────────────────────────────────────────
  async function deleteMessage(msgId: string) {
    setLongPressId(null);
    try {
      const res = await fetch(
        `/api/public/chat/${storeSlug}/message/${msgId}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customerId, conversationId }),
        }
      );
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

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: "#f0ede8" }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 bg-white border-b border-gray-100 flex-shrink-0"
        style={{
          paddingTop: "max(14px, env(safe-area-inset-top))",
          paddingBottom: 14,
        }}
      >
        <button
          onClick={onClose}
          className="p-1.5 rounded-full hover:bg-gray-100 flex-shrink-0"
        >
          <ChevronLeft className="w-5 h-5 text-gray-700" />
        </button>
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold text-white"
          style={{ background: "linear-gradient(135deg, #1a1a1a, #444)" }}
        >
          {(storeName ?? "").slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p
            className="font-bold text-sm text-gray-900 truncate"
            style={{ fontFamily: "'Montserrat', sans-serif" }}
          >
            {storeName}
          </p>
          <p className="text-[10px] text-green-500 font-semibold">Online</p>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {initLoading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <Loader2 className="w-7 h-7 text-gray-300 animate-spin" />
            <p className="text-xs text-gray-400">Connecting…</p>
          </div>
        ) : initError ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <AlertCircle className="w-10 h-10 text-red-300" />
            <p className="text-sm font-semibold text-red-500">{initError}</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 py-16 text-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(0,0,0,0.06)" }}
            >
              <MessageCircle className="w-8 h-8 text-gray-300" />
            </div>
            <div>
              <p
                className="text-sm font-bold text-gray-700"
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              >
                Say hello!
              </p>
              <p className="text-xs text-gray-400 mt-1 max-w-[200px] mx-auto">
                Send a message to start chatting with {storeName}
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isCustomer = msg.senderRole === "customer";
            const isDeleted = msg.text === "This message was deleted";
            const isLongPressed = longPressId === msg.id;

            return (
              <div
                key={msg.id}
                className={`flex ${isCustomer ? "justify-end" : "justify-start"} relative`}
              >
                <div
                  className="max-w-[78%] relative"
                  onMouseDown={() => startLongPress(msg.id)}
                  onMouseUp={cancelLongPress}
                  onMouseLeave={cancelLongPress}
                  onTouchStart={() => startLongPress(msg.id)}
                  onTouchEnd={cancelLongPress}
                >
                  <div
                    className={`px-3.5 py-2.5 text-sm ${
                      isCustomer
                        ? "rounded-2xl rounded-br-sm text-white"
                        : "rounded-2xl rounded-bl-sm bg-white text-gray-900"
                    } ${isDeleted ? "opacity-60 italic" : ""}`}
                    style={
                      isCustomer
                        ? {
                            background: "linear-gradient(135deg, #1a1a1a, #333)",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
                          }
                        : {
                            boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
                            border: "1px solid rgba(0,0,0,0.04)",
                          }
                    }
                  >
                    <p
                      className="leading-relaxed break-words"
                      style={{ fontFamily: "'Poppins', sans-serif", fontSize: 13 }}
                    >
                      {msg.text}
                    </p>
                    <div
                      className={`flex items-center gap-1 mt-1 ${
                        isCustomer ? "justify-end" : "justify-start"
                      }`}
                    >
                      <span
                        className="text-[9px]"
                        style={{ color: isCustomer ? "rgba(255,255,255,0.45)" : "#bbb" }}
                      >
                        {new Date(msg.createdAt).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </span>
                      {isCustomer && !isDeleted && (
                        <MessageStatus readAt={msg.readAt} pending={msg.pending} />
                      )}
                    </div>
                  </div>

                  {/* Long-press delete menu */}
                  {isLongPressed && isCustomer && (
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

      {/* Dismiss long-press on outside click */}
      {longPressId && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setLongPressId(null)}
        />
      )}

      {/* Send error */}
      {sendError && (
        <div className="px-4 pb-1">
          <p className="text-xs text-red-500 text-center">{sendError}</p>
        </div>
      )}

      {/* Send box */}
      <div
        className="px-4 pt-3 pb-3 bg-white border-t border-gray-100 flex-shrink-0"
        style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
      >
        <div className="flex items-end gap-2">
          <div
            className="flex-1 rounded-2xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 flex items-end"
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
              disabled={!conversationId || initLoading}
              style={{ fontFamily: "'Poppins', sans-serif" }}
            />
          </div>
          <button
            onClick={sendMessage}
            disabled={!msgText.trim() || sending || !conversationId}
            className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
            style={{
              background:
                msgText.trim() && !sending ? "#1a1a1a" : "#e5e7eb",
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
