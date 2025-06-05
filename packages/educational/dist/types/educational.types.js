import { z } from 'zod';
// Skill Level Enum
export const SkillLevelSchema = z.enum(['beginner', 'intermediate', 'advanced']);
// Difficulty Enum
export const DifficultySchema = z.enum(['easy', 'medium', 'hard']);
// Content Types
export const ContentTypeSchema = z.enum(['video', 'article', 'interactive', 'simulation', 'document']);
// Assessment Types
export const AssessmentTypeSchema = z.enum(['quiz', 'practical', 'project', 'simulation', 'essay']);
// User Role for Educational Context
export const UserRoleSchema = z.enum(['student', 'instructor', 'admin', 'mentor']);
// Lab Environment Types
export const LabEnvironmentTypeSchema = z.enum(['simulated', 'live', 'sandboxed', 'cloud']);
// Question Types
export const QuestionTypeSchema = z.enum(['multiple-choice', 'true-false', 'fill-blank', 'essay', 'code', 'simulation']);
// Progress Status
export const ProgressStatusSchema = z.enum(['not-started', 'in-progress', 'completed', 'failed', 'paused']);
// Interactive Content Schema
export const InteractiveContentSchema = z.object({
    type: z.enum(['simulation', 'diagram', 'code-editor', 'terminal', 'network-map']),
    config: z.record(z.any()),
    data: z.any().optional(),
    instructions: z.string()
});
// Quiz Question Schema
export const QuizQuestionSchema = z.object({
    id: z.string(),
    type: QuestionTypeSchema,
    question: z.string(),
    options: z.array(z.string()).optional(),
    correctAnswer: z.union([z.string(), z.array(z.string())]),
    explanation: z.string().optional(),
    points: z.number().default(1),
    timeLimit: z.number().optional(), // seconds
    hints: z.array(z.string()).default([])
});
// Quiz Schema
export const QuizSchema = z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().optional(),
    questions: z.array(QuizQuestionSchema),
    timeLimit: z.number().optional(), // minutes
    passingScore: z.number().default(70), // percentage
    maxAttempts: z.number().default(3),
    randomizeQuestions: z.boolean().default(false),
    showResults: z.boolean().default(true)
});
// Lesson Schema
export const LessonSchema = z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    type: ContentTypeSchema,
    content: z.union([
        z.string(), // article content
        z.object({ videoUrl: z.string(), transcript: z.string().optional() }), // video content
        InteractiveContentSchema // interactive content
    ]),
    duration: z.number(), // minutes
    order: z.number(),
    quiz: QuizSchema.optional(),
    prerequisites: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
    resources: z.array(z.object({
        title: z.string(),
        url: z.string(),
        type: z.enum(['document', 'link', 'tool'])
    })).default([]),
    metadata: z.record(z.any()).default({})
});
// Lab Hint Schema
export const LabHintSchema = z.object({
    id: z.string(),
    order: z.number(),
    title: z.string(),
    content: z.string(),
    pointDeduction: z.number().default(0) // points lost for using hint
});
// Lab Task Schema
export const LabTaskSchema = z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    order: z.number(),
    instructions: z.string(),
    expectedOutput: z.string().optional(),
    validationScript: z.string().optional(),
    points: z.number().default(10),
    timeLimit: z.number().optional(), // minutes
    prerequisites: z.array(z.string()).default([]),
    tools: z.array(z.string()).default([]), // required tools
    flags: z.array(z.string()).default([]) // CTF-style flags
});
// Lab Environment Schema
export const LabEnvironmentSchema = z.object({
    type: LabEnvironmentTypeSchema,
    config: z.object({
        containers: z.array(z.object({
            name: z.string(),
            image: z.string(),
            ports: z.array(z.number()).default([]),
            environment: z.record(z.string()).default({}),
            volumes: z.array(z.string()).default([])
        })).default([]),
        network: z.object({
            isolated: z.boolean().default(true),
            allowInternet: z.boolean().default(false),
            customTopology: z.any().optional()
        }).optional(),
        resources: z.object({
            cpu: z.string().default('1'),
            memory: z.string().default('1Gi'),
            storage: z.string().default('10Gi')
        }).optional(),
        timeout: z.number().default(7200) // 2 hours in seconds
    }),
    provisioning: z.object({
        setupScript: z.string().optional(),
        teardownScript: z.string().optional(),
        healthCheck: z.string().optional()
    }).optional()
});
// Lab Schema
export const LabSchema = z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    difficulty: DifficultySchema,
    skillLevel: SkillLevelSchema,
    environment: LabEnvironmentSchema,
    tasks: z.array(LabTaskSchema),
    hints: z.array(LabHintSchema).default([]),
    solution: z.string(),
    estimatedTime: z.number(), // minutes
    maxAttempts: z.number().default(5),
    order: z.number(),
    prerequisites: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
    learningObjectives: z.array(z.string()).default([]),
    references: z.array(z.object({
        title: z.string(),
        url: z.string(),
        type: z.enum(['documentation', 'tutorial', 'tool', 'research'])
    })).default([]),
    createdBy: z.string(),
    createdAt: z.date(),
    updatedAt: z.date(),
    metadata: z.record(z.any()).default({})
});
// Assessment Result Schema
export const AssessmentResultSchema = z.object({
    id: z.string(),
    assessmentId: z.string(),
    studentId: z.string(),
    type: AssessmentTypeSchema,
    score: z.number(), // percentage
    maxScore: z.number(),
    passed: z.boolean(),
    startedAt: z.date(),
    completedAt: z.date().optional(),
    timeSpent: z.number(), // minutes
    answers: z.record(z.any()).default({}),
    feedback: z.string().optional(),
    graderNotes: z.string().optional(),
    attempt: z.number().default(1),
    metadata: z.record(z.any()).default({})
});
// Assessment Schema
export const AssessmentSchema = z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    type: AssessmentTypeSchema,
    difficulty: DifficultySchema,
    timeLimit: z.number().optional(), // minutes
    passingScore: z.number().default(70), // percentage
    maxAttempts: z.number().default(3),
    questions: z.array(QuizQuestionSchema).optional(),
    practicalTasks: z.array(LabTaskSchema).optional(),
    rubric: z.object({
        criteria: z.array(z.object({
            name: z.string(),
            description: z.string(),
            maxPoints: z.number(),
            weight: z.number() // percentage
        }))
    }).optional(),
    autoGrading: z.boolean().default(false),
    order: z.number(),
    prerequisites: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
    createdBy: z.string(),
    createdAt: z.date(),
    updatedAt: z.date(),
    metadata: z.record(z.any()).default({})
});
// Completion Criteria Schema
export const CompletionCriteriaSchema = z.object({
    requiredLessons: z.array(z.string()).default([]),
    requiredLabs: z.array(z.string()).default([]),
    requiredAssessments: z.array(z.string()).default([]),
    minimumAssessmentScore: z.number().default(70), // percentage
    minimumLabScore: z.number().default(70), // percentage
    requireAllLessons: z.boolean().default(true),
    requireAllLabs: z.boolean().default(true),
    requireAllAssessments: z.boolean().default(true)
});
// Learning Module Schema
export const LearningModuleSchema = z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    order: z.number(),
    estimatedHours: z.number(),
    skillLevel: SkillLevelSchema,
    content: z.object({
        lessons: z.array(LessonSchema).default([]),
        labs: z.array(LabSchema).default([]),
        assessments: z.array(AssessmentSchema).default([])
    }),
    completionCriteria: CompletionCriteriaSchema,
    prerequisites: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
    learningObjectives: z.array(z.string()).default([]),
    createdBy: z.string(),
    createdAt: z.date(),
    updatedAt: z.date(),
    metadata: z.record(z.any()).default({})
});
// Certification Schema
export const CertificationSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    issuer: z.string(),
    validityPeriod: z.number().optional(), // months
    examRequirements: z.string(),
    prerequisites: z.array(z.string()).default([]),
    competencies: z.array(z.object({
        id: z.string(),
        name: z.string(),
        description: z.string(),
        weight: z.number() // percentage
    })).default([]),
    passingCriteria: z.object({
        minimumScore: z.number().default(80),
        requiredCompetencies: z.array(z.string()).default([]),
        timeLimit: z.number().optional() // minutes
    }),
    badgeUrl: z.string().optional(),
    credentialTemplate: z.string().optional(),
    metadata: z.record(z.any()).default({})
});
// Learning Path Schema
export const LearningPathSchema = z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    skillLevel: SkillLevelSchema,
    estimatedHours: z.number(),
    modules: z.array(LearningModuleSchema),
    prerequisites: z.array(z.string()).default([]),
    certification: CertificationSchema.optional(),
    tags: z.array(z.string()).default([]),
    category: z.string(),
    difficulty: DifficultySchema,
    learningObjectives: z.array(z.string()).default([]),
    targetAudience: z.array(z.string()).default([]),
    industry: z.array(z.string()).default([]),
    trending: z.boolean().default(false),
    featured: z.boolean().default(false),
    price: z.number().default(0), // 0 for free
    enrollmentLimit: z.number().optional(),
    startDate: z.date().optional(),
    endDate: z.date().optional(),
    instructors: z.array(z.string()).default([]),
    createdBy: z.string(),
    createdAt: z.date(),
    updatedAt: z.date(),
    metadata: z.record(z.any()).default({})
});
// Student Progress Schema
export const StudentProgressSchema = z.object({
    id: z.string(),
    studentId: z.string(),
    learningPathId: z.string(),
    moduleId: z.string().optional(),
    lessonId: z.string().optional(),
    labId: z.string().optional(),
    assessmentId: z.string().optional(),
    status: ProgressStatusSchema,
    progress: z.number().min(0).max(100), // percentage
    score: z.number().optional(), // percentage
    timeSpent: z.number().default(0), // minutes
    attempts: z.number().default(0),
    lastAccessed: z.date().optional(),
    startedAt: z.date(),
    completedAt: z.date().optional(),
    notes: z.string().optional(),
    bookmarks: z.array(z.object({
        contentId: z.string(),
        contentType: z.enum(['lesson', 'lab', 'assessment']),
        note: z.string().optional(),
        timestamp: z.date()
    })).default([]),
    achievements: z.array(z.string()).default([]),
    metadata: z.record(z.any()).default({})
});
// Enrollment Schema
export const EnrollmentSchema = z.object({
    id: z.string(),
    studentId: z.string(),
    learningPathId: z.string(),
    enrolledAt: z.date(),
    status: z.enum(['active', 'completed', 'dropped', 'suspended']),
    dueDate: z.date().optional(),
    accessExpiresAt: z.date().optional(),
    paymentStatus: z.enum(['free', 'paid', 'pending', 'failed']).default('free'),
    completionCertificateId: z.string().optional(),
    instructorFeedback: z.string().optional(),
    finalGrade: z.number().optional(), // percentage
    metadata: z.record(z.any()).default({})
});
// Training Scenario Schema
export const TrainingScenarioSchema = z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    category: z.enum(['incident-response', 'forensics', 'threat-hunting', 'red-team', 'blue-team', 'purple-team']),
    difficulty: DifficultySchema,
    skillLevel: SkillLevelSchema,
    scenario: z.object({
        background: z.string(),
        timeline: z.array(z.object({
            timestamp: z.string(),
            event: z.string(),
            source: z.string(),
            evidence: z.array(z.string()).default([])
        })),
        environment: LabEnvironmentSchema,
        objectives: z.array(z.object({
            id: z.string(),
            description: z.string(),
            points: z.number(),
            required: z.boolean().default(false)
        })),
        artifacts: z.array(z.object({
            id: z.string(),
            name: z.string(),
            type: z.enum(['log', 'memory-dump', 'disk-image', 'network-capture', 'file']),
            path: z.string(),
            description: z.string()
        })).default([])
    }),
    estimatedTime: z.number(), // minutes
    maxScore: z.number(),
    passingScore: z.number(),
    hints: z.array(LabHintSchema).default([]),
    solution: z.object({
        summary: z.string(),
        steps: z.array(z.string()),
        explanation: z.string(),
        references: z.array(z.string()).default([])
    }),
    prerequisites: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
    createdBy: z.string(),
    createdAt: z.date(),
    updatedAt: z.date(),
    metadata: z.record(z.any()).default({})
});
// Knowledge Base Article Schema
export const KnowledgeBaseArticleSchema = z.object({
    id: z.string(),
    title: z.string(),
    summary: z.string(),
    content: z.string(),
    category: z.string(),
    subcategory: z.string().optional(),
    type: z.enum(['guide', 'tutorial', 'reference', 'faq', 'best-practice']),
    difficulty: DifficultySchema,
    tags: z.array(z.string()).default([]),
    attachments: z.array(z.object({
        id: z.string(),
        name: z.string(),
        url: z.string(),
        type: z.string(),
        size: z.number()
    })).default([]),
    relatedArticles: z.array(z.string()).default([]),
    prerequisites: z.array(z.string()).default([]),
    estimatedReadTime: z.number(), // minutes
    lastReviewed: z.date().optional(),
    reviewedBy: z.string().optional(),
    version: z.string().default('1.0'),
    status: z.enum(['draft', 'published', 'archived']).default('draft'),
    votes: z.object({
        helpful: z.number().default(0),
        notHelpful: z.number().default(0)
    }).default({}),
    views: z.number().default(0),
    author: z.string(),
    contributors: z.array(z.string()).default([]),
    createdAt: z.date(),
    updatedAt: z.date(),
    publishedAt: z.date().optional(),
    metadata: z.record(z.any()).default({})
});
// Forum Thread Schema
export const ForumThreadSchema = z.object({
    id: z.string(),
    title: z.string(),
    category: z.string(),
    tags: z.array(z.string()).default([]),
    authorId: z.string(),
    status: z.enum(['open', 'closed', 'pinned', 'locked']).default('open'),
    priority: z.enum(['low', 'normal', 'high']).default('normal'),
    views: z.number().default(0),
    replies: z.number().default(0),
    lastReplyAt: z.date().optional(),
    lastReplyBy: z.string().optional(),
    solved: z.boolean().default(false),
    solutionPostId: z.string().optional(),
    createdAt: z.date(),
    updatedAt: z.date(),
    metadata: z.record(z.any()).default({})
});
// Forum Post Schema
export const ForumPostSchema = z.object({
    id: z.string(),
    threadId: z.string(),
    authorId: z.string(),
    content: z.string(),
    parentPostId: z.string().optional(), // for nested replies
    level: z.number().default(0), // nesting level
    votes: z.object({
        upvotes: z.number().default(0),
        downvotes: z.number().default(0)
    }).default({}),
    isSolution: z.boolean().default(false),
    isModerated: z.boolean().default(false),
    moderatedBy: z.string().optional(),
    moderationReason: z.string().optional(),
    attachments: z.array(z.object({
        id: z.string(),
        name: z.string(),
        url: z.string(),
        type: z.string(),
        size: z.number()
    })).default([]),
    mentions: z.array(z.string()).default([]),
    edited: z.boolean().default(false),
    editedAt: z.date().optional(),
    editedBy: z.string().optional(),
    createdAt: z.date(),
    updatedAt: z.date(),
    metadata: z.record(z.any()).default({})
});
// Instructor Schema
export const InstructorSchema = z.object({
    id: z.string(),
    userId: z.string(),
    bio: z.string(),
    specializations: z.array(z.string()).default([]),
    certifications: z.array(z.object({
        name: z.string(),
        issuer: z.string(),
        dateObtained: z.date(),
        expirationDate: z.date().optional(),
        credentialUrl: z.string().optional()
    })).default([]),
    experience: z.object({
        yearsInField: z.number(),
        currentRole: z.string(),
        organization: z.string().optional(),
        previousRoles: z.array(z.object({
            title: z.string(),
            organization: z.string(),
            duration: z.string()
        })).default([])
    }),
    teaching: z.object({
        yearsTeaching: z.number(),
        coursesCreated: z.number().default(0),
        studentsGraduated: z.number().default(0),
        averageRating: z.number().default(0),
        totalRatings: z.number().default(0)
    }),
    availability: z.object({
        timezone: z.string(),
        weeklyHours: z.number(),
        schedule: z.record(z.array(z.string())).default({}) // day -> time slots
    }).optional(),
    socialMedia: z.object({
        linkedin: z.string().optional(),
        twitter: z.string().optional(),
        github: z.string().optional(),
        website: z.string().optional()
    }).default({}),
    verified: z.boolean().default(false),
    verifiedAt: z.date().optional(),
    createdAt: z.date(),
    updatedAt: z.date(),
    metadata: z.record(z.any()).default({})
});
// Database Configuration Schema
export const DatabaseConfigSchema = z.object({
    type: z.enum(['sqlite', 'mysql', 'postgresql']),
    connection: z.union([
        z.string(), // SQLite file path
        z.object({
            host: z.string(),
            port: z.number(),
            database: z.string(),
            user: z.string(),
            password: z.string()
        })
    ])
});
// Educational Configuration Schema
export const EducationalConfigSchema = z.object({
    features: z.object({
        enrollmentRequired: z.boolean().default(true),
        allowGuestAccess: z.boolean().default(false),
        enableCertifications: z.boolean().default(true),
        enableForums: z.boolean().default(true),
        enableLabs: z.boolean().default(true),
        enableAssessments: z.boolean().default(true),
        enableProgressTracking: z.boolean().default(true)
    }),
    limits: z.object({
        maxEnrollmentsPerUser: z.number().default(10),
        maxLabDuration: z.number().default(14400), // 4 hours in seconds
        maxFileUploadSize: z.number().default(10485760), // 10MB
        maxLabAttempts: z.number().default(5),
        maxAssessmentAttempts: z.number().default(3)
    }),
    notifications: z.object({
        enableEmailNotifications: z.boolean().default(true),
        enablePushNotifications: z.boolean().default(false),
        enrollmentReminders: z.boolean().default(true),
        assessmentReminders: z.boolean().default(true),
        certificateNotifications: z.boolean().default(true)
    }),
    labs: z.object({
        defaultEnvironment: z.enum(['docker', 'kubernetes', 'vm']).default('docker'),
        resourceLimits: z.object({
            cpu: z.string().default('1'),
            memory: z.string().default('1Gi'),
            storage: z.string().default('10Gi')
        }),
        networkIsolation: z.boolean().default(true),
        autoCleanup: z.boolean().default(true),
        cleanupDelay: z.number().default(3600) // 1 hour in seconds
    }),
    assessment: z.object({
        randomizeQuestions: z.boolean().default(true),
        showCorrectAnswers: z.boolean().default(true),
        allowRetakes: z.boolean().default(true),
        proctoring: z.object({
            enabled: z.boolean().default(false),
            requireWebcam: z.boolean().default(false),
            requireScreenShare: z.boolean().default(false),
            plagiarismDetection: z.boolean().default(false)
        })
    })
});
// Search and Filter Schemas
export const SearchFiltersSchema = z.object({
    query: z.string().optional(),
    category: z.string().optional(),
    skillLevel: SkillLevelSchema.optional(),
    difficulty: DifficultySchema.optional(),
    tags: z.array(z.string()).default([]),
    duration: z.object({
        min: z.number().optional(),
        max: z.number().optional()
    }).optional(),
    type: z.string().optional(),
    instructor: z.string().optional(),
    certification: z.boolean().optional(),
    free: z.boolean().optional(),
    trending: z.boolean().optional(),
    featured: z.boolean().optional()
});
export const PaginationSchema = z.object({
    page: z.number().min(1).default(1),
    limit: z.number().min(1).max(100).default(20),
    sortBy: z.string().default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc')
});
// Statistics Schema
export const LearningStatisticsSchema = z.object({
    totalLearningPaths: z.number(),
    totalModules: z.number(),
    totalLessons: z.number(),
    totalLabs: z.number(),
    totalAssessments: z.number(),
    totalStudents: z.number(),
    totalInstructors: z.number(),
    totalEnrollments: z.number(),
    completionRate: z.number(), // percentage
    averageScore: z.number(), // percentage
    popularPaths: z.array(z.object({
        id: z.string(),
        title: z.string(),
        enrollments: z.number()
    })),
    recentActivity: z.array(z.object({
        type: z.string(),
        description: z.string(),
        timestamp: z.date()
    }))
});
// Export all schemas for validation
export const EducationalSchemas = {
    SkillLevelSchema,
    DifficultySchema,
    ContentTypeSchema,
    AssessmentTypeSchema,
    UserRoleSchema,
    LabEnvironmentTypeSchema,
    QuestionTypeSchema,
    ProgressStatusSchema,
    InteractiveContentSchema,
    QuizQuestionSchema,
    QuizSchema,
    LessonSchema,
    LabHintSchema,
    LabTaskSchema,
    LabEnvironmentSchema,
    LabSchema,
    AssessmentResultSchema,
    AssessmentSchema,
    CompletionCriteriaSchema,
    LearningModuleSchema,
    CertificationSchema,
    LearningPathSchema,
    StudentProgressSchema,
    EnrollmentSchema,
    TrainingScenarioSchema,
    KnowledgeBaseArticleSchema,
    ForumThreadSchema,
    ForumPostSchema,
    InstructorSchema,
    DatabaseConfigSchema,
    EducationalConfigSchema,
    SearchFiltersSchema,
    PaginationSchema,
    LearningStatisticsSchema
};
//# sourceMappingURL=educational.types.js.map