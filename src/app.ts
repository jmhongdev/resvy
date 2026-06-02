import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
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

// Security middleware

// Security headers
app.use(helmet());

// Validate CORS origin at startup
const corsOrigin = process.env.CORS_ORIGIN;
if (!corsOrigin) {
  throw new Error('Missing required environment variable: CORS_ORIGIN');
}

app.use(cors({
  origin:      corsOrigin,
  credentials: true,
}));

// Limit request body size — prevents payload flooding
app.use(express.json({ limit: '10kb' }));

// Request logging

app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Rate limiting

// Strict limiter for auth endpoints — prevents brute force
const authLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             10,
  message:         { success: false, message: 'Too many attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders:   false,
});

// General limiter — relaxed in development
const generalLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             process.env.NODE_ENV === 'production' ? 100 : 1000,
  message:         { success: false, message: 'Too many requests, please slow down' },
  standardHeaders: true,
  legacyHeaders:   false,
});

app.use(generalLimiter);
app.use('/auth/login',    authLimiter);
app.use('/auth/register', authLimiter);

// API documentation (development only)

if (process.env.NODE_ENV !== 'production') {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

// Routes

app.use('/health',    healthRoute);
app.use('/auth',      authRoute);
app.use('/amenities', amenityRoute);
app.use('/bookings',  bookingRoute);
app.use('/stats',     statsRoute);
app.use('/users',     userRoute);

// Error handling

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
  });
});

app.use(errorHandler);

export default app;