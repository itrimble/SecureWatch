import { Router } from 'express';
import { EducationalManager } from '@securewatch/educational';
import { logger } from '../utils/logger';
import { validateRequest, idParamSchema, learningFilterSchema } from '../middleware/validation.middleware';
import { learningPathSchema, courseSchema, progressUpdateSchema } from '../schemas/education.schemas';
import { requireInstructor, requirePermission, EDUCATION_PERMISSIONS } from '../middleware/auth.middleware';

const router = Router();

/**
 * GET /api/learning/paths
 * Get learning paths with filtering and pagination
 */
router.get('/paths', validateRequest({ query: learningFilterSchema }), async (req, res) => {
  try {
    const educationalSystem: EducationalManager = req.app.locals.educationalSystem;
    const learningService = educationalSystem.getLearningManagementService();

    const result = await learningService.getLearningPaths({
      filters: req.query as any,
      pagination: {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
      },
    });

    res.json(result);
  } catch (error) {
    logger.error('Error fetching learning paths:', error);
    res.status(500).json({ error: 'Failed to fetch learning paths' });
  }
});

/**
 * POST /api/learning/paths
 * Create a new learning path (instructor/admin only)
 */
router.post('/paths', 
  requirePermission(EDUCATION_PERMISSIONS.CREATE_CONTENT),
  validateRequest(learningPathSchema),
  async (req, res) => {
    try {
      const educationalSystem: EducationalManager = req.app.locals.educationalSystem;
      const learningService = educationalSystem.getLearningManagementService();
      const userId = req.user?.id;

      const learningPathData = {
        ...req.body,
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const newLearningPath = await learningService.createLearningPath(learningPathData);

      logger.info('Learning path created', {
        learningPathId: newLearningPath.id,
        title: newLearningPath.title,
        createdBy: userId,
      });

      res.status(201).json({
        message: 'Learning path created successfully',
        learningPath: newLearningPath,
      });
    } catch (error) {
      logger.error('Error creating learning path:', error);
      res.status(500).json({ error: 'Failed to create learning path' });
    }
  }
);

/**
 * GET /api/learning/paths/:id
 * Get specific learning path with user progress
 */
router.get('/paths/:id', 
  validateRequest({ params: idParamSchema }),
  async (req, res) => {
    try {
      const educationalSystem: EducationalManager = req.app.locals.educationalSystem;
      const learningService = educationalSystem.getLearningManagementService();
      const progressService = educationalSystem.getProgressTrackingService();
      const { id } = req.params;
      const userId = req.user?.id;

      const learningPath = await learningService.getLearningPath(id);
      
      if (!learningPath) {
        return res.status(404).json({ error: 'Learning path not found' });
      }

      // Get user progress if authenticated
      let userProgress = null;
      if (userId) {
        userProgress = await progressService.getPathProgress(userId, id);
      }

      // Get related paths
      const relatedPaths = await learningService.getRelatedPaths(id, 5);

      res.json({
        ...learningPath,
        userProgress,
        relatedPaths,
      });
    } catch (error) {
      logger.error('Error fetching learning path:', error);
      res.status(500).json({ error: 'Failed to fetch learning path' });
    }
  }
);

/**
 * PUT /api/learning/paths/:id
 * Update learning path (instructor/admin only)
 */
router.put('/paths/:id',
  requirePermission(EDUCATION_PERMISSIONS.EDIT_CONTENT),
  validateRequest({ params: idParamSchema, body: learningPathSchema.body }),
  async (req, res) => {
    try {
      const educationalSystem: EducationalManager = req.app.locals.educationalSystem;
      const learningService = educationalSystem.getLearningManagementService();
      const { id } = req.params;
      const userId = req.user?.id;

      const existingPath = await learningService.getLearningPath(id);
      if (!existingPath) {
        return res.status(404).json({ error: 'Learning path not found' });
      }

      const updateData = {
        ...req.body,
        updatedBy: userId,
        updatedAt: new Date(),
      };

      const updatedPath = await learningService.updateLearningPath(id, updateData);

      logger.info('Learning path updated', {
        learningPathId: id,
        updatedBy: userId,
      });

      res.json({
        message: 'Learning path updated successfully',
        learningPath: updatedPath,
      });
    } catch (error) {
      logger.error('Error updating learning path:', error);
      res.status(500).json({ error: 'Failed to update learning path' });
    }
  }
);

/**
 * DELETE /api/learning/paths/:id
 * Delete learning path (admin only)
 */
router.delete('/paths/:id',
  requirePermission(EDUCATION_PERMISSIONS.DELETE_CONTENT),
  validateRequest({ params: idParamSchema }),
  async (req, res) => {
    try {
      const educationalSystem: EducationalManager = req.app.locals.educationalSystem;
      const learningService = educationalSystem.getLearningManagementService();
      const { id } = req.params;
      const userId = req.user?.id;

      const existingPath = await learningService.getLearningPath(id);
      if (!existingPath) {
        return res.status(404).json({ error: 'Learning path not found' });
      }

      await learningService.deleteLearningPath(id);

      logger.info('Learning path deleted', {
        learningPathId: id,
        deletedBy: userId,
      });

      res.json({ message: 'Learning path deleted successfully' });
    } catch (error) {
      logger.error('Error deleting learning path:', error);
      res.status(500).json({ error: 'Failed to delete learning path' });
    }
  }
);

/**
 * GET /api/learning/courses
 * Get courses with filtering and pagination
 */
router.get('/courses', validateRequest({ query: learningFilterSchema }), async (req, res) => {
  try {
    const educationalSystem: EducationalManager = req.app.locals.educationalSystem;
    const learningService = educationalSystem.getLearningManagementService();

    const result = await learningService.getCourses({
      filters: req.query as any,
      pagination: {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
      },
    });

    res.json(result);
  } catch (error) {
    logger.error('Error fetching courses:', error);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

/**
 * POST /api/learning/courses
 * Create a new course (instructor/admin only)
 */
router.post('/courses',
  requirePermission(EDUCATION_PERMISSIONS.CREATE_CONTENT),
  validateRequest(courseSchema),
  async (req, res) => {
    try {
      const educationalSystem: EducationalManager = req.app.locals.educationalSystem;
      const learningService = educationalSystem.getLearningManagementService();
      const userId = req.user?.id;

      const courseData = {
        ...req.body,
        instructorId: req.body.instructorId || userId, // Default to current user
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const newCourse = await learningService.createCourse(courseData);

      logger.info('Course created', {
        courseId: newCourse.id,
        title: newCourse.title,
        createdBy: userId,
      });

      res.status(201).json({
        message: 'Course created successfully',
        course: newCourse,
      });
    } catch (error) {
      logger.error('Error creating course:', error);
      res.status(500).json({ error: 'Failed to create course' });
    }
  }
);

/**
 * GET /api/learning/courses/:id
 * Get specific course with enrollment status
 */
router.get('/courses/:id',
  validateRequest({ params: idParamSchema }),
  async (req, res) => {
    try {
      const educationalSystem: EducationalManager = req.app.locals.educationalSystem;
      const learningService = educationalSystem.getLearningManagementService();
      const progressService = educationalSystem.getProgressTrackingService();
      const { id } = req.params;
      const userId = req.user?.id;

      const course = await learningService.getCourse(id);
      
      if (!course) {
        return res.status(404).json({ error: 'Course not found' });
      }

      // Get enrollment status and progress if user is authenticated
      let enrollment = null;
      let userProgress = null;
      if (userId) {
        enrollment = await progressService.getCourseEnrollment(userId, id);
        if (enrollment) {
          userProgress = await progressService.getCourseProgress(userId, id);
        }
      }

      // Get course statistics
      const stats = await learningService.getCourseStats(id);

      res.json({
        ...course,
        enrollment,
        userProgress,
        stats,
      });
    } catch (error) {
      logger.error('Error fetching course:', error);
      res.status(500).json({ error: 'Failed to fetch course' });
    }
  }
);

/**
 * POST /api/learning/progress
 * Update user's learning progress
 */
router.post('/progress',
  validateRequest(progressUpdateSchema),
  async (req, res) => {
    try {
      const educationalSystem: EducationalManager = req.app.locals.educationalSystem;
      const progressService = educationalSystem.getProgressTrackingService();
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const progressData = {
        ...req.body,
        userId,
        updatedAt: new Date(),
      };

      const updatedProgress = await progressService.updateProgress(progressData);

      logger.info('Progress updated', {
        userId,
        entityType: req.body.entityType,
        entityId: req.body.entityId,
        status: req.body.status,
        progress: req.body.progress,
      });

      res.json({
        message: 'Progress updated successfully',
        progress: updatedProgress,
      });
    } catch (error) {
      logger.error('Error updating progress:', error);
      res.status(500).json({ error: 'Failed to update progress' });
    }
  }
);

/**
 * GET /api/learning/progress/:userId
 * Get user's learning progress (user can view own, instructors can view students)
 */
router.get('/progress/:userId',
  validateRequest({ params: { userId: idParamSchema.extract('id') } }),
  async (req, res) => {
    try {
      const educationalSystem: EducationalManager = req.app.locals.educationalSystem;
      const progressService = educationalSystem.getProgressTrackingService();
      const { userId: targetUserId } = req.params;
      const currentUserId = req.user?.id;
      const userRole = req.user?.role;

      // Check if user can view this progress
      if (currentUserId !== targetUserId && !['instructor', 'admin'].includes(userRole || '')) {
        return res.status(403).json({ error: 'Insufficient permissions to view this progress' });
      }

      const userProgress = await progressService.getUserProgress(targetUserId);
      
      if (!userProgress) {
        return res.status(404).json({ error: 'User progress not found' });
      }

      res.json(userProgress);
    } catch (error) {
      logger.error('Error fetching user progress:', error);
      res.status(500).json({ error: 'Failed to fetch user progress' });
    }
  }
);

/**
 * GET /api/learning/recommendations
 * Get personalized learning recommendations for current user
 */
router.get('/recommendations', async (req, res) => {
  try {
    const educationalSystem: EducationalManager = req.app.locals.educationalSystem;
    const learningService = educationalSystem.getLearningManagementService();
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const limit = parseInt(req.query.limit as string) || 10;
    const type = req.query.type as string || 'all'; // 'paths', 'courses', 'articles', 'all'

    const recommendations = await learningService.getPersonalizedRecommendations(userId, {
      limit,
      type,
    });

    res.json({
      recommendations,
      generatedAt: new Date().toISOString(),
      userId,
    });
  } catch (error) {
    logger.error('Error fetching recommendations:', error);
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
});

/**
 * GET /api/learning/categories
 * Get all available learning categories
 */
router.get('/categories', async (req, res) => {
  try {
    const educationalSystem: EducationalManager = req.app.locals.educationalSystem;
    const learningService = educationalSystem.getLearningManagementService();

    const categories = await learningService.getCategories();
    
    res.json({ categories });
  } catch (error) {
    logger.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

/**
 * GET /api/learning/popular
 * Get popular learning content
 */
router.get('/popular', async (req, res) => {
  try {
    const educationalSystem: EducationalManager = req.app.locals.educationalSystem;
    const learningService = educationalSystem.getLearningManagementService();

    const timeframe = req.query.timeframe as string || 'month'; // week, month, year, all
    const type = req.query.type as string || 'all'; // paths, courses, all
    const limit = parseInt(req.query.limit as string) || 10;

    const popularContent = await learningService.getPopularContent({
      timeframe,
      type,
      limit,
    });

    res.json(popularContent);
  } catch (error) {
    logger.error('Error fetching popular content:', error);
    res.status(500).json({ error: 'Failed to fetch popular content' });
  }
});

export { router as learningRoutes };