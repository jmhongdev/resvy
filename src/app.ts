import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import { errorHandler } from './middleware/errorHandler';
import healthRoute from './routes/healthRoute';
import authRoute from './routes/authRoute';
import amenityRoute from './routes/amenityRoute';
import bookingRoute from './routes/bookingRoute';
import statsRoute from './routes/statsRoute';
import userRoute from './routes/userRoute';

const app = express();

// Security headers. Helmet sets safe defaults for
// X-Frame-Options, X-XSS-Protection
app.use(helmet());

// Restrict CORS to the frontend domain only
// prevents other websites from making requests to the API
app.use(cors({
  origin:      process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

// Limit request body size. This prevents payload flooding attacks
app.use(express.json({ limit: '10kb' }));

// Rate limiters

// Strict limiter for auth endpoints to prevent brute force attacks
// Max 10 requests per IP per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      10,
  message:  {
    success: false,
    message: 'Too many attempts, please try again later',
  },
  standardHeaders: true,  // Return rate limit info in headers
  legacyHeaders:   false,
});

// General limiter for all other routes
// Max 100 requests per IP per 15 minutes
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      process.env.NODE_ENV === 'production' ? 100 : 1000,
  message:  {
    success: false,
    message: 'Too many requests, please slow down',
  },
  standardHeaders: true,
  legacyHeaders:   false,
});

// Apply general limiter to all routes
app.use(generalLimiter);

// Apply strict limiter to auth routes
// Must be before app.use('/auth', authRoute)
app.use('/auth/login',    authLimiter);
app.use('/auth/register', authLimiter);

// API documentation
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use('/health',    healthRoute);
app.use('/auth',      authRoute);
app.use('/amenities', amenityRoute);
app.use('/bookings',  bookingRoute);
app.use('/stats',     statsRoute);
app.use('/users', userRoute);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// Global error handler — must be last
app.use(errorHandler);

export default app;