import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import knex, { Knex } from 'knex';
import { logger } from '../utils/logger';
import {
  LearningPath,
  LearningPathSchema,
  LearningModule,
  LearningModuleSchema,
  Lesson,
  LessonSchema,
  DatabaseConfig,
  SearchFilters,
  Pagination,
  SkillLevel,
  Difficulty
} from '../types/educational.types';

interface LearningPathSearchResult {
  paths: LearningPath[];
  total: number;
  page: number;
  totalPages: number;
}

interface ModuleSearchResult {
  modules: LearningModule[];
  total: number;
  page: number;
  totalPages: number;
}

export class LearningManagementService extends EventEmitter {
  private db: Knex;

  constructor(config: { database: DatabaseConfig }) {
    super();
    this.db = knex({
      client: config.database.type,
      connection: config.database.connection,
      useNullAsDefault: true
    });
  }

  async initialize(): Promise<void> {
    logger.info('Initializing Learning Management Service');
    await this.createTables();
    await this.seedDefaultContent();
    logger.info('Learning Management Service initialized successfully');
  }

  private async createTables(): Promise<void> {
    // Learning paths table
    if (!(await this.db.schema.hasTable('learning_paths'))) {
      await this.db.schema.createTable('learning_paths', (table) => {
        table.string('id').primary();
        table.string('title').notNullable();
        table.text('description');
        table.string('skill_level').notNullable();
        table.integer('estimated_hours').notNullable();
        table.string('category').notNullable();
        table.string('difficulty').notNullable();
        table.json('prerequisites');
        table.json('certification');
        table.json('tags');
        table.json('learning_objectives');
        table.json('target_audience');
        table.json('industry');
        table.boolean('trending').defaultTo(false);
        table.boolean('featured').defaultTo(false);
        table.decimal('price', 10, 2).defaultTo(0);
        table.integer('enrollment_limit');
        table.dateTime('start_date');
        table.dateTime('end_date');
        table.json('instructors');
        table.string('created_by').notNullable();
        table.dateTime('created_at').notNullable();
        table.dateTime('updated_at').notNullable();
        table.json('metadata');
        
        table.index(['category', 'skill_level']);
        table.index(['difficulty']);
        table.index(['trending', 'featured']);
        table.index(['created_at']);
      });
    }

    // Learning modules table
    if (!(await this.db.schema.hasTable('learning_modules'))) {
      await this.db.schema.createTable('learning_modules', (table) => {
        table.string('id').primary();
        table.string('learning_path_id').notNullable();
        table.string('title').notNullable();
        table.text('description');
        table.integer('order').notNullable();
        table.integer('estimated_hours').notNullable();
        table.string('skill_level').notNullable();
        table.json('completion_criteria');
        table.json('prerequisites');
        table.json('tags');
        table.json('learning_objectives');
        table.string('created_by').notNullable();
        table.dateTime('created_at').notNullable();
        table.dateTime('updated_at').notNullable();
        table.json('metadata');
        
        table.foreign('learning_path_id').references('learning_paths.id').onDelete('CASCADE');
        table.index(['learning_path_id', 'order']);
        table.index(['skill_level']);
      });
    }

    // Lessons table
    if (!(await this.db.schema.hasTable('lessons'))) {
      await this.db.schema.createTable('lessons', (table) => {
        table.string('id').primary();
        table.string('module_id').notNullable();
        table.string('title').notNullable();
        table.text('description');
        table.string('type').notNullable();
        table.json('content');
        table.integer('duration').notNullable(); // minutes
        table.integer('order').notNullable();
        table.json('quiz');
        table.json('prerequisites');
        table.json('tags');
        table.json('resources');
        table.dateTime('created_at').notNullable();
        table.dateTime('updated_at').notNullable();
        table.json('metadata');
        
        table.foreign('module_id').references('learning_modules.id').onDelete('CASCADE');
        table.index(['module_id', 'order']);
        table.index(['type']);
      });
    }

    // Path modules mapping table (for module reuse across paths)
    if (!(await this.db.schema.hasTable('path_modules'))) {
      await this.db.schema.createTable('path_modules', (table) => {
        table.string('id').primary();
        table.string('learning_path_id').notNullable();
        table.string('module_id').notNullable();
        table.integer('order').notNullable();
        table.boolean('required').defaultTo(true);
        table.dateTime('created_at').notNullable();
        
        table.foreign('learning_path_id').references('learning_paths.id').onDelete('CASCADE');
        table.foreign('module_id').references('learning_modules.id').onDelete('CASCADE');
        table.unique(['learning_path_id', 'module_id']);
        table.index(['learning_path_id', 'order']);
      });
    }

    // Categories table
    if (!(await this.db.schema.hasTable('categories'))) {
      await this.db.schema.createTable('categories', (table) => {
        table.string('id').primary();
        table.string('name').notNullable();
        table.string('slug').notNullable().unique();
        table.text('description');
        table.string('parent_id');
        table.string('icon').defaultTo('📚');
        table.integer('order').defaultTo(0);
        table.boolean('active').defaultTo(true);
        table.dateTime('created_at').notNullable();
        table.dateTime('updated_at').notNullable();
        
        table.foreign('parent_id').references('categories.id').onDelete('SET NULL');
        table.index(['parent_id', 'order']);
        table.index(['active']);
      });
    }

    // Tags table
    if (!(await this.db.schema.hasTable('tags'))) {
      await this.db.schema.createTable('tags', (table) => {
        table.string('id').primary();
        table.string('name').notNullable().unique();
        table.string('slug').notNullable().unique();
        table.text('description');
        table.string('color').defaultTo('#3B82F6');
        table.integer('usage_count').defaultTo(0);
        table.dateTime('created_at').notNullable();
        
        table.index(['usage_count']);
      });
    }
  }

  private async seedDefaultContent(): Promise<void> {
    // Seed categories
    const categoriesCount = await this.db('categories').count('* as count').first();
    if (categoriesCount?.count === 0) {
      await this.db('categories').insert([
        {
          id: uuidv4(),
          name: 'Cybersecurity Fundamentals',
          slug: 'cybersecurity-fundamentals',
          description: 'Basic cybersecurity concepts and principles',
          icon: '🛡️',
          order: 1,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: uuidv4(),
          name: 'Incident Response',
          slug: 'incident-response',
          description: 'Incident response procedures and case management',
          icon: '🚨',
          order: 2,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: uuidv4(),
          name: 'Digital Forensics',
          slug: 'digital-forensics',
          description: 'Digital forensics and evidence analysis',
          icon: '🔍',
          order: 3,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: uuidv4(),
          name: 'Penetration Testing',
          slug: 'penetration-testing',
          description: 'Ethical hacking and vulnerability assessment',
          icon: '⚔️',
          order: 4,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: uuidv4(),
          name: 'Security Operations',
          slug: 'security-operations',
          description: 'SOC operations and security monitoring',
          icon: '📊',
          order: 5,
          created_at: new Date(),
          updated_at: new Date()
        }
      ]);
    }

    // Seed common tags
    const tagsCount = await this.db('tags').count('* as count').first();
    if (tagsCount?.count === 0) {
      await this.db('tags').insert([
        { id: uuidv4(), name: 'SIEM', slug: 'siem', description: 'Security Information and Event Management', created_at: new Date() },
        { id: uuidv4(), name: 'Malware Analysis', slug: 'malware-analysis', description: 'Malware analysis and reverse engineering', created_at: new Date() },
        { id: uuidv4(), name: 'Network Security', slug: 'network-security', description: 'Network security concepts and tools', created_at: new Date() },
        { id: uuidv4(), name: 'OSINT', slug: 'osint', description: 'Open Source Intelligence', created_at: new Date() },
        { id: uuidv4(), name: 'Threat Hunting', slug: 'threat-hunting', description: 'Proactive threat hunting techniques', created_at: new Date() },
        { id: uuidv4(), name: 'Cloud Security', slug: 'cloud-security', description: 'Cloud security and architecture', created_at: new Date() },
        { id: uuidv4(), name: 'Compliance', slug: 'compliance', description: 'Regulatory compliance and frameworks', created_at: new Date() },
        { id: uuidv4(), name: 'Risk Management', slug: 'risk-management', description: 'Risk assessment and management', created_at: new Date() }
      ]);
    }
  }

  // Learning Path Management
  async createLearningPath(pathData: Omit<LearningPath, 'id' | 'createdAt' | 'updatedAt'>): Promise<LearningPath> {
    const now = new Date();
    const newPath: LearningPath = {
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
      ...pathData
    };

    const validatedPath = LearningPathSchema.parse(newPath);

    // Insert the learning path
    await this.db('learning_paths').insert({
      id: validatedPath.id,
      title: validatedPath.title,
      description: validatedPath.description,
      skill_level: validatedPath.skillLevel,
      estimated_hours: validatedPath.estimatedHours,
      category: validatedPath.category,
      difficulty: validatedPath.difficulty,
      prerequisites: JSON.stringify(validatedPath.prerequisites),
      certification: validatedPath.certification ? JSON.stringify(validatedPath.certification) : null,
      tags: JSON.stringify(validatedPath.tags),
      learning_objectives: JSON.stringify(validatedPath.learningObjectives),
      target_audience: JSON.stringify(validatedPath.targetAudience),
      industry: JSON.stringify(validatedPath.industry),
      trending: validatedPath.trending,
      featured: validatedPath.featured,
      price: validatedPath.price,
      enrollment_limit: validatedPath.enrollmentLimit,
      start_date: validatedPath.startDate,
      end_date: validatedPath.endDate,
      instructors: JSON.stringify(validatedPath.instructors),
      created_by: validatedPath.createdBy,
      created_at: validatedPath.createdAt,
      updated_at: validatedPath.updatedAt,
      metadata: JSON.stringify(validatedPath.metadata)
    });

    // Insert modules if provided
    if (validatedPath.modules && validatedPath.modules.length > 0) {
      for (let i = 0; i < validatedPath.modules.length; i++) {
        const module = validatedPath.modules[i];
        await this.addModuleToPath(validatedPath.id, module, i + 1);
      }
    }

    this.emit('learning-path-created', { pathId: validatedPath.id, path: validatedPath });
    logger.info(`Created learning path: ${validatedPath.title}`);
    
    return validatedPath;
  }

  async getLearningPath(pathId: string, includeModules: boolean = true): Promise<LearningPath | null> {
    const pathRow = await this.db('learning_paths').where('id', pathId).first();
    if (!pathRow) return null;

    const path: LearningPath = {
      id: pathRow.id,
      title: pathRow.title,
      description: pathRow.description,
      skillLevel: pathRow.skill_level,
      estimatedHours: pathRow.estimated_hours,
      category: pathRow.category,
      difficulty: pathRow.difficulty,
      prerequisites: JSON.parse(pathRow.prerequisites || '[]'),
      certification: pathRow.certification ? JSON.parse(pathRow.certification) : undefined,
      tags: JSON.parse(pathRow.tags || '[]'),
      learningObjectives: JSON.parse(pathRow.learning_objectives || '[]'),
      targetAudience: JSON.parse(pathRow.target_audience || '[]'),
      industry: JSON.parse(pathRow.industry || '[]'),
      trending: pathRow.trending,
      featured: pathRow.featured,
      price: parseFloat(pathRow.price),
      enrollmentLimit: pathRow.enrollment_limit,
      startDate: pathRow.start_date ? new Date(pathRow.start_date) : undefined,
      endDate: pathRow.end_date ? new Date(pathRow.end_date) : undefined,
      instructors: JSON.parse(pathRow.instructors || '[]'),
      createdBy: pathRow.created_by,
      createdAt: new Date(pathRow.created_at),
      updatedAt: new Date(pathRow.updated_at),
      metadata: JSON.parse(pathRow.metadata || '{}'),
      modules: []
    };

    if (includeModules) {
      path.modules = await this.getPathModules(pathId);
    }

    return path;
  }

  async updateLearningPath(pathId: string, updates: Partial<LearningPath>): Promise<LearningPath | null> {
    const existingPath = await this.getLearningPath(pathId, false);
    if (!existingPath) return null;

    const updatedPath = { ...existingPath, ...updates, updatedAt: new Date() };
    const validatedPath = LearningPathSchema.parse(updatedPath);

    await this.db('learning_paths')
      .where('id', pathId)
      .update({
        title: validatedPath.title,
        description: validatedPath.description,
        skill_level: validatedPath.skillLevel,
        estimated_hours: validatedPath.estimatedHours,
        category: validatedPath.category,
        difficulty: validatedPath.difficulty,
        prerequisites: JSON.stringify(validatedPath.prerequisites),
        certification: validatedPath.certification ? JSON.stringify(validatedPath.certification) : null,
        tags: JSON.stringify(validatedPath.tags),
        learning_objectives: JSON.stringify(validatedPath.learningObjectives),
        target_audience: JSON.stringify(validatedPath.targetAudience),
        industry: JSON.stringify(validatedPath.industry),
        trending: validatedPath.trending,
        featured: validatedPath.featured,
        price: validatedPath.price,
        enrollment_limit: validatedPath.enrollmentLimit,
        start_date: validatedPath.startDate,
        end_date: validatedPath.endDate,
        instructors: JSON.stringify(validatedPath.instructors),
        updated_at: validatedPath.updatedAt,
        metadata: JSON.stringify(validatedPath.metadata)
      });

    this.emit('learning-path-updated', { pathId, updates });
    return validatedPath;
  }

  async deleteLearningPath(pathId: string): Promise<void> {
    await this.db('learning_paths').where('id', pathId).del();
    this.emit('learning-path-deleted', { pathId });
  }

  async searchLearningPaths(filters: SearchFilters, pagination: Pagination): Promise<LearningPathSearchResult> {
    let query = this.db('learning_paths').select('*');

    // Apply filters
    if (filters.query) {
      query = query.where((builder) => {
        builder
          .where('title', 'like', `%${filters.query}%`)
          .orWhere('description', 'like', `%${filters.query}%`);
      });
    }

    if (filters.category) {
      query = query.where('category', filters.category);
    }

    if (filters.skillLevel) {
      query = query.where('skill_level', filters.skillLevel);
    }

    if (filters.difficulty) {
      query = query.where('difficulty', filters.difficulty);
    }

    if (filters.tags && filters.tags.length > 0) {
      query = query.whereRaw('JSON_EXTRACT(tags, "$") LIKE ?', [`%${filters.tags.join('%')}%`]);
    }

    if (filters.duration) {
      if (filters.duration.min !== undefined) {
        query = query.where('estimated_hours', '>=', filters.duration.min);
      }
      if (filters.duration.max !== undefined) {
        query = query.where('estimated_hours', '<=', filters.duration.max);
      }
    }

    if (filters.instructor) {
      query = query.whereRaw('JSON_EXTRACT(instructors, "$") LIKE ?', [`%${filters.instructor}%`]);
    }

    if (filters.certification !== undefined) {
      if (filters.certification) {
        query = query.whereNotNull('certification');
      } else {
        query = query.whereNull('certification');
      }
    }

    if (filters.free !== undefined) {
      if (filters.free) {
        query = query.where('price', 0);
      } else {
        query = query.where('price', '>', 0);
      }
    }

    if (filters.trending) {
      query = query.where('trending', true);
    }

    if (filters.featured) {
      query = query.where('featured', true);
    }

    // Count total results
    const totalResult = await query.clone().count('* as total').first();
    const total = totalResult?.total || 0;

    // Apply pagination and sorting
    const offset = (pagination.page - 1) * pagination.limit;
    query = query
      .orderBy(pagination.sortBy, pagination.sortOrder)
      .limit(pagination.limit)
      .offset(offset);

    const rows = await query;
    const paths: LearningPath[] = rows.map((row: any) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      skillLevel: row.skill_level,
      estimatedHours: row.estimated_hours,
      category: row.category,
      difficulty: row.difficulty,
      prerequisites: JSON.parse(row.prerequisites || '[]'),
      certification: row.certification ? JSON.parse(row.certification) : undefined,
      tags: JSON.parse(row.tags || '[]'),
      learningObjectives: JSON.parse(row.learning_objectives || '[]'),
      targetAudience: JSON.parse(row.target_audience || '[]'),
      industry: JSON.parse(row.industry || '[]'),
      trending: row.trending,
      featured: row.featured,
      price: parseFloat(row.price),
      enrollmentLimit: row.enrollment_limit,
      startDate: row.start_date ? new Date(row.start_date) : undefined,
      endDate: row.end_date ? new Date(row.end_date) : undefined,
      instructors: JSON.parse(row.instructors || '[]'),
      createdBy: row.created_by,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      metadata: JSON.parse(row.metadata || '{}'),
      modules: [] // Modules loaded separately if needed
    }));

    const totalPages = Math.ceil(total / pagination.limit);

    return {
      paths,
      total,
      page: pagination.page,
      totalPages
    };
  }

  // Module Management
  async createModule(moduleData: Omit<LearningModule, 'id' | 'createdAt' | 'updatedAt'>): Promise<LearningModule> {
    const now = new Date();
    const newModule: LearningModule = {
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
      ...moduleData
    };

    const validatedModule = LearningModuleSchema.parse(newModule);

    await this.db('learning_modules').insert({
      id: validatedModule.id,
      learning_path_id: validatedModule.id, // Will be updated when added to path
      title: validatedModule.title,
      description: validatedModule.description,
      order: validatedModule.order,
      estimated_hours: validatedModule.estimatedHours,
      skill_level: validatedModule.skillLevel,
      completion_criteria: JSON.stringify(validatedModule.completionCriteria),
      prerequisites: JSON.stringify(validatedModule.prerequisites),
      tags: JSON.stringify(validatedModule.tags),
      learning_objectives: JSON.stringify(validatedModule.learningObjectives),
      created_by: validatedModule.createdBy,
      created_at: validatedModule.createdAt,
      updated_at: validatedModule.updatedAt,
      metadata: JSON.stringify(validatedModule.metadata)
    });

    // Insert lessons if provided
    if (validatedModule.content.lessons && validatedModule.content.lessons.length > 0) {
      for (const lesson of validatedModule.content.lessons) {
        await this.addLessonToModule(validatedModule.id, lesson);
      }
    }

    this.emit('module-created', { moduleId: validatedModule.id, module: validatedModule });
    logger.info(`Created learning module: ${validatedModule.title}`);
    
    return validatedModule;
  }

  async addModuleToPath(pathId: string, module: LearningModule, order: number): Promise<void> {
    // First create the module
    const createdModule = await this.createModule(module);

    // Then link it to the path
    await this.db('path_modules').insert({
      id: uuidv4(),
      learning_path_id: pathId,
      module_id: createdModule.id,
      order,
      required: true,
      created_at: new Date()
    });

    this.emit('module-added-to-path', { pathId, moduleId: createdModule.id, order });
  }

  async getPathModules(pathId: string): Promise<LearningModule[]> {
    const query = this.db('learning_modules as m')
      .join('path_modules as pm', 'm.id', 'pm.module_id')
      .where('pm.learning_path_id', pathId)
      .orderBy('pm.order')
      .select('m.*', 'pm.order as path_order', 'pm.required');

    const rows = await query;
    const modules: LearningModule[] = [];

    for (const row of rows) {
      const module: LearningModule = {
        id: row.id,
        title: row.title,
        description: row.description,
        order: row.path_order,
        estimatedHours: row.estimated_hours,
        skillLevel: row.skill_level,
        completionCriteria: JSON.parse(row.completion_criteria || '{}'),
        prerequisites: JSON.parse(row.prerequisites || '[]'),
        tags: JSON.parse(row.tags || '[]'),
        learningObjectives: JSON.parse(row.learning_objectives || '[]'),
        createdBy: row.created_by,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        metadata: JSON.parse(row.metadata || '{}'),
        content: {
          lessons: await this.getModuleLessons(row.id),
          labs: [], // Labs loaded by lab service
          assessments: [] // Assessments loaded by assessment service
        }
      };

      modules.push(module);
    }

    return modules;
  }

  async getModule(moduleId: string): Promise<LearningModule | null> {
    const row = await this.db('learning_modules').where('id', moduleId).first();
    if (!row) return null;

    const module: LearningModule = {
      id: row.id,
      title: row.title,
      description: row.description,
      order: row.order,
      estimatedHours: row.estimated_hours,
      skillLevel: row.skill_level,
      completionCriteria: JSON.parse(row.completion_criteria || '{}'),
      prerequisites: JSON.parse(row.prerequisites || '[]'),
      tags: JSON.parse(row.tags || '[]'),
      learningObjectives: JSON.parse(row.learning_objectives || '[]'),
      createdBy: row.created_by,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      metadata: JSON.parse(row.metadata || '{}'),
      content: {
        lessons: await this.getModuleLessons(moduleId),
        labs: [],
        assessments: []
      }
    };

    return module;
  }

  // Lesson Management
  async addLessonToModule(moduleId: string, lesson: Lesson): Promise<void> {
    const validatedLesson = LessonSchema.parse(lesson);

    await this.db('lessons').insert({
      id: validatedLesson.id,
      module_id: moduleId,
      title: validatedLesson.title,
      description: validatedLesson.description,
      type: validatedLesson.type,
      content: JSON.stringify(validatedLesson.content),
      duration: validatedLesson.duration,
      order: validatedLesson.order,
      quiz: validatedLesson.quiz ? JSON.stringify(validatedLesson.quiz) : null,
      prerequisites: JSON.stringify(validatedLesson.prerequisites),
      tags: JSON.stringify(validatedLesson.tags),
      resources: JSON.stringify(validatedLesson.resources),
      created_at: new Date(),
      updated_at: new Date(),
      metadata: JSON.stringify(validatedLesson.metadata)
    });

    this.emit('lesson-added', { moduleId, lessonId: validatedLesson.id });
  }

  async getModuleLessons(moduleId: string): Promise<Lesson[]> {
    const rows = await this.db('lessons')
      .where('module_id', moduleId)
      .orderBy('order');

    return rows.map((row: any) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      type: row.type,
      content: JSON.parse(row.content),
      duration: row.duration,
      order: row.order,
      quiz: row.quiz ? JSON.parse(row.quiz) : undefined,
      prerequisites: JSON.parse(row.prerequisites || '[]'),
      tags: JSON.parse(row.tags || '[]'),
      resources: JSON.parse(row.resources || '[]'),
      metadata: JSON.parse(row.metadata || '{}')
    }));
  }

  async getLesson(lessonId: string): Promise<Lesson | null> {
    const row = await this.db('lessons').where('id', lessonId).first();
    if (!row) return null;

    return {
      id: row.id,
      title: row.title,
      description: row.description,
      type: row.type,
      content: JSON.parse(row.content),
      duration: row.duration,
      order: row.order,
      quiz: row.quiz ? JSON.parse(row.quiz) : undefined,
      prerequisites: JSON.parse(row.prerequisites || '[]'),
      tags: JSON.parse(row.tags || '[]'),
      resources: JSON.parse(row.resources || '[]'),
      metadata: JSON.parse(row.metadata || '{}')
    };
  }

  // Categories and Tags
  async getCategories(): Promise<any[]> {
    return await this.db('categories')
      .where('active', true)
      .orderBy('order');
  }

  async getPopularTags(limit: number = 20): Promise<any[]> {
    return await this.db('tags')
      .orderBy('usage_count', 'desc')
      .limit(limit);
  }

  async searchTags(query: string, limit: number = 10): Promise<any[]> {
    return await this.db('tags')
      .where('name', 'like', `%${query}%`)
      .orderBy('usage_count', 'desc')
      .limit(limit);
  }

  // Statistics
  async getLearningPathStatistics(): Promise<any> {
    const [
      totalPaths,
      totalModules,
      totalLessons,
      skillLevelStats,
      categoryStats,
      difficultyStats
    ] = await Promise.all([
      this.db('learning_paths').count('* as count').first(),
      this.db('learning_modules').count('* as count').first(),
      this.db('lessons').count('* as count').first(),
      this.db('learning_paths')
        .select('skill_level')
        .count('* as count')
        .groupBy('skill_level'),
      this.db('learning_paths')
        .select('category')
        .count('* as count')
        .groupBy('category')
        .orderBy('count', 'desc'),
      this.db('learning_paths')
        .select('difficulty')
        .count('* as count')
        .groupBy('difficulty')
    ]);

    return {
      totalPaths: totalPaths?.count || 0,
      totalModules: totalModules?.count || 0,
      totalLessons: totalLessons?.count || 0,
      bySkillLevel: skillLevelStats,
      byCategory: categoryStats,
      byDifficulty: difficultyStats
    };
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down Learning Management Service');
    await this.db.destroy();
    logger.info('Learning Management Service shutdown complete');
  }
}