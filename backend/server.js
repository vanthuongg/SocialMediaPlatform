// [auto] Initial Express server entry point
import 'dotenv/config';
import { createServer } from 'http';
import app from './src/app.js';
import { connectDatabase } from './src/config/database.js';
import { initializeSocket } from './src/socket/index.js';
import { env } from './src/config/env.js';

const PORT = env.PORT || 5000;

// Create HTTP server (shared between Express & Socket.IO)
const httpServer = createServer(app);

// Initialize Socket.IO
initializeSocket(httpServer);

// Connect to MongoDB then start server
connectDatabase()
  .then(() => {
    httpServer.listen(PORT, () => {
      console.log(`\n🚀 Nova API running on http://localhost:${PORT}`);
      console.log(`🌐 Environment: ${env.NODE_ENV}`);
      console.log(`📡 Socket.IO ready\n`);
    });
  })
  .catch((err) => {
    console.error('❌ Failed to connect to MongoDB:', err.message);
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  httpServer.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  httpServer.close(() => process.exit(1));
});
