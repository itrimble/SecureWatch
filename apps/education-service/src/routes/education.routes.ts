import { Router } from 'express';
import { EducationalManager } from '@securewatch/educational';
import { logger } from '../utils/logger';
import { validateRequest } from '../middleware/validation.middleware';
import { dashboardSchema, enrollmentSchema } from '../schemas/education.schemas';

const router = Router();

/**
 * GET /api/education/dashboard
 * Get educational dashboard overview for current user
 */
router.get('/dashboard', validateRequest(dashboardSchema), async (req, res) => {
  try {
    const educationalSystem: EducationalManager = req.app.locals.educationalSystem;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get user's learning progress
    const progressService = educationalSystem.getProgressTrackingService();
    const userProgress = await progressService.getUserProgress(userId);

    // Get available learning paths
    const learningService = educationalSystem.getLearningManagementService();
    const availablePaths = await learningService.getAvailableLearningPaths();

    // Get recent activity
    const recentActivity = await progressService.getRecentActivity(userId, 10);

    // Get user's certifications
    const certificationService = educationalSystem.getCertificationService();
    const userCertifications = await certificationService.getUserCertifications(userId);

    // Get recommended content
    const recommendations = await learningService.getRecommendedContent(userId);

    const dashboardData = {
      user: {
        id: userId,
        progressSummary: {
          totalEnrollments: userProgress.enrollments?.length || 0,
          completedCourses: userProgress.completedCourses || 0,
          inProgressCourses: userProgress.inProgressCourses || 0,
          totalSkillPoints: userProgress.totalSkillPoints || 0,
          currentLevel: userProgress.currentLevel || 'Beginner',
        },
      },
      learningPaths: availablePaths.slice(0, 6), // Featured learning paths
      recentActivity: recentActivity,
      certifications: userCertifications,
      recommendations: recommendations.slice(0, 5),
      statistics: {
        totalLearningPaths: availablePaths.length,
        totalCertifications: userCertifications.length,
        avgCompletionTime: userProgress.avgCompletionTime || 0,
        skillDistribution: userProgress.skillDistribution || {},
      },
    };

    res.json(dashboardData);
  } catch (error) {
    logger.error('Error fetching education dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

/**
 * GET /api/education/learning-paths
 * Get all available learning paths with filtering
 */
router.get('/learning-paths', async (req, res) => {
  try {
    const educationalSystem: EducationalManager = req.app.locals.educationalSystem;
    const learningService = educationalSystem.getLearningManagementService();

    const {
      category,
      difficulty,
      skillLevel,
      duration,
      page = 1,
      limit = 20,
      search,
    } = req.query;

    const filters = {
      category: category as string,
      difficulty: difficulty as string,
      skillLevel: skillLevel as string,
      duration: duration as string,
      search: search as string,
    };

    const result = await learningService.getLearningPaths({
      filters,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
      },
    });

    res.json(result);
  } catch (error) {
    logger.error('Error fetching learning paths:', error);
    res.status(500).json({ error: 'Failed to fetch learning paths' });
  }
});

/**
 * GET /api/education/learning-paths/:id
 * Get specific learning path details
 */
router.get('/learning-paths/:id', async (req, res) => {
  try {
    const educationalSystem: EducationalManager = req.app.locals.educationalSystem;
    const learningService = educationalSystem.getLearningManagementService();
    const { id } = req.params;
    const userId = req.user?.id;

    const learningPath = await learningService.getLearningPath(id);
    
    if (!learningPath) {
      return res.status(404).json({ error: 'Learning path not found' });
    }

    // Get user's progress on this path if authenticated
    let userProgress = null;
    if (userId) {
      const progressService = educationalSystem.getProgressTrackingService();
      userProgress = await progressService.getPathProgress(userId, id);
    }

    res.json({
      ...learningPath,
      userProgress,
    });
  } catch (error) {
    logger.error('Error fetching learning path:', error);
    res.status(500).json({ error: 'Failed to fetch learning path' });
  }
});

/**
 * POST /api/education/enroll
 * Enroll user in a learning path or course
 */
router.post('/enroll', validateRequest(enrollmentSchema), async (req, res) => {
  try {
    const educationalSystem: EducationalManager = req.app.locals.educationalSystem;
    const progressService = educationalSystem.getProgressTrackingService();
    const { learningPathId, courseId } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const enrollmentResult = await progressService.enrollUser({
      userId,
      learningPathId,
      courseId,
      enrollmentDate: new Date(),
    });

    res.status(201).json({
      message: 'Successfully enrolled',
      enrollment: enrollmentResult,
    });
  } catch (error) {
    logger.error('Error enrolling user:', error);
    if (error.message.includes('already enrolled')) {
      res.status(409).json({ error: 'User already enrolled in this content' });
    } else if (error.message.includes('enrollment limit')) {
      res.status(429).json({ error: 'Enrollment limit reached' });
    } else {
      res.status(500).json({ error: 'Failed to enroll user' });
    }
  }
});

/**
 * GET /api/education/my-enrollments
 * Get current user's enrollments and progress
 */
router.get('/my-enrollments', async (req, res) => {
  try {
    const educationalSystem: EducationalManager = req.app.locals.educationalSystem;
    const progressService = educationalSystem.getProgressTrackingService();
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const enrollments = await progressService.getUserEnrollments(userId);
    
    res.json({
      enrollments,
      summary: {
        total: enrollments.length,
        inProgress: enrollments.filter(e => e.status === 'in-progress').length,
        completed: enrollments.filter(e => e.status === 'completed').length,
        paused: enrollments.filter(e => e.status === 'paused').length,
      },
    });
  } catch (error) {
    logger.error('Error fetching user enrollments:', error);
    res.status(500).json({ error: 'Failed to fetch enrollments' });
  }
});

/**
 * GET /api/education/categories
 * Get all available content categories
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
 * GET /api/education/search
 * Search across all educational content
 */
router.get('/search', async (req, res) => {
  try {
    const educationalSystem: EducationalManager = req.app.locals.educationalSystem;
    const learningService = educationalSystem.getLearningManagementService();
    const knowledgeBaseService = educationalSystem.getKnowledgeBaseService();

    const { q: query, type, page = 1, limit = 20 } = req.query;

    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters long' });
    }

    const searchParams = {
      query: query.trim(),
      type: type as string,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
      },
    };

    // Search learning content
    const learningResults = await learningService.searchContent(searchParams);
    
    // Search knowledge base
    const knowledgeResults = await knowledgeBaseService.searchArticles(searchParams);

    const combinedResults = {
      query: searchParams.query,
      totalResults: learningResults.total + knowledgeResults.total,
      learning: learningResults,
      knowledgeBase: knowledgeResults,
      suggestions: await learningService.getSearchSuggestions(searchParams.query),
    };

    res.json(combinedResults);
  } catch (error) {
    logger.error('Error performing search:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

/**
 * GET /api/education/stats
 * Get overall educational system statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const educationalSystem: EducationalManager = req.app.locals.educationalSystem;
    const progressService = educationalSystem.getProgressTrackingService();
    const learningService = educationalSystem.getLearningManagementService();
    const certificationService = educationalSystem.getCertificationService();

    const [
      totalUsers,
      totalLearningPaths,
      totalCertifications,
      totalKnowledgeArticles,
      recentEnrollments,
    ] = await Promise.all([
      progressService.getTotalUsers(),
      learningService.getTotalLearningPaths(),
      certificationService.getTotalCertifications(),
      educationalSystem.getKnowledgeBaseService().getTotalArticles(),
      progressService.getRecentEnrollments(30), // Last 30 days
    ]);

    const stats = {
      overview: {
        totalUsers,
        totalLearningPaths,
        totalCertifications,
        totalKnowledgeArticles,
        recentEnrollments: recentEnrollments.length,
      },
      growth: {
        monthlyEnrollments: recentEnrollments.length,
        // Add more growth metrics as needed
      },
      lastUpdated: new Date().toISOString(),
    };

    res.json(stats);
  } catch (error) {
    logger.error('Error fetching education stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

export { router as educationRoutes };