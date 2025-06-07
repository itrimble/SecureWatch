import { Router } from 'express';
import { EducationalManager } from '@securewatch/educational';
import { logger } from '../utils/logger';
import { validateRequest, idParamSchema } from '../middleware/validation.middleware';
import { certificationSchema } from '../schemas/education.schemas';
import { requirePermission, EDUCATION_PERMISSIONS } from '../middleware/auth.middleware';

const router = Router();

/**
 * GET /api/certifications
 * Get available certifications
 */
router.get('/', async (req, res) => {
  try {
    const educationalSystem: EducationalManager = req.app.locals.educationalSystem;
    const certificationService = educationalSystem.getCertificationService();

    const result = await certificationService.getCertifications({
      filters: req.query as any,
      pagination: {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
      },
    });

    res.json(result);
  } catch (error) {
    logger.error('Error fetching certifications:', error);
    res.status(500).json({ error: 'Failed to fetch certifications' });
  }
});

/**
 * POST /api/certifications
 * Create new certification
 */
router.post('/',
  requirePermission(EDUCATION_PERMISSIONS.MANAGE_CERTIFICATES),
  validateRequest(certificationSchema),
  async (req, res) => {
    try {
      const educationalSystem: EducationalManager = req.app.locals.educationalSystem;
      const certificationService = educationalSystem.getCertificationService();
      const userId = req.user?.id;

      const certificationData = {
        ...req.body,
        createdBy: userId,
        createdAt: new Date(),
      };

      const newCertification = await certificationService.createCertification(certificationData);

      res.status(201).json({
        message: 'Certification created successfully',
        certification: newCertification,
      });
    } catch (error) {
      logger.error('Error creating certification:', error);
      res.status(500).json({ error: 'Failed to create certification' });
    }
  }
);

/**
 * GET /api/certifications/my-certificates
 * Get user's earned certificates
 */
router.get('/my-certificates', async (req, res) => {
  try {
    const educationalSystem: EducationalManager = req.app.locals.educationalSystem;
    const certificationService = educationalSystem.getCertificationService();
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const certificates = await certificationService.getUserCertifications(userId);

    res.json({ certificates });
  } catch (error) {
    logger.error('Error fetching user certificates:', error);
    res.status(500).json({ error: 'Failed to fetch certificates' });
  }
});

export { router as certificationRoutes };