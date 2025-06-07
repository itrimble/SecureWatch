import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import { createEducationalSystem, EDUCATIONAL_FEATURES } from '@securewatch/educational';

// Import routes
import { educationRoutes } from './routes/education.routes';
import { learningRoutes } from './routes/learning.routes';
import { assessmentRoutes } from './routes/assessment.routes';
import { labRoutes } from './routes/lab.routes';
import { certificationRoutes } from './routes/certification.routes';
import { knowledgeBaseRoutes } from './routes/knowledge-base.routes';

// Import middleware
import { errorHandler } from './middleware/error-handler';
import { authMiddleware } from './middleware/auth.middleware';
import { logger } from './utils/logger';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4011;

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:4000',
  credentials: true,
}));
app.use(compression());
app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString(),
  });
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'education-service',
    version: '1.9.0',
    timestamp: new Date().toISOString(),
    features: Object.values(EDUCATIONAL_FEATURES),
  });
});

// API Routes (with authentication)
app.use('/api/education', authMiddleware, educationRoutes);
app.use('/api/learning', authMiddleware, learningRoutes);
app.use('/api/assessments', authMiddleware, assessmentRoutes);
app.use('/api/labs', authMiddleware, labRoutes);
app.use('/api/certifications', authMiddleware, certificationRoutes);
app.use('/api/knowledge-base', authMiddleware, knowledgeBaseRoutes);

// Public routes (no authentication required)
app.use('/api/public/education', educationRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
    service: 'education-service',
  });
});

// Error handling middleware
app.use(errorHandler);

// Initialize educational system and start server
async function startServer() {
  try {
    logger.info('Initializing educational system...');
    
    // Configure database connection
    const databaseConfig = {
      type: process.env.DB_TYPE || 'sqlite',
      connection: process.env.DB_CONNECTION || './data/education.db',
      ...(process.env.DB_TYPE === 'postgres' && {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        user: process.env.DB_USER || 'securewatch',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'securewatch_education',
      }),
    };

    // Create educational system
    const educationalSystem = await createEducationalSystem({
      database: databaseConfig,
      educational: {
        features: {
          enrollmentRequired: process.env.ENROLLMENT_REQUIRED !== 'false',
          allowGuestAccess: process.env.ALLOW_GUEST_ACCESS === 'true',
          enableCertifications: process.env.ENABLE_CERTIFICATIONS !== 'false',
          enableForums: process.env.ENABLE_FORUMS !== 'false',
          enableLabs: process.env.ENABLE_LABS !== 'false',
          enableAssessments: process.env.ENABLE_ASSESSMENTS !== 'false',
          enableProgressTracking: process.env.ENABLE_PROGRESS_TRACKING !== 'false',
        },
        limits: {
          maxEnrollmentsPerUser: parseInt(process.env.MAX_ENROLLMENTS_PER_USER || '10'),
          maxLabDuration: parseInt(process.env.MAX_LAB_DURATION || '14400'), // 4 hours
          maxFileUploadSize: parseInt(process.env.MAX_FILE_UPLOAD_SIZE || '10485760'), // 10MB
          maxLabAttempts: parseInt(process.env.MAX_LAB_ATTEMPTS || '5'),
          maxAssessmentAttempts: parseInt(process.env.MAX_ASSESSMENT_ATTEMPTS || '3'),
        },
        labs: {
          defaultEnvironment: process.env.LAB_DEFAULT_ENVIRONMENT || 'docker',
          resourceLimits: {
            cpu: process.env.LAB_CPU_LIMIT || '1',
            memory: process.env.LAB_MEMORY_LIMIT || '1Gi',
            storage: process.env.LAB_STORAGE_LIMIT || '10Gi',
          },
          networkIsolation: process.env.LAB_NETWORK_ISOLATION !== 'false',
          autoCleanup: process.env.LAB_AUTO_CLEANUP !== 'false',
          cleanupDelay: parseInt(process.env.LAB_CLEANUP_DELAY || '3600'),
        },
      },
      services: {
        enableLearningManagement: process.env.ENABLE_LEARNING_MANAGEMENT !== 'false',
        enableLabEnvironment: process.env.ENABLE_LAB_ENVIRONMENT !== 'false',
        enableProgressTracking: process.env.ENABLE_PROGRESS_TRACKING !== 'false',
        enableAssessments: process.env.ENABLE_ASSESSMENTS !== 'false',
        enableCertifications: process.env.ENABLE_CERTIFICATIONS !== 'false',
        enableTrainingScenarios: process.env.ENABLE_TRAINING_SCENARIOS !== 'false',
        enableKnowledgeBase: process.env.ENABLE_KNOWLEDGE_BASE !== 'false',
        enableInstructorTools: process.env.ENABLE_INSTRUCTOR_TOOLS !== 'false',
      },
    });

    // Make educational system available to routes
    app.locals.educationalSystem = educationalSystem;

    logger.info('Educational system initialized successfully');

    // Start server
    app.listen(PORT, () => {
      logger.info(`🎓 Education Service running on port ${PORT}`);
      logger.info(`📚 Features enabled: ${Object.values(EDUCATIONAL_FEATURES).join(', ')}`);
      logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🗄️  Database: ${databaseConfig.type}`);
    });

  } catch (error) {
    logger.error('Failed to start education service:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  // Add any cleanup logic here if needed
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  // Add any cleanup logic here if needed
  process.exit(0);
});

// Start the server
startServer().catch((error) => {
  logger.error('Unhandled error during startup:', error);
  process.exit(1);
});