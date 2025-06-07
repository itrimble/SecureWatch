import Joi from 'joi';

/**
 * Schema for dashboard query parameters
 */
export const dashboardSchema = {
  query: Joi.object({
    includeStats: Joi.boolean().default(true),
    includeRecommendations: Joi.boolean().default(true),
    limit: Joi.number().integer().min(1).max(50).default(10),
  }),
};

/**
 * Schema for user enrollment
 */
export const enrollmentSchema = {
  body: Joi.object({
    learningPathId: Joi.string().uuid().when('courseId', {
      is: Joi.exist(),
      then: Joi.optional(),
      otherwise: Joi.required(),
    }),
    courseId: Joi.string().uuid().when('learningPathId', {
      is: Joi.exist(),
      then: Joi.optional(),
      otherwise: Joi.required(),
    }),
    startDate: Joi.date().iso().default(new Date()),
    notifyUser: Joi.boolean().default(true),
  }).xor('learningPathId', 'courseId'), // Exactly one of these must be provided
};

/**
 * Schema for creating/updating learning paths
 */
export const learningPathSchema = {
  body: Joi.object({
    title: Joi.string().min(3).max(200).required(),
    description: Joi.string().min(10).max(2000).required(),
    category: Joi.string().min(2).max(50).required(),
    difficulty: Joi.string().valid('beginner', 'intermediate', 'advanced').required(),
    estimatedDuration: Joi.number().integer().min(1).max(10000).required(), // in minutes
    prerequisites: Joi.array().items(Joi.string().uuid()).default([]),
    learningObjectives: Joi.array().items(Joi.string().min(5).max(500)).min(1).required(),
    tags: Joi.array().items(Joi.string().min(2).max(30)).max(10).default([]),
    skillLevel: Joi.string().valid('beginner', 'intermediate', 'advanced').required(),
    isPublic: Joi.boolean().default(true),
    language: Joi.string().length(2).default('en'), // ISO 639-1 language codes
    thumbnail: Joi.string().uri().optional(),
    modules: Joi.array().items(
      Joi.object({
        title: Joi.string().min(3).max(100).required(),
        description: Joi.string().min(10).max(1000),
        order: Joi.number().integer().min(1).required(),
        estimatedDuration: Joi.number().integer().min(1).max(1000), // in minutes
        content: Joi.object({
          type: Joi.string().valid('video', 'article', 'interactive', 'quiz', 'lab').required(),
          url: Joi.string().uri().when('type', {
            is: Joi.valid('video', 'article'),
            then: Joi.required(),
            otherwise: Joi.optional(),
          }),
          content: Joi.string().when('type', {
            is: 'article',
            then: Joi.required(),
            otherwise: Joi.optional(),
          }),
        }).required(),
      })
    ).min(1).required(),
  }),
};

/**
 * Schema for creating/updating courses
 */
export const courseSchema = {
  body: Joi.object({
    title: Joi.string().min(3).max(200).required(),
    description: Joi.string().min(10).max(2000).required(),
    category: Joi.string().min(2).max(50).required(),
    difficulty: Joi.string().valid('beginner', 'intermediate', 'advanced').required(),
    estimatedDuration: Joi.number().integer().min(1).max(10000).required(), // in minutes
    instructorId: Joi.string().uuid().required(),
    prerequisites: Joi.array().items(Joi.string().uuid()).default([]),
    learningObjectives: Joi.array().items(Joi.string().min(5).max(500)).min(1).required(),
    tags: Joi.array().items(Joi.string().min(2).max(30)).max(10).default([]),
    skillLevel: Joi.string().valid('beginner', 'intermediate', 'advanced').required(),
    maxStudents: Joi.number().integer().min(1).max(1000).default(100),
    price: Joi.number().min(0).default(0),
    currency: Joi.string().length(3).default('USD'), // ISO 4217 currency codes
    isPublic: Joi.boolean().default(true),
    language: Joi.string().length(2).default('en'),
    thumbnail: Joi.string().uri().optional(),
    syllabus: Joi.string().min(50).max(5000),
    startDate: Joi.date().iso().min('now'),
    endDate: Joi.date().iso().greater(Joi.ref('startDate')),
  }),
};

/**
 * Schema for creating/updating assessments
 */
export const assessmentSchema = {
  body: Joi.object({
    title: Joi.string().min(3).max(200).required(),
    description: Joi.string().min(10).max(1000),
    type: Joi.string().valid('quiz', 'practical', 'project', 'simulation', 'essay').required(),
    courseId: Joi.string().uuid().optional(),
    learningPathId: Joi.string().uuid().optional(),
    timeLimit: Joi.number().integer().min(1).max(480), // in minutes, max 8 hours
    passingScore: Joi.number().min(0).max(100).default(70), // percentage
    maxAttempts: Joi.number().integer().min(1).max(10).default(3),
    randomizeQuestions: Joi.boolean().default(true),
    showCorrectAnswers: Joi.boolean().default(true),
    allowRetakes: Joi.boolean().default(true),
    questions: Joi.array().items(
      Joi.object({
        id: Joi.string().uuid().optional(),
        type: Joi.string().valid('multiple-choice', 'true-false', 'short-answer', 'essay', 'code').required(),
        question: Joi.string().min(10).max(2000).required(),
        points: Joi.number().min(1).max(100).default(1),
        options: Joi.array().items(Joi.string()).when('type', {
          is: Joi.valid('multiple-choice'),
          then: Joi.min(2).max(10).required(),
          otherwise: Joi.optional(),
        }),
        correctAnswer: Joi.alternatives().try(
          Joi.string(),
          Joi.number(),
          Joi.array().items(Joi.string())
        ).when('type', {
          is: Joi.valid('essay'),
          then: Joi.optional(),
          otherwise: Joi.required(),
        }),
        explanation: Joi.string().max(1000),
        hints: Joi.array().items(Joi.string().max(200)).max(3),
      })
    ).min(1).required(),
    instructions: Joi.string().max(2000),
    resources: Joi.array().items(
      Joi.object({
        title: Joi.string().max(100).required(),
        url: Joi.string().uri().required(),
        type: Joi.string().valid('document', 'video', 'link', 'image').required(),
      })
    ).max(10),
  }),
};

/**
 * Schema for submitting assessment answers
 */
export const assessmentSubmissionSchema = {
  body: Joi.object({
    assessmentId: Joi.string().uuid().required(),
    answers: Joi.array().items(
      Joi.object({
        questionId: Joi.string().uuid().required(),
        answer: Joi.alternatives().try(
          Joi.string(),
          Joi.number(),
          Joi.array().items(Joi.string())
        ).required(),
        timeSpent: Joi.number().integer().min(0), // in seconds
      })
    ).min(1).required(),
    totalTimeSpent: Joi.number().integer().min(0).required(), // in seconds
    submittedAt: Joi.date().iso().default(new Date()),
  }),
};

/**
 * Schema for creating/updating lab environments
 */
export const labEnvironmentSchema = {
  body: Joi.object({
    title: Joi.string().min(3).max(200).required(),
    description: Joi.string().min(10).max(2000).required(),
    category: Joi.string().min(2).max(50).required(),
    difficulty: Joi.string().valid('beginner', 'intermediate', 'advanced').required(),
    estimatedDuration: Joi.number().integer().min(5).max(480).required(), // 5 min to 8 hours
    environment: Joi.string().valid('docker', 'vm', 'kubernetes', 'cloud').required(),
    configuration: Joi.object({
      image: Joi.string().when('..environment', {
        is: 'docker',
        then: Joi.required(),
        otherwise: Joi.optional(),
      }),
      ports: Joi.array().items(Joi.number().integer().min(1).max(65535)),
      environmentVariables: Joi.object().pattern(Joi.string(), Joi.string()),
      volumes: Joi.array().items(Joi.string()),
      networkMode: Joi.string().valid('bridge', 'host', 'none', 'isolated').default('isolated'),
      resourceLimits: Joi.object({
        cpu: Joi.string().pattern(/^\d+(\.\d+)?m?$/).default('500m'),
        memory: Joi.string().pattern(/^\d+[KMGTkmgt]i?$/).default('512Mi'),
        storage: Joi.string().pattern(/^\d+[KMGTkmgt]i?$/).default('1Gi'),
      }),
    }).required(),
    instructions: Joi.string().min(50).max(5000).required(),
    objectives: Joi.array().items(Joi.string().min(5).max(500)).min(1).required(),
    prerequisites: Joi.array().items(Joi.string().uuid()).default([]),
    tags: Joi.array().items(Joi.string().min(2).max(30)).max(10).default([]),
    maxDuration: Joi.number().integer().min(5).max(480).default(120), // default 2 hours
    autoCleanup: Joi.boolean().default(true),
    cleanupDelay: Joi.number().integer().min(0).max(7200).default(300), // 5 minutes default
    allowSnapshots: Joi.boolean().default(false),
    maxSnapshots: Joi.number().integer().min(1).max(10).default(3),
  }),
};

/**
 * Schema for creating/updating knowledge base articles
 */
export const knowledgeBaseSchema = {
  body: Joi.object({
    title: Joi.string().min(3).max(200).required(),
    content: Joi.string().min(50).max(50000).required(), // Support long articles
    category: Joi.string().min(2).max(50).required(),
    tags: Joi.array().items(Joi.string().min(2).max(30)).max(15).default([]),
    type: Joi.string().valid('article', 'tutorial', 'guide', 'reference', 'faq').required(),
    difficulty: Joi.string().valid('beginner', 'intermediate', 'advanced').default('beginner'),
    language: Joi.string().length(2).default('en'),
    isPublic: Joi.boolean().default(true),
    allowComments: Joi.boolean().default(true),
    relatedArticles: Joi.array().items(Joi.string().uuid()).max(10).default([]),
    attachments: Joi.array().items(
      Joi.object({
        filename: Joi.string().max(255).required(),
        url: Joi.string().uri().required(),
        size: Joi.number().integer().min(1).max(10485760), // max 10MB
        mimeType: Joi.string().max(100).required(),
      })
    ).max(5).default([]),
    metadata: Joi.object({
      estimatedReadTime: Joi.number().integer().min(1).max(120), // in minutes
      lastReviewed: Joi.date().iso(),
      reviewedBy: Joi.string().uuid(),
      version: Joi.string().pattern(/^\d+\.\d+\.\d+$/), // semantic versioning
    }),
  }),
};

/**
 * Schema for creating/updating certifications
 */
export const certificationSchema = {
  body: Joi.object({
    title: Joi.string().min(3).max(200).required(),
    description: Joi.string().min(10).max(2000).required(),
    requirements: Joi.array().items(
      Joi.object({
        type: Joi.string().valid('course', 'assessment', 'lab', 'project').required(),
        id: Joi.string().uuid().required(),
        minScore: Joi.number().min(0).max(100).when('type', {
          is: 'assessment',
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
      })
    ).min(1).required(),
    validityPeriod: Joi.number().integer().min(1).max(120), // months
    category: Joi.string().min(2).max(50).required(),
    level: Joi.string().valid('foundation', 'associate', 'professional', 'expert').required(),
    badge: Joi.object({
      imageUrl: Joi.string().uri().required(),
      backgroundColor: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).default('#1f2937'),
      textColor: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).default('#ffffff'),
    }),
    issuer: Joi.object({
      name: Joi.string().min(2).max(100).required(),
      url: Joi.string().uri(),
      logo: Joi.string().uri(),
    }).required(),
    isActive: Joi.boolean().default(true),
    maxIssuances: Joi.number().integer().min(1), // optional limit
  }),
};

/**
 * Schema for progress updates
 */
export const progressUpdateSchema = {
  body: Joi.object({
    entityType: Joi.string().valid('course', 'module', 'lesson', 'assessment', 'lab').required(),
    entityId: Joi.string().uuid().required(),
    status: Joi.string().valid('not-started', 'in-progress', 'completed', 'failed', 'paused').required(),
    progress: Joi.number().min(0).max(100).default(0), // percentage
    timeSpent: Joi.number().integer().min(0), // in seconds
    score: Joi.number().min(0).max(100).when('status', {
      is: Joi.valid('completed', 'failed'),
      then: Joi.optional(),
      otherwise: Joi.forbidden(),
    }),
    notes: Joi.string().max(1000),
    metadata: Joi.object(), // flexible metadata object
  }),
};

/**
 * Schema for comment creation
 */
export const commentSchema = {
  body: Joi.object({
    content: Joi.string().min(3).max(2000).required(),
    parentId: Joi.string().uuid().optional(), // for replies
    entityType: Joi.string().valid('article', 'course', 'lab', 'assessment').required(),
    entityId: Joi.string().uuid().required(),
  }),
};