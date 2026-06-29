import { useState, useEffect } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import CreateGroupModal from '../Group/CreateGroupModal';

const formatTime = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isToday(d))     return format(d, 'HH:mm');
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'dd/MM/yy');
};

export default function Sidebar({ activeConversation, onSelectConversation }) {
  const { user, logout }                        = useAuth();
  const { isOnline }                            = useSocket();
  const [conversations, setConversations]       = useState([]);
  const [search, setSearch]                     = useState('');
  const [searchResults, setSearchResults]       = useState([]);
  const [showGroupModal, setShowGroupModal]     = useState(false);
  const [showMenu, setShowMenu]                 = useState(false);
  const [unreadMap, setUnreadMap]               = useState({});

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    const { data } = await api.get('/conversations');
    setConversations(data);
  };

  // Search users
  useEffect(() => {
    if (!search.trim()) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      const { data } = await api.get(`/users/search?q=${search}`);
      setSearchResults(data);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Start a direct chat with a user from search
  const startDirectChat = async (targetUser) => {
    const { data } = await api.post('/conversations/direct', { userId: targetUser._id });
    setSearch('');
    setSearchResults([]);
    // Add to list if not already there
    setConversations((prev) => {
      const exists = prev.find((c) => c._id === data._id);
      return exists ? prev : [data, ...prev];
    });
    onSelectConversation(data);
  };

  const handleGroupCreated = (group) => {
    setConversations((prev) => [group, ...prev]);
    onSelectConversation(group);
  };

  // Update conversation when new message arrives (called from ChatLayout)
  const updateLastMessage = (conversationId, message) => {
    setConversations((prev) =>
      prev.map((c) =>
        c._id === conversationId ? { ...c, lastMessage: message, updatedAt: message.createdAt } : c
      ).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    );
  };

  // Expose for parent via ref if needed — simpler: pass as prop setter
  useEffect(() => {
    if (onSelectConversation._updateSidebar) {
      onSelectConversation._updateSidebar(updateLastMessage);
    }
  }, []);

  const getConversationName = (conv) => {
    if (conv.isGroup) return conv.name;
    const other = conv.participants?.find((p) => p._id !== user._id);
    return other?.name || 'Unknown';
  };

  const getConversationAvatar = (conv) => {
    if (conv.isGroup) return conv.name?.[0]?.toUpperCase() || '👥';
    const other = conv.participants?.find((p) => p._id !== user._id);
    return other?.name?.[0]?.toUpperCase() || '?';
  };

  const getOtherUser = (conv) => {
    return conv.participants?.find((p) => p._id !== user._id);
  };

  const displayList = search.trim() ? [] : conversations;

  return (
    <aside style={styles.sidebar}>
      {/* ── Header ─────────────────────────────────── */}
      <div style={styles.header}>
        <div style={styles.myAvatar}>
          {user?.name?.[0]?.toUpperCase()}
        </div>
        <div style={styles.headerTitle}>ChatApp</div>
        <div style={styles.headerActions}>
          <button
            style={styles.iconBtn}
            title="New Group"
            onClick={() => setShowGroupModal(true)}
          >
            👥
          </button>
          <div style={{ position: 'relative' }}>
            <button
              style={styles.iconBtn}
              onClick={() => setShowMenu(!showMenu)}
              title="Menu"
            >
              ⋮
            </button>
            {showMenu && (
              <div style={styles.dropdown}>
                <button style={styles.dropdownItem} onClick={logout}>
                  🚪 Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Search ──────────────────────────────────── */}
      <div style={styles.searchWrap}>
        <span style={styles.searchIcon}>🔍</span>
        <input
          style={styles.searchInput}
          placeholder="Search or start new chat"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button style={styles.clearBtn} onClick={() => setSearch('')}>✕</button>
        )}
      </div>

      {/* ── Search Results ──────────────────────────── */}
      {search.trim() && (
        <div style={styles.searchSection}>
          <div style={styles.sectionLabel}>USERS</div>
          {searchResults.length === 0 ? (
            <div style={styles.emptySearch}>No users found</div>
          ) : (
            searchResults.map((u) => (
              <div
                key={u._id}
                style={styles.searchItem}
                onClick={() => startDirectChat(u)}
              >
                <div style={styles.avatarCircle}>{u.name[0].toUpperCase()}</div>
                <div>
                  <div style={styles.itemName}>{u.name}</div>
                  <div style={styles.itemSub}>{u.email}</div>
                </div>
                {isOnline(u._id) && <span style={styles.onlineDot} />}
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Conversations List ───────────────────────── */}
      {!search.trim() && (
        <div style={styles.list}>
          {displayList.length === 0 && (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>💬</div>
              <p>No conversations yet</p>
              <p style={styles.emptyHint}>Search for a user to start chatting</p>
            </div>
          )}
          {displayList.map((conv) => {
            const isActive  = activeConversation?._id === conv._id;
            const otherUser = getOtherUser(conv);
            const online    = !conv.isGroup && otherUser && isOnline(otherUser._id);
            const lastMsg   = conv.lastMessage;
            const preview   = lastMsg
              ? (lastMsg.sender?._id === user._id ? 'You: ' : '') + lastMsg.content
              : 'No messages yet';

            return (
              <div
                key={conv._id}
                style={{
                  ...styles.convItem,
                  background: isActive ? '#2a3942' : 'transparent',
                }}
                onClick={() => onSelectConversation(conv)}
              >
                {/* Avatar */}
                <div style={{ position: 'relative' }}>
                  <div style={styles.convAvatar}>
                    {conv.isGroup ? '👥' : getConversationAvatar(conv)}
                  </div>
                  {online && <span style={styles.onlineBadge} />}
                </div>

                {/* Info */}
                <div style={styles.convInfo}>
                  <div style={styles.convTop}>
                    <span style={styles.convName}>{getConversationName(conv)}</span>
                    <span style={styles.convTime}>
                      {formatTime(conv.updatedAt)}
                    </span>
                  </div>
                  <div style={styles.convPreview}>{preview}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showGroupModal && (
        <CreateGroupModal
          onClose={() => setShowGroupModal(false)}
          onGroupCreated={handleGroupCreated}
        />
      )}
    </aside>
  );
}

const styles = {
  sidebar: {
    width: 360,
    minWidth: 300,
    borderRight: '1px solid #222d34',
    background: '#111b21',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 16px',
    background: '#202c33',
    flexShrink: 0,
  },
  myAvatar: {
    width: 40, height: 40, borderRadius: '50%',
    background: '#00a884',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#fff', fontWeight: 700, fontSize: 16, flexShrink: 0,
  },
  headerTitle: { flex: 1, color: '#e9edef', fontSize: 17, fontWeight: 600 },
  headerActions: { display: 'flex', gap: 4 },
  iconBtn: {
    background: 'none', border: 'none', color: '#aebac1',
    cursor: 'pointer', fontSize: 18, padding: '6px 8px', borderRadius: 6,
  },
  dropdown: {
    position: 'absolute', right: 0, top: '100%', background: '#233138',
    borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
    minWidth: 160, zIndex: 100, overflow: 'hidden',
  },
  dropdownItem: {
    display: 'block', width: '100%', padding: '12px 16px',
    background: 'none', border: 'none', color: '#e9edef',
    cursor: 'pointer', fontSize: 14, textAlign: 'left',
  },
  searchWrap: {
    display: 'flex', alignItems: 'center', gap: 10,
    margin: '10px 12px', background: '#202c33', borderRadius: 8, padding: '8px 12px',
    flexShrink: 0,
  },
  searchIcon: { fontSize: 14, color: '#8696a0' },
  searchInput: {
    background: 'none', border: 'none', color: '#e9edef',
    fontSize: 14, outline: 'none', flex: 1,
  },
  clearBtn: {
    background: 'none', border: 'none', color: '#8696a0',
    cursor: 'pointer', fontSize: 13,
  },
  searchSection: { overflowY: 'auto', flex: 1, padding: '0 0 12px' },
  sectionLabel: {
    color: '#8696a0', fontSize: 12, fontWeight: 600,
    padding: '12px 16px 6px', letterSpacing: '0.5px',
  },
  emptySearch: { color: '#8696a0', textAlign: 'center', padding: 24, fontSize: 14 },
  searchItem: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '10px 16px', cursor: 'pointer',
    transition: 'background 0.15s',
  },
  avatarCircle: {
    width: 42, height: 42, borderRadius: '50%', background: '#374045',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#e9edef', fontWeight: 600, fontSize: 17, flexShrink: 0,
  },
  itemName: { color: '#e9edef', fontSize: 15, fontWeight: 500 },
  itemSub: { color: '#8696a0', fontSize: 13 },
  onlineDot: {
    width: 8, height: 8, borderRadius: '50%', background: '#25d366',
    marginLeft: 'auto', flexShrink: 0,
  },
  list: { overflowY: 'auto', flex: 1 },
  emptyState: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', gap: 8, height: 300, color: '#8696a0',
  },
  emptyIcon: { fontSize: 48, marginBottom: 8 },
  emptyHint: { fontSize: 13, color: '#556268' },
  convItem: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '10px 16px', cursor: 'pointer', transition: 'background 0.15s',
    borderBottom: '1px solid #1d2c35',
  },
  convAvatar: {
    width: 48, height: 48, borderRadius: '50%', background: '#374045',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#e9edef', fontWeight: 700, fontSize: 18, flexShrink: 0,
  },
  onlineBadge: {
    position: 'absolute', bottom: 2, right: 2,
    width: 12, height: 12, borderRadius: '50%',
    background: '#25d366', border: '2px solid #111b21',
  },
  convInfo: { flex: 1, overflow: 'hidden' },
  convTop: { display: 'flex', justifyContent: 'space-between', marginBottom: 3 },
  convName: { color: '#e9edef', fontSize: 15, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180 },
  convTime: { color: '#8696a0', fontSize: 12, flexShrink: 0 },
  convPreview: { color: '#8696a0', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
};
