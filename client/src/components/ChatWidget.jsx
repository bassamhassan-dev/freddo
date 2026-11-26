import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/store/auth.js';
import { getAccessToken } from '@/api/client.js';
import { getChatSocket } from '@/api/chatSocket.js';
import { getMyChat, sendMyMessage, markMyChatRead, uploadChatImage } from '@/api/chat.js';
import { t } from '@/i18n/index.js';
import ChatAvatar from './ChatAvatar.jsx';

// Floating customer <-> admin chat (Sprint 26). Visible only to signed-in
// customers. Socket.IO carries messages live; REST is the fallback when the
// socket is not connected yet, so sending always works.
export default function ChatWidget({ lang }) {
  const { user, status } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [uploadsOn, setUploadsOn] = useState(true);
  const bottomRef = useRef(null);
  const socketRef = useRef(null);

  const isCustomer = status === 'authed' && user?.role === 'customer';
  const convId = conversation?.id;

  // Deduped local append: used by the live broadcast AND by the send ack /
  // REST response, so the sender's own message always appears immediately.
  const appendLocal = useCallback((msg) => {
    setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
  }, []);

  const load = useCallback(async () => {
    const { data } = await getMyChat();
    setConversation(data.conversation);
    setMessages(data.messages);
    setUploadsOn(data.uploadsEnabled !== false);
  }, []);

  useEffect(() => {
    if (!isCustomer || !open) return;
    load().catch(() => {});
  }, [isCustomer, open, load]);

  useEffect(() => {
    if (!isCustomer) return;
    const token = getAccessToken();
    if (!token) return;
    const socket = getChatSocket(token);
    socketRef.current = socket;
    // Server broadcasts 'chat:message' with { conversationId, message }.
    const onNew = (payload) => {
      const msg = payload?.message || payload;
      if (!msg?.id) return;
      appendLocal(msg);
      if (!open && msg.senderRole !== 'customer')
        setConversation((c) => (c ? { ...c, unreadForCustomer: (c.unreadForCustomer || 0) + 1 } : c));
    };
    socket.on('chat:message', onNew);
    return () => socket.off('chat:message', onNew);
  }, [isCustomer, open, appendLocal]);

  useEffect(() => {
    if (!open || !convId) return;
    markMyChatRead().catch(() => {});
    setConversation((c) => (c ? { ...c, unreadForCustomer: 0 } : c));
  }, [open, convId, messages.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages, open]);

  if (!isCustomer) return null;

  async function send(body) {
    setSending(true);
    try {
      const socket = socketRef.current;
      if (socket?.connected) {
        const ack = await socket.emitWithAck('chat:send', body);
        if (ack?.message) appendLocal(ack.message);
      } else {
        const { data } = await sendMyMessage(body);
        appendLocal(data.message);
      }
      setDraft('');
    } catch {
      // surfaced by the disabled state / next attempt
    } finally {
      setSending(false);
    }
  }

  async function onPickImage(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const { data } = await uploadChatImage(file);
      await send({ kind: 'image', imageUrl: data.url });
    } catch (err) {
      if (err.status === 503) setUploadsOn(false);
    }
  }

  const unread = conversation?.unreadForCustomer || 0;

  return (
    <div className="fixed bottom-4 end-4 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="flex h-96 w-80 max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-amber-900/40 bg-[#120d08] shadow-2xl">
          <div className="flex items-center gap-2 border-b border-amber-900/40 bg-[#1a130b] px-4 py-3">
            <ChatAvatar name={user?.name} variant="amber" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#f6e7cf]">{t(lang, 'chat.title')}</p>
              <p className="truncate text-xs text-[#a89880]">{user?.name}</p>
            </div>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto p-3">
            {messages.map((m) => {
              const own = m.senderRole === 'customer';
              return (
                <div key={m.id} className="flex items-end gap-1.5">
                  {!own && <ChatAvatar name={m.senderName || t(lang, 'chat.team')} size="sm" />}
                  <div className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${own ? 'ms-auto bg-[#ffb21a] text-black' : 'bg-[#241a10] text-[#f6e7cf]'}`}>
                    {m.kind === 'image' ? (
                      <img src={m.imageUrl} alt="" className="max-h-40 rounded-lg" />
                    ) : (
                      m.text
                    )}
                  </div>
                  {own && <ChatAvatar name={m.senderName || user?.name} variant="amber" size="sm" />}
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
          <form
            className="flex items-center gap-2 border-t border-amber-900/40 p-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (draft.trim()) send({ kind: 'text', text: draft.trim() });
            }}
          >
            {uploadsOn && (
              <label className="cursor-pointer px-1 text-lg" title={t(lang, 'chat.sendImage')}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#f6e7cf]"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                <input type="file" accept="image/*" className="hidden" onChange={onPickImage} />
              </label>
            )}
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t(lang, 'chat.placeholder')}
              className="min-w-0 flex-1 rounded-lg border border-amber-900/40 bg-transparent px-2 py-1.5 text-sm text-[#f6e7cf] outline-none"
            />
            <button type="submit" disabled={sending || !draft.trim()} className="rounded-lg bg-[#ffb21a] px-3 py-1.5 text-sm font-bold text-black disabled:opacity-40">
              {t(lang, 'chat.send')}
            </button>
          </form>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-12 w-12 items-center justify-center rounded-full bg-[#ffb21a] text-xl text-black shadow-lg"
        aria-label={t(lang, 'chat.title')}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z"/></svg>
        {unread > 0 && (
          <span className="absolute -top-1 -end-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-bold text-white">
            {unread}
          </span>
        )}
      </button>
    </div>
  );
}
