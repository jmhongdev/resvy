import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler } from './middleware/errorHandler';
import healthRoute from './routes/healthRoute';

const app = express();

// Security headers
app.use(helmet());

// Allow cross-origin requests from the React frontend
app.use(cors());

// Parse incoming JSON request bodies
app.use(express.json());

// Routes
app.use('/health', healthRoute);

// 404 handler — catches any route that doesn't match above
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// Global error handler
app.use(errorHandler);

export default app;