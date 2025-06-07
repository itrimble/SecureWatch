import { Router } from 'express';
import { EducationalManager } from '@securewatch/educational';
import { logger } from '../utils/logger';
import { validateRequest, idParamSchema, searchSchema } from '../middleware/validation.middleware';
import { knowledgeBaseSchema } from '../schemas/education.schemas';
import { requirePermission, EDUCATION_PERMISSIONS } from '../middleware/auth.middleware';

const router = Router();

/**
 * GET /api/knowledge-base/articles
 * Get knowledge base articles
 */
router.get('/articles', async (req, res) => {
  try {
    const educationalSystem: EducationalManager = req.app.locals.educationalSystem;
    const knowledgeBaseService = educationalSystem.getKnowledgeBaseService();

    const result = await knowledgeBaseService.getArticles({
      filters: req.query as any,
      pagination: {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
      },
    });

    res.json(result);
  } catch (error) {
    logger.error('Error fetching knowledge base articles:', error);
    res.status(500).json({ error: 'Failed to fetch articles' });
  }
});

/**
 * POST /api/knowledge-base/articles
 * Create new knowledge base article
 */
router.post('/articles',
  requirePermission(EDUCATION_PERMISSIONS.CREATE_CONTENT),
  validateRequest(knowledgeBaseSchema),
  async (req, res) => {
    try {
      const educationalSystem: EducationalManager = req.app.locals.educationalSystem;
      const knowledgeBaseService = educationalSystem.getKnowledgeBaseService();
      const userId = req.user?.id;

      const articleData = {
        ...req.body,
        createdBy: userId,
        createdAt: new Date(),
      };

      const newArticle = await knowledgeBaseService.createArticle(articleData);

      res.status(201).json({
        message: 'Knowledge base article created successfully',
        article: newArticle,
      });
    } catch (error) {
      logger.error('Error creating knowledge base article:', error);
      res.status(500).json({ error: 'Failed to create article' });
    }
  }
);

/**
 * GET /api/knowledge-base/articles/:id
 * Get specific knowledge base article
 */
router.get('/articles/:id',
  validateRequest({ params: idParamSchema }),
  async (req, res) => {
    try {
      const educationalSystem: EducationalManager = req.app.locals.educationalSystem;
      const knowledgeBaseService = educationalSystem.getKnowledgeBaseService();
      const { id } = req.params;

      const article = await knowledgeBaseService.getArticle(id);
      
      if (!article) {
        return res.status(404).json({ error: 'Article not found' });
      }

      res.json(article);
    } catch (error) {
      logger.error('Error fetching knowledge base article:', error);
      res.status(500).json({ error: 'Failed to fetch article' });
    }
  }
);

/**
 * GET /api/knowledge-base/search
 * Search knowledge base articles
 */
router.get('/search',
  validateRequest({ query: searchSchema }),
  async (req, res) => {
    try {
      const educationalSystem: EducationalManager = req.app.locals.educationalSystem;
      const knowledgeBaseService = educationalSystem.getKnowledgeBaseService();

      const result = await knowledgeBaseService.searchArticles({
        query: req.query.q as string,
        type: req.query.type as string,
        pagination: {
          page: parseInt(req.query.page as string) || 1,
          limit: parseInt(req.query.limit as string) || 20,
        },
      });

      res.json(result);
    } catch (error) {
      logger.error('Error searching knowledge base:', error);
      res.status(500).json({ error: 'Failed to search articles' });
    }
  }
);

export { router as knowledgeBaseRoutes };