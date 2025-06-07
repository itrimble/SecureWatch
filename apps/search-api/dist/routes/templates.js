"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.templatesRoutes = void 0;
// @ts-nocheck
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const kql_engine_1 = require("@securewatch/kql-engine");
const logger_1 = __importDefault(require("../utils/logger"));
const router = (0, express_1.Router)();
exports.templatesRoutes = router;
/**
 * @swagger
 * components:
 *   schemas:
 *     SecurityTemplate:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Unique template identifier
 *         name:
 *           type: string
 *           description: Human-readable template name
 *         description:
 *           type: string
 *           description: Detailed description of what the template detects
 *         category:
 *           type: string
 *           enum: [Authentication, Network Security, Malware Detection, Data Exfiltration, Privilege Escalation, Lateral Movement, Persistence, Reconnaissance, Threat Hunting, Compliance, Incident Response, Anomaly Detection]
 *         query:
 *           type: string
 *           description: KQL query template with parameter placeholders
 *         parameters:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [string, number, timespan, datetime, boolean]
 *               description:
 *                 type: string
 *               defaultValue:
 *                 type: string
 *               required:
 *                 type: boolean
 *               options:
 *                 type: array
 *                 items:
 *                   type: string
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *         mitreTactics:
 *           type: array
 *           items:
 *             type: string
 *         mitreAttackIds:
 *           type: array
 *           items:
 *             type: string
 *         difficulty:
 *           type: string
 *           enum: [beginner, intermediate, advanced]
 *         useCase:
 *           type: string
 *           description: Primary use case for this template
 */
/**
 * @swagger
 * /api/v1/templates:
 *   get:
 *     summary: Get all security templates
 *     description: Retrieve all available security search templates
 *     tags: [Templates]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [Authentication, Network Security, Malware Detection, Data Exfiltration, Privilege Escalation, Lateral Movement, Persistence, Reconnaissance, Threat Hunting, Compliance, Incident Response, Anomaly Detection]
 *         description: Filter by category
 *       - in: query
 *         name: difficulty
 *         schema:
 *           type: string
 *           enum: [beginner, intermediate, advanced]
 *         description: Filter by difficulty level
 *       - in: query
 *         name: tag
 *         schema:
 *           type: string
 *         description: Filter by tag
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in template names, descriptions, and use cases
 *     responses:
 *       200:
 *         description: List of security templates
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/SecurityTemplate'
 */
router.get('/', [
    (0, express_validator_1.query)('category')
        .optional()
        .isIn(Object.values(kql_engine_1.SecurityCategory))
        .withMessage('Invalid category'),
    (0, express_validator_1.query)('difficulty')
        .optional()
        .isIn(['beginner', 'intermediate', 'advanced'])
        .withMessage('Invalid difficulty level'),
    (0, express_validator_1.query)('tag')
        .optional()
        .isString()
        .isLength({ min: 1, max: 50 })
        .withMessage('Tag must be 1-50 characters'),
    (0, express_validator_1.query)('search')
        .optional()
        .isString()
        .isLength({ min: 1, max: 100 })
        .withMessage('Search term must be 1-100 characters')
], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Validation failed',
            details: errors.array()
        });
    }
    try {
        const templateProvider = req.templateProvider;
        const { category, difficulty, tag, search } = req.query;
        let templates = templateProvider.getTemplates();
        // Apply filters
        if (category) {
            templates = templateProvider.getTemplatesByCategory(category);
        }
        if (difficulty) {
            templates = templates.filter(t => t.difficulty === difficulty);
        }
        if (tag) {
            templates = templateProvider.getTemplatesByTag(tag);
        }
        if (search) {
            templates = templateProvider.searchTemplates(search);
        }
        // Sort by difficulty and name
        templates.sort((a, b) => {
            const difficultyOrder = { beginner: 1, intermediate: 2, advanced: 3 };
            const diffA = difficultyOrder[a.difficulty];
            const diffB = difficultyOrder[b.difficulty];
            if (diffA !== diffB) {
                return diffA - diffB;
            }
            return a.name.localeCompare(b.name);
        });
        res.json(templates);
    }
    catch (error) {
        logger_1.default.error('Failed to get templates', error);
        res.status(500).json({
            error: 'Failed to get templates',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * @swagger
 * /api/v1/templates/{id}:
 *   get:
 *     summary: Get a specific template
 *     description: Retrieve a security template by its ID
 *     tags: [Templates]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Template ID
 *     responses:
 *       200:
 *         description: Security template
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SecurityTemplate'
 *       404:
 *         description: Template not found
 */
router.get('/:id', [
    (0, express_validator_1.param)('id')
        .isString()
        .isLength({ min: 1, max: 100 })
        .withMessage('Template ID must be 1-100 characters')
], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Validation failed',
            details: errors.array()
        });
    }
    try {
        const templateProvider = req.templateProvider;
        const { id } = req.params;
        const template = templateProvider.getTemplate(id);
        if (!template) {
            return res.status(404).json({
                error: 'Template not found',
                message: `Template with ID '${id}' was not found`
            });
        }
        res.json(template);
    }
    catch (error) {
        logger_1.default.error('Failed to get template', error);
        res.status(500).json({
            error: 'Failed to get template',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * @swagger
 * /api/v1/templates/{id}/render:
 *   post:
 *     summary: Render a template with parameters
 *     description: Generate a KQL query from a template with provided parameters
 *     tags: [Templates]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Template ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               parameters:
 *                 type: object
 *                 description: Parameter values for the template
 *                 example:
 *                   timeRange: "1h"
 *                   threshold: 10
 *     responses:
 *       200:
 *         description: Rendered KQL query
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 query:
 *                   type: string
 *                   description: Rendered KQL query
 *                 parameters:
 *                   type: object
 *                   description: Parameters used in rendering
 *       404:
 *         description: Template not found
 */
router.post('/:id/render', [
    (0, express_validator_1.param)('id')
        .isString()
        .isLength({ min: 1, max: 100 })
        .withMessage('Template ID must be 1-100 characters'),
    (0, express_validator_1.body)('parameters')
        .isObject()
        .withMessage('Parameters must be an object')
], async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Validation failed',
            details: errors.array()
        });
    }
    try {
        const templateProvider = req.templateProvider;
        const { id } = req.params;
        const { parameters } = req.body;
        const template = templateProvider.getTemplate(id);
        if (!template) {
            return res.status(404).json({
                error: 'Template not found',
                message: `Template with ID '${id}' was not found`
            });
        }
        // Validate required parameters
        const missingParams = [];
        if (template.parameters) {
            for (const param of template.parameters) {
                if (param.required && !(param.name in parameters)) {
                    missingParams.push(param.name);
                }
            }
        }
        if (missingParams.length > 0) {
            return res.status(400).json({
                error: 'Missing required parameters',
                missing: missingParams
            });
        }
        // Apply default values for missing optional parameters
        const finalParameters = { ...parameters };
        if (template.parameters) {
            for (const param of template.parameters) {
                if (!(param.name in finalParameters) && param.defaultValue !== undefined) {
                    finalParameters[param.name] = param.defaultValue;
                }
            }
        }
        const query = templateProvider.renderTemplate(id, finalParameters);
        logger_1.default.info('Template rendered', {
            templateId: id,
            userId: req.user?.sub,
            organizationId: req.headers['x-organization-id']
        });
        res.json({
            query,
            parameters: finalParameters,
            template: {
                id: template.id,
                name: template.name,
                category: template.category,
                difficulty: template.difficulty
            }
        });
    }
    catch (error) {
        logger_1.default.error('Failed to render template', error);
        res.status(500).json({
            error: 'Failed to render template',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * @swagger
 * /api/v1/templates/categories:
 *   get:
 *     summary: Get all template categories
 *     description: Retrieve all available security template categories
 *     tags: [Templates]
 *     responses:
 *       200:
 *         description: List of categories
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: string
 */
router.get('/meta/categories', async (req, res) => {
    try {
        const templateProvider = req.templateProvider;
        const categories = templateProvider.getCategories();
        res.json(categories);
    }
    catch (error) {
        logger_1.default.error('Failed to get categories', error);
        res.status(500).json({
            error: 'Failed to get categories',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * @swagger
 * /api/v1/templates/stats:
 *   get:
 *     summary: Get template statistics
 *     description: Get statistics about available templates
 *     tags: [Templates]
 *     responses:
 *       200:
 *         description: Template statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *                 byCategory:
 *                   type: object
 *                 byDifficulty:
 *                   type: object
 *                 topTags:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       tag:
 *                         type: string
 *                       count:
 *                         type: integer
 */
router.get('/meta/stats', async (req, res) => {
    try {
        const templateProvider = req.templateProvider;
        const templates = templateProvider.getTemplates();
        // Calculate statistics
        const stats = {
            total: templates.length,
            byCategory: {},
            byDifficulty: {},
            topTags: []
        };
        // Count by category
        for (const template of templates) {
            stats.byCategory[template.category] = (stats.byCategory[template.category] || 0) + 1;
        }
        // Count by difficulty
        for (const template of templates) {
            stats.byDifficulty[template.difficulty] = (stats.byDifficulty[template.difficulty] || 0) + 1;
        }
        // Count tags
        const tagCounts = new Map();
        for (const template of templates) {
            for (const tag of template.tags) {
                tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
            }
        }
        // Get top 10 tags
        stats.topTags = Array.from(tagCounts.entries())
            .map(([tag, count]) => ({ tag, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
        res.json(stats);
    }
    catch (error) {
        logger_1.default.error('Failed to get template stats', error);
        res.status(500).json({
            error: 'Failed to get template stats',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
