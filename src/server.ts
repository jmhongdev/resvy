import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { pool } from './db/pool';

const PORT = Number(process.env.PORT) || 3000;

// Capture the server instance so we can shut it down gracefully
const server = app.listen(PORT, () => {
  console.log(`Resvy API running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV ?? 'development'}`);
  console.log(`API docs: http://localhost:${PORT}/api/docs`);
});

// Handle server startup errors
server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use`);
  } else {
    console.error('Server error:', err);
  }
  process.exit(1);
});

// Graceful shutdown on SIGTERM
process.on('SIGTERM', () => {
  console.log('SIGTERM received — shutting down gracefully');
  server.close(() => {
    console.log('HTTP server closed');
    pool.end(() => {
      console.log('Database pool closed');
      process.exit(0);
    });
  });
});

// Graceful shutdown on SIGINT
process.on('SIGINT', () => {
  console.log('SIGINT received — shutting down gracefully');
  server.close(() => {
    pool.end(() => {
      process.exit(0);
    });
  });
});

// Catch unhandled promise rejections log and exit cleanly
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
  process.exit(1);
});