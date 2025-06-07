import { Router } from 'express';
import { EducationalManager } from '@securewatch/educational';
import { logger } from '../utils/logger';
import { validateRequest, idParamSchema } from '../middleware/validation.middleware';
import { assessmentSchema, assessmentSubmissionSchema } from '../schemas/education.schemas';
import { requirePermission, EDUCATION_PERMISSIONS } from '../middleware/auth.middleware';

const router = Router();

/**
 * GET /api/assessments
 * Get assessments with filtering
 */
router.get('/', async (req, res) => {
  try {
    const educationalSystem: EducationalManager = req.app.locals.educationalSystem;
    const assessmentService = educationalSystem.getAssessmentService();

    const result = await assessmentService.getAssessments({
      filters: req.query as any,
      pagination: {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
      },
    });

    res.json(result);
  } catch (error) {
    logger.error('Error fetching assessments:', error);
    res.status(500).json({ error: 'Failed to fetch assessments' });
  }
});

/**
 * POST /api/assessments
 * Create new assessment
 */
router.post('/',
  requirePermission(EDUCATION_PERMISSIONS.CREATE_ASSESSMENTS),
  validateRequest(assessmentSchema),
  async (req, res) => {
    try {
      const educationalSystem: EducationalManager = req.app.locals.educationalSystem;
      const assessmentService = educationalSystem.getAssessmentService();
      const userId = req.user?.id;

      const assessmentData = {
        ...req.body,
        createdBy: userId,
        createdAt: new Date(),
      };

      const newAssessment = await assessmentService.createAssessment(assessmentData);

      res.status(201).json({
        message: 'Assessment created successfully',
        assessment: newAssessment,
      });
    } catch (error) {
      logger.error('Error creating assessment:', error);
      res.status(500).json({ error: 'Failed to create assessment' });
    }
  }
);

/**
 * GET /api/assessments/:id
 * Get specific assessment
 */
router.get('/:id',
  validateRequest({ params: idParamSchema }),
  async (req, res) => {
    try {
      const educationalSystem: EducationalManager = req.app.locals.educationalSystem;
      const assessmentService = educationalSystem.getAssessmentService();
      const { id } = req.params;
      const userId = req.user?.id;

      const assessment = await assessmentService.getAssessment(id, userId);
      
      if (!assessment) {
        return res.status(404).json({ error: 'Assessment not found' });
      }

      res.json(assessment);
    } catch (error) {
      logger.error('Error fetching assessment:', error);
      res.status(500).json({ error: 'Failed to fetch assessment' });
    }
  }
);

/**
 * POST /api/assessments/:id/submit
 * Submit assessment answers
 */
router.post('/:id/submit',
  validateRequest({ params: idParamSchema, body: assessmentSubmissionSchema.body }),
  async (req, res) => {
    try {
      const educationalSystem: EducationalManager = req.app.locals.educationalSystem;
      const assessmentService = educationalSystem.getAssessmentService();
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const submissionData = {
        ...req.body,
        userId,
        assessmentId: id,
      };

      const result = await assessmentService.submitAssessment(submissionData);

      res.json({
        message: 'Assessment submitted successfully',
        result,
      });
    } catch (error) {
      logger.error('Error submitting assessment:', error);
      res.status(500).json({ error: 'Failed to submit assessment' });
    }
  }
);

export { router as assessmentRoutes };