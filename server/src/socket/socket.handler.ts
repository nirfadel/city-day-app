import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { SOCKET_EVENTS } from '../types';

let io: Server;

export const initSocket = (httpServer: HttpServer): Server => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:4200',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket: Socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);

    // Player joins their group room
    socket.on(SOCKET_EVENTS.JOIN_ROOM, ({ groupId, nickname, groupName, groupColor }: {
      groupId: string; nickname: string; groupName?: string; groupColor?: string;
    }) => {
      socket.join(`group-${groupId}`);
      console.log(`[Socket] ${nickname} joined group-${groupId}`);
      // USER_JOINED is emitted by auth.controller after DB write — re-emit here
      // only for reconnections (page reload) where controller won't fire again
      io.to('admin-room').emit(SOCKET_EVENTS.USER_JOINED, { nickname, groupName, groupColor });
    });

    // Admin joins admin room
    socket.on(SOCKET_EVENTS.ADMIN_JOIN, () => {
      socket.join('admin-room');
      console.log(`[Socket] Admin joined admin-room`);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Disconnected: ${socket.id}`);
    });
  });

  return io;
};

// Use this in controllers to emit events
export const getIO = (): Server => {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
};
