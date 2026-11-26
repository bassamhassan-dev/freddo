import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useAuthStore } from '@/store/auth.js';

// Sprint 29 regression: Bassam's sent messages only appeared after a page
// refresh. Two causes pinned here: the client listened to the wrong socket
// event ('chat:new' vs the server's 'chat:message'), and the socket send
// path never appended the ack's message locally.

let socketHandlers = {};
const fakeSocket = {
  connected: true,
  emitWithAck: vi.fn(async (_event, body) => ({
    ok: true,
    message: { id: 'm-ack', conversationId: 'c1', senderRole: 'customer', senderName: 'باسم', kind: 'text', text: body.text },
  })),
  on: (event, fn) => { socketHandlers[event] = fn; },
  off: (event) => { delete socketHandlers[event]; },
};
vi.mock('@/api/chatSocket.js', () => ({
  getChatSocket: () => fakeSocket,
  closeChatSocket: () => {},
}));
vi.mock('@/api/client.js', () => ({
  getAccessToken: () => 'tok',
  request: vi.fn(),
  setUnauthorizedHandler: () => {},
}));
const sendMyMessage = vi.fn();
vi.mock('@/api/chat.js', () => ({
  getMyChat: async () => ({ data: { conversation: { id: 'c1', unreadForCustomer: 0 }, messages: [], uploadsEnabled: false } }),
  sendMyMessage: (...args) => sendMyMessage(...args),
  markMyChatRead: async () => ({}),
  uploadChatImage: vi.fn(),
}));

const { default: ChatWidget } = await import('./ChatWidget.jsx');

describe('ChatWidget live echo (S29)', () => {
  beforeEach(() => {
    window.HTMLElement.prototype.scrollIntoView = () => {}; // not in jsdom
    socketHandlers = {};
    fakeSocket.connected = true;
    fakeSocket.emitWithAck.mockClear();
    sendMyMessage.mockReset();
    useAuthStore.setState({ user: { id: 'u1', name: 'باسم', role: 'customer' }, status: 'authed' });
  });

  it('shows the sent message immediately on the socket path (ack echo)', async () => {
    render(<ChatWidget lang="ar" />);
    fireEvent.click(screen.getByLabelText('كلّمنا'));
    const input = await screen.findByPlaceholderText('اكتب رسالتك...');
    fireEvent.change(input, { target: { value: 'أهلاً' } });
    fireEvent.submit(input.closest('form'));
    expect(await screen.findByText('أهلاً')).toBeTruthy();
    expect(sendMyMessage).not.toHaveBeenCalled();
    // and the identity is visible: the sender's name in the header
    expect(screen.getAllByText('باسم').length).toBeGreaterThan(0);
  });

  it('appends a message pushed live on chat:message', async () => {
    render(<ChatWidget lang="ar" />);
    fireEvent.click(screen.getByLabelText('كلّمنا'));
    await screen.findByPlaceholderText('اكتب رسالتك...');
    socketHandlers['chat:message']({
      conversationId: 'c1',
      message: { id: 'm-live', conversationId: 'c1', senderRole: 'admin', senderName: 'Freddo', kind: 'text', text: 'نورت' },
    });
    expect(await screen.findByText('نورت')).toBeTruthy();
  });

  it('falls back to REST when the socket is down and still echoes', async () => {
    fakeSocket.connected = false;
    sendMyMessage.mockResolvedValue({
      data: { message: { id: 'm-rest', conversationId: 'c1', senderRole: 'customer', senderName: 'باسم', kind: 'text', text: 'بالراحة' } },
    });
    render(<ChatWidget lang="ar" />);
    fireEvent.click(screen.getByLabelText('كلّمنا'));
    const input = await screen.findByPlaceholderText('اكتب رسالتك...');
    fireEvent.change(input, { target: { value: 'بالراحة' } });
    fireEvent.submit(input.closest('form'));
    await waitFor(() => expect(screen.getByText('بالراحة')).toBeTruthy());
    expect(sendMyMessage).toHaveBeenCalledTimes(1);
  });
});
