import { io, Socket } from 'socket.io-client';
import { API_URL } from './api';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(API_URL, {
      autoConnect: false,
      transports: ['websocket'],
    });
  }
  return socket;
};

export const connectSocket = () => {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
    console.log('[Socket] Connecting...');
  }
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    console.log('[Socket] Disconnected');
    socket = null;
  }
};

export const joinPostRoom = (postId: string) => {
  const s = getSocket();
  connectSocket();
  s.emit('join_post', postId);
};

export const leavePostRoom = (postId: string) => {
  if (socket && socket.connected) {
    socket.emit('leave_post', postId);
  }
};
