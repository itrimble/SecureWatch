import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import { createGoogleStrategy } from './services/oauth/google.strategy';
import { createMicrosoftStrategy } from './services/oauth/microsoft.strategy';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import roleRoutes from './routes/role.routes';
import { errorHandler } from './middleware/error.middleware';
import { requestLogger } from './middleware/logging.middleware';
import { DatabaseService } from './services/database.service';
import { RedisService } from './services/redis.service';
import logger from './utils/logger';

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Request logging
app.use(requestLogger);

// Initialize Passport
app.use(passport.initialize());

// Configure OAuth strategies
passport.use('google', createGoogleStrategy());
passport.use('microsoft', createMicrosoftStrategy());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    service: 'auth-service',
    timestamp: new Date().toISOString(),
  });
});

// Ready check endpoint
app.get('/ready', async (req, res) => {
  try {
    // Check database connection
    await DatabaseService.healthCheck();
    
    // Check Redis connection
    await RedisService.healthCheck();
    
    res.status(200).json({ 
      status: 'ready',
      service: 'auth-service',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'not ready',
      service: 'auth-service',
      error: error instanceof Error ? error.message : 'Service not ready',
      timestamp: new Date().toISOString(),
    });
  }
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);

// Error handling middleware (must be last)
app.use(errorHandler);

// Initialize services and start server
async function startServer() {
  try {
    // Initialize database connection
    await DatabaseService.initialize();
    logger.info('Database connection established');

    // Initialize Redis connection
    await RedisService.initialize();
    logger.info('Redis connection established');

    // Start server
    app.listen(PORT, () => {
      logger.info(`Auth service running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Failed to start auth service:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  try {
    await DatabaseService.close();
    await RedisService.close();
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
});

// Start the server
startServer();