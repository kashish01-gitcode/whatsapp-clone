import { useState, useRef, useEffect, useCallback } from 'react';
import { useSocket } from '../../context/SocketContext';

export default function MessageInput({ conversationId, onSend }) {
  const [text, setText]         = useState('');
  const { socket }              = useSocket();
  const typingTimeoutRef        = useRef(null);
  const isTypingRef             = useRef(false);
  const inputRef                = useRef(null);

  // Focus input when conversation changes
  useEffect(() => {
    inputRef.current?.focus();
  }, [conversationId]);

  const sendTypingStop = useCallback(() => {
    if (isTypingRef.current) {
      socket?.emit('typing:stop', { conversationId });
      isTypingRef.current = false;
    }
  }, [socket, conversationId]);

  const handleChange = (e) => {
    setText(e.target.value);

    // Typing indicator
    if (!isTypingRef.current) {
      socket?.emit('typing:start', { conversationId });
      isTypingRef.current = true;
    }
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(sendTypingStop, 1500);
  };

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    sendTypingStop();
    clearTimeout(typingTimeoutRef.current);
    onSend(trimmed);
    setText('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={styles.wrap}>
      <div style={styles.inputRow}>
        {/* Emoji placeholder */}
        <button style={styles.sideBtn} title="Emoji">😊</button>

        <textarea
          ref={inputRef}
          style={styles.input}
          placeholder="Type a message"
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          rows={1}
        />

        <button
          style={{
            ...styles.sendBtn,
            background: text.trim() ? '#00a884' : '#374045',
          }}
          onClick={handleSend}
          disabled={!text.trim()}
          title="Send"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

const styles = {
  wrap: {
    padding: '10px 16px',
    background: '#202c33',
    borderTop: '1px solid #222d34',
    flexShrink: 0,
  },
  inputRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: '#2a3942',
    borderRadius: 10,
    padding: '6px 8px',
  },
  sideBtn: {
    background: 'none', border: 'none', fontSize: 22,
    cursor: 'pointer', flexShrink: 0, padding: '4px',
    color: '#8696a0',
  },
  input: {
    flex: 1,
    background: 'none',
    border: 'none',
    color: '#e9edef',
    fontSize: 15,
    outline: 'none',
    resize: 'none',
    fontFamily: 'inherit',
    lineHeight: 1.5,
    maxHeight: 120,
    overflowY: 'auto',
    padding: '4px 0',
  },
  sendBtn: {
    width: 38, height: 38, borderRadius: '50%',
    border: 'none', cursor: 'pointer', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, transition: 'background 0.2s',
  },
};
