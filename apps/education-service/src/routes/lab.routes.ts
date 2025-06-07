import { Router } from 'express';
import { EducationalManager } from '@securewatch/educational';
import { logger } from '../utils/logger';
import { validateRequest, idParamSchema } from '../middleware/validation.middleware';
import { labEnvironmentSchema } from '../schemas/education.schemas';
import { requirePermission, EDUCATION_PERMISSIONS } from '../middleware/auth.middleware';

const router = Router();

/**
 * GET /api/labs
 * Get available lab environments
 */
router.get('/', async (req, res) => {
  try {
    const educationalSystem: EducationalManager = req.app.locals.educationalSystem;
    const labService = educationalSystem.getLabEnvironmentService();

    const result = await labService.getLabEnvironments({
      filters: req.query as any,
      pagination: {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
      },
    });

    res.json(result);
  } catch (error) {
    logger.error('Error fetching lab environments:', error);
    res.status(500).json({ error: 'Failed to fetch lab environments' });
  }
});

/**
 * POST /api/labs
 * Create new lab environment
 */
router.post('/',
  requirePermission(EDUCATION_PERMISSIONS.MANAGE_LABS),
  validateRequest(labEnvironmentSchema),
  async (req, res) => {
    try {
      const educationalSystem: EducationalManager = req.app.locals.educationalSystem;
      const labService = educationalSystem.getLabEnvironmentService();
      const userId = req.user?.id;

      const labData = {
        ...req.body,
        createdBy: userId,
        createdAt: new Date(),
      };

      const newLab = await labService.createLabEnvironment(labData);

      res.status(201).json({
        message: 'Lab environment created successfully',
        lab: newLab,
      });
    } catch (error) {
      logger.error('Error creating lab environment:', error);
      res.status(500).json({ error: 'Failed to create lab environment' });
    }
  }
);

/**
 * POST /api/labs/:id/start
 * Start a lab session
 */
router.post('/:id/start',
  validateRequest({ params: idParamSchema }),
  async (req, res) => {
    try {
      const educationalSystem: EducationalManager = req.app.locals.educationalSystem;
      const labService = educationalSystem.getLabEnvironmentService();
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const session = await labService.startLabSession(userId, id);

      res.json({
        message: 'Lab session started successfully',
        session,
      });
    } catch (error) {
      logger.error('Error starting lab session:', error);
      res.status(500).json({ error: 'Failed to start lab session' });
    }
  }
);

export { router as labRoutes };