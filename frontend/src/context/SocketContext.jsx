import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const { user }                          = useAuth();
  const [socket, setSocket]               = useState(null);
  const [onlineUsers, setOnlineUsers]     = useState(new Set());
  const [connected, setConnected]         = useState(false);

  useEffect(() => {
    if (!user?.token) return;

    const newSocket = io('http://localhost:5001', {
      auth: { token: user.token },
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      setConnected(true);
      // Join all rooms this user has conversations in
      newSocket.emit('join:conversations');
    });

    newSocket.on('disconnect', () => setConnected(false));

    newSocket.on('user:online', ({ userId }) => {
      setOnlineUsers((prev) => new Set([...prev, userId]));
    });

    newSocket.on('user:offline', ({ userId }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [user]);

  const isOnline = (userId) => onlineUsers.has(userId);

  return (
    <SocketContext.Provider value={{ socket, connected, onlineUsers, isOnline }}>
      {children}
    </SocketContext.Provider>
  );
};
