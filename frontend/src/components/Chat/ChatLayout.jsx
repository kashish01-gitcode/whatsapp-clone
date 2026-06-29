import { useState, useCallback } from 'react';
import { useSocket } from '../../context/SocketContext';
import Sidebar from './Sidebar';
import ChatWindow from './ChatWindow';

export default function ChatLayout() {
  const [activeConversation, setActiveConversation]   = useState(null);
  const [sidebarUpdater, setSidebarUpdater]           = useState(null);
  const { connected }                                 = useSocket();

  const handleNewMessage = useCallback((conversationId, message) => {
    sidebarUpdater?.(conversationId, message);
  }, [sidebarUpdater]);

  // Sidebar can register its update function via this callback
  const onSelectConversation = useCallback((conv) => {
    setActiveConversation(conv);
  }, []);

  // Allow sidebar to register its lastMessage updater
  onSelectConversation._updateSidebar = setSidebarUpdater;

  return (
    <div style={styles.layout}>
      {/* Connection Banner */}
      {!connected && (
        <div style={styles.banner}>
          🔄 Reconnecting to server…
        </div>
      )}

      <div style={styles.inner}>
        <Sidebar
          activeConversation={activeConversation}
          onSelectConversation={onSelectConversation}
        />
        <main style={styles.main}>
          <ChatWindow
            conversation={activeConversation}
            onNewMessage={handleNewMessage}
          />
        </main>
      </div>
    </div>
  );
}

const styles = {
  layout: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  banner: {
    background: '#2a2a2a',
    color: '#ffcc00',
    textAlign: 'center',
    padding: '6px',
    fontSize: 13,
    flexShrink: 0,
  },
  inner: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  main: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
  },
};
