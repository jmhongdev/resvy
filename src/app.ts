import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler } from './middleware/errorHandler';
import healthRoute from './routes/healthRoute';
import authRoute from './routes/authRoute';
import amenityRoute from './routes/amenityRoute';
import bookingRoute from './routes/bookingRoute';
import statsRoute from './routes/statsRoute';

const app = express();

// Security headers
app.use(helmet());

// Allow cross-origin requests from the React frontend
app.use(cors());

// Parse incoming JSON request bodies
app.use(express.json());

// Routes
app.use('/health', healthRoute);
app.use('/auth', authRoute);
app.use('/amenities', amenityRoute);
app.use('/bookings', bookingRoute);
app.use('/stats',    statsRoute);

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