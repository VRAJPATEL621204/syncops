import { Server } from 'socket.io';
import { verifyToken } from '../utils/jwt.js';
import prisma from './prisma.js';
import { encrypt, decrypt } from '../utils/crypto.js';

let io = null;

export const initializeSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: true,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Socket authentication middleware
  io.use(async (socket, next) => {
    try {
      // Parse token from HttpOnly cookie in handshake headers
      const cookieHeader = socket.handshake.headers.cookie || '';
      const cookieToken = cookieHeader
        .split(';')
        .map(c => c.trim())
        .find(c => c.startsWith('token='));
      const token = cookieToken ? cookieToken.split('=')[1] : null;
      
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = verifyToken(token);
      
      if (!decoded) {
        return next(new Error('Invalid token'));
      }

      // Attach user data to socket
      socket.userId = decoded.userId;
      socket.userRole = decoded.role;
      socket.organizationId = decoded.organizationId;
      
      // Join organization room for org-wide broadcasts
      socket.join(`org:${decoded.organizationId}`);
      
      next();
    } catch (error) {
      console.error('Socket auth error:', error);
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`[Socket] User connected: ${socket.userId}`);

    // Join a chat room
    socket.on('room:join', async (roomId) => {
      try {
        // Verify user is a participant of this room
        const participant = await prisma.roomParticipant.findFirst({
          where: {
            roomId,
            userId: socket.userId,
          },
        });

        // Also check if it's an org room the user has access to
        const room = await prisma.room.findFirst({
          where: {
            id: roomId,
            organizationId: socket.organizationId,
          },
        });

        // Allow: participants, org rooms, or admins
        const isAdmin = socket.userRole === 'admin';
        if (!participant && room?.type !== 'org' && !isAdmin) {
          socket.emit('error', { message: 'Not authorized to join this room' });
          return;
        }

        // For org rooms, auto-add as participant if not already
        if (room?.type === 'org' && !participant) {
          await prisma.roomParticipant.create({
            data: {
              roomId,
              userId: socket.userId,
            },
          });
        }

        socket.join(`room:${roomId}`);
        socket.currentRoom = roomId;
        
        socket.emit('room:joined', { roomId });
        console.log(`[Socket] User ${socket.userId} joined room ${roomId}`);
        
        // Update lastReadAt
        await prisma.roomParticipant.updateMany({
          where: { roomId, userId: socket.userId },
          data: { lastReadAt: new Date() },
        });
      } catch (error) {
        console.error('[Socket] Join room error:', error);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    // Leave a chat room
    socket.on('room:leave', (roomId) => {
      socket.leave(`room:${roomId}`);
      if (socket.currentRoom === roomId) {
        socket.currentRoom = null;
      }
      socket.emit('room:left', { roomId });
      console.log(`[Socket] User ${socket.userId} left room ${roomId}`);
    });

    // Send a message
    socket.on('message:send', async (data) => {
      try {
        const { roomId, content, type = 'text', mediaUrl, mimeType, duration } = data;

        // Verify user is in the room
        if (!socket.rooms.has(`room:${roomId}`)) {
          socket.emit('error', { message: 'Not in room' });
          return;
        }

        // Build message data — encrypt text content before persisting
        const plainContent = content?.trim() || '';
        const messageData = {
          roomId,
          senderId: socket.userId,
          content: encrypt(plainContent),
          type,
        };
        if (mediaUrl) messageData.mediaUrl = mediaUrl;
        if (mimeType) messageData.mimeType = mimeType;
        if (duration) messageData.duration = duration;

        // Create message in database
        const message = await prisma.message.create({
          data: messageData,
          include: {
            sender: {
              select: {
                id: true,
                fullName: true,
                email: true,
                profileImage: true,
              },
            },
          },
        });

        // Broadcast to all room participants — send decrypted content
        io.to(`room:${roomId}`).emit('message:new', {
          message: {
            id: message.id,
            roomId: message.roomId,
            content: decrypt(message.content),
            type: message.type,
            mediaUrl: message.mediaUrl,
            mimeType: message.mimeType,
            duration: message.duration,
            sender: message.sender,
            createdAt: message.createdAt,
          },
        });

        console.log(`[Socket] Message sent in room ${roomId} by ${socket.userId}`);
      } catch (error) {
        console.error('[Socket] Send message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // User disconnect
    socket.on('disconnect', () => {
      console.log(`[Socket] User disconnected: ${socket.userId}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
};

// Helper to broadcast to organization
export const broadcastToOrg = (organizationId, event, data) => {
  if (!io) return;
  io.to(`org:${organizationId}`).emit(event, data);
};

// Helper to broadcast to specific room
export const broadcastToRoom = (roomId, event, data) => {
  if (!io) return;
  io.to(`room:${roomId}`).emit(event, data);
};
