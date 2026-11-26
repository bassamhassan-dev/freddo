import { useCallback, useEffect, useRef, useState } from 'react';
import { getAccessToken } from '@/api/client.js';
import { getChatSocket } from '@/api/chatSocket.js';
import {
  adminListChats,
  adminGetMessages,
  adminSendMessage,
  adminMarkRead,
  uploadChatImage,
} from '@/api/chat.js';
import { t } from '@/i18n/index.js';
import ChatAvatar from './ChatAvatar.jsx';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// Admin side of the customer chat (Sprint 26): conversation list with unread
// badges on the side, the selected thread, and a reply box. Opening a thread
// joins its socket room (which clears the admin unread counter server-side).
export default function AdminChat({ lang }) {
  const [conversations, setConversations] = useState([]);
  const [active, setActive] = useState(null); // conversation id
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [uploadsOn, setUploadsOn] = useState(true);
  const bottomRef = useRef(null);
  const socketRef = useRef(null);
  const activeRef = useRef(null);
  activeRef.current = active;
  const activeConv = conversations.find((c) => String(c.id) === String(active));

  // Deduped local append so a sent message shows immediately on every path
  // (socket ack, live broadcast, REST fallback).
  const appendLocal = useCallback((msg) => {
    setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
  }, []);

  const loadList = useCallback(async () => {
    const { data } = await adminListChats();
    setConversations(data.conversations);
  }, []);

  useEffect(() => {
    loadList().catch(() => {});
    const token = getAccessToken();
    if (!token) return;
    const socket = getChatSocket(token);
    socketRef.current = socket;
    // Server broadcasts 'chat:message' with { conversationId, message }.
    const onNew = (payload) => {
      const msg = payload?.message || payload;
      if (!msg?.id) return;
      if (String(payload?.conversationId || msg.conversationId) === String(activeRef.current)) {
        appendLocal(msg);
      }
      loadList().catch(() => {});
    };
    socket.on('chat:message', onNew);
    const interval = setInterval(() => loadList().catch(() => {}), 30000);
    return () => {
      socket.off('chat:message', onNew);
      clearInterval(interval);
    };
  }, [loadList, appendLocal]);

  useEffect(() => {
    if (!active) return;
    adminGetMessages(active)
      .then(({ data }) => setMessages(data.messages))
      .catch(() => {});
    adminMarkRead(active).then(loadList).catch(() => {});
    const socket = socketRef.current;
    if (socket?.connected) socket.emit('chat:join', { conversationId: active });
  }, [active, loadList]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages]);

  async function send(body) {
    if (!active) return;
    setSending(true);
    try {
      const socket = socketRef.current;
      if (socket?.connected) {
        const ack = await socket.emitWithAck('chat:send', { ...body, conversationId: active });
        if (ack?.message) appendLocal(ack.message);
      } else {
        const { data } = await adminSendMessage(active, body);
        appendLocal(data.message);
      }
      setDraft('');
    } catch {
      // keep the draft so nothing is lost
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

  return (
    <div className="grid gap-4 md:grid-cols-[260px_1fr]">
      <div className="space-y-2">
        {conversations.length === 0 && (
          <p className="text-sm text-[#a89880]">{t(lang, 'chat.adminEmpty')}</p>
        )}
        {conversations.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setActive(c.id)}
            className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-start text-sm ${
              active === c.id
                ? 'border-[#ffb21a] bg-[#241a10] text-[#f6e7cf]'
                : 'border-amber-900/30 bg-[#120d08] text-[#cbb894]'
            }`}
          >
            <span className="flex min-w-0 items-center gap-2">
              <ChatAvatar name={c.customer?.name || c.customer?.email} size="sm" />
              <span className="min-w-0">
                <span className="block truncate font-semibold">{c.customer?.name || c.customer?.email}</span>
                <span className="block truncate text-xs opacity-70">{c.lastMessagePreview || '—'}</span>
              </span>
            </span>
            {c.unreadForAdmin > 0 && <Badge>{c.unreadForAdmin}</Badge>}
          </button>
        ))}
      </div>
      <div className="flex h-[28rem] flex-col overflow-hidden rounded-2xl border border-amber-900/40 bg-[#120d08]">
        {!active ? (
          <div className="flex flex-1 items-center justify-center text-sm text-[#a89880]">
            {t(lang, 'chat.adminPick')}
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 border-b border-amber-900/40 bg-[#1a130b] px-4 py-2.5">
              <ChatAvatar name={activeConv?.customer?.name || activeConv?.customer?.email} size="sm" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#f6e7cf]">{activeConv?.customer?.name || activeConv?.customer?.email}</p>
                {activeConv?.customer?.name && (
                  <p className="truncate text-xs text-[#a89880]">{activeConv?.customer?.email}</p>
                )}
              </div>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto p-3">
              {messages.map((m) => {
                const own = m.senderRole === 'admin';
                return (
                  <div key={m.id} className="flex items-end gap-1.5">
                    {!own && <ChatAvatar name={m.senderName || activeConv?.customer?.name} size="sm" />}
                    <div className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${own ? 'ms-auto bg-[#ffb21a] text-black' : 'bg-[#241a10] text-[#f6e7cf]'}`}>
                      {m.kind === 'image' ? (
                        <img src={m.imageUrl} alt="" className="max-h-40 rounded-lg" />
                      ) : (
                        m.text
                      )}
                    </div>
                    {own && <ChatAvatar name={m.senderName || t(lang, 'chat.team')} variant="amber" size="sm" />}
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
              <Button type="submit" size="sm" disabled={sending || !draft.trim()}>
                {t(lang, 'chat.send')}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
