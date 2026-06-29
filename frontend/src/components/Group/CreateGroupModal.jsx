import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useSocket } from '../../context/SocketContext';

export default function CreateGroupModal({ onClose, onGroupCreated }) {
  const [groupName, setGroupName]           = useState('');
  const [allUsers, setAllUsers]             = useState([]);
  const [selectedUsers, setSelectedUsers]   = useState([]);
  const [search, setSearch]                 = useState('');
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState('');
  const { socket }                          = useSocket();

  useEffect(() => {
    api.get('/users').then(({ data }) => setAllUsers(data));
  }, []);

  const filtered = allUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  const toggleUser = (userId) => {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleCreate = async () => {
    if (!groupName.trim()) return setError('Please enter a group name');
    if (selectedUsers.length < 2) return setError('Select at least 2 members');
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/conversations/group', {
        name: groupName.trim(),
        participants: selectedUsers,
      });
      // Join the new group room via socket
      socket?.emit('join:conversation', data._id);
      onGroupCreated(data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={(e) => e.stopPropagation()}>
        <div style={header}>
          <h2 style={title}>New Group</h2>
          <button style={closeBtn} onClick={onClose}>✕</button>
        </div>

        {error && <div style={errorBox}>{error}</div>}

        <input
          style={inputStyle}
          placeholder="Group name (e.g. Team Alpha)"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
        />

        <input
          style={{ ...inputStyle, marginTop: 10 }}
          placeholder="Search users…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* Selected chips */}
        {selectedUsers.length > 0 && (
          <div style={chipsRow}>
            {selectedUsers.map((uid) => {
              const u = allUsers.find((x) => x._id === uid);
              return (
                <span key={uid} style={chip}>
                  {u?.name}
                  <button style={chipX} onClick={() => toggleUser(uid)}>×</button>
                </span>
              );
            })}
          </div>
        )}

        {/* User list */}
        <div style={userList}>
          {filtered.map((u) => {
            const selected = selectedUsers.includes(u._id);
            return (
              <div
                key={u._id}
                style={{ ...userRow, background: selected ? 'rgba(0,168,132,0.15)' : 'transparent' }}
                onClick={() => toggleUser(u._id)}
              >
                <div style={avatar}>{u.name[0].toUpperCase()}</div>
                <div style={userInfo}>
                  <div style={userName}>{u.name}</div>
                  <div style={userEmail}>{u.email}</div>
                </div>
                {selected && <span style={checkmark}>✓</span>}
              </div>
            );
          })}
        </div>

        <button style={createBtn} onClick={handleCreate} disabled={loading}>
          {loading ? 'Creating…' : `Create Group (${selectedUsers.length} selected)`}
        </button>
      </div>
    </div>
  );
}

const overlay = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
};
const modal = {
  background: '#202c33', borderRadius: 14, padding: '24px 20px',
  width: 400, maxHeight: '80vh', display: 'flex', flexDirection: 'column', gap: 12,
  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
};
const header = { display: 'flex', alignItems: 'center', justifyContent: 'space-between' };
const title  = { color: '#e9edef', fontSize: 18, fontWeight: 600 };
const closeBtn = {
  background: 'none', border: 'none', color: '#8696a0',
  fontSize: 18, cursor: 'pointer',
};
const errorBox = {
  background: 'rgba(241,92,109,0.15)', border: '1px solid rgba(241,92,109,0.4)',
  color: '#f15c6d', borderRadius: 8, padding: '8px 12px', fontSize: 13,
};
const inputStyle = {
  background: '#2a3942', border: '1px solid #374045', borderRadius: 8,
  color: '#e9edef', fontSize: 14, padding: '10px 14px', outline: 'none', width: '100%',
};
const chipsRow = { display: 'flex', flexWrap: 'wrap', gap: 6 };
const chip = {
  background: 'rgba(0,168,132,0.2)', border: '1px solid rgba(0,168,132,0.4)',
  color: '#00a884', borderRadius: 20, padding: '4px 10px', fontSize: 13,
  display: 'flex', alignItems: 'center', gap: 6,
};
const chipX = {
  background: 'none', border: 'none', color: '#00a884',
  cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0,
};
const userList = { overflowY: 'auto', maxHeight: 240, display: 'flex', flexDirection: 'column' };
const userRow = {
  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 8px',
  borderRadius: 8, cursor: 'pointer', transition: 'background 0.15s',
};
const avatar = {
  width: 38, height: 38, borderRadius: '50%', background: '#374045',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: '#e9edef', fontWeight: 600, fontSize: 16, flexShrink: 0,
};
const userInfo = { flex: 1 };
const userName  = { color: '#e9edef', fontSize: 14, fontWeight: 500 };
const userEmail = { color: '#8696a0', fontSize: 12 };
const checkmark = { color: '#00a884', fontSize: 18, fontWeight: 700 };
const createBtn = {
  background: '#00a884', border: 'none', borderRadius: 8, color: '#fff',
  cursor: 'pointer', fontSize: 15, fontWeight: 600, padding: '12px',
  marginTop: 4,
};
