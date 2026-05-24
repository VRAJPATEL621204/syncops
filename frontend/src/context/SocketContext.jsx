import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { toast } from '@/hooks/use-toast';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [messages, setMessages] = useState({}); // roomId -> messages[]
  const processedMessageIds = useRef(new Set()); // Track processed message IDs
  const socketRef = useRef(null); // Stable ref to prevent StrictMode double-connect

  // Initialize socket connection
  useEffect(() => {
    if (!user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setConnected(false);
      }
      return;
    }

    // Already have a socket instance — skip (handles StrictMode double-invoke)
    if (socketRef.current) return;

    const socketUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5002/api').replace(/\/api$/, '');
    const newSocket = io(socketUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
    });
    socketRef.current = newSocket;

    newSocket.on('connect', () => {
      console.log('[Socket] Connected');
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('[Socket] Disconnected');
      setConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error);
      setConnected(false);
    });

    newSocket.on('error', (error) => {
      console.error('[Socket] Error:', error);
      toast({
        title: 'Chat Error',
        description: error.message || 'Something went wrong',
        variant: 'destructive',
      });
    });

    // Handle incoming messages
    newSocket.on('message:new', ({ message }) => {
      // Global deduplication - skip if we've already processed this message ID
      if (processedMessageIds.current.has(message.id)) {
        return;
      }
      processedMessageIds.current.add(message.id);
      
      setMessages((prev) => {
        const roomMessages = prev[message.roomId] || [];
        
        // Double-check: prevent duplicates by ID
        if (roomMessages.find((m) => m.id === message.id)) {
          return prev;
        }
        
        // Check if there's a temp message from the same sender with same content/media (within 5 seconds)
        const tempIndex = roomMessages.findIndex((m) => {
          if (!m.isTemp) return false;
          if (m.sender.id !== message.sender.id) return false;
          const tempTime = new Date(m.createdAt).getTime();
          const serverTime = new Date(message.createdAt).getTime();
          if (Math.abs(serverTime - tempTime) >= 5000) return false;
          // For media messages match by type + mediaUrl
          if (message.type !== 'text') {
            return m.type === message.type && m.mediaUrl === message.mediaUrl;
          }
          // For text messages match by content
          return m.content === message.content;
        });
        
        if (tempIndex !== -1) {
          // Replace temp message with server-confirmed message
          const newMessages = [...roomMessages];
          newMessages[tempIndex] = message;
          return {
            ...prev,
            [message.roomId]: newMessages,
          };
        }
        
        // Add new message
        return {
          ...prev,
          [message.roomId]: [...roomMessages, message],
        };
      });
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
      socketRef.current = null;
    };
  }, [user?.id]);

  // Join a room
  const joinRoom = useCallback((roomId) => {
    if (!socket || !connected) return;

    // Leave current room if different
    if (currentRoom && currentRoom !== roomId) {
      socket.emit('room:leave', currentRoom);
    }

    socket.emit('room:join', roomId);
    setCurrentRoom(roomId);
  }, [socket, connected, currentRoom]);

  // Leave a room
  const leaveRoom = useCallback((roomId) => {
    if (!socket || !connected) return;

    socket.emit('room:leave', roomId);
    if (currentRoom === roomId) {
      setCurrentRoom(null);
    }
  }, [socket, connected, currentRoom]);

  // Send a message (text or media)
  const sendMessage = useCallback((roomId, content, mediaPayload = null) => {
    if (!socket || !connected) {
      toast({
        title: 'Error',
        description: 'Not connected to chat server',
        variant: 'destructive',
      });
      return;
    }

    if (mediaPayload) {
      socket.emit('message:send', { roomId, content: content || '', ...mediaPayload });
    } else {
      if (!content.trim()) return;
      socket.emit('message:send', { roomId, content: content.trim() });
    }
  }, [socket, connected]);

  // Set messages for a room (used when fetching history)
  const setRoomMessages = useCallback((roomId, newMessages) => {
    setMessages((prev) => ({
      ...prev,
      [roomId]: newMessages,
    }));
  }, []);

  // Get messages for a room
  const getRoomMessages = useCallback((roomId) => {
    return messages[roomId] || [];
  }, [messages]);

  const value = {
    socket,
    connected,
    currentRoom,
    joinRoom,
    leaveRoom,
    sendMessage,
    setRoomMessages,
    getRoomMessages,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
