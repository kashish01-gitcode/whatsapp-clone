import { useState, useEffect, useRef, useCallback } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import MessageInput from './MessageInput';

const formatMsgTime = (dateStr) => format(new Date(dateStr), 'HH:mm');
const formatDateLabel = (dateStr) => {
  const d = new Date(dateStr);
  if (isToday(d))     return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'MMMM d, yyyy');
};

export default function ChatWindow({ conversation, onNewMessage }) {
  const { user }                          = useAuth();
  const { socket, isOnline }             = useSocket();
  const [messages, setMessages]           = useState([]);
  const [loading, setLoading]             = useState(true);
  const [typingUsers, setTypingUsers]     = useState([]);
  const bottomRef                         = useRef(null);
  const prevConvId                        = useRef(null);

  const otherParticipant = conversation?.participants?.find((p) => p._id !== user._id);
  const chatName = conversation?.isGroup
    ? conversation.name
    : otherParticipant?.name || 'Unknown';
  const online = !conversation?.isGroup && otherParticipant && isOnline(otherParticipant._id);

  // Load messages when conversation changes
  useEffect(() => {
    if (!conversation?._id) return;

    setLoading(true);
    setMessages([]);
    setTypingUsers([]);

    // Join this conversation's socket room
    socket?.emit('join:conversation', conversation._id);

    api.get(`/messages/${conversation._id}`)
      .then(({ data }) => {
        setMessages(data);
        setLoading(false);
        // Mark as read
        socket?.emit('messages:read', { conversationId: conversation._id });
      })
      .catch(() => setLoading(false));

    prevConvId.current = conversation._id;
  }, [conversation?._id]);

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  // Socket event handlers
  useEffect(() => {
    if (!socket) return;

    const onMessage = (msg) => {
      if (msg.conversationId !== conversation?._id) return;
      setMessages((prev) => {
        // Avoid duplicates
        if (prev.find((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
      onNewMessage?.(msg.conversationId, msg);
      socket.emit('messages:read', { conversationId: msg.conversationId });
    };

    const onTypingStart = ({ conversationId, userName, userId }) => {
      if (conversationId !== conversation?._id) return;
      if (userId === user._id) return;
      setTypingUsers((prev) => prev.includes(userName) ? prev : [...prev, userName]);
    };

    const onTypingStop = ({ conversationId, userId }) => {
      if (conversationId !== conversation?._id) return;
      const u = conversation.participants?.find((p) => p._id === userId);
      if (u) setTypingUsers((prev) => prev.filter((n) => n !== u.name));
    };

    socket.on('message:received', onMessage);
    socket.on('typing:start',     onTypingStart);
    socket.on('typing:stop',      onTypingStop);

    return () => {
      socket.off('message:received', onMessage);
      socket.off('typing:start',     onTypingStart);
      socket.off('typing:stop',      onTypingStop);
    };
  }, [socket, conversation?._id]);

  const handleSend = useCallback(
    (content) => {
      if (!socket || !conversation?._id) return;
      socket.emit('message:send', {
        conversationId: conversation._id,
        content,
      });
    },
    [socket, conversation?._id]
  );

  if (!conversation) {
    return (
      <div style={styles.empty}>
        <div style={styles.emptyInner}>
          <div style={styles.emptyIcon}>💬</div>
          <h2 style={styles.emptyTitle}>ChatApp</h2>
          <p style={styles.emptyText}>
            Select a conversation or search for a user to start chatting
          </p>
        </div>
      </div>
    );
  }

  // Group messages by date
  const grouped = [];
  let lastDate = '';
  for (const msg of messages) {
    const dateLabel = formatDateLabel(msg.createdAt);
    if (dateLabel !== lastDate) {
      grouped.push({ type: 'date', label: dateLabel, key: dateLabel + msg._id });
      lastDate = dateLabel;
    }
    grouped.push({ type: 'message', data: msg, key: msg._id });
  }

  return (
    <div style={styles.wrap}>
      {/* ── Chat Header ─────────────────────────────── */}
      <div style={styles.header}>
        <div style={{ position: 'relative' }}>
          <div style={styles.headerAvatar}>
            {conversation.isGroup ? '👥' : chatName[0]?.toUpperCase()}
          </div>
          {online && <span style={styles.onlineBadge} />}
        </div>
        <div style={styles.headerInfo}>
          <div style={styles.headerName}>{chatName}</div>
          <div style={styles.headerSub}>
            {conversation.isGroup
              ? `${conversation.participants?.length} members`
              : online ? 'online' : 'offline'}
          </div>
        </div>
      </div>

      {/* ── Messages Area ────────────────────────────── */}
      <div className="chat-bg" style={styles.messages}>
        {loading ? (
          <div style={styles.loadingMsg}>Loading messages…</div>
        ) : messages.length === 0 && !loading ? (
          <div style={styles.noMsgs}>
            No messages yet. Say hello! 👋
          </div>
        ) : (
          grouped.map((item) => {
            if (item.type === 'date') {
              return (
                <div key={item.key} style={styles.dateDivider}>
                  <span style={styles.dateLabel}>{item.label}</span>
                </div>
              );
            }
            const msg    = item.data;
            const isMine = msg.sender?._id === user._id || msg.sender === user._id;

            return (
              <div
                key={item.key}
                style={{
                  ...styles.msgRow,
                  justifyContent: isMine ? 'flex-end' : 'flex-start',
                }}
              >
                {/* Show sender name in groups for received messages */}
                <div style={{ maxWidth: '65%' }}>
                  {conversation.isGroup && !isMine && (
                    <div style={styles.senderName}>{msg.sender?.name}</div>
                  )}
                  <div
                    style={{
                      ...styles.bubble,
                      background: isMine ? '#005c4b' : '#202c33',
                      borderRadius: isMine
                        ? '12px 12px 4px 12px'
                        : '12px 12px 12px 4px',
                    }}
                  >
                    <span style={styles.msgText}>{msg.content}</span>
                    <div style={styles.msgMeta}>
                      <span style={styles.msgTime}>{formatMsgTime(msg.createdAt)}</span>
                      {isMine && (
                        <span style={styles.readTick}>
                          {msg.readBy?.length > 1 ? '✓✓' : '✓'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div style={{ ...styles.msgRow, justifyContent: 'flex-start' }}>
            <div style={{ ...styles.bubble, background: '#202c33', padding: '10px 14px' }}>
              <div style={styles.typingDots}>
                <span style={styles.dot} />
                <span style={{ ...styles.dot, animationDelay: '0.2s' }} />
                <span style={{ ...styles.dot, animationDelay: '0.4s' }} />
              </div>
              <style>{`
                @keyframes bounce {
                  0%, 80%, 100% { transform: translateY(0); }
                  40% { transform: translateY(-6px); }
                }
              `}</style>
              <div style={{ color: '#8696a0', fontSize: 12, marginTop: 4 }}>
                {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing…
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Message Input ────────────────────────────── */}
      <MessageInput
        conversationId={conversation._id}
        onSend={handleSend}
      />
    </div>
  );
}

const styles = {
  empty: {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: '#0b141a',
  },
  emptyInner: {
    textAlign: 'center', maxWidth: 320,
  },
  emptyIcon: { fontSize: 72, marginBottom: 16 },
  emptyTitle: { color: '#e9edef', fontSize: 24, fontWeight: 300, marginBottom: 12 },
  emptyText: { color: '#8696a0', fontSize: 14, lineHeight: 1.6 },
  wrap: {
    flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
  },
  header: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '10px 16px', background: '#202c33',
    borderBottom: '1px solid #222d34', flexShrink: 0,
  },
  headerAvatar: {
    width: 42, height: 42, borderRadius: '50%', background: '#374045',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#e9edef', fontWeight: 700, fontSize: 17,
  },
  onlineBadge: {
    position: 'absolute', bottom: 2, right: 2,
    width: 11, height: 11, borderRadius: '50%',
    background: '#25d366', border: '2px solid #202c33',
  },
  headerInfo: {},
  headerName: { color: '#e9edef', fontSize: 16, fontWeight: 600 },
  headerSub: { color: '#8696a0', fontSize: 13 },
  messages: {
    flex: 1, overflowY: 'auto', padding: '16px 8%',
    display: 'flex', flexDirection: 'column', gap: 4,
  },
  loadingMsg: {
    textAlign: 'center', color: '#8696a0', padding: 24, fontSize: 14,
  },
  noMsgs: {
    textAlign: 'center', color: '#8696a0', marginTop: 'auto',
    marginBottom: 'auto', fontSize: 15,
  },
  dateDivider: {
    display: 'flex', justifyContent: 'center', margin: '12px 0',
  },
  dateLabel: {
    background: 'rgba(17,27,33,0.8)', color: '#8696a0',
    fontSize: 12, padding: '4px 14px', borderRadius: 12,
    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
  },
  msgRow: { display: 'flex', marginBottom: 4 },
  senderName: { color: '#53bdeb', fontSize: 12, fontWeight: 600, marginBottom: 2, paddingLeft: 4 },
  bubble: { padding: '8px 12px 6px', boxShadow: '0 1px 2px rgba(0,0,0,0.3)' },
  msgText: { color: '#e9edef', fontSize: 14.5, lineHeight: 1.5, wordBreak: 'break-word', display: 'block' },
  msgMeta: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 3 },
  msgTime: { color: 'rgba(134,150,160,0.9)', fontSize: 11 },
  readTick: { color: '#53bdeb', fontSize: 13 },
  typingDots: { display: 'flex', gap: 4, alignItems: 'center' },
  dot: {
    width: 8, height: 8, borderRadius: '50%', background: '#8696a0',
    animation: 'bounce 1.2s infinite',
    display: 'inline-block',
  },
};
