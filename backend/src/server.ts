import http from 'http';
import { Server } from 'socket.io';
import app from './app';
import { config } from './config';
import { connectDB } from './database/db';

const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Set Socket.io instance on express app to expose to routes
app.set('io', io);

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log(`[WS] Client connected: ${socket.id}`);

  // Join a room for a specific post to receive real-time votes/comments updates
  socket.on('join_post', (postId: string) => {
    console.log(`[WS] Client ${socket.id} joined post room: ${postId}`);
    socket.join(postId);
  });

  socket.on('leave_post', (postId: string) => {
    console.log(`[WS] Client ${socket.id} left post room: ${postId}`);
    socket.leave(postId);
  });

  socket.on('disconnect', () => {
    console.log(`[WS] Client disconnected: ${socket.id}`);
  });
});

const startServer = async () => {
  // 1. Connect to Database & Redis
  await connectDB();

  // 2. Start Listening
  const PORT = config.port;
  server.listen(PORT, () => {
    console.log(`========================================`);
    console.log(`🚀 Verdict Server running on port ${PORT}`);
    console.log(`👉 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`========================================`);
  });
};

startServer();
