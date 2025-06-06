// @ts-nocheck
import { Router } from 'express';
import { KQLEngine } from '@securewatch/kql-engine';
import logger from '../utils/logger';

const router = Router();

/**
 * @swagger
 * /api/v1/schema/tables:
 *   get:
 *     summary: Get database schema
 *     description: Retrieve information about available tables and their columns
 *     tags: [Schema]
 *     responses:
 *       200:
 *         description: Database schema information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tables:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                       description:
 *                         type: string
 *                       columns:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             name:
 *                               type: string
 *                             type:
 *                               type: string
 *                             nullable:
 *                               type: boolean
 *                             description:
 *                               type: string
 */
router.get('/tables', async (req, res) => {
  try {
    const kqlEngine: KQLEngine = (req as any).kqlEngine;
    const schema = kqlEngine.getTableSchemas();
    res.json(schema);

  } catch (error) {
    logger.error('Failed to get schema', error);
    res.status(500).json({
      error: 'Failed to get schema',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/v1/schema/functions:
 *   get:
 *     summary: Get available functions
 *     description: Retrieve information about available KQL functions
 *     tags: [Schema]
 *     responses:
 *       200:
 *         description: Available functions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                   description:
 *                     type: string
 *                   parameters:
 *                     type: array
 *                   returnType:
 *                     type: string
 *                   category:
 *                     type: string
 *                   examples:
 *                     type: array
 *                     items:
 *                       type: string
 */
router.get('/functions', async (req, res) => {
  try {
    const kqlEngine: KQLEngine = (req as any).kqlEngine;
    const functions = kqlEngine.getFunctions();
    res.json(functions);

  } catch (error) {
    logger.error('Failed to get functions', error);
    res.status(500).json({
      error: 'Failed to get functions',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { router as schemaRoutes };