import { z } from 'zod';
export declare const SkillLevelSchema: z.ZodEnum<["beginner", "intermediate", "advanced"]>;
export type SkillLevel = z.infer<typeof SkillLevelSchema>;
export declare const DifficultySchema: z.ZodEnum<["easy", "medium", "hard"]>;
export type Difficulty = z.infer<typeof DifficultySchema>;
export declare const ContentTypeSchema: z.ZodEnum<["video", "article", "interactive", "simulation", "document"]>;
export type ContentType = z.infer<typeof ContentTypeSchema>;
export declare const AssessmentTypeSchema: z.ZodEnum<["quiz", "practical", "project", "simulation", "essay"]>;
export type AssessmentType = z.infer<typeof AssessmentTypeSchema>;
export declare const UserRoleSchema: z.ZodEnum<["student", "instructor", "admin", "mentor"]>;
export type UserRole = z.infer<typeof UserRoleSchema>;
export declare const LabEnvironmentTypeSchema: z.ZodEnum<["simulated", "live", "sandboxed", "cloud"]>;
export type LabEnvironmentType = z.infer<typeof LabEnvironmentTypeSchema>;
export declare const QuestionTypeSchema: z.ZodEnum<["multiple-choice", "true-false", "fill-blank", "essay", "code", "simulation"]>;
export type QuestionType = z.infer<typeof QuestionTypeSchema>;
export declare const ProgressStatusSchema: z.ZodEnum<["not-started", "in-progress", "completed", "failed", "paused"]>;
export type ProgressStatus = z.infer<typeof ProgressStatusSchema>;
export declare const InteractiveContentSchema: z.ZodObject<{
    type: z.ZodEnum<["simulation", "diagram", "code-editor", "terminal", "network-map"]>;
    config: z.ZodRecord<z.ZodString, z.ZodAny>;
    data: z.ZodOptional<z.ZodAny>;
    instructions: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "simulation" | "diagram" | "code-editor" | "terminal" | "network-map";
    config: Record<string, any>;
    instructions: string;
    data?: any;
}, {
    type: "simulation" | "diagram" | "code-editor" | "terminal" | "network-map";
    config: Record<string, any>;
    instructions: string;
    data?: any;
}>;
export type InteractiveContent = z.infer<typeof InteractiveContentSchema>;
export declare const QuizQuestionSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodEnum<["multiple-choice", "true-false", "fill-blank", "essay", "code", "simulation"]>;
    question: z.ZodString;
    options: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    correctAnswer: z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>;
    explanation: z.ZodOptional<z.ZodString>;
    points: z.ZodDefault<z.ZodNumber>;
    timeLimit: z.ZodOptional<z.ZodNumber>;
    hints: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
    id: string;
    question: string;
    correctAnswer: string | string[];
    points: number;
    hints: string[];
    options?: string[] | undefined;
    explanation?: string | undefined;
    timeLimit?: number | undefined;
}, {
    type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
    id: string;
    question: string;
    correctAnswer: string | string[];
    options?: string[] | undefined;
    explanation?: string | undefined;
    points?: number | undefined;
    timeLimit?: number | undefined;
    hints?: string[] | undefined;
}>;
export type QuizQuestion = z.infer<typeof QuizQuestionSchema>;
export declare const QuizSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    questions: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodEnum<["multiple-choice", "true-false", "fill-blank", "essay", "code", "simulation"]>;
        question: z.ZodString;
        options: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        correctAnswer: z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>;
        explanation: z.ZodOptional<z.ZodString>;
        points: z.ZodDefault<z.ZodNumber>;
        timeLimit: z.ZodOptional<z.ZodNumber>;
        hints: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
        id: string;
        question: string;
        correctAnswer: string | string[];
        points: number;
        hints: string[];
        options?: string[] | undefined;
        explanation?: string | undefined;
        timeLimit?: number | undefined;
    }, {
        type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
        id: string;
        question: string;
        correctAnswer: string | string[];
        options?: string[] | undefined;
        explanation?: string | undefined;
        points?: number | undefined;
        timeLimit?: number | undefined;
        hints?: string[] | undefined;
    }>, "many">;
    timeLimit: z.ZodOptional<z.ZodNumber>;
    passingScore: z.ZodDefault<z.ZodNumber>;
    maxAttempts: z.ZodDefault<z.ZodNumber>;
    randomizeQuestions: z.ZodDefault<z.ZodBoolean>;
    showResults: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    id: string;
    title: string;
    questions: {
        type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
        id: string;
        question: string;
        correctAnswer: string | string[];
        points: number;
        hints: string[];
        options?: string[] | undefined;
        explanation?: string | undefined;
        timeLimit?: number | undefined;
    }[];
    passingScore: number;
    maxAttempts: number;
    randomizeQuestions: boolean;
    showResults: boolean;
    timeLimit?: number | undefined;
    description?: string | undefined;
}, {
    id: string;
    title: string;
    questions: {
        type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
        id: string;
        question: string;
        correctAnswer: string | string[];
        options?: string[] | undefined;
        explanation?: string | undefined;
        points?: number | undefined;
        timeLimit?: number | undefined;
        hints?: string[] | undefined;
    }[];
    timeLimit?: number | undefined;
    description?: string | undefined;
    passingScore?: number | undefined;
    maxAttempts?: number | undefined;
    randomizeQuestions?: boolean | undefined;
    showResults?: boolean | undefined;
}>;
export type Quiz = z.infer<typeof QuizSchema>;
export declare const LessonSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    description: z.ZodString;
    type: z.ZodEnum<["video", "article", "interactive", "simulation", "document"]>;
    content: z.ZodUnion<[z.ZodString, z.ZodObject<{
        videoUrl: z.ZodString;
        transcript: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        videoUrl: string;
        transcript?: string | undefined;
    }, {
        videoUrl: string;
        transcript?: string | undefined;
    }>, z.ZodObject<{
        type: z.ZodEnum<["simulation", "diagram", "code-editor", "terminal", "network-map"]>;
        config: z.ZodRecord<z.ZodString, z.ZodAny>;
        data: z.ZodOptional<z.ZodAny>;
        instructions: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: "simulation" | "diagram" | "code-editor" | "terminal" | "network-map";
        config: Record<string, any>;
        instructions: string;
        data?: any;
    }, {
        type: "simulation" | "diagram" | "code-editor" | "terminal" | "network-map";
        config: Record<string, any>;
        instructions: string;
        data?: any;
    }>]>;
    duration: z.ZodNumber;
    order: z.ZodNumber;
    quiz: z.ZodOptional<z.ZodObject<{
        id: z.ZodString;
        title: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        questions: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            type: z.ZodEnum<["multiple-choice", "true-false", "fill-blank", "essay", "code", "simulation"]>;
            question: z.ZodString;
            options: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            correctAnswer: z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>;
            explanation: z.ZodOptional<z.ZodString>;
            points: z.ZodDefault<z.ZodNumber>;
            timeLimit: z.ZodOptional<z.ZodNumber>;
            hints: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
            id: string;
            question: string;
            correctAnswer: string | string[];
            points: number;
            hints: string[];
            options?: string[] | undefined;
            explanation?: string | undefined;
            timeLimit?: number | undefined;
        }, {
            type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
            id: string;
            question: string;
            correctAnswer: string | string[];
            options?: string[] | undefined;
            explanation?: string | undefined;
            points?: number | undefined;
            timeLimit?: number | undefined;
            hints?: string[] | undefined;
        }>, "many">;
        timeLimit: z.ZodOptional<z.ZodNumber>;
        passingScore: z.ZodDefault<z.ZodNumber>;
        maxAttempts: z.ZodDefault<z.ZodNumber>;
        randomizeQuestions: z.ZodDefault<z.ZodBoolean>;
        showResults: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        title: string;
        questions: {
            type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
            id: string;
            question: string;
            correctAnswer: string | string[];
            points: number;
            hints: string[];
            options?: string[] | undefined;
            explanation?: string | undefined;
            timeLimit?: number | undefined;
        }[];
        passingScore: number;
        maxAttempts: number;
        randomizeQuestions: boolean;
        showResults: boolean;
        timeLimit?: number | undefined;
        description?: string | undefined;
    }, {
        id: string;
        title: string;
        questions: {
            type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
            id: string;
            question: string;
            correctAnswer: string | string[];
            options?: string[] | undefined;
            explanation?: string | undefined;
            points?: number | undefined;
            timeLimit?: number | undefined;
            hints?: string[] | undefined;
        }[];
        timeLimit?: number | undefined;
        description?: string | undefined;
        passingScore?: number | undefined;
        maxAttempts?: number | undefined;
        randomizeQuestions?: boolean | undefined;
        showResults?: boolean | undefined;
    }>>;
    prerequisites: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    resources: z.ZodDefault<z.ZodArray<z.ZodObject<{
        title: z.ZodString;
        url: z.ZodString;
        type: z.ZodEnum<["document", "link", "tool"]>;
    }, "strip", z.ZodTypeAny, {
        type: "document" | "link" | "tool";
        title: string;
        url: string;
    }, {
        type: "document" | "link" | "tool";
        title: string;
        url: string;
    }>, "many">>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    type: "video" | "article" | "interactive" | "simulation" | "document";
    id: string;
    title: string;
    description: string;
    content: string | {
        type: "simulation" | "diagram" | "code-editor" | "terminal" | "network-map";
        config: Record<string, any>;
        instructions: string;
        data?: any;
    } | {
        videoUrl: string;
        transcript?: string | undefined;
    };
    duration: number;
    order: number;
    prerequisites: string[];
    tags: string[];
    resources: {
        type: "document" | "link" | "tool";
        title: string;
        url: string;
    }[];
    metadata: Record<string, any>;
    quiz?: {
        id: string;
        title: string;
        questions: {
            type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
            id: string;
            question: string;
            correctAnswer: string | string[];
            points: number;
            hints: string[];
            options?: string[] | undefined;
            explanation?: string | undefined;
            timeLimit?: number | undefined;
        }[];
        passingScore: number;
        maxAttempts: number;
        randomizeQuestions: boolean;
        showResults: boolean;
        timeLimit?: number | undefined;
        description?: string | undefined;
    } | undefined;
}, {
    type: "video" | "article" | "interactive" | "simulation" | "document";
    id: string;
    title: string;
    description: string;
    content: string | {
        type: "simulation" | "diagram" | "code-editor" | "terminal" | "network-map";
        config: Record<string, any>;
        instructions: string;
        data?: any;
    } | {
        videoUrl: string;
        transcript?: string | undefined;
    };
    duration: number;
    order: number;
    quiz?: {
        id: string;
        title: string;
        questions: {
            type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
            id: string;
            question: string;
            correctAnswer: string | string[];
            options?: string[] | undefined;
            explanation?: string | undefined;
            points?: number | undefined;
            timeLimit?: number | undefined;
            hints?: string[] | undefined;
        }[];
        timeLimit?: number | undefined;
        description?: string | undefined;
        passingScore?: number | undefined;
        maxAttempts?: number | undefined;
        randomizeQuestions?: boolean | undefined;
        showResults?: boolean | undefined;
    } | undefined;
    prerequisites?: string[] | undefined;
    tags?: string[] | undefined;
    resources?: {
        type: "document" | "link" | "tool";
        title: string;
        url: string;
    }[] | undefined;
    metadata?: Record<string, any> | undefined;
}>;
export type Lesson = z.infer<typeof LessonSchema>;
export declare const LabHintSchema: z.ZodObject<{
    id: z.ZodString;
    order: z.ZodNumber;
    title: z.ZodString;
    content: z.ZodString;
    pointDeduction: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    id: string;
    title: string;
    content: string;
    order: number;
    pointDeduction: number;
}, {
    id: string;
    title: string;
    content: string;
    order: number;
    pointDeduction?: number | undefined;
}>;
export type LabHint = z.infer<typeof LabHintSchema>;
export declare const LabTaskSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    description: z.ZodString;
    order: z.ZodNumber;
    instructions: z.ZodString;
    expectedOutput: z.ZodOptional<z.ZodString>;
    validationScript: z.ZodOptional<z.ZodString>;
    points: z.ZodDefault<z.ZodNumber>;
    timeLimit: z.ZodOptional<z.ZodNumber>;
    prerequisites: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    tools: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    flags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    instructions: string;
    id: string;
    points: number;
    title: string;
    description: string;
    order: number;
    prerequisites: string[];
    tools: string[];
    flags: string[];
    timeLimit?: number | undefined;
    expectedOutput?: string | undefined;
    validationScript?: string | undefined;
}, {
    instructions: string;
    id: string;
    title: string;
    description: string;
    order: number;
    points?: number | undefined;
    timeLimit?: number | undefined;
    prerequisites?: string[] | undefined;
    expectedOutput?: string | undefined;
    validationScript?: string | undefined;
    tools?: string[] | undefined;
    flags?: string[] | undefined;
}>;
export type LabTask = z.infer<typeof LabTaskSchema>;
export declare const LabEnvironmentSchema: z.ZodObject<{
    type: z.ZodEnum<["simulated", "live", "sandboxed", "cloud"]>;
    config: z.ZodObject<{
        containers: z.ZodDefault<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            image: z.ZodString;
            ports: z.ZodDefault<z.ZodArray<z.ZodNumber, "many">>;
            environment: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>;
            volumes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            image: string;
            ports: number[];
            environment: Record<string, string>;
            volumes: string[];
        }, {
            name: string;
            image: string;
            ports?: number[] | undefined;
            environment?: Record<string, string> | undefined;
            volumes?: string[] | undefined;
        }>, "many">>;
        network: z.ZodOptional<z.ZodObject<{
            isolated: z.ZodDefault<z.ZodBoolean>;
            allowInternet: z.ZodDefault<z.ZodBoolean>;
            customTopology: z.ZodOptional<z.ZodAny>;
        }, "strip", z.ZodTypeAny, {
            isolated: boolean;
            allowInternet: boolean;
            customTopology?: any;
        }, {
            isolated?: boolean | undefined;
            allowInternet?: boolean | undefined;
            customTopology?: any;
        }>>;
        resources: z.ZodOptional<z.ZodObject<{
            cpu: z.ZodDefault<z.ZodString>;
            memory: z.ZodDefault<z.ZodString>;
            storage: z.ZodDefault<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            cpu: string;
            memory: string;
            storage: string;
        }, {
            cpu?: string | undefined;
            memory?: string | undefined;
            storage?: string | undefined;
        }>>;
        timeout: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        containers: {
            name: string;
            image: string;
            ports: number[];
            environment: Record<string, string>;
            volumes: string[];
        }[];
        timeout: number;
        resources?: {
            cpu: string;
            memory: string;
            storage: string;
        } | undefined;
        network?: {
            isolated: boolean;
            allowInternet: boolean;
            customTopology?: any;
        } | undefined;
    }, {
        resources?: {
            cpu?: string | undefined;
            memory?: string | undefined;
            storage?: string | undefined;
        } | undefined;
        containers?: {
            name: string;
            image: string;
            ports?: number[] | undefined;
            environment?: Record<string, string> | undefined;
            volumes?: string[] | undefined;
        }[] | undefined;
        network?: {
            isolated?: boolean | undefined;
            allowInternet?: boolean | undefined;
            customTopology?: any;
        } | undefined;
        timeout?: number | undefined;
    }>;
    provisioning: z.ZodOptional<z.ZodObject<{
        setupScript: z.ZodOptional<z.ZodString>;
        teardownScript: z.ZodOptional<z.ZodString>;
        healthCheck: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        setupScript?: string | undefined;
        teardownScript?: string | undefined;
        healthCheck?: string | undefined;
    }, {
        setupScript?: string | undefined;
        teardownScript?: string | undefined;
        healthCheck?: string | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    type: "simulated" | "live" | "sandboxed" | "cloud";
    config: {
        containers: {
            name: string;
            image: string;
            ports: number[];
            environment: Record<string, string>;
            volumes: string[];
        }[];
        timeout: number;
        resources?: {
            cpu: string;
            memory: string;
            storage: string;
        } | undefined;
        network?: {
            isolated: boolean;
            allowInternet: boolean;
            customTopology?: any;
        } | undefined;
    };
    provisioning?: {
        setupScript?: string | undefined;
        teardownScript?: string | undefined;
        healthCheck?: string | undefined;
    } | undefined;
}, {
    type: "simulated" | "live" | "sandboxed" | "cloud";
    config: {
        resources?: {
            cpu?: string | undefined;
            memory?: string | undefined;
            storage?: string | undefined;
        } | undefined;
        containers?: {
            name: string;
            image: string;
            ports?: number[] | undefined;
            environment?: Record<string, string> | undefined;
            volumes?: string[] | undefined;
        }[] | undefined;
        network?: {
            isolated?: boolean | undefined;
            allowInternet?: boolean | undefined;
            customTopology?: any;
        } | undefined;
        timeout?: number | undefined;
    };
    provisioning?: {
        setupScript?: string | undefined;
        teardownScript?: string | undefined;
        healthCheck?: string | undefined;
    } | undefined;
}>;
export type LabEnvironment = z.infer<typeof LabEnvironmentSchema>;
export declare const LabSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    description: z.ZodString;
    difficulty: z.ZodEnum<["easy", "medium", "hard"]>;
    skillLevel: z.ZodEnum<["beginner", "intermediate", "advanced"]>;
    environment: z.ZodObject<{
        type: z.ZodEnum<["simulated", "live", "sandboxed", "cloud"]>;
        config: z.ZodObject<{
            containers: z.ZodDefault<z.ZodArray<z.ZodObject<{
                name: z.ZodString;
                image: z.ZodString;
                ports: z.ZodDefault<z.ZodArray<z.ZodNumber, "many">>;
                environment: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>;
                volumes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            }, "strip", z.ZodTypeAny, {
                name: string;
                image: string;
                ports: number[];
                environment: Record<string, string>;
                volumes: string[];
            }, {
                name: string;
                image: string;
                ports?: number[] | undefined;
                environment?: Record<string, string> | undefined;
                volumes?: string[] | undefined;
            }>, "many">>;
            network: z.ZodOptional<z.ZodObject<{
                isolated: z.ZodDefault<z.ZodBoolean>;
                allowInternet: z.ZodDefault<z.ZodBoolean>;
                customTopology: z.ZodOptional<z.ZodAny>;
            }, "strip", z.ZodTypeAny, {
                isolated: boolean;
                allowInternet: boolean;
                customTopology?: any;
            }, {
                isolated?: boolean | undefined;
                allowInternet?: boolean | undefined;
                customTopology?: any;
            }>>;
            resources: z.ZodOptional<z.ZodObject<{
                cpu: z.ZodDefault<z.ZodString>;
                memory: z.ZodDefault<z.ZodString>;
                storage: z.ZodDefault<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                cpu: string;
                memory: string;
                storage: string;
            }, {
                cpu?: string | undefined;
                memory?: string | undefined;
                storage?: string | undefined;
            }>>;
            timeout: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            containers: {
                name: string;
                image: string;
                ports: number[];
                environment: Record<string, string>;
                volumes: string[];
            }[];
            timeout: number;
            resources?: {
                cpu: string;
                memory: string;
                storage: string;
            } | undefined;
            network?: {
                isolated: boolean;
                allowInternet: boolean;
                customTopology?: any;
            } | undefined;
        }, {
            resources?: {
                cpu?: string | undefined;
                memory?: string | undefined;
                storage?: string | undefined;
            } | undefined;
            containers?: {
                name: string;
                image: string;
                ports?: number[] | undefined;
                environment?: Record<string, string> | undefined;
                volumes?: string[] | undefined;
            }[] | undefined;
            network?: {
                isolated?: boolean | undefined;
                allowInternet?: boolean | undefined;
                customTopology?: any;
            } | undefined;
            timeout?: number | undefined;
        }>;
        provisioning: z.ZodOptional<z.ZodObject<{
            setupScript: z.ZodOptional<z.ZodString>;
            teardownScript: z.ZodOptional<z.ZodString>;
            healthCheck: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            setupScript?: string | undefined;
            teardownScript?: string | undefined;
            healthCheck?: string | undefined;
        }, {
            setupScript?: string | undefined;
            teardownScript?: string | undefined;
            healthCheck?: string | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        type: "simulated" | "live" | "sandboxed" | "cloud";
        config: {
            containers: {
                name: string;
                image: string;
                ports: number[];
                environment: Record<string, string>;
                volumes: string[];
            }[];
            timeout: number;
            resources?: {
                cpu: string;
                memory: string;
                storage: string;
            } | undefined;
            network?: {
                isolated: boolean;
                allowInternet: boolean;
                customTopology?: any;
            } | undefined;
        };
        provisioning?: {
            setupScript?: string | undefined;
            teardownScript?: string | undefined;
            healthCheck?: string | undefined;
        } | undefined;
    }, {
        type: "simulated" | "live" | "sandboxed" | "cloud";
        config: {
            resources?: {
                cpu?: string | undefined;
                memory?: string | undefined;
                storage?: string | undefined;
            } | undefined;
            containers?: {
                name: string;
                image: string;
                ports?: number[] | undefined;
                environment?: Record<string, string> | undefined;
                volumes?: string[] | undefined;
            }[] | undefined;
            network?: {
                isolated?: boolean | undefined;
                allowInternet?: boolean | undefined;
                customTopology?: any;
            } | undefined;
            timeout?: number | undefined;
        };
        provisioning?: {
            setupScript?: string | undefined;
            teardownScript?: string | undefined;
            healthCheck?: string | undefined;
        } | undefined;
    }>;
    tasks: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        title: z.ZodString;
        description: z.ZodString;
        order: z.ZodNumber;
        instructions: z.ZodString;
        expectedOutput: z.ZodOptional<z.ZodString>;
        validationScript: z.ZodOptional<z.ZodString>;
        points: z.ZodDefault<z.ZodNumber>;
        timeLimit: z.ZodOptional<z.ZodNumber>;
        prerequisites: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        tools: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        flags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        instructions: string;
        id: string;
        points: number;
        title: string;
        description: string;
        order: number;
        prerequisites: string[];
        tools: string[];
        flags: string[];
        timeLimit?: number | undefined;
        expectedOutput?: string | undefined;
        validationScript?: string | undefined;
    }, {
        instructions: string;
        id: string;
        title: string;
        description: string;
        order: number;
        points?: number | undefined;
        timeLimit?: number | undefined;
        prerequisites?: string[] | undefined;
        expectedOutput?: string | undefined;
        validationScript?: string | undefined;
        tools?: string[] | undefined;
        flags?: string[] | undefined;
    }>, "many">;
    hints: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        order: z.ZodNumber;
        title: z.ZodString;
        content: z.ZodString;
        pointDeduction: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        title: string;
        content: string;
        order: number;
        pointDeduction: number;
    }, {
        id: string;
        title: string;
        content: string;
        order: number;
        pointDeduction?: number | undefined;
    }>, "many">>;
    solution: z.ZodString;
    estimatedTime: z.ZodNumber;
    maxAttempts: z.ZodDefault<z.ZodNumber>;
    order: z.ZodNumber;
    prerequisites: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    learningObjectives: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    references: z.ZodDefault<z.ZodArray<z.ZodObject<{
        title: z.ZodString;
        url: z.ZodString;
        type: z.ZodEnum<["documentation", "tutorial", "tool", "research"]>;
    }, "strip", z.ZodTypeAny, {
        type: "tool" | "documentation" | "tutorial" | "research";
        title: string;
        url: string;
    }, {
        type: "tool" | "documentation" | "tutorial" | "research";
        title: string;
        url: string;
    }>, "many">>;
    createdBy: z.ZodString;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    hints: {
        id: string;
        title: string;
        content: string;
        order: number;
        pointDeduction: number;
    }[];
    title: string;
    description: string;
    maxAttempts: number;
    order: number;
    prerequisites: string[];
    tags: string[];
    metadata: Record<string, any>;
    environment: {
        type: "simulated" | "live" | "sandboxed" | "cloud";
        config: {
            containers: {
                name: string;
                image: string;
                ports: number[];
                environment: Record<string, string>;
                volumes: string[];
            }[];
            timeout: number;
            resources?: {
                cpu: string;
                memory: string;
                storage: string;
            } | undefined;
            network?: {
                isolated: boolean;
                allowInternet: boolean;
                customTopology?: any;
            } | undefined;
        };
        provisioning?: {
            setupScript?: string | undefined;
            teardownScript?: string | undefined;
            healthCheck?: string | undefined;
        } | undefined;
    };
    difficulty: "easy" | "medium" | "hard";
    skillLevel: "beginner" | "intermediate" | "advanced";
    tasks: {
        instructions: string;
        id: string;
        points: number;
        title: string;
        description: string;
        order: number;
        prerequisites: string[];
        tools: string[];
        flags: string[];
        timeLimit?: number | undefined;
        expectedOutput?: string | undefined;
        validationScript?: string | undefined;
    }[];
    solution: string;
    estimatedTime: number;
    learningObjectives: string[];
    references: {
        type: "tool" | "documentation" | "tutorial" | "research";
        title: string;
        url: string;
    }[];
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}, {
    id: string;
    title: string;
    description: string;
    order: number;
    environment: {
        type: "simulated" | "live" | "sandboxed" | "cloud";
        config: {
            resources?: {
                cpu?: string | undefined;
                memory?: string | undefined;
                storage?: string | undefined;
            } | undefined;
            containers?: {
                name: string;
                image: string;
                ports?: number[] | undefined;
                environment?: Record<string, string> | undefined;
                volumes?: string[] | undefined;
            }[] | undefined;
            network?: {
                isolated?: boolean | undefined;
                allowInternet?: boolean | undefined;
                customTopology?: any;
            } | undefined;
            timeout?: number | undefined;
        };
        provisioning?: {
            setupScript?: string | undefined;
            teardownScript?: string | undefined;
            healthCheck?: string | undefined;
        } | undefined;
    };
    difficulty: "easy" | "medium" | "hard";
    skillLevel: "beginner" | "intermediate" | "advanced";
    tasks: {
        instructions: string;
        id: string;
        title: string;
        description: string;
        order: number;
        points?: number | undefined;
        timeLimit?: number | undefined;
        prerequisites?: string[] | undefined;
        expectedOutput?: string | undefined;
        validationScript?: string | undefined;
        tools?: string[] | undefined;
        flags?: string[] | undefined;
    }[];
    solution: string;
    estimatedTime: number;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
    hints?: {
        id: string;
        title: string;
        content: string;
        order: number;
        pointDeduction?: number | undefined;
    }[] | undefined;
    maxAttempts?: number | undefined;
    prerequisites?: string[] | undefined;
    tags?: string[] | undefined;
    metadata?: Record<string, any> | undefined;
    learningObjectives?: string[] | undefined;
    references?: {
        type: "tool" | "documentation" | "tutorial" | "research";
        title: string;
        url: string;
    }[] | undefined;
}>;
export type Lab = z.infer<typeof LabSchema>;
export declare const AssessmentResultSchema: z.ZodObject<{
    id: z.ZodString;
    assessmentId: z.ZodString;
    studentId: z.ZodString;
    type: z.ZodEnum<["quiz", "practical", "project", "simulation", "essay"]>;
    score: z.ZodNumber;
    maxScore: z.ZodNumber;
    passed: z.ZodBoolean;
    startedAt: z.ZodDate;
    completedAt: z.ZodOptional<z.ZodDate>;
    timeSpent: z.ZodNumber;
    answers: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
    feedback: z.ZodOptional<z.ZodString>;
    graderNotes: z.ZodOptional<z.ZodString>;
    attempt: z.ZodDefault<z.ZodNumber>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    type: "simulation" | "quiz" | "practical" | "project" | "essay";
    id: string;
    metadata: Record<string, any>;
    assessmentId: string;
    studentId: string;
    score: number;
    maxScore: number;
    passed: boolean;
    startedAt: Date;
    timeSpent: number;
    answers: Record<string, any>;
    attempt: number;
    completedAt?: Date | undefined;
    feedback?: string | undefined;
    graderNotes?: string | undefined;
}, {
    type: "simulation" | "quiz" | "practical" | "project" | "essay";
    id: string;
    assessmentId: string;
    studentId: string;
    score: number;
    maxScore: number;
    passed: boolean;
    startedAt: Date;
    timeSpent: number;
    metadata?: Record<string, any> | undefined;
    completedAt?: Date | undefined;
    answers?: Record<string, any> | undefined;
    feedback?: string | undefined;
    graderNotes?: string | undefined;
    attempt?: number | undefined;
}>;
export type AssessmentResult = z.infer<typeof AssessmentResultSchema>;
export declare const AssessmentSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    description: z.ZodString;
    type: z.ZodEnum<["quiz", "practical", "project", "simulation", "essay"]>;
    difficulty: z.ZodEnum<["easy", "medium", "hard"]>;
    timeLimit: z.ZodOptional<z.ZodNumber>;
    passingScore: z.ZodDefault<z.ZodNumber>;
    maxAttempts: z.ZodDefault<z.ZodNumber>;
    questions: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodEnum<["multiple-choice", "true-false", "fill-blank", "essay", "code", "simulation"]>;
        question: z.ZodString;
        options: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        correctAnswer: z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>;
        explanation: z.ZodOptional<z.ZodString>;
        points: z.ZodDefault<z.ZodNumber>;
        timeLimit: z.ZodOptional<z.ZodNumber>;
        hints: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
        id: string;
        question: string;
        correctAnswer: string | string[];
        points: number;
        hints: string[];
        options?: string[] | undefined;
        explanation?: string | undefined;
        timeLimit?: number | undefined;
    }, {
        type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
        id: string;
        question: string;
        correctAnswer: string | string[];
        options?: string[] | undefined;
        explanation?: string | undefined;
        points?: number | undefined;
        timeLimit?: number | undefined;
        hints?: string[] | undefined;
    }>, "many">>;
    practicalTasks: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        title: z.ZodString;
        description: z.ZodString;
        order: z.ZodNumber;
        instructions: z.ZodString;
        expectedOutput: z.ZodOptional<z.ZodString>;
        validationScript: z.ZodOptional<z.ZodString>;
        points: z.ZodDefault<z.ZodNumber>;
        timeLimit: z.ZodOptional<z.ZodNumber>;
        prerequisites: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        tools: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        flags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        instructions: string;
        id: string;
        points: number;
        title: string;
        description: string;
        order: number;
        prerequisites: string[];
        tools: string[];
        flags: string[];
        timeLimit?: number | undefined;
        expectedOutput?: string | undefined;
        validationScript?: string | undefined;
    }, {
        instructions: string;
        id: string;
        title: string;
        description: string;
        order: number;
        points?: number | undefined;
        timeLimit?: number | undefined;
        prerequisites?: string[] | undefined;
        expectedOutput?: string | undefined;
        validationScript?: string | undefined;
        tools?: string[] | undefined;
        flags?: string[] | undefined;
    }>, "many">>;
    rubric: z.ZodOptional<z.ZodObject<{
        criteria: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            description: z.ZodString;
            maxPoints: z.ZodNumber;
            weight: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            description: string;
            name: string;
            maxPoints: number;
            weight: number;
        }, {
            description: string;
            name: string;
            maxPoints: number;
            weight: number;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        criteria: {
            description: string;
            name: string;
            maxPoints: number;
            weight: number;
        }[];
    }, {
        criteria: {
            description: string;
            name: string;
            maxPoints: number;
            weight: number;
        }[];
    }>>;
    autoGrading: z.ZodDefault<z.ZodBoolean>;
    order: z.ZodNumber;
    prerequisites: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    createdBy: z.ZodString;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    type: "simulation" | "quiz" | "practical" | "project" | "essay";
    id: string;
    title: string;
    description: string;
    passingScore: number;
    maxAttempts: number;
    order: number;
    prerequisites: string[];
    tags: string[];
    metadata: Record<string, any>;
    difficulty: "easy" | "medium" | "hard";
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
    autoGrading: boolean;
    timeLimit?: number | undefined;
    questions?: {
        type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
        id: string;
        question: string;
        correctAnswer: string | string[];
        points: number;
        hints: string[];
        options?: string[] | undefined;
        explanation?: string | undefined;
        timeLimit?: number | undefined;
    }[] | undefined;
    practicalTasks?: {
        instructions: string;
        id: string;
        points: number;
        title: string;
        description: string;
        order: number;
        prerequisites: string[];
        tools: string[];
        flags: string[];
        timeLimit?: number | undefined;
        expectedOutput?: string | undefined;
        validationScript?: string | undefined;
    }[] | undefined;
    rubric?: {
        criteria: {
            description: string;
            name: string;
            maxPoints: number;
            weight: number;
        }[];
    } | undefined;
}, {
    type: "simulation" | "quiz" | "practical" | "project" | "essay";
    id: string;
    title: string;
    description: string;
    order: number;
    difficulty: "easy" | "medium" | "hard";
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
    timeLimit?: number | undefined;
    questions?: {
        type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
        id: string;
        question: string;
        correctAnswer: string | string[];
        options?: string[] | undefined;
        explanation?: string | undefined;
        points?: number | undefined;
        timeLimit?: number | undefined;
        hints?: string[] | undefined;
    }[] | undefined;
    passingScore?: number | undefined;
    maxAttempts?: number | undefined;
    prerequisites?: string[] | undefined;
    tags?: string[] | undefined;
    metadata?: Record<string, any> | undefined;
    practicalTasks?: {
        instructions: string;
        id: string;
        title: string;
        description: string;
        order: number;
        points?: number | undefined;
        timeLimit?: number | undefined;
        prerequisites?: string[] | undefined;
        expectedOutput?: string | undefined;
        validationScript?: string | undefined;
        tools?: string[] | undefined;
        flags?: string[] | undefined;
    }[] | undefined;
    rubric?: {
        criteria: {
            description: string;
            name: string;
            maxPoints: number;
            weight: number;
        }[];
    } | undefined;
    autoGrading?: boolean | undefined;
}>;
export type Assessment = z.infer<typeof AssessmentSchema>;
export declare const CompletionCriteriaSchema: z.ZodObject<{
    requiredLessons: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    requiredLabs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    requiredAssessments: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    minimumAssessmentScore: z.ZodDefault<z.ZodNumber>;
    minimumLabScore: z.ZodDefault<z.ZodNumber>;
    requireAllLessons: z.ZodDefault<z.ZodBoolean>;
    requireAllLabs: z.ZodDefault<z.ZodBoolean>;
    requireAllAssessments: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    requiredLessons: string[];
    requiredLabs: string[];
    requiredAssessments: string[];
    minimumAssessmentScore: number;
    minimumLabScore: number;
    requireAllLessons: boolean;
    requireAllLabs: boolean;
    requireAllAssessments: boolean;
}, {
    requiredLessons?: string[] | undefined;
    requiredLabs?: string[] | undefined;
    requiredAssessments?: string[] | undefined;
    minimumAssessmentScore?: number | undefined;
    minimumLabScore?: number | undefined;
    requireAllLessons?: boolean | undefined;
    requireAllLabs?: boolean | undefined;
    requireAllAssessments?: boolean | undefined;
}>;
export type CompletionCriteria = z.infer<typeof CompletionCriteriaSchema>;
export declare const LearningModuleSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    description: z.ZodString;
    order: z.ZodNumber;
    estimatedHours: z.ZodNumber;
    skillLevel: z.ZodEnum<["beginner", "intermediate", "advanced"]>;
    content: z.ZodObject<{
        lessons: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            title: z.ZodString;
            description: z.ZodString;
            type: z.ZodEnum<["video", "article", "interactive", "simulation", "document"]>;
            content: z.ZodUnion<[z.ZodString, z.ZodObject<{
                videoUrl: z.ZodString;
                transcript: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                videoUrl: string;
                transcript?: string | undefined;
            }, {
                videoUrl: string;
                transcript?: string | undefined;
            }>, z.ZodObject<{
                type: z.ZodEnum<["simulation", "diagram", "code-editor", "terminal", "network-map"]>;
                config: z.ZodRecord<z.ZodString, z.ZodAny>;
                data: z.ZodOptional<z.ZodAny>;
                instructions: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                type: "simulation" | "diagram" | "code-editor" | "terminal" | "network-map";
                config: Record<string, any>;
                instructions: string;
                data?: any;
            }, {
                type: "simulation" | "diagram" | "code-editor" | "terminal" | "network-map";
                config: Record<string, any>;
                instructions: string;
                data?: any;
            }>]>;
            duration: z.ZodNumber;
            order: z.ZodNumber;
            quiz: z.ZodOptional<z.ZodObject<{
                id: z.ZodString;
                title: z.ZodString;
                description: z.ZodOptional<z.ZodString>;
                questions: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    type: z.ZodEnum<["multiple-choice", "true-false", "fill-blank", "essay", "code", "simulation"]>;
                    question: z.ZodString;
                    options: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                    correctAnswer: z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>;
                    explanation: z.ZodOptional<z.ZodString>;
                    points: z.ZodDefault<z.ZodNumber>;
                    timeLimit: z.ZodOptional<z.ZodNumber>;
                    hints: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
                }, "strip", z.ZodTypeAny, {
                    type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
                    id: string;
                    question: string;
                    correctAnswer: string | string[];
                    points: number;
                    hints: string[];
                    options?: string[] | undefined;
                    explanation?: string | undefined;
                    timeLimit?: number | undefined;
                }, {
                    type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
                    id: string;
                    question: string;
                    correctAnswer: string | string[];
                    options?: string[] | undefined;
                    explanation?: string | undefined;
                    points?: number | undefined;
                    timeLimit?: number | undefined;
                    hints?: string[] | undefined;
                }>, "many">;
                timeLimit: z.ZodOptional<z.ZodNumber>;
                passingScore: z.ZodDefault<z.ZodNumber>;
                maxAttempts: z.ZodDefault<z.ZodNumber>;
                randomizeQuestions: z.ZodDefault<z.ZodBoolean>;
                showResults: z.ZodDefault<z.ZodBoolean>;
            }, "strip", z.ZodTypeAny, {
                id: string;
                title: string;
                questions: {
                    type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
                    id: string;
                    question: string;
                    correctAnswer: string | string[];
                    points: number;
                    hints: string[];
                    options?: string[] | undefined;
                    explanation?: string | undefined;
                    timeLimit?: number | undefined;
                }[];
                passingScore: number;
                maxAttempts: number;
                randomizeQuestions: boolean;
                showResults: boolean;
                timeLimit?: number | undefined;
                description?: string | undefined;
            }, {
                id: string;
                title: string;
                questions: {
                    type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
                    id: string;
                    question: string;
                    correctAnswer: string | string[];
                    options?: string[] | undefined;
                    explanation?: string | undefined;
                    points?: number | undefined;
                    timeLimit?: number | undefined;
                    hints?: string[] | undefined;
                }[];
                timeLimit?: number | undefined;
                description?: string | undefined;
                passingScore?: number | undefined;
                maxAttempts?: number | undefined;
                randomizeQuestions?: boolean | undefined;
                showResults?: boolean | undefined;
            }>>;
            prerequisites: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            resources: z.ZodDefault<z.ZodArray<z.ZodObject<{
                title: z.ZodString;
                url: z.ZodString;
                type: z.ZodEnum<["document", "link", "tool"]>;
            }, "strip", z.ZodTypeAny, {
                type: "document" | "link" | "tool";
                title: string;
                url: string;
            }, {
                type: "document" | "link" | "tool";
                title: string;
                url: string;
            }>, "many">>;
            metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
        }, "strip", z.ZodTypeAny, {
            type: "video" | "article" | "interactive" | "simulation" | "document";
            id: string;
            title: string;
            description: string;
            content: string | {
                type: "simulation" | "diagram" | "code-editor" | "terminal" | "network-map";
                config: Record<string, any>;
                instructions: string;
                data?: any;
            } | {
                videoUrl: string;
                transcript?: string | undefined;
            };
            duration: number;
            order: number;
            prerequisites: string[];
            tags: string[];
            resources: {
                type: "document" | "link" | "tool";
                title: string;
                url: string;
            }[];
            metadata: Record<string, any>;
            quiz?: {
                id: string;
                title: string;
                questions: {
                    type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
                    id: string;
                    question: string;
                    correctAnswer: string | string[];
                    points: number;
                    hints: string[];
                    options?: string[] | undefined;
                    explanation?: string | undefined;
                    timeLimit?: number | undefined;
                }[];
                passingScore: number;
                maxAttempts: number;
                randomizeQuestions: boolean;
                showResults: boolean;
                timeLimit?: number | undefined;
                description?: string | undefined;
            } | undefined;
        }, {
            type: "video" | "article" | "interactive" | "simulation" | "document";
            id: string;
            title: string;
            description: string;
            content: string | {
                type: "simulation" | "diagram" | "code-editor" | "terminal" | "network-map";
                config: Record<string, any>;
                instructions: string;
                data?: any;
            } | {
                videoUrl: string;
                transcript?: string | undefined;
            };
            duration: number;
            order: number;
            quiz?: {
                id: string;
                title: string;
                questions: {
                    type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
                    id: string;
                    question: string;
                    correctAnswer: string | string[];
                    options?: string[] | undefined;
                    explanation?: string | undefined;
                    points?: number | undefined;
                    timeLimit?: number | undefined;
                    hints?: string[] | undefined;
                }[];
                timeLimit?: number | undefined;
                description?: string | undefined;
                passingScore?: number | undefined;
                maxAttempts?: number | undefined;
                randomizeQuestions?: boolean | undefined;
                showResults?: boolean | undefined;
            } | undefined;
            prerequisites?: string[] | undefined;
            tags?: string[] | undefined;
            resources?: {
                type: "document" | "link" | "tool";
                title: string;
                url: string;
            }[] | undefined;
            metadata?: Record<string, any> | undefined;
        }>, "many">>;
        labs: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            title: z.ZodString;
            description: z.ZodString;
            difficulty: z.ZodEnum<["easy", "medium", "hard"]>;
            skillLevel: z.ZodEnum<["beginner", "intermediate", "advanced"]>;
            environment: z.ZodObject<{
                type: z.ZodEnum<["simulated", "live", "sandboxed", "cloud"]>;
                config: z.ZodObject<{
                    containers: z.ZodDefault<z.ZodArray<z.ZodObject<{
                        name: z.ZodString;
                        image: z.ZodString;
                        ports: z.ZodDefault<z.ZodArray<z.ZodNumber, "many">>;
                        environment: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>;
                        volumes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
                    }, "strip", z.ZodTypeAny, {
                        name: string;
                        image: string;
                        ports: number[];
                        environment: Record<string, string>;
                        volumes: string[];
                    }, {
                        name: string;
                        image: string;
                        ports?: number[] | undefined;
                        environment?: Record<string, string> | undefined;
                        volumes?: string[] | undefined;
                    }>, "many">>;
                    network: z.ZodOptional<z.ZodObject<{
                        isolated: z.ZodDefault<z.ZodBoolean>;
                        allowInternet: z.ZodDefault<z.ZodBoolean>;
                        customTopology: z.ZodOptional<z.ZodAny>;
                    }, "strip", z.ZodTypeAny, {
                        isolated: boolean;
                        allowInternet: boolean;
                        customTopology?: any;
                    }, {
                        isolated?: boolean | undefined;
                        allowInternet?: boolean | undefined;
                        customTopology?: any;
                    }>>;
                    resources: z.ZodOptional<z.ZodObject<{
                        cpu: z.ZodDefault<z.ZodString>;
                        memory: z.ZodDefault<z.ZodString>;
                        storage: z.ZodDefault<z.ZodString>;
                    }, "strip", z.ZodTypeAny, {
                        cpu: string;
                        memory: string;
                        storage: string;
                    }, {
                        cpu?: string | undefined;
                        memory?: string | undefined;
                        storage?: string | undefined;
                    }>>;
                    timeout: z.ZodDefault<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    containers: {
                        name: string;
                        image: string;
                        ports: number[];
                        environment: Record<string, string>;
                        volumes: string[];
                    }[];
                    timeout: number;
                    resources?: {
                        cpu: string;
                        memory: string;
                        storage: string;
                    } | undefined;
                    network?: {
                        isolated: boolean;
                        allowInternet: boolean;
                        customTopology?: any;
                    } | undefined;
                }, {
                    resources?: {
                        cpu?: string | undefined;
                        memory?: string | undefined;
                        storage?: string | undefined;
                    } | undefined;
                    containers?: {
                        name: string;
                        image: string;
                        ports?: number[] | undefined;
                        environment?: Record<string, string> | undefined;
                        volumes?: string[] | undefined;
                    }[] | undefined;
                    network?: {
                        isolated?: boolean | undefined;
                        allowInternet?: boolean | undefined;
                        customTopology?: any;
                    } | undefined;
                    timeout?: number | undefined;
                }>;
                provisioning: z.ZodOptional<z.ZodObject<{
                    setupScript: z.ZodOptional<z.ZodString>;
                    teardownScript: z.ZodOptional<z.ZodString>;
                    healthCheck: z.ZodOptional<z.ZodString>;
                }, "strip", z.ZodTypeAny, {
                    setupScript?: string | undefined;
                    teardownScript?: string | undefined;
                    healthCheck?: string | undefined;
                }, {
                    setupScript?: string | undefined;
                    teardownScript?: string | undefined;
                    healthCheck?: string | undefined;
                }>>;
            }, "strip", z.ZodTypeAny, {
                type: "simulated" | "live" | "sandboxed" | "cloud";
                config: {
                    containers: {
                        name: string;
                        image: string;
                        ports: number[];
                        environment: Record<string, string>;
                        volumes: string[];
                    }[];
                    timeout: number;
                    resources?: {
                        cpu: string;
                        memory: string;
                        storage: string;
                    } | undefined;
                    network?: {
                        isolated: boolean;
                        allowInternet: boolean;
                        customTopology?: any;
                    } | undefined;
                };
                provisioning?: {
                    setupScript?: string | undefined;
                    teardownScript?: string | undefined;
                    healthCheck?: string | undefined;
                } | undefined;
            }, {
                type: "simulated" | "live" | "sandboxed" | "cloud";
                config: {
                    resources?: {
                        cpu?: string | undefined;
                        memory?: string | undefined;
                        storage?: string | undefined;
                    } | undefined;
                    containers?: {
                        name: string;
                        image: string;
                        ports?: number[] | undefined;
                        environment?: Record<string, string> | undefined;
                        volumes?: string[] | undefined;
                    }[] | undefined;
                    network?: {
                        isolated?: boolean | undefined;
                        allowInternet?: boolean | undefined;
                        customTopology?: any;
                    } | undefined;
                    timeout?: number | undefined;
                };
                provisioning?: {
                    setupScript?: string | undefined;
                    teardownScript?: string | undefined;
                    healthCheck?: string | undefined;
                } | undefined;
            }>;
            tasks: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                title: z.ZodString;
                description: z.ZodString;
                order: z.ZodNumber;
                instructions: z.ZodString;
                expectedOutput: z.ZodOptional<z.ZodString>;
                validationScript: z.ZodOptional<z.ZodString>;
                points: z.ZodDefault<z.ZodNumber>;
                timeLimit: z.ZodOptional<z.ZodNumber>;
                prerequisites: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
                tools: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
                flags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            }, "strip", z.ZodTypeAny, {
                instructions: string;
                id: string;
                points: number;
                title: string;
                description: string;
                order: number;
                prerequisites: string[];
                tools: string[];
                flags: string[];
                timeLimit?: number | undefined;
                expectedOutput?: string | undefined;
                validationScript?: string | undefined;
            }, {
                instructions: string;
                id: string;
                title: string;
                description: string;
                order: number;
                points?: number | undefined;
                timeLimit?: number | undefined;
                prerequisites?: string[] | undefined;
                expectedOutput?: string | undefined;
                validationScript?: string | undefined;
                tools?: string[] | undefined;
                flags?: string[] | undefined;
            }>, "many">;
            hints: z.ZodDefault<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                order: z.ZodNumber;
                title: z.ZodString;
                content: z.ZodString;
                pointDeduction: z.ZodDefault<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                id: string;
                title: string;
                content: string;
                order: number;
                pointDeduction: number;
            }, {
                id: string;
                title: string;
                content: string;
                order: number;
                pointDeduction?: number | undefined;
            }>, "many">>;
            solution: z.ZodString;
            estimatedTime: z.ZodNumber;
            maxAttempts: z.ZodDefault<z.ZodNumber>;
            order: z.ZodNumber;
            prerequisites: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            learningObjectives: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            references: z.ZodDefault<z.ZodArray<z.ZodObject<{
                title: z.ZodString;
                url: z.ZodString;
                type: z.ZodEnum<["documentation", "tutorial", "tool", "research"]>;
            }, "strip", z.ZodTypeAny, {
                type: "tool" | "documentation" | "tutorial" | "research";
                title: string;
                url: string;
            }, {
                type: "tool" | "documentation" | "tutorial" | "research";
                title: string;
                url: string;
            }>, "many">>;
            createdBy: z.ZodString;
            createdAt: z.ZodDate;
            updatedAt: z.ZodDate;
            metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            hints: {
                id: string;
                title: string;
                content: string;
                order: number;
                pointDeduction: number;
            }[];
            title: string;
            description: string;
            maxAttempts: number;
            order: number;
            prerequisites: string[];
            tags: string[];
            metadata: Record<string, any>;
            environment: {
                type: "simulated" | "live" | "sandboxed" | "cloud";
                config: {
                    containers: {
                        name: string;
                        image: string;
                        ports: number[];
                        environment: Record<string, string>;
                        volumes: string[];
                    }[];
                    timeout: number;
                    resources?: {
                        cpu: string;
                        memory: string;
                        storage: string;
                    } | undefined;
                    network?: {
                        isolated: boolean;
                        allowInternet: boolean;
                        customTopology?: any;
                    } | undefined;
                };
                provisioning?: {
                    setupScript?: string | undefined;
                    teardownScript?: string | undefined;
                    healthCheck?: string | undefined;
                } | undefined;
            };
            difficulty: "easy" | "medium" | "hard";
            skillLevel: "beginner" | "intermediate" | "advanced";
            tasks: {
                instructions: string;
                id: string;
                points: number;
                title: string;
                description: string;
                order: number;
                prerequisites: string[];
                tools: string[];
                flags: string[];
                timeLimit?: number | undefined;
                expectedOutput?: string | undefined;
                validationScript?: string | undefined;
            }[];
            solution: string;
            estimatedTime: number;
            learningObjectives: string[];
            references: {
                type: "tool" | "documentation" | "tutorial" | "research";
                title: string;
                url: string;
            }[];
            createdBy: string;
            createdAt: Date;
            updatedAt: Date;
        }, {
            id: string;
            title: string;
            description: string;
            order: number;
            environment: {
                type: "simulated" | "live" | "sandboxed" | "cloud";
                config: {
                    resources?: {
                        cpu?: string | undefined;
                        memory?: string | undefined;
                        storage?: string | undefined;
                    } | undefined;
                    containers?: {
                        name: string;
                        image: string;
                        ports?: number[] | undefined;
                        environment?: Record<string, string> | undefined;
                        volumes?: string[] | undefined;
                    }[] | undefined;
                    network?: {
                        isolated?: boolean | undefined;
                        allowInternet?: boolean | undefined;
                        customTopology?: any;
                    } | undefined;
                    timeout?: number | undefined;
                };
                provisioning?: {
                    setupScript?: string | undefined;
                    teardownScript?: string | undefined;
                    healthCheck?: string | undefined;
                } | undefined;
            };
            difficulty: "easy" | "medium" | "hard";
            skillLevel: "beginner" | "intermediate" | "advanced";
            tasks: {
                instructions: string;
                id: string;
                title: string;
                description: string;
                order: number;
                points?: number | undefined;
                timeLimit?: number | undefined;
                prerequisites?: string[] | undefined;
                expectedOutput?: string | undefined;
                validationScript?: string | undefined;
                tools?: string[] | undefined;
                flags?: string[] | undefined;
            }[];
            solution: string;
            estimatedTime: number;
            createdBy: string;
            createdAt: Date;
            updatedAt: Date;
            hints?: {
                id: string;
                title: string;
                content: string;
                order: number;
                pointDeduction?: number | undefined;
            }[] | undefined;
            maxAttempts?: number | undefined;
            prerequisites?: string[] | undefined;
            tags?: string[] | undefined;
            metadata?: Record<string, any> | undefined;
            learningObjectives?: string[] | undefined;
            references?: {
                type: "tool" | "documentation" | "tutorial" | "research";
                title: string;
                url: string;
            }[] | undefined;
        }>, "many">>;
        assessments: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            title: z.ZodString;
            description: z.ZodString;
            type: z.ZodEnum<["quiz", "practical", "project", "simulation", "essay"]>;
            difficulty: z.ZodEnum<["easy", "medium", "hard"]>;
            timeLimit: z.ZodOptional<z.ZodNumber>;
            passingScore: z.ZodDefault<z.ZodNumber>;
            maxAttempts: z.ZodDefault<z.ZodNumber>;
            questions: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                type: z.ZodEnum<["multiple-choice", "true-false", "fill-blank", "essay", "code", "simulation"]>;
                question: z.ZodString;
                options: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                correctAnswer: z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>;
                explanation: z.ZodOptional<z.ZodString>;
                points: z.ZodDefault<z.ZodNumber>;
                timeLimit: z.ZodOptional<z.ZodNumber>;
                hints: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            }, "strip", z.ZodTypeAny, {
                type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
                id: string;
                question: string;
                correctAnswer: string | string[];
                points: number;
                hints: string[];
                options?: string[] | undefined;
                explanation?: string | undefined;
                timeLimit?: number | undefined;
            }, {
                type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
                id: string;
                question: string;
                correctAnswer: string | string[];
                options?: string[] | undefined;
                explanation?: string | undefined;
                points?: number | undefined;
                timeLimit?: number | undefined;
                hints?: string[] | undefined;
            }>, "many">>;
            practicalTasks: z.ZodOptional<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                title: z.ZodString;
                description: z.ZodString;
                order: z.ZodNumber;
                instructions: z.ZodString;
                expectedOutput: z.ZodOptional<z.ZodString>;
                validationScript: z.ZodOptional<z.ZodString>;
                points: z.ZodDefault<z.ZodNumber>;
                timeLimit: z.ZodOptional<z.ZodNumber>;
                prerequisites: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
                tools: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
                flags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            }, "strip", z.ZodTypeAny, {
                instructions: string;
                id: string;
                points: number;
                title: string;
                description: string;
                order: number;
                prerequisites: string[];
                tools: string[];
                flags: string[];
                timeLimit?: number | undefined;
                expectedOutput?: string | undefined;
                validationScript?: string | undefined;
            }, {
                instructions: string;
                id: string;
                title: string;
                description: string;
                order: number;
                points?: number | undefined;
                timeLimit?: number | undefined;
                prerequisites?: string[] | undefined;
                expectedOutput?: string | undefined;
                validationScript?: string | undefined;
                tools?: string[] | undefined;
                flags?: string[] | undefined;
            }>, "many">>;
            rubric: z.ZodOptional<z.ZodObject<{
                criteria: z.ZodArray<z.ZodObject<{
                    name: z.ZodString;
                    description: z.ZodString;
                    maxPoints: z.ZodNumber;
                    weight: z.ZodNumber;
                }, "strip", z.ZodTypeAny, {
                    description: string;
                    name: string;
                    maxPoints: number;
                    weight: number;
                }, {
                    description: string;
                    name: string;
                    maxPoints: number;
                    weight: number;
                }>, "many">;
            }, "strip", z.ZodTypeAny, {
                criteria: {
                    description: string;
                    name: string;
                    maxPoints: number;
                    weight: number;
                }[];
            }, {
                criteria: {
                    description: string;
                    name: string;
                    maxPoints: number;
                    weight: number;
                }[];
            }>>;
            autoGrading: z.ZodDefault<z.ZodBoolean>;
            order: z.ZodNumber;
            prerequisites: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            createdBy: z.ZodString;
            createdAt: z.ZodDate;
            updatedAt: z.ZodDate;
            metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
        }, "strip", z.ZodTypeAny, {
            type: "simulation" | "quiz" | "practical" | "project" | "essay";
            id: string;
            title: string;
            description: string;
            passingScore: number;
            maxAttempts: number;
            order: number;
            prerequisites: string[];
            tags: string[];
            metadata: Record<string, any>;
            difficulty: "easy" | "medium" | "hard";
            createdBy: string;
            createdAt: Date;
            updatedAt: Date;
            autoGrading: boolean;
            timeLimit?: number | undefined;
            questions?: {
                type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
                id: string;
                question: string;
                correctAnswer: string | string[];
                points: number;
                hints: string[];
                options?: string[] | undefined;
                explanation?: string | undefined;
                timeLimit?: number | undefined;
            }[] | undefined;
            practicalTasks?: {
                instructions: string;
                id: string;
                points: number;
                title: string;
                description: string;
                order: number;
                prerequisites: string[];
                tools: string[];
                flags: string[];
                timeLimit?: number | undefined;
                expectedOutput?: string | undefined;
                validationScript?: string | undefined;
            }[] | undefined;
            rubric?: {
                criteria: {
                    description: string;
                    name: string;
                    maxPoints: number;
                    weight: number;
                }[];
            } | undefined;
        }, {
            type: "simulation" | "quiz" | "practical" | "project" | "essay";
            id: string;
            title: string;
            description: string;
            order: number;
            difficulty: "easy" | "medium" | "hard";
            createdBy: string;
            createdAt: Date;
            updatedAt: Date;
            timeLimit?: number | undefined;
            questions?: {
                type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
                id: string;
                question: string;
                correctAnswer: string | string[];
                options?: string[] | undefined;
                explanation?: string | undefined;
                points?: number | undefined;
                timeLimit?: number | undefined;
                hints?: string[] | undefined;
            }[] | undefined;
            passingScore?: number | undefined;
            maxAttempts?: number | undefined;
            prerequisites?: string[] | undefined;
            tags?: string[] | undefined;
            metadata?: Record<string, any> | undefined;
            practicalTasks?: {
                instructions: string;
                id: string;
                title: string;
                description: string;
                order: number;
                points?: number | undefined;
                timeLimit?: number | undefined;
                prerequisites?: string[] | undefined;
                expectedOutput?: string | undefined;
                validationScript?: string | undefined;
                tools?: string[] | undefined;
                flags?: string[] | undefined;
            }[] | undefined;
            rubric?: {
                criteria: {
                    description: string;
                    name: string;
                    maxPoints: number;
                    weight: number;
                }[];
            } | undefined;
            autoGrading?: boolean | undefined;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        lessons: {
            type: "video" | "article" | "interactive" | "simulation" | "document";
            id: string;
            title: string;
            description: string;
            content: string | {
                type: "simulation" | "diagram" | "code-editor" | "terminal" | "network-map";
                config: Record<string, any>;
                instructions: string;
                data?: any;
            } | {
                videoUrl: string;
                transcript?: string | undefined;
            };
            duration: number;
            order: number;
            prerequisites: string[];
            tags: string[];
            resources: {
                type: "document" | "link" | "tool";
                title: string;
                url: string;
            }[];
            metadata: Record<string, any>;
            quiz?: {
                id: string;
                title: string;
                questions: {
                    type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
                    id: string;
                    question: string;
                    correctAnswer: string | string[];
                    points: number;
                    hints: string[];
                    options?: string[] | undefined;
                    explanation?: string | undefined;
                    timeLimit?: number | undefined;
                }[];
                passingScore: number;
                maxAttempts: number;
                randomizeQuestions: boolean;
                showResults: boolean;
                timeLimit?: number | undefined;
                description?: string | undefined;
            } | undefined;
        }[];
        labs: {
            id: string;
            hints: {
                id: string;
                title: string;
                content: string;
                order: number;
                pointDeduction: number;
            }[];
            title: string;
            description: string;
            maxAttempts: number;
            order: number;
            prerequisites: string[];
            tags: string[];
            metadata: Record<string, any>;
            environment: {
                type: "simulated" | "live" | "sandboxed" | "cloud";
                config: {
                    containers: {
                        name: string;
                        image: string;
                        ports: number[];
                        environment: Record<string, string>;
                        volumes: string[];
                    }[];
                    timeout: number;
                    resources?: {
                        cpu: string;
                        memory: string;
                        storage: string;
                    } | undefined;
                    network?: {
                        isolated: boolean;
                        allowInternet: boolean;
                        customTopology?: any;
                    } | undefined;
                };
                provisioning?: {
                    setupScript?: string | undefined;
                    teardownScript?: string | undefined;
                    healthCheck?: string | undefined;
                } | undefined;
            };
            difficulty: "easy" | "medium" | "hard";
            skillLevel: "beginner" | "intermediate" | "advanced";
            tasks: {
                instructions: string;
                id: string;
                points: number;
                title: string;
                description: string;
                order: number;
                prerequisites: string[];
                tools: string[];
                flags: string[];
                timeLimit?: number | undefined;
                expectedOutput?: string | undefined;
                validationScript?: string | undefined;
            }[];
            solution: string;
            estimatedTime: number;
            learningObjectives: string[];
            references: {
                type: "tool" | "documentation" | "tutorial" | "research";
                title: string;
                url: string;
            }[];
            createdBy: string;
            createdAt: Date;
            updatedAt: Date;
        }[];
        assessments: {
            type: "simulation" | "quiz" | "practical" | "project" | "essay";
            id: string;
            title: string;
            description: string;
            passingScore: number;
            maxAttempts: number;
            order: number;
            prerequisites: string[];
            tags: string[];
            metadata: Record<string, any>;
            difficulty: "easy" | "medium" | "hard";
            createdBy: string;
            createdAt: Date;
            updatedAt: Date;
            autoGrading: boolean;
            timeLimit?: number | undefined;
            questions?: {
                type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
                id: string;
                question: string;
                correctAnswer: string | string[];
                points: number;
                hints: string[];
                options?: string[] | undefined;
                explanation?: string | undefined;
                timeLimit?: number | undefined;
            }[] | undefined;
            practicalTasks?: {
                instructions: string;
                id: string;
                points: number;
                title: string;
                description: string;
                order: number;
                prerequisites: string[];
                tools: string[];
                flags: string[];
                timeLimit?: number | undefined;
                expectedOutput?: string | undefined;
                validationScript?: string | undefined;
            }[] | undefined;
            rubric?: {
                criteria: {
                    description: string;
                    name: string;
                    maxPoints: number;
                    weight: number;
                }[];
            } | undefined;
        }[];
    }, {
        lessons?: {
            type: "video" | "article" | "interactive" | "simulation" | "document";
            id: string;
            title: string;
            description: string;
            content: string | {
                type: "simulation" | "diagram" | "code-editor" | "terminal" | "network-map";
                config: Record<string, any>;
                instructions: string;
                data?: any;
            } | {
                videoUrl: string;
                transcript?: string | undefined;
            };
            duration: number;
            order: number;
            quiz?: {
                id: string;
                title: string;
                questions: {
                    type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
                    id: string;
                    question: string;
                    correctAnswer: string | string[];
                    options?: string[] | undefined;
                    explanation?: string | undefined;
                    points?: number | undefined;
                    timeLimit?: number | undefined;
                    hints?: string[] | undefined;
                }[];
                timeLimit?: number | undefined;
                description?: string | undefined;
                passingScore?: number | undefined;
                maxAttempts?: number | undefined;
                randomizeQuestions?: boolean | undefined;
                showResults?: boolean | undefined;
            } | undefined;
            prerequisites?: string[] | undefined;
            tags?: string[] | undefined;
            resources?: {
                type: "document" | "link" | "tool";
                title: string;
                url: string;
            }[] | undefined;
            metadata?: Record<string, any> | undefined;
        }[] | undefined;
        labs?: {
            id: string;
            title: string;
            description: string;
            order: number;
            environment: {
                type: "simulated" | "live" | "sandboxed" | "cloud";
                config: {
                    resources?: {
                        cpu?: string | undefined;
                        memory?: string | undefined;
                        storage?: string | undefined;
                    } | undefined;
                    containers?: {
                        name: string;
                        image: string;
                        ports?: number[] | undefined;
                        environment?: Record<string, string> | undefined;
                        volumes?: string[] | undefined;
                    }[] | undefined;
                    network?: {
                        isolated?: boolean | undefined;
                        allowInternet?: boolean | undefined;
                        customTopology?: any;
                    } | undefined;
                    timeout?: number | undefined;
                };
                provisioning?: {
                    setupScript?: string | undefined;
                    teardownScript?: string | undefined;
                    healthCheck?: string | undefined;
                } | undefined;
            };
            difficulty: "easy" | "medium" | "hard";
            skillLevel: "beginner" | "intermediate" | "advanced";
            tasks: {
                instructions: string;
                id: string;
                title: string;
                description: string;
                order: number;
                points?: number | undefined;
                timeLimit?: number | undefined;
                prerequisites?: string[] | undefined;
                expectedOutput?: string | undefined;
                validationScript?: string | undefined;
                tools?: string[] | undefined;
                flags?: string[] | undefined;
            }[];
            solution: string;
            estimatedTime: number;
            createdBy: string;
            createdAt: Date;
            updatedAt: Date;
            hints?: {
                id: string;
                title: string;
                content: string;
                order: number;
                pointDeduction?: number | undefined;
            }[] | undefined;
            maxAttempts?: number | undefined;
            prerequisites?: string[] | undefined;
            tags?: string[] | undefined;
            metadata?: Record<string, any> | undefined;
            learningObjectives?: string[] | undefined;
            references?: {
                type: "tool" | "documentation" | "tutorial" | "research";
                title: string;
                url: string;
            }[] | undefined;
        }[] | undefined;
        assessments?: {
            type: "simulation" | "quiz" | "practical" | "project" | "essay";
            id: string;
            title: string;
            description: string;
            order: number;
            difficulty: "easy" | "medium" | "hard";
            createdBy: string;
            createdAt: Date;
            updatedAt: Date;
            timeLimit?: number | undefined;
            questions?: {
                type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
                id: string;
                question: string;
                correctAnswer: string | string[];
                options?: string[] | undefined;
                explanation?: string | undefined;
                points?: number | undefined;
                timeLimit?: number | undefined;
                hints?: string[] | undefined;
            }[] | undefined;
            passingScore?: number | undefined;
            maxAttempts?: number | undefined;
            prerequisites?: string[] | undefined;
            tags?: string[] | undefined;
            metadata?: Record<string, any> | undefined;
            practicalTasks?: {
                instructions: string;
                id: string;
                title: string;
                description: string;
                order: number;
                points?: number | undefined;
                timeLimit?: number | undefined;
                prerequisites?: string[] | undefined;
                expectedOutput?: string | undefined;
                validationScript?: string | undefined;
                tools?: string[] | undefined;
                flags?: string[] | undefined;
            }[] | undefined;
            rubric?: {
                criteria: {
                    description: string;
                    name: string;
                    maxPoints: number;
                    weight: number;
                }[];
            } | undefined;
            autoGrading?: boolean | undefined;
        }[] | undefined;
    }>;
    completionCriteria: z.ZodObject<{
        requiredLessons: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        requiredLabs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        requiredAssessments: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        minimumAssessmentScore: z.ZodDefault<z.ZodNumber>;
        minimumLabScore: z.ZodDefault<z.ZodNumber>;
        requireAllLessons: z.ZodDefault<z.ZodBoolean>;
        requireAllLabs: z.ZodDefault<z.ZodBoolean>;
        requireAllAssessments: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        requiredLessons: string[];
        requiredLabs: string[];
        requiredAssessments: string[];
        minimumAssessmentScore: number;
        minimumLabScore: number;
        requireAllLessons: boolean;
        requireAllLabs: boolean;
        requireAllAssessments: boolean;
    }, {
        requiredLessons?: string[] | undefined;
        requiredLabs?: string[] | undefined;
        requiredAssessments?: string[] | undefined;
        minimumAssessmentScore?: number | undefined;
        minimumLabScore?: number | undefined;
        requireAllLessons?: boolean | undefined;
        requireAllLabs?: boolean | undefined;
        requireAllAssessments?: boolean | undefined;
    }>;
    prerequisites: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    learningObjectives: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    createdBy: z.ZodString;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    title: string;
    description: string;
    content: {
        lessons: {
            type: "video" | "article" | "interactive" | "simulation" | "document";
            id: string;
            title: string;
            description: string;
            content: string | {
                type: "simulation" | "diagram" | "code-editor" | "terminal" | "network-map";
                config: Record<string, any>;
                instructions: string;
                data?: any;
            } | {
                videoUrl: string;
                transcript?: string | undefined;
            };
            duration: number;
            order: number;
            prerequisites: string[];
            tags: string[];
            resources: {
                type: "document" | "link" | "tool";
                title: string;
                url: string;
            }[];
            metadata: Record<string, any>;
            quiz?: {
                id: string;
                title: string;
                questions: {
                    type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
                    id: string;
                    question: string;
                    correctAnswer: string | string[];
                    points: number;
                    hints: string[];
                    options?: string[] | undefined;
                    explanation?: string | undefined;
                    timeLimit?: number | undefined;
                }[];
                passingScore: number;
                maxAttempts: number;
                randomizeQuestions: boolean;
                showResults: boolean;
                timeLimit?: number | undefined;
                description?: string | undefined;
            } | undefined;
        }[];
        labs: {
            id: string;
            hints: {
                id: string;
                title: string;
                content: string;
                order: number;
                pointDeduction: number;
            }[];
            title: string;
            description: string;
            maxAttempts: number;
            order: number;
            prerequisites: string[];
            tags: string[];
            metadata: Record<string, any>;
            environment: {
                type: "simulated" | "live" | "sandboxed" | "cloud";
                config: {
                    containers: {
                        name: string;
                        image: string;
                        ports: number[];
                        environment: Record<string, string>;
                        volumes: string[];
                    }[];
                    timeout: number;
                    resources?: {
                        cpu: string;
                        memory: string;
                        storage: string;
                    } | undefined;
                    network?: {
                        isolated: boolean;
                        allowInternet: boolean;
                        customTopology?: any;
                    } | undefined;
                };
                provisioning?: {
                    setupScript?: string | undefined;
                    teardownScript?: string | undefined;
                    healthCheck?: string | undefined;
                } | undefined;
            };
            difficulty: "easy" | "medium" | "hard";
            skillLevel: "beginner" | "intermediate" | "advanced";
            tasks: {
                instructions: string;
                id: string;
                points: number;
                title: string;
                description: string;
                order: number;
                prerequisites: string[];
                tools: string[];
                flags: string[];
                timeLimit?: number | undefined;
                expectedOutput?: string | undefined;
                validationScript?: string | undefined;
            }[];
            solution: string;
            estimatedTime: number;
            learningObjectives: string[];
            references: {
                type: "tool" | "documentation" | "tutorial" | "research";
                title: string;
                url: string;
            }[];
            createdBy: string;
            createdAt: Date;
            updatedAt: Date;
        }[];
        assessments: {
            type: "simulation" | "quiz" | "practical" | "project" | "essay";
            id: string;
            title: string;
            description: string;
            passingScore: number;
            maxAttempts: number;
            order: number;
            prerequisites: string[];
            tags: string[];
            metadata: Record<string, any>;
            difficulty: "easy" | "medium" | "hard";
            createdBy: string;
            createdAt: Date;
            updatedAt: Date;
            autoGrading: boolean;
            timeLimit?: number | undefined;
            questions?: {
                type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
                id: string;
                question: string;
                correctAnswer: string | string[];
                points: number;
                hints: string[];
                options?: string[] | undefined;
                explanation?: string | undefined;
                timeLimit?: number | undefined;
            }[] | undefined;
            practicalTasks?: {
                instructions: string;
                id: string;
                points: number;
                title: string;
                description: string;
                order: number;
                prerequisites: string[];
                tools: string[];
                flags: string[];
                timeLimit?: number | undefined;
                expectedOutput?: string | undefined;
                validationScript?: string | undefined;
            }[] | undefined;
            rubric?: {
                criteria: {
                    description: string;
                    name: string;
                    maxPoints: number;
                    weight: number;
                }[];
            } | undefined;
        }[];
    };
    order: number;
    prerequisites: string[];
    tags: string[];
    metadata: Record<string, any>;
    skillLevel: "beginner" | "intermediate" | "advanced";
    learningObjectives: string[];
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
    estimatedHours: number;
    completionCriteria: {
        requiredLessons: string[];
        requiredLabs: string[];
        requiredAssessments: string[];
        minimumAssessmentScore: number;
        minimumLabScore: number;
        requireAllLessons: boolean;
        requireAllLabs: boolean;
        requireAllAssessments: boolean;
    };
}, {
    id: string;
    title: string;
    description: string;
    content: {
        lessons?: {
            type: "video" | "article" | "interactive" | "simulation" | "document";
            id: string;
            title: string;
            description: string;
            content: string | {
                type: "simulation" | "diagram" | "code-editor" | "terminal" | "network-map";
                config: Record<string, any>;
                instructions: string;
                data?: any;
            } | {
                videoUrl: string;
                transcript?: string | undefined;
            };
            duration: number;
            order: number;
            quiz?: {
                id: string;
                title: string;
                questions: {
                    type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
                    id: string;
                    question: string;
                    correctAnswer: string | string[];
                    options?: string[] | undefined;
                    explanation?: string | undefined;
                    points?: number | undefined;
                    timeLimit?: number | undefined;
                    hints?: string[] | undefined;
                }[];
                timeLimit?: number | undefined;
                description?: string | undefined;
                passingScore?: number | undefined;
                maxAttempts?: number | undefined;
                randomizeQuestions?: boolean | undefined;
                showResults?: boolean | undefined;
            } | undefined;
            prerequisites?: string[] | undefined;
            tags?: string[] | undefined;
            resources?: {
                type: "document" | "link" | "tool";
                title: string;
                url: string;
            }[] | undefined;
            metadata?: Record<string, any> | undefined;
        }[] | undefined;
        labs?: {
            id: string;
            title: string;
            description: string;
            order: number;
            environment: {
                type: "simulated" | "live" | "sandboxed" | "cloud";
                config: {
                    resources?: {
                        cpu?: string | undefined;
                        memory?: string | undefined;
                        storage?: string | undefined;
                    } | undefined;
                    containers?: {
                        name: string;
                        image: string;
                        ports?: number[] | undefined;
                        environment?: Record<string, string> | undefined;
                        volumes?: string[] | undefined;
                    }[] | undefined;
                    network?: {
                        isolated?: boolean | undefined;
                        allowInternet?: boolean | undefined;
                        customTopology?: any;
                    } | undefined;
                    timeout?: number | undefined;
                };
                provisioning?: {
                    setupScript?: string | undefined;
                    teardownScript?: string | undefined;
                    healthCheck?: string | undefined;
                } | undefined;
            };
            difficulty: "easy" | "medium" | "hard";
            skillLevel: "beginner" | "intermediate" | "advanced";
            tasks: {
                instructions: string;
                id: string;
                title: string;
                description: string;
                order: number;
                points?: number | undefined;
                timeLimit?: number | undefined;
                prerequisites?: string[] | undefined;
                expectedOutput?: string | undefined;
                validationScript?: string | undefined;
                tools?: string[] | undefined;
                flags?: string[] | undefined;
            }[];
            solution: string;
            estimatedTime: number;
            createdBy: string;
            createdAt: Date;
            updatedAt: Date;
            hints?: {
                id: string;
                title: string;
                content: string;
                order: number;
                pointDeduction?: number | undefined;
            }[] | undefined;
            maxAttempts?: number | undefined;
            prerequisites?: string[] | undefined;
            tags?: string[] | undefined;
            metadata?: Record<string, any> | undefined;
            learningObjectives?: string[] | undefined;
            references?: {
                type: "tool" | "documentation" | "tutorial" | "research";
                title: string;
                url: string;
            }[] | undefined;
        }[] | undefined;
        assessments?: {
            type: "simulation" | "quiz" | "practical" | "project" | "essay";
            id: string;
            title: string;
            description: string;
            order: number;
            difficulty: "easy" | "medium" | "hard";
            createdBy: string;
            createdAt: Date;
            updatedAt: Date;
            timeLimit?: number | undefined;
            questions?: {
                type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
                id: string;
                question: string;
                correctAnswer: string | string[];
                options?: string[] | undefined;
                explanation?: string | undefined;
                points?: number | undefined;
                timeLimit?: number | undefined;
                hints?: string[] | undefined;
            }[] | undefined;
            passingScore?: number | undefined;
            maxAttempts?: number | undefined;
            prerequisites?: string[] | undefined;
            tags?: string[] | undefined;
            metadata?: Record<string, any> | undefined;
            practicalTasks?: {
                instructions: string;
                id: string;
                title: string;
                description: string;
                order: number;
                points?: number | undefined;
                timeLimit?: number | undefined;
                prerequisites?: string[] | undefined;
                expectedOutput?: string | undefined;
                validationScript?: string | undefined;
                tools?: string[] | undefined;
                flags?: string[] | undefined;
            }[] | undefined;
            rubric?: {
                criteria: {
                    description: string;
                    name: string;
                    maxPoints: number;
                    weight: number;
                }[];
            } | undefined;
            autoGrading?: boolean | undefined;
        }[] | undefined;
    };
    order: number;
    skillLevel: "beginner" | "intermediate" | "advanced";
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
    estimatedHours: number;
    completionCriteria: {
        requiredLessons?: string[] | undefined;
        requiredLabs?: string[] | undefined;
        requiredAssessments?: string[] | undefined;
        minimumAssessmentScore?: number | undefined;
        minimumLabScore?: number | undefined;
        requireAllLessons?: boolean | undefined;
        requireAllLabs?: boolean | undefined;
        requireAllAssessments?: boolean | undefined;
    };
    prerequisites?: string[] | undefined;
    tags?: string[] | undefined;
    metadata?: Record<string, any> | undefined;
    learningObjectives?: string[] | undefined;
}>;
export type LearningModule = z.infer<typeof LearningModuleSchema>;
export declare const CertificationSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodString;
    issuer: z.ZodString;
    validityPeriod: z.ZodOptional<z.ZodNumber>;
    examRequirements: z.ZodString;
    prerequisites: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    competencies: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        description: z.ZodString;
        weight: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        id: string;
        description: string;
        name: string;
        weight: number;
    }, {
        id: string;
        description: string;
        name: string;
        weight: number;
    }>, "many">>;
    passingCriteria: z.ZodObject<{
        minimumScore: z.ZodDefault<z.ZodNumber>;
        requiredCompetencies: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        timeLimit: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        minimumScore: number;
        requiredCompetencies: string[];
        timeLimit?: number | undefined;
    }, {
        timeLimit?: number | undefined;
        minimumScore?: number | undefined;
        requiredCompetencies?: string[] | undefined;
    }>;
    badgeUrl: z.ZodOptional<z.ZodString>;
    credentialTemplate: z.ZodOptional<z.ZodString>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    description: string;
    prerequisites: string[];
    metadata: Record<string, any>;
    name: string;
    issuer: string;
    examRequirements: string;
    competencies: {
        id: string;
        description: string;
        name: string;
        weight: number;
    }[];
    passingCriteria: {
        minimumScore: number;
        requiredCompetencies: string[];
        timeLimit?: number | undefined;
    };
    validityPeriod?: number | undefined;
    badgeUrl?: string | undefined;
    credentialTemplate?: string | undefined;
}, {
    id: string;
    description: string;
    name: string;
    issuer: string;
    examRequirements: string;
    passingCriteria: {
        timeLimit?: number | undefined;
        minimumScore?: number | undefined;
        requiredCompetencies?: string[] | undefined;
    };
    prerequisites?: string[] | undefined;
    metadata?: Record<string, any> | undefined;
    validityPeriod?: number | undefined;
    competencies?: {
        id: string;
        description: string;
        name: string;
        weight: number;
    }[] | undefined;
    badgeUrl?: string | undefined;
    credentialTemplate?: string | undefined;
}>;
export type Certification = z.infer<typeof CertificationSchema>;
export declare const LearningPathSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    description: z.ZodString;
    skillLevel: z.ZodEnum<["beginner", "intermediate", "advanced"]>;
    estimatedHours: z.ZodNumber;
    modules: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        title: z.ZodString;
        description: z.ZodString;
        order: z.ZodNumber;
        estimatedHours: z.ZodNumber;
        skillLevel: z.ZodEnum<["beginner", "intermediate", "advanced"]>;
        content: z.ZodObject<{
            lessons: z.ZodDefault<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                title: z.ZodString;
                description: z.ZodString;
                type: z.ZodEnum<["video", "article", "interactive", "simulation", "document"]>;
                content: z.ZodUnion<[z.ZodString, z.ZodObject<{
                    videoUrl: z.ZodString;
                    transcript: z.ZodOptional<z.ZodString>;
                }, "strip", z.ZodTypeAny, {
                    videoUrl: string;
                    transcript?: string | undefined;
                }, {
                    videoUrl: string;
                    transcript?: string | undefined;
                }>, z.ZodObject<{
                    type: z.ZodEnum<["simulation", "diagram", "code-editor", "terminal", "network-map"]>;
                    config: z.ZodRecord<z.ZodString, z.ZodAny>;
                    data: z.ZodOptional<z.ZodAny>;
                    instructions: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    type: "simulation" | "diagram" | "code-editor" | "terminal" | "network-map";
                    config: Record<string, any>;
                    instructions: string;
                    data?: any;
                }, {
                    type: "simulation" | "diagram" | "code-editor" | "terminal" | "network-map";
                    config: Record<string, any>;
                    instructions: string;
                    data?: any;
                }>]>;
                duration: z.ZodNumber;
                order: z.ZodNumber;
                quiz: z.ZodOptional<z.ZodObject<{
                    id: z.ZodString;
                    title: z.ZodString;
                    description: z.ZodOptional<z.ZodString>;
                    questions: z.ZodArray<z.ZodObject<{
                        id: z.ZodString;
                        type: z.ZodEnum<["multiple-choice", "true-false", "fill-blank", "essay", "code", "simulation"]>;
                        question: z.ZodString;
                        options: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                        correctAnswer: z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>;
                        explanation: z.ZodOptional<z.ZodString>;
                        points: z.ZodDefault<z.ZodNumber>;
                        timeLimit: z.ZodOptional<z.ZodNumber>;
                        hints: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
                    }, "strip", z.ZodTypeAny, {
                        type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
                        id: string;
                        question: string;
                        correctAnswer: string | string[];
                        points: number;
                        hints: string[];
                        options?: string[] | undefined;
                        explanation?: string | undefined;
                        timeLimit?: number | undefined;
                    }, {
                        type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
                        id: string;
                        question: string;
                        correctAnswer: string | string[];
                        options?: string[] | undefined;
                        explanation?: string | undefined;
                        points?: number | undefined;
                        timeLimit?: number | undefined;
                        hints?: string[] | undefined;
                    }>, "many">;
                    timeLimit: z.ZodOptional<z.ZodNumber>;
                    passingScore: z.ZodDefault<z.ZodNumber>;
                    maxAttempts: z.ZodDefault<z.ZodNumber>;
                    randomizeQuestions: z.ZodDefault<z.ZodBoolean>;
                    showResults: z.ZodDefault<z.ZodBoolean>;
                }, "strip", z.ZodTypeAny, {
                    id: string;
                    title: string;
                    questions: {
                        type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
                        id: string;
                        question: string;
                        correctAnswer: string | string[];
                        points: number;
                        hints: string[];
                        options?: string[] | undefined;
                        explanation?: string | undefined;
                        timeLimit?: number | undefined;
                    }[];
                    passingScore: number;
                    maxAttempts: number;
                    randomizeQuestions: boolean;
                    showResults: boolean;
                    timeLimit?: number | undefined;
                    description?: string | undefined;
                }, {
                    id: string;
                    title: string;
                    questions: {
                        type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
                        id: string;
                        question: string;
                        correctAnswer: string | string[];
                        options?: string[] | undefined;
                        explanation?: string | undefined;
                        points?: number | undefined;
                        timeLimit?: number | undefined;
                        hints?: string[] | undefined;
                    }[];
                    timeLimit?: number | undefined;
                    description?: string | undefined;
                    passingScore?: number | undefined;
                    maxAttempts?: number | undefined;
                    randomizeQuestions?: boolean | undefined;
                    showResults?: boolean | undefined;
                }>>;
                prerequisites: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
                tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
                resources: z.ZodDefault<z.ZodArray<z.ZodObject<{
                    title: z.ZodString;
                    url: z.ZodString;
                    type: z.ZodEnum<["document", "link", "tool"]>;
                }, "strip", z.ZodTypeAny, {
                    type: "document" | "link" | "tool";
                    title: string;
                    url: string;
                }, {
                    type: "document" | "link" | "tool";
                    title: string;
                    url: string;
                }>, "many">>;
                metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
            }, "strip", z.ZodTypeAny, {
                type: "video" | "article" | "interactive" | "simulation" | "document";
                id: string;
                title: string;
                description: string;
                content: string | {
                    type: "simulation" | "diagram" | "code-editor" | "terminal" | "network-map";
                    config: Record<string, any>;
                    instructions: string;
                    data?: any;
                } | {
                    videoUrl: string;
                    transcript?: string | undefined;
                };
                duration: number;
                order: number;
                prerequisites: string[];
                tags: string[];
                resources: {
                    type: "document" | "link" | "tool";
                    title: string;
                    url: string;
                }[];
                metadata: Record<string, any>;
                quiz?: {
                    id: string;
                    title: string;
                    questions: {
                        type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
                        id: string;
                        question: string;
                        correctAnswer: string | string[];
                        points: number;
                        hints: string[];
                        options?: string[] | undefined;
                        explanation?: string | undefined;
                        timeLimit?: number | undefined;
                    }[];
                    passingScore: number;
                    maxAttempts: number;
                    randomizeQuestions: boolean;
                    showResults: boolean;
                    timeLimit?: number | undefined;
                    description?: string | undefined;
                } | undefined;
            }, {
                type: "video" | "article" | "interactive" | "simulation" | "document";
                id: string;
                title: string;
                description: string;
                content: string | {
                    type: "simulation" | "diagram" | "code-editor" | "terminal" | "network-map";
                    config: Record<string, any>;
                    instructions: string;
                    data?: any;
                } | {
                    videoUrl: string;
                    transcript?: string | undefined;
                };
                duration: number;
                order: number;
                quiz?: {
                    id: string;
                    title: string;
                    questions: {
                        type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
                        id: string;
                        question: string;
                        correctAnswer: string | string[];
                        options?: string[] | undefined;
                        explanation?: string | undefined;
                        points?: number | undefined;
                        timeLimit?: number | undefined;
                        hints?: string[] | undefined;
                    }[];
                    timeLimit?: number | undefined;
                    description?: string | undefined;
                    passingScore?: number | undefined;
                    maxAttempts?: number | undefined;
                    randomizeQuestions?: boolean | undefined;
                    showResults?: boolean | undefined;
                } | undefined;
                prerequisites?: string[] | undefined;
                tags?: string[] | undefined;
                resources?: {
                    type: "document" | "link" | "tool";
                    title: string;
                    url: string;
                }[] | undefined;
                metadata?: Record<string, any> | undefined;
            }>, "many">>;
            labs: z.ZodDefault<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                title: z.ZodString;
                description: z.ZodString;
                difficulty: z.ZodEnum<["easy", "medium", "hard"]>;
                skillLevel: z.ZodEnum<["beginner", "intermediate", "advanced"]>;
                environment: z.ZodObject<{
                    type: z.ZodEnum<["simulated", "live", "sandboxed", "cloud"]>;
                    config: z.ZodObject<{
                        containers: z.ZodDefault<z.ZodArray<z.ZodObject<{
                            name: z.ZodString;
                            image: z.ZodString;
                            ports: z.ZodDefault<z.ZodArray<z.ZodNumber, "many">>;
                            environment: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>;
                            volumes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
                        }, "strip", z.ZodTypeAny, {
                            name: string;
                            image: string;
                            ports: number[];
                            environment: Record<string, string>;
                            volumes: string[];
                        }, {
                            name: string;
                            image: string;
                            ports?: number[] | undefined;
                            environment?: Record<string, string> | undefined;
                            volumes?: string[] | undefined;
                        }>, "many">>;
                        network: z.ZodOptional<z.ZodObject<{
                            isolated: z.ZodDefault<z.ZodBoolean>;
                            allowInternet: z.ZodDefault<z.ZodBoolean>;
                            customTopology: z.ZodOptional<z.ZodAny>;
                        }, "strip", z.ZodTypeAny, {
                            isolated: boolean;
                            allowInternet: boolean;
                            customTopology?: any;
                        }, {
                            isolated?: boolean | undefined;
                            allowInternet?: boolean | undefined;
                            customTopology?: any;
                        }>>;
                        resources: z.ZodOptional<z.ZodObject<{
                            cpu: z.ZodDefault<z.ZodString>;
                            memory: z.ZodDefault<z.ZodString>;
                            storage: z.ZodDefault<z.ZodString>;
                        }, "strip", z.ZodTypeAny, {
                            cpu: string;
                            memory: string;
                            storage: string;
                        }, {
                            cpu?: string | undefined;
                            memory?: string | undefined;
                            storage?: string | undefined;
                        }>>;
                        timeout: z.ZodDefault<z.ZodNumber>;
                    }, "strip", z.ZodTypeAny, {
                        containers: {
                            name: string;
                            image: string;
                            ports: number[];
                            environment: Record<string, string>;
                            volumes: string[];
                        }[];
                        timeout: number;
                        resources?: {
                            cpu: string;
                            memory: string;
                            storage: string;
                        } | undefined;
                        network?: {
                            isolated: boolean;
                            allowInternet: boolean;
                            customTopology?: any;
                        } | undefined;
                    }, {
                        resources?: {
                            cpu?: string | undefined;
                            memory?: string | undefined;
                            storage?: string | undefined;
                        } | undefined;
                        containers?: {
                            name: string;
                            image: string;
                            ports?: number[] | undefined;
                            environment?: Record<string, string> | undefined;
                            volumes?: string[] | undefined;
                        }[] | undefined;
                        network?: {
                            isolated?: boolean | undefined;
                            allowInternet?: boolean | undefined;
                            customTopology?: any;
                        } | undefined;
                        timeout?: number | undefined;
                    }>;
                    provisioning: z.ZodOptional<z.ZodObject<{
                        setupScript: z.ZodOptional<z.ZodString>;
                        teardownScript: z.ZodOptional<z.ZodString>;
                        healthCheck: z.ZodOptional<z.ZodString>;
                    }, "strip", z.ZodTypeAny, {
                        setupScript?: string | undefined;
                        teardownScript?: string | undefined;
                        healthCheck?: string | undefined;
                    }, {
                        setupScript?: string | undefined;
                        teardownScript?: string | undefined;
                        healthCheck?: string | undefined;
                    }>>;
                }, "strip", z.ZodTypeAny, {
                    type: "simulated" | "live" | "sandboxed" | "cloud";
                    config: {
                        containers: {
                            name: string;
                            image: string;
                            ports: number[];
                            environment: Record<string, string>;
                            volumes: string[];
                        }[];
                        timeout: number;
                        resources?: {
                            cpu: string;
                            memory: string;
                            storage: string;
                        } | undefined;
                        network?: {
                            isolated: boolean;
                            allowInternet: boolean;
                            customTopology?: any;
                        } | undefined;
                    };
                    provisioning?: {
                        setupScript?: string | undefined;
                        teardownScript?: string | undefined;
                        healthCheck?: string | undefined;
                    } | undefined;
                }, {
                    type: "simulated" | "live" | "sandboxed" | "cloud";
                    config: {
                        resources?: {
                            cpu?: string | undefined;
                            memory?: string | undefined;
                            storage?: string | undefined;
                        } | undefined;
                        containers?: {
                            name: string;
                            image: string;
                            ports?: number[] | undefined;
                            environment?: Record<string, string> | undefined;
                            volumes?: string[] | undefined;
                        }[] | undefined;
                        network?: {
                            isolated?: boolean | undefined;
                            allowInternet?: boolean | undefined;
                            customTopology?: any;
                        } | undefined;
                        timeout?: number | undefined;
                    };
                    provisioning?: {
                        setupScript?: string | undefined;
                        teardownScript?: string | undefined;
                        healthCheck?: string | undefined;
                    } | undefined;
                }>;
                tasks: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    title: z.ZodString;
                    description: z.ZodString;
                    order: z.ZodNumber;
                    instructions: z.ZodString;
                    expectedOutput: z.ZodOptional<z.ZodString>;
                    validationScript: z.ZodOptional<z.ZodString>;
                    points: z.ZodDefault<z.ZodNumber>;
                    timeLimit: z.ZodOptional<z.ZodNumber>;
                    prerequisites: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
                    tools: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
                    flags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
                }, "strip", z.ZodTypeAny, {
                    instructions: string;
                    id: string;
                    points: number;
                    title: string;
                    description: string;
                    order: number;
                    prerequisites: string[];
                    tools: string[];
                    flags: string[];
                    timeLimit?: number | undefined;
                    expectedOutput?: string | undefined;
                    validationScript?: string | undefined;
                }, {
                    instructions: string;
                    id: string;
                    title: string;
                    description: string;
                    order: number;
                    points?: number | undefined;
                    timeLimit?: number | undefined;
                    prerequisites?: string[] | undefined;
                    expectedOutput?: string | undefined;
                    validationScript?: string | undefined;
                    tools?: string[] | undefined;
                    flags?: string[] | undefined;
                }>, "many">;
                hints: z.ZodDefault<z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    order: z.ZodNumber;
                    title: z.ZodString;
                    content: z.ZodString;
                    pointDeduction: z.ZodDefault<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    id: string;
                    title: string;
                    content: string;
                    order: number;
                    pointDeduction: number;
                }, {
                    id: string;
                    title: string;
                    content: string;
                    order: number;
                    pointDeduction?: number | undefined;
                }>, "many">>;
                solution: z.ZodString;
                estimatedTime: z.ZodNumber;
                maxAttempts: z.ZodDefault<z.ZodNumber>;
                order: z.ZodNumber;
                prerequisites: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
                tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
                learningObjectives: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
                references: z.ZodDefault<z.ZodArray<z.ZodObject<{
                    title: z.ZodString;
                    url: z.ZodString;
                    type: z.ZodEnum<["documentation", "tutorial", "tool", "research"]>;
                }, "strip", z.ZodTypeAny, {
                    type: "tool" | "documentation" | "tutorial" | "research";
                    title: string;
                    url: string;
                }, {
                    type: "tool" | "documentation" | "tutorial" | "research";
                    title: string;
                    url: string;
                }>, "many">>;
                createdBy: z.ZodString;
                createdAt: z.ZodDate;
                updatedAt: z.ZodDate;
                metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
            }, "strip", z.ZodTypeAny, {
                id: string;
                hints: {
                    id: string;
                    title: string;
                    content: string;
                    order: number;
                    pointDeduction: number;
                }[];
                title: string;
                description: string;
                maxAttempts: number;
                order: number;
                prerequisites: string[];
                tags: string[];
                metadata: Record<string, any>;
                environment: {
                    type: "simulated" | "live" | "sandboxed" | "cloud";
                    config: {
                        containers: {
                            name: string;
                            image: string;
                            ports: number[];
                            environment: Record<string, string>;
                            volumes: string[];
                        }[];
                        timeout: number;
                        resources?: {
                            cpu: string;
                            memory: string;
                            storage: string;
                        } | undefined;
                        network?: {
                            isolated: boolean;
                            allowInternet: boolean;
                            customTopology?: any;
                        } | undefined;
                    };
                    provisioning?: {
                        setupScript?: string | undefined;
                        teardownScript?: string | undefined;
                        healthCheck?: string | undefined;
                    } | undefined;
                };
                difficulty: "easy" | "medium" | "hard";
                skillLevel: "beginner" | "intermediate" | "advanced";
                tasks: {
                    instructions: string;
                    id: string;
                    points: number;
                    title: string;
                    description: string;
                    order: number;
                    prerequisites: string[];
                    tools: string[];
                    flags: string[];
                    timeLimit?: number | undefined;
                    expectedOutput?: string | undefined;
                    validationScript?: string | undefined;
                }[];
                solution: string;
                estimatedTime: number;
                learningObjectives: string[];
                references: {
                    type: "tool" | "documentation" | "tutorial" | "research";
                    title: string;
                    url: string;
                }[];
                createdBy: string;
                createdAt: Date;
                updatedAt: Date;
            }, {
                id: string;
                title: string;
                description: string;
                order: number;
                environment: {
                    type: "simulated" | "live" | "sandboxed" | "cloud";
                    config: {
                        resources?: {
                            cpu?: string | undefined;
                            memory?: string | undefined;
                            storage?: string | undefined;
                        } | undefined;
                        containers?: {
                            name: string;
                            image: string;
                            ports?: number[] | undefined;
                            environment?: Record<string, string> | undefined;
                            volumes?: string[] | undefined;
                        }[] | undefined;
                        network?: {
                            isolated?: boolean | undefined;
                            allowInternet?: boolean | undefined;
                            customTopology?: any;
                        } | undefined;
                        timeout?: number | undefined;
                    };
                    provisioning?: {
                        setupScript?: string | undefined;
                        teardownScript?: string | undefined;
                        healthCheck?: string | undefined;
                    } | undefined;
                };
                difficulty: "easy" | "medium" | "hard";
                skillLevel: "beginner" | "intermediate" | "advanced";
                tasks: {
                    instructions: string;
                    id: string;
                    title: string;
                    description: string;
                    order: number;
                    points?: number | undefined;
                    timeLimit?: number | undefined;
                    prerequisites?: string[] | undefined;
                    expectedOutput?: string | undefined;
                    validationScript?: string | undefined;
                    tools?: string[] | undefined;
                    flags?: string[] | undefined;
                }[];
                solution: string;
                estimatedTime: number;
                createdBy: string;
                createdAt: Date;
                updatedAt: Date;
                hints?: {
                    id: string;
                    title: string;
                    content: string;
                    order: number;
                    pointDeduction?: number | undefined;
                }[] | undefined;
                maxAttempts?: number | undefined;
                prerequisites?: string[] | undefined;
                tags?: string[] | undefined;
                metadata?: Record<string, any> | undefined;
                learningObjectives?: string[] | undefined;
                references?: {
                    type: "tool" | "documentation" | "tutorial" | "research";
                    title: string;
                    url: string;
                }[] | undefined;
            }>, "many">>;
            assessments: z.ZodDefault<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                title: z.ZodString;
                description: z.ZodString;
                type: z.ZodEnum<["quiz", "practical", "project", "simulation", "essay"]>;
                difficulty: z.ZodEnum<["easy", "medium", "hard"]>;
                timeLimit: z.ZodOptional<z.ZodNumber>;
                passingScore: z.ZodDefault<z.ZodNumber>;
                maxAttempts: z.ZodDefault<z.ZodNumber>;
                questions: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    type: z.ZodEnum<["multiple-choice", "true-false", "fill-blank", "essay", "code", "simulation"]>;
                    question: z.ZodString;
                    options: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                    correctAnswer: z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>;
                    explanation: z.ZodOptional<z.ZodString>;
                    points: z.ZodDefault<z.ZodNumber>;
                    timeLimit: z.ZodOptional<z.ZodNumber>;
                    hints: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
                }, "strip", z.ZodTypeAny, {
                    type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
                    id: string;
                    question: string;
                    correctAnswer: string | string[];
                    points: number;
                    hints: string[];
                    options?: string[] | undefined;
                    explanation?: string | undefined;
                    timeLimit?: number | undefined;
                }, {
                    type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
                    id: string;
                    question: string;
                    correctAnswer: string | string[];
                    options?: string[] | undefined;
                    explanation?: string | undefined;
                    points?: number | undefined;
                    timeLimit?: number | undefined;
                    hints?: string[] | undefined;
                }>, "many">>;
                practicalTasks: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    title: z.ZodString;
                    description: z.ZodString;
                    order: z.ZodNumber;
                    instructions: z.ZodString;
                    expectedOutput: z.ZodOptional<z.ZodString>;
                    validationScript: z.ZodOptional<z.ZodString>;
                    points: z.ZodDefault<z.ZodNumber>;
                    timeLimit: z.ZodOptional<z.ZodNumber>;
                    prerequisites: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
                    tools: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
                    flags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
                }, "strip", z.ZodTypeAny, {
                    instructions: string;
                    id: string;
                    points: number;
                    title: string;
                    description: string;
                    order: number;
                    prerequisites: string[];
                    tools: string[];
                    flags: string[];
                    timeLimit?: number | undefined;
                    expectedOutput?: string | undefined;
                    validationScript?: string | undefined;
                }, {
                    instructions: string;
                    id: string;
                    title: string;
                    description: string;
                    order: number;
                    points?: number | undefined;
                    timeLimit?: number | undefined;
                    prerequisites?: string[] | undefined;
                    expectedOutput?: string | undefined;
                    validationScript?: string | undefined;
                    tools?: string[] | undefined;
                    flags?: string[] | undefined;
                }>, "many">>;
                rubric: z.ZodOptional<z.ZodObject<{
                    criteria: z.ZodArray<z.ZodObject<{
                        name: z.ZodString;
                        description: z.ZodString;
                        maxPoints: z.ZodNumber;
                        weight: z.ZodNumber;
                    }, "strip", z.ZodTypeAny, {
                        description: string;
                        name: string;
                        maxPoints: number;
                        weight: number;
                    }, {
                        description: string;
                        name: string;
                        maxPoints: number;
                        weight: number;
                    }>, "many">;
                }, "strip", z.ZodTypeAny, {
                    criteria: {
                        description: string;
                        name: string;
                        maxPoints: number;
                        weight: number;
                    }[];
                }, {
                    criteria: {
                        description: string;
                        name: string;
                        maxPoints: number;
                        weight: number;
                    }[];
                }>>;
                autoGrading: z.ZodDefault<z.ZodBoolean>;
                order: z.ZodNumber;
                prerequisites: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
                tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
                createdBy: z.ZodString;
                createdAt: z.ZodDate;
                updatedAt: z.ZodDate;
                metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
            }, "strip", z.ZodTypeAny, {
                type: "simulation" | "quiz" | "practical" | "project" | "essay";
                id: string;
                title: string;
                description: string;
                passingScore: number;
                maxAttempts: number;
                order: number;
                prerequisites: string[];
                tags: string[];
                metadata: Record<string, any>;
                difficulty: "easy" | "medium" | "hard";
                createdBy: string;
                createdAt: Date;
                updatedAt: Date;
                autoGrading: boolean;
                timeLimit?: number | undefined;
                questions?: {
                    type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
                    id: string;
                    question: string;
                    correctAnswer: string | string[];
                    points: number;
                    hints: string[];
                    options?: string[] | undefined;
                    explanation?: string | undefined;
                    timeLimit?: number | undefined;
                }[] | undefined;
                practicalTasks?: {
                    instructions: string;
                    id: string;
                    points: number;
                    title: string;
                    description: string;
                    order: number;
                    prerequisites: string[];
                    tools: string[];
                    flags: string[];
                    timeLimit?: number | undefined;
                    expectedOutput?: string | undefined;
                    validationScript?: string | undefined;
                }[] | undefined;
                rubric?: {
                    criteria: {
                        description: string;
                        name: string;
                        maxPoints: number;
                        weight: number;
                    }[];
                } | undefined;
            }, {
                type: "simulation" | "quiz" | "practical" | "project" | "essay";
                id: string;
                title: string;
                description: string;
                order: number;
                difficulty: "easy" | "medium" | "hard";
                createdBy: string;
                createdAt: Date;
                updatedAt: Date;
                timeLimit?: number | undefined;
                questions?: {
                    type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
                    id: string;
                    question: string;
                    correctAnswer: string | string[];
                    options?: string[] | undefined;
                    explanation?: string | undefined;
                    points?: number | undefined;
                    timeLimit?: number | undefined;
                    hints?: string[] | undefined;
                }[] | undefined;
                passingScore?: number | undefined;
                maxAttempts?: number | undefined;
                prerequisites?: string[] | undefined;
                tags?: string[] | undefined;
                metadata?: Record<string, any> | undefined;
                practicalTasks?: {
                    instructions: string;
                    id: string;
                    title: string;
                    description: string;
                    order: number;
                    points?: number | undefined;
                    timeLimit?: number | undefined;
                    prerequisites?: string[] | undefined;
                    expectedOutput?: string | undefined;
                    validationScript?: string | undefined;
                    tools?: string[] | undefined;
                    flags?: string[] | undefined;
                }[] | undefined;
                rubric?: {
                    criteria: {
                        description: string;
                        name: string;
                        maxPoints: number;
                        weight: number;
                    }[];
                } | undefined;
                autoGrading?: boolean | undefined;
            }>, "many">>;
        }, "strip", z.ZodTypeAny, {
            lessons: {
                type: "video" | "article" | "interactive" | "simulation" | "document";
                id: string;
                title: string;
                description: string;
                content: string | {
                    type: "simulation" | "diagram" | "code-editor" | "terminal" | "network-map";
                    config: Record<string, any>;
                    instructions: string;
                    data?: any;
                } | {
                    videoUrl: string;
                    transcript?: string | undefined;
                };
                duration: number;
                order: number;
                prerequisites: string[];
                tags: string[];
                resources: {
                    type: "document" | "link" | "tool";
                    title: string;
                    url: string;
                }[];
                metadata: Record<string, any>;
                quiz?: {
                    id: string;
                    title: string;
                    questions: {
                        type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
                        id: string;
                        question: string;
                        correctAnswer: string | string[];
                        points: number;
                        hints: string[];
                        options?: string[] | undefined;
                        explanation?: string | undefined;
                        timeLimit?: number | undefined;
                    }[];
                    passingScore: number;
                    maxAttempts: number;
                    randomizeQuestions: boolean;
                    showResults: boolean;
                    timeLimit?: number | undefined;
                    description?: string | undefined;
                } | undefined;
            }[];
            labs: {
                id: string;
                hints: {
                    id: string;
                    title: string;
                    content: string;
                    order: number;
                    pointDeduction: number;
                }[];
                title: string;
                description: string;
                maxAttempts: number;
                order: number;
                prerequisites: string[];
                tags: string[];
                metadata: Record<string, any>;
                environment: {
                    type: "simulated" | "live" | "sandboxed" | "cloud";
                    config: {
                        containers: {
                            name: string;
                            image: string;
                            ports: number[];
                            environment: Record<string, string>;
                            volumes: string[];
                        }[];
                        timeout: number;
                        resources?: {
                            cpu: string;
                            memory: string;
                            storage: string;
                        } | undefined;
                        network?: {
                            isolated: boolean;
                            allowInternet: boolean;
                            customTopology?: any;
                        } | undefined;
                    };
                    provisioning?: {
                        setupScript?: string | undefined;
                        teardownScript?: string | undefined;
                        healthCheck?: string | undefined;
                    } | undefined;
                };
                difficulty: "easy" | "medium" | "hard";
                skillLevel: "beginner" | "intermediate" | "advanced";
                tasks: {
                    instructions: string;
                    id: string;
                    points: number;
                    title: string;
                    description: string;
                    order: number;
                    prerequisites: string[];
                    tools: string[];
                    flags: string[];
                    timeLimit?: number | undefined;
                    expectedOutput?: string | undefined;
                    validationScript?: string | undefined;
                }[];
                solution: string;
                estimatedTime: number;
                learningObjectives: string[];
                references: {
                    type: "tool" | "documentation" | "tutorial" | "research";
                    title: string;
                    url: string;
                }[];
                createdBy: string;
                createdAt: Date;
                updatedAt: Date;
            }[];
            assessments: {
                type: "simulation" | "quiz" | "practical" | "project" | "essay";
                id: string;
                title: string;
                description: string;
                passingScore: number;
                maxAttempts: number;
                order: number;
                prerequisites: string[];
                tags: string[];
                metadata: Record<string, any>;
                difficulty: "easy" | "medium" | "hard";
                createdBy: string;
                createdAt: Date;
                updatedAt: Date;
                autoGrading: boolean;
                timeLimit?: number | undefined;
                questions?: {
                    type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
                    id: string;
                    question: string;
                    correctAnswer: string | string[];
                    points: number;
                    hints: string[];
                    options?: string[] | undefined;
                    explanation?: string | undefined;
                    timeLimit?: number | undefined;
                }[] | undefined;
                practicalTasks?: {
                    instructions: string;
                    id: string;
                    points: number;
                    title: string;
                    description: string;
                    order: number;
                    prerequisites: string[];
                    tools: string[];
                    flags: string[];
                    timeLimit?: number | undefined;
                    expectedOutput?: string | undefined;
                    validationScript?: string | undefined;
                }[] | undefined;
                rubric?: {
                    criteria: {
                        description: string;
                        name: string;
                        maxPoints: number;
                        weight: number;
                    }[];
                } | undefined;
            }[];
        }, {
            lessons?: {
                type: "video" | "article" | "interactive" | "simulation" | "document";
                id: string;
                title: string;
                description: string;
                content: string | {
                    type: "simulation" | "diagram" | "code-editor" | "terminal" | "network-map";
                    config: Record<string, any>;
                    instructions: string;
                    data?: any;
                } | {
                    videoUrl: string;
                    transcript?: string | undefined;
                };
                duration: number;
                order: number;
                quiz?: {
                    id: string;
                    title: string;
                    questions: {
                        type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
                        id: string;
                        question: string;
                        correctAnswer: string | string[];
                        options?: string[] | undefined;
                        explanation?: string | undefined;
                        points?: number | undefined;
                        timeLimit?: number | undefined;
                        hints?: string[] | undefined;
                    }[];
                    timeLimit?: number | undefined;
                    description?: string | undefined;
                    passingScore?: number | undefined;
                    maxAttempts?: number | undefined;
                    randomizeQuestions?: boolean | undefined;
                    showResults?: boolean | undefined;
                } | undefined;
                prerequisites?: string[] | undefined;
                tags?: string[] | undefined;
                resources?: {
                    type: "document" | "link" | "tool";
                    title: string;
                    url: string;
                }[] | undefined;
                metadata?: Record<string, any> | undefined;
            }[] | undefined;
            labs?: {
                id: string;
                title: string;
                description: string;
                order: number;
                environment: {
                    type: "simulated" | "live" | "sandboxed" | "cloud";
                    config: {
                        resources?: {
                            cpu?: string | undefined;
                            memory?: string | undefined;
                            storage?: string | undefined;
                        } | undefined;
                        containers?: {
                            name: string;
                            image: string;
                            ports?: number[] | undefined;
                            environment?: Record<string, string> | undefined;
                            volumes?: string[] | undefined;
                        }[] | undefined;
                        network?: {
                            isolated?: boolean | undefined;
                            allowInternet?: boolean | undefined;
                            customTopology?: any;
                        } | undefined;
                        timeout?: number | undefined;
                    };
                    provisioning?: {
                        setupScript?: string | undefined;
                        teardownScript?: string | undefined;
                        healthCheck?: string | undefined;
                    } | undefined;
                };
                difficulty: "easy" | "medium" | "hard";
                skillLevel: "beginner" | "intermediate" | "advanced";
                tasks: {
                    instructions: string;
                    id: string;
                    title: string;
                    description: string;
                    order: number;
                    points?: number | undefined;
                    timeLimit?: number | undefined;
                    prerequisites?: string[] | undefined;
                    expectedOutput?: string | undefined;
                    validationScript?: string | undefined;
                    tools?: string[] | undefined;
                    flags?: string[] | undefined;
                }[];
                solution: string;
                estimatedTime: number;
                createdBy: string;
                createdAt: Date;
                updatedAt: Date;
                hints?: {
                    id: string;
                    title: string;
                    content: string;
                    order: number;
                    pointDeduction?: number | undefined;
                }[] | undefined;
                maxAttempts?: number | undefined;
                prerequisites?: string[] | undefined;
                tags?: string[] | undefined;
                metadata?: Record<string, any> | undefined;
                learningObjectives?: string[] | undefined;
                references?: {
                    type: "tool" | "documentation" | "tutorial" | "research";
                    title: string;
                    url: string;
                }[] | undefined;
            }[] | undefined;
            assessments?: {
                type: "simulation" | "quiz" | "practical" | "project" | "essay";
                id: string;
                title: string;
                description: string;
                order: number;
                difficulty: "easy" | "medium" | "hard";
                createdBy: string;
                createdAt: Date;
                updatedAt: Date;
                timeLimit?: number | undefined;
                questions?: {
                    type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
                    id: string;
                    question: string;
                    correctAnswer: string | string[];
                    options?: string[] | undefined;
                    explanation?: string | undefined;
                    points?: number | undefined;
                    timeLimit?: number | undefined;
                    hints?: string[] | undefined;
                }[] | undefined;
                passingScore?: number | undefined;
                maxAttempts?: number | undefined;
                prerequisites?: string[] | undefined;
                tags?: string[] | undefined;
                metadata?: Record<string, any> | undefined;
                practicalTasks?: {
                    instructions: string;
                    id: string;
                    title: string;
                    description: string;
                    order: number;
                    points?: number | undefined;
                    timeLimit?: number | undefined;
                    prerequisites?: string[] | undefined;
                    expectedOutput?: string | undefined;
                    validationScript?: string | undefined;
                    tools?: string[] | undefined;
                    flags?: string[] | undefined;
                }[] | undefined;
                rubric?: {
                    criteria: {
                        description: string;
                        name: string;
                        maxPoints: number;
                        weight: number;
                    }[];
                } | undefined;
                autoGrading?: boolean | undefined;
            }[] | undefined;
        }>;
        completionCriteria: z.ZodObject<{
            requiredLessons: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            requiredLabs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            requiredAssessments: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            minimumAssessmentScore: z.ZodDefault<z.ZodNumber>;
            minimumLabScore: z.ZodDefault<z.ZodNumber>;
            requireAllLessons: z.ZodDefault<z.ZodBoolean>;
            requireAllLabs: z.ZodDefault<z.ZodBoolean>;
            requireAllAssessments: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            requiredLessons: string[];
            requiredLabs: string[];
            requiredAssessments: string[];
            minimumAssessmentScore: number;
            minimumLabScore: number;
            requireAllLessons: boolean;
            requireAllLabs: boolean;
            requireAllAssessments: boolean;
        }, {
            requiredLessons?: string[] | undefined;
            requiredLabs?: string[] | undefined;
            requiredAssessments?: string[] | undefined;
            minimumAssessmentScore?: number | undefined;
            minimumLabScore?: number | undefined;
            requireAllLessons?: boolean | undefined;
            requireAllLabs?: boolean | undefined;
            requireAllAssessments?: boolean | undefined;
        }>;
        prerequisites: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        learningObjectives: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        createdBy: z.ZodString;
        createdAt: z.ZodDate;
        updatedAt: z.ZodDate;
        metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        title: string;
        description: string;
        content: {
            lessons: {
                type: "video" | "article" | "interactive" | "simulation" | "document";
                id: string;
                title: string;
                description: string;
                content: string | {
                    type: "simulation" | "diagram" | "code-editor" | "terminal" | "network-map";
                    config: Record<string, any>;
                    instructions: string;
                    data?: any;
                } | {
                    videoUrl: string;
                    transcript?: string | undefined;
                };
                duration: number;
                order: number;
                prerequisites: string[];
                tags: string[];
                resources: {
                    type: "document" | "link" | "tool";
                    title: string;
                    url: string;
                }[];
                metadata: Record<string, any>;
                quiz?: {
                    id: string;
                    title: string;
                    questions: {
                        type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
                        id: string;
                        question: string;
                        correctAnswer: string | string[];
                        points: number;
                        hints: string[];
                        options?: string[] | undefined;
                        explanation?: string | undefined;
                        timeLimit?: number | undefined;
                    }[];
                    passingScore: number;
                    maxAttempts: number;
                    randomizeQuestions: boolean;
                    showResults: boolean;
                    timeLimit?: number | undefined;
                    description?: string | undefined;
                } | undefined;
            }[];
            labs: {
                id: string;
                hints: {
                    id: string;
                    title: string;
                    content: string;
                    order: number;
                    pointDeduction: number;
                }[];
                title: string;
                description: string;
                maxAttempts: number;
                order: number;
                prerequisites: string[];
                tags: string[];
                metadata: Record<string, any>;
                environment: {
                    type: "simulated" | "live" | "sandboxed" | "cloud";
                    config: {
                        containers: {
                            name: string;
                            image: string;
                            ports: number[];
                            environment: Record<string, string>;
                            volumes: string[];
                        }[];
                        timeout: number;
                        resources?: {
                            cpu: string;
                            memory: string;
                            storage: string;
                        } | undefined;
                        network?: {
                            isolated: boolean;
                            allowInternet: boolean;
                            customTopology?: any;
                        } | undefined;
                    };
                    provisioning?: {
                        setupScript?: string | undefined;
                        teardownScript?: string | undefined;
                        healthCheck?: string | undefined;
                    } | undefined;
                };
                difficulty: "easy" | "medium" | "hard";
                skillLevel: "beginner" | "intermediate" | "advanced";
                tasks: {
                    instructions: string;
                    id: string;
                    points: number;
                    title: string;
                    description: string;
                    order: number;
                    prerequisites: string[];
                    tools: string[];
                    flags: string[];
                    timeLimit?: number | undefined;
                    expectedOutput?: string | undefined;
                    validationScript?: string | undefined;
                }[];
                solution: string;
                estimatedTime: number;
                learningObjectives: string[];
                references: {
                    type: "tool" | "documentation" | "tutorial" | "research";
                    title: string;
                    url: string;
                }[];
                createdBy: string;
                createdAt: Date;
                updatedAt: Date;
            }[];
            assessments: {
                type: "simulation" | "quiz" | "practical" | "project" | "essay";
                id: string;
                title: string;
                description: string;
                passingScore: number;
                maxAttempts: number;
                order: number;
                prerequisites: string[];
                tags: string[];
                metadata: Record<string, any>;
                difficulty: "easy" | "medium" | "hard";
                createdBy: string;
                createdAt: Date;
                updatedAt: Date;
                autoGrading: boolean;
                timeLimit?: number | undefined;
                questions?: {
                    type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
                    id: string;
                    question: string;
                    correctAnswer: string | string[];
                    points: number;
                    hints: string[];
                    options?: string[] | undefined;
                    explanation?: string | undefined;
                    timeLimit?: number | undefined;
                }[] | undefined;
                practicalTasks?: {
                    instructions: string;
                    id: string;
                    points: number;
                    title: string;
                    description: string;
                    order: number;
                    prerequisites: string[];
                    tools: string[];
                    flags: string[];
                    timeLimit?: number | undefined;
                    expectedOutput?: string | undefined;
                    validationScript?: string | undefined;
                }[] | undefined;
                rubric?: {
                    criteria: {
                        description: string;
                        name: string;
                        maxPoints: number;
                        weight: number;
                    }[];
                } | undefined;
            }[];
        };
        order: number;
        prerequisites: string[];
        tags: string[];
        metadata: Record<string, any>;
        skillLevel: "beginner" | "intermediate" | "advanced";
        learningObjectives: string[];
        createdBy: string;
        createdAt: Date;
        updatedAt: Date;
        estimatedHours: number;
        completionCriteria: {
            requiredLessons: string[];
            requiredLabs: string[];
            requiredAssessments: string[];
            minimumAssessmentScore: number;
            minimumLabScore: number;
            requireAllLessons: boolean;
            requireAllLabs: boolean;
            requireAllAssessments: boolean;
        };
    }, {
        id: string;
        title: string;
        description: string;
        content: {
            lessons?: {
                type: "video" | "article" | "interactive" | "simulation" | "document";
                id: string;
                title: string;
                description: string;
                content: string | {
                    type: "simulation" | "diagram" | "code-editor" | "terminal" | "network-map";
                    config: Record<string, any>;
                    instructions: string;
                    data?: any;
                } | {
                    videoUrl: string;
                    transcript?: string | undefined;
                };
                duration: number;
                order: number;
                quiz?: {
                    id: string;
                    title: string;
                    questions: {
                        type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
                        id: string;
                        question: string;
                        correctAnswer: string | string[];
                        options?: string[] | undefined;
                        explanation?: string | undefined;
                        points?: number | undefined;
                        timeLimit?: number | undefined;
                        hints?: string[] | undefined;
                    }[];
                    timeLimit?: number | undefined;
                    description?: string | undefined;
                    passingScore?: number | undefined;
                    maxAttempts?: number | undefined;
                    randomizeQuestions?: boolean | undefined;
                    showResults?: boolean | undefined;
                } | undefined;
                prerequisites?: string[] | undefined;
                tags?: string[] | undefined;
                resources?: {
                    type: "document" | "link" | "tool";
                    title: string;
                    url: string;
                }[] | undefined;
                metadata?: Record<string, any> | undefined;
            }[] | undefined;
            labs?: {
                id: string;
                title: string;
                description: string;
                order: number;
                environment: {
                    type: "simulated" | "live" | "sandboxed" | "cloud";
                    config: {
                        resources?: {
                            cpu?: string | undefined;
                            memory?: string | undefined;
                            storage?: string | undefined;
                        } | undefined;
                        containers?: {
                            name: string;
                            image: string;
                            ports?: number[] | undefined;
                            environment?: Record<string, string> | undefined;
                            volumes?: string[] | undefined;
                        }[] | undefined;
                        network?: {
                            isolated?: boolean | undefined;
                            allowInternet?: boolean | undefined;
                            customTopology?: any;
                        } | undefined;
                        timeout?: number | undefined;
                    };
                    provisioning?: {
                        setupScript?: string | undefined;
                        teardownScript?: string | undefined;
                        healthCheck?: string | undefined;
                    } | undefined;
                };
                difficulty: "easy" | "medium" | "hard";
                skillLevel: "beginner" | "intermediate" | "advanced";
                tasks: {
                    instructions: string;
                    id: string;
                    title: string;
                    description: string;
                    order: number;
                    points?: number | undefined;
                    timeLimit?: number | undefined;
                    prerequisites?: string[] | undefined;
                    expectedOutput?: string | undefined;
                    validationScript?: string | undefined;
                    tools?: string[] | undefined;
                    flags?: string[] | undefined;
                }[];
                solution: string;
                estimatedTime: number;
                createdBy: string;
                createdAt: Date;
                updatedAt: Date;
                hints?: {
                    id: string;
                    title: string;
                    content: string;
                    order: number;
                    pointDeduction?: number | undefined;
                }[] | undefined;
                maxAttempts?: number | undefined;
                prerequisites?: string[] | undefined;
                tags?: string[] | undefined;
                metadata?: Record<string, any> | undefined;
                learningObjectives?: string[] | undefined;
                references?: {
                    type: "tool" | "documentation" | "tutorial" | "research";
                    title: string;
                    url: string;
                }[] | undefined;
            }[] | undefined;
            assessments?: {
                type: "simulation" | "quiz" | "practical" | "project" | "essay";
                id: string;
                title: string;
                description: string;
                order: number;
                difficulty: "easy" | "medium" | "hard";
                createdBy: string;
                createdAt: Date;
                updatedAt: Date;
                timeLimit?: number | undefined;
                questions?: {
                    type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
                    id: string;
                    question: string;
                    correctAnswer: string | string[];
                    options?: string[] | undefined;
                    explanation?: string | undefined;
                    points?: number | undefined;
                    timeLimit?: number | undefined;
                    hints?: string[] | undefined;
                }[] | undefined;
                passingScore?: number | undefined;
                maxAttempts?: number | undefined;
                prerequisites?: string[] | undefined;
                tags?: string[] | undefined;
                metadata?: Record<string, any> | undefined;
                practicalTasks?: {
                    instructions: string;
                    id: string;
                    title: string;
                    description: string;
                    order: number;
                    points?: number | undefined;
                    timeLimit?: number | undefined;
                    prerequisites?: string[] | undefined;
                    expectedOutput?: string | undefined;
                    validationScript?: string | undefined;
                    tools?: string[] | undefined;
                    flags?: string[] | undefined;
                }[] | undefined;
                rubric?: {
                    criteria: {
                        description: string;
                        name: string;
                        maxPoints: number;
                        weight: number;
                    }[];
                } | undefined;
                autoGrading?: boolean | undefined;
            }[] | undefined;
        };
        order: number;
        skillLevel: "beginner" | "intermediate" | "advanced";
        createdBy: string;
        createdAt: Date;
        updatedAt: Date;
        estimatedHours: number;
        completionCriteria: {
            requiredLessons?: string[] | undefined;
            requiredLabs?: string[] | undefined;
            requiredAssessments?: string[] | undefined;
            minimumAssessmentScore?: number | undefined;
            minimumLabScore?: number | undefined;
            requireAllLessons?: boolean | undefined;
            requireAllLabs?: boolean | undefined;
            requireAllAssessments?: boolean | undefined;
        };
        prerequisites?: string[] | undefined;
        tags?: string[] | undefined;
        metadata?: Record<string, any> | undefined;
        learningObjectives?: string[] | undefined;
    }>, "many">;
    prerequisites: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    certification: z.ZodOptional<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        description: z.ZodString;
        issuer: z.ZodString;
        validityPeriod: z.ZodOptional<z.ZodNumber>;
        examRequirements: z.ZodString;
        prerequisites: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        competencies: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            description: z.ZodString;
            weight: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            id: string;
            description: string;
            name: string;
            weight: number;
        }, {
            id: string;
            description: string;
            name: string;
            weight: number;
        }>, "many">>;
        passingCriteria: z.ZodObject<{
            minimumScore: z.ZodDefault<z.ZodNumber>;
            requiredCompetencies: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            timeLimit: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            minimumScore: number;
            requiredCompetencies: string[];
            timeLimit?: number | undefined;
        }, {
            timeLimit?: number | undefined;
            minimumScore?: number | undefined;
            requiredCompetencies?: string[] | undefined;
        }>;
        badgeUrl: z.ZodOptional<z.ZodString>;
        credentialTemplate: z.ZodOptional<z.ZodString>;
        metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        description: string;
        prerequisites: string[];
        metadata: Record<string, any>;
        name: string;
        issuer: string;
        examRequirements: string;
        competencies: {
            id: string;
            description: string;
            name: string;
            weight: number;
        }[];
        passingCriteria: {
            minimumScore: number;
            requiredCompetencies: string[];
            timeLimit?: number | undefined;
        };
        validityPeriod?: number | undefined;
        badgeUrl?: string | undefined;
        credentialTemplate?: string | undefined;
    }, {
        id: string;
        description: string;
        name: string;
        issuer: string;
        examRequirements: string;
        passingCriteria: {
            timeLimit?: number | undefined;
            minimumScore?: number | undefined;
            requiredCompetencies?: string[] | undefined;
        };
        prerequisites?: string[] | undefined;
        metadata?: Record<string, any> | undefined;
        validityPeriod?: number | undefined;
        competencies?: {
            id: string;
            description: string;
            name: string;
            weight: number;
        }[] | undefined;
        badgeUrl?: string | undefined;
        credentialTemplate?: string | undefined;
    }>>;
    tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    category: z.ZodString;
    difficulty: z.ZodEnum<["easy", "medium", "hard"]>;
    learningObjectives: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    targetAudience: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    industry: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    trending: z.ZodDefault<z.ZodBoolean>;
    featured: z.ZodDefault<z.ZodBoolean>;
    price: z.ZodDefault<z.ZodNumber>;
    enrollmentLimit: z.ZodOptional<z.ZodNumber>;
    startDate: z.ZodOptional<z.ZodDate>;
    endDate: z.ZodOptional<z.ZodDate>;
    instructors: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    createdBy: z.ZodString;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    title: string;
    description: string;
    prerequisites: string[];
    tags: string[];
    metadata: Record<string, any>;
    difficulty: "easy" | "medium" | "hard";
    skillLevel: "beginner" | "intermediate" | "advanced";
    learningObjectives: string[];
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
    estimatedHours: number;
    modules: {
        id: string;
        title: string;
        description: string;
        content: {
            lessons: {
                type: "video" | "article" | "interactive" | "simulation" | "document";
                id: string;
                title: string;
                description: string;
                content: string | {
                    type: "simulation" | "diagram" | "code-editor" | "terminal" | "network-map";
                    config: Record<string, any>;
                    instructions: string;
                    data?: any;
                } | {
                    videoUrl: string;
                    transcript?: string | undefined;
                };
                duration: number;
                order: number;
                prerequisites: string[];
                tags: string[];
                resources: {
                    type: "document" | "link" | "tool";
                    title: string;
                    url: string;
                }[];
                metadata: Record<string, any>;
                quiz?: {
                    id: string;
                    title: string;
                    questions: {
                        type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
                        id: string;
                        question: string;
                        correctAnswer: string | string[];
                        points: number;
                        hints: string[];
                        options?: string[] | undefined;
                        explanation?: string | undefined;
                        timeLimit?: number | undefined;
                    }[];
                    passingScore: number;
                    maxAttempts: number;
                    randomizeQuestions: boolean;
                    showResults: boolean;
                    timeLimit?: number | undefined;
                    description?: string | undefined;
                } | undefined;
            }[];
            labs: {
                id: string;
                hints: {
                    id: string;
                    title: string;
                    content: string;
                    order: number;
                    pointDeduction: number;
                }[];
                title: string;
                description: string;
                maxAttempts: number;
                order: number;
                prerequisites: string[];
                tags: string[];
                metadata: Record<string, any>;
                environment: {
                    type: "simulated" | "live" | "sandboxed" | "cloud";
                    config: {
                        containers: {
                            name: string;
                            image: string;
                            ports: number[];
                            environment: Record<string, string>;
                            volumes: string[];
                        }[];
                        timeout: number;
                        resources?: {
                            cpu: string;
                            memory: string;
                            storage: string;
                        } | undefined;
                        network?: {
                            isolated: boolean;
                            allowInternet: boolean;
                            customTopology?: any;
                        } | undefined;
                    };
                    provisioning?: {
                        setupScript?: string | undefined;
                        teardownScript?: string | undefined;
                        healthCheck?: string | undefined;
                    } | undefined;
                };
                difficulty: "easy" | "medium" | "hard";
                skillLevel: "beginner" | "intermediate" | "advanced";
                tasks: {
                    instructions: string;
                    id: string;
                    points: number;
                    title: string;
                    description: string;
                    order: number;
                    prerequisites: string[];
                    tools: string[];
                    flags: string[];
                    timeLimit?: number | undefined;
                    expectedOutput?: string | undefined;
                    validationScript?: string | undefined;
                }[];
                solution: string;
                estimatedTime: number;
                learningObjectives: string[];
                references: {
                    type: "tool" | "documentation" | "tutorial" | "research";
                    title: string;
                    url: string;
                }[];
                createdBy: string;
                createdAt: Date;
                updatedAt: Date;
            }[];
            assessments: {
                type: "simulation" | "quiz" | "practical" | "project" | "essay";
                id: string;
                title: string;
                description: string;
                passingScore: number;
                maxAttempts: number;
                order: number;
                prerequisites: string[];
                tags: string[];
                metadata: Record<string, any>;
                difficulty: "easy" | "medium" | "hard";
                createdBy: string;
                createdAt: Date;
                updatedAt: Date;
                autoGrading: boolean;
                timeLimit?: number | undefined;
                questions?: {
                    type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
                    id: string;
                    question: string;
                    correctAnswer: string | string[];
                    points: number;
                    hints: string[];
                    options?: string[] | undefined;
                    explanation?: string | undefined;
                    timeLimit?: number | undefined;
                }[] | undefined;
                practicalTasks?: {
                    instructions: string;
                    id: string;
                    points: number;
                    title: string;
                    description: string;
                    order: number;
                    prerequisites: string[];
                    tools: string[];
                    flags: string[];
                    timeLimit?: number | undefined;
                    expectedOutput?: string | undefined;
                    validationScript?: string | undefined;
                }[] | undefined;
                rubric?: {
                    criteria: {
                        description: string;
                        name: string;
                        maxPoints: number;
                        weight: number;
                    }[];
                } | undefined;
            }[];
        };
        order: number;
        prerequisites: string[];
        tags: string[];
        metadata: Record<string, any>;
        skillLevel: "beginner" | "intermediate" | "advanced";
        learningObjectives: string[];
        createdBy: string;
        createdAt: Date;
        updatedAt: Date;
        estimatedHours: number;
        completionCriteria: {
            requiredLessons: string[];
            requiredLabs: string[];
            requiredAssessments: string[];
            minimumAssessmentScore: number;
            minimumLabScore: number;
            requireAllLessons: boolean;
            requireAllLabs: boolean;
            requireAllAssessments: boolean;
        };
    }[];
    category: string;
    targetAudience: string[];
    industry: string[];
    trending: boolean;
    featured: boolean;
    price: number;
    instructors: string[];
    certification?: {
        id: string;
        description: string;
        prerequisites: string[];
        metadata: Record<string, any>;
        name: string;
        issuer: string;
        examRequirements: string;
        competencies: {
            id: string;
            description: string;
            name: string;
            weight: number;
        }[];
        passingCriteria: {
            minimumScore: number;
            requiredCompetencies: string[];
            timeLimit?: number | undefined;
        };
        validityPeriod?: number | undefined;
        badgeUrl?: string | undefined;
        credentialTemplate?: string | undefined;
    } | undefined;
    enrollmentLimit?: number | undefined;
    startDate?: Date | undefined;
    endDate?: Date | undefined;
}, {
    id: string;
    title: string;
    description: string;
    difficulty: "easy" | "medium" | "hard";
    skillLevel: "beginner" | "intermediate" | "advanced";
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
    estimatedHours: number;
    modules: {
        id: string;
        title: string;
        description: string;
        content: {
            lessons?: {
                type: "video" | "article" | "interactive" | "simulation" | "document";
                id: string;
                title: string;
                description: string;
                content: string | {
                    type: "simulation" | "diagram" | "code-editor" | "terminal" | "network-map";
                    config: Record<string, any>;
                    instructions: string;
                    data?: any;
                } | {
                    videoUrl: string;
                    transcript?: string | undefined;
                };
                duration: number;
                order: number;
                quiz?: {
                    id: string;
                    title: string;
                    questions: {
                        type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
                        id: string;
                        question: string;
                        correctAnswer: string | string[];
                        options?: string[] | undefined;
                        explanation?: string | undefined;
                        points?: number | undefined;
                        timeLimit?: number | undefined;
                        hints?: string[] | undefined;
                    }[];
                    timeLimit?: number | undefined;
                    description?: string | undefined;
                    passingScore?: number | undefined;
                    maxAttempts?: number | undefined;
                    randomizeQuestions?: boolean | undefined;
                    showResults?: boolean | undefined;
                } | undefined;
                prerequisites?: string[] | undefined;
                tags?: string[] | undefined;
                resources?: {
                    type: "document" | "link" | "tool";
                    title: string;
                    url: string;
                }[] | undefined;
                metadata?: Record<string, any> | undefined;
            }[] | undefined;
            labs?: {
                id: string;
                title: string;
                description: string;
                order: number;
                environment: {
                    type: "simulated" | "live" | "sandboxed" | "cloud";
                    config: {
                        resources?: {
                            cpu?: string | undefined;
                            memory?: string | undefined;
                            storage?: string | undefined;
                        } | undefined;
                        containers?: {
                            name: string;
                            image: string;
                            ports?: number[] | undefined;
                            environment?: Record<string, string> | undefined;
                            volumes?: string[] | undefined;
                        }[] | undefined;
                        network?: {
                            isolated?: boolean | undefined;
                            allowInternet?: boolean | undefined;
                            customTopology?: any;
                        } | undefined;
                        timeout?: number | undefined;
                    };
                    provisioning?: {
                        setupScript?: string | undefined;
                        teardownScript?: string | undefined;
                        healthCheck?: string | undefined;
                    } | undefined;
                };
                difficulty: "easy" | "medium" | "hard";
                skillLevel: "beginner" | "intermediate" | "advanced";
                tasks: {
                    instructions: string;
                    id: string;
                    title: string;
                    description: string;
                    order: number;
                    points?: number | undefined;
                    timeLimit?: number | undefined;
                    prerequisites?: string[] | undefined;
                    expectedOutput?: string | undefined;
                    validationScript?: string | undefined;
                    tools?: string[] | undefined;
                    flags?: string[] | undefined;
                }[];
                solution: string;
                estimatedTime: number;
                createdBy: string;
                createdAt: Date;
                updatedAt: Date;
                hints?: {
                    id: string;
                    title: string;
                    content: string;
                    order: number;
                    pointDeduction?: number | undefined;
                }[] | undefined;
                maxAttempts?: number | undefined;
                prerequisites?: string[] | undefined;
                tags?: string[] | undefined;
                metadata?: Record<string, any> | undefined;
                learningObjectives?: string[] | undefined;
                references?: {
                    type: "tool" | "documentation" | "tutorial" | "research";
                    title: string;
                    url: string;
                }[] | undefined;
            }[] | undefined;
            assessments?: {
                type: "simulation" | "quiz" | "practical" | "project" | "essay";
                id: string;
                title: string;
                description: string;
                order: number;
                difficulty: "easy" | "medium" | "hard";
                createdBy: string;
                createdAt: Date;
                updatedAt: Date;
                timeLimit?: number | undefined;
                questions?: {
                    type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
                    id: string;
                    question: string;
                    correctAnswer: string | string[];
                    options?: string[] | undefined;
                    explanation?: string | undefined;
                    points?: number | undefined;
                    timeLimit?: number | undefined;
                    hints?: string[] | undefined;
                }[] | undefined;
                passingScore?: number | undefined;
                maxAttempts?: number | undefined;
                prerequisites?: string[] | undefined;
                tags?: string[] | undefined;
                metadata?: Record<string, any> | undefined;
                practicalTasks?: {
                    instructions: string;
                    id: string;
                    title: string;
                    description: string;
                    order: number;
                    points?: number | undefined;
                    timeLimit?: number | undefined;
                    prerequisites?: string[] | undefined;
                    expectedOutput?: string | undefined;
                    validationScript?: string | undefined;
                    tools?: string[] | undefined;
                    flags?: string[] | undefined;
                }[] | undefined;
                rubric?: {
                    criteria: {
                        description: string;
                        name: string;
                        maxPoints: number;
                        weight: number;
                    }[];
                } | undefined;
                autoGrading?: boolean | undefined;
            }[] | undefined;
        };
        order: number;
        skillLevel: "beginner" | "intermediate" | "advanced";
        createdBy: string;
        createdAt: Date;
        updatedAt: Date;
        estimatedHours: number;
        completionCriteria: {
            requiredLessons?: string[] | undefined;
            requiredLabs?: string[] | undefined;
            requiredAssessments?: string[] | undefined;
            minimumAssessmentScore?: number | undefined;
            minimumLabScore?: number | undefined;
            requireAllLessons?: boolean | undefined;
            requireAllLabs?: boolean | undefined;
            requireAllAssessments?: boolean | undefined;
        };
        prerequisites?: string[] | undefined;
        tags?: string[] | undefined;
        metadata?: Record<string, any> | undefined;
        learningObjectives?: string[] | undefined;
    }[];
    category: string;
    prerequisites?: string[] | undefined;
    tags?: string[] | undefined;
    metadata?: Record<string, any> | undefined;
    learningObjectives?: string[] | undefined;
    certification?: {
        id: string;
        description: string;
        name: string;
        issuer: string;
        examRequirements: string;
        passingCriteria: {
            timeLimit?: number | undefined;
            minimumScore?: number | undefined;
            requiredCompetencies?: string[] | undefined;
        };
        prerequisites?: string[] | undefined;
        metadata?: Record<string, any> | undefined;
        validityPeriod?: number | undefined;
        competencies?: {
            id: string;
            description: string;
            name: string;
            weight: number;
        }[] | undefined;
        badgeUrl?: string | undefined;
        credentialTemplate?: string | undefined;
    } | undefined;
    targetAudience?: string[] | undefined;
    industry?: string[] | undefined;
    trending?: boolean | undefined;
    featured?: boolean | undefined;
    price?: number | undefined;
    enrollmentLimit?: number | undefined;
    startDate?: Date | undefined;
    endDate?: Date | undefined;
    instructors?: string[] | undefined;
}>;
export type LearningPath = z.infer<typeof LearningPathSchema>;
export declare const StudentProgressSchema: z.ZodObject<{
    id: z.ZodString;
    studentId: z.ZodString;
    learningPathId: z.ZodString;
    moduleId: z.ZodOptional<z.ZodString>;
    lessonId: z.ZodOptional<z.ZodString>;
    labId: z.ZodOptional<z.ZodString>;
    assessmentId: z.ZodOptional<z.ZodString>;
    status: z.ZodEnum<["not-started", "in-progress", "completed", "failed", "paused"]>;
    progress: z.ZodNumber;
    score: z.ZodOptional<z.ZodNumber>;
    timeSpent: z.ZodDefault<z.ZodNumber>;
    attempts: z.ZodDefault<z.ZodNumber>;
    lastAccessed: z.ZodOptional<z.ZodDate>;
    startedAt: z.ZodDate;
    completedAt: z.ZodOptional<z.ZodDate>;
    notes: z.ZodOptional<z.ZodString>;
    bookmarks: z.ZodDefault<z.ZodArray<z.ZodObject<{
        contentId: z.ZodString;
        contentType: z.ZodEnum<["lesson", "lab", "assessment"]>;
        note: z.ZodOptional<z.ZodString>;
        timestamp: z.ZodDate;
    }, "strip", z.ZodTypeAny, {
        contentId: string;
        contentType: "lesson" | "lab" | "assessment";
        timestamp: Date;
        note?: string | undefined;
    }, {
        contentId: string;
        contentType: "lesson" | "lab" | "assessment";
        timestamp: Date;
        note?: string | undefined;
    }>, "many">>;
    achievements: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    status: "not-started" | "in-progress" | "completed" | "failed" | "paused";
    id: string;
    metadata: Record<string, any>;
    studentId: string;
    startedAt: Date;
    timeSpent: number;
    learningPathId: string;
    progress: number;
    attempts: number;
    bookmarks: {
        contentId: string;
        contentType: "lesson" | "lab" | "assessment";
        timestamp: Date;
        note?: string | undefined;
    }[];
    achievements: string[];
    assessmentId?: string | undefined;
    score?: number | undefined;
    completedAt?: Date | undefined;
    moduleId?: string | undefined;
    lessonId?: string | undefined;
    labId?: string | undefined;
    lastAccessed?: Date | undefined;
    notes?: string | undefined;
}, {
    status: "not-started" | "in-progress" | "completed" | "failed" | "paused";
    id: string;
    studentId: string;
    startedAt: Date;
    learningPathId: string;
    progress: number;
    metadata?: Record<string, any> | undefined;
    assessmentId?: string | undefined;
    score?: number | undefined;
    completedAt?: Date | undefined;
    timeSpent?: number | undefined;
    moduleId?: string | undefined;
    lessonId?: string | undefined;
    labId?: string | undefined;
    attempts?: number | undefined;
    lastAccessed?: Date | undefined;
    notes?: string | undefined;
    bookmarks?: {
        contentId: string;
        contentType: "lesson" | "lab" | "assessment";
        timestamp: Date;
        note?: string | undefined;
    }[] | undefined;
    achievements?: string[] | undefined;
}>;
export type StudentProgress = z.infer<typeof StudentProgressSchema>;
export declare const EnrollmentSchema: z.ZodObject<{
    id: z.ZodString;
    studentId: z.ZodString;
    learningPathId: z.ZodString;
    enrolledAt: z.ZodDate;
    status: z.ZodEnum<["active", "completed", "dropped", "suspended"]>;
    dueDate: z.ZodOptional<z.ZodDate>;
    accessExpiresAt: z.ZodOptional<z.ZodDate>;
    paymentStatus: z.ZodDefault<z.ZodEnum<["free", "paid", "pending", "failed"]>>;
    completionCertificateId: z.ZodOptional<z.ZodString>;
    instructorFeedback: z.ZodOptional<z.ZodString>;
    finalGrade: z.ZodOptional<z.ZodNumber>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    status: "completed" | "active" | "dropped" | "suspended";
    id: string;
    metadata: Record<string, any>;
    studentId: string;
    learningPathId: string;
    enrolledAt: Date;
    paymentStatus: "failed" | "free" | "paid" | "pending";
    dueDate?: Date | undefined;
    accessExpiresAt?: Date | undefined;
    completionCertificateId?: string | undefined;
    instructorFeedback?: string | undefined;
    finalGrade?: number | undefined;
}, {
    status: "completed" | "active" | "dropped" | "suspended";
    id: string;
    studentId: string;
    learningPathId: string;
    enrolledAt: Date;
    metadata?: Record<string, any> | undefined;
    dueDate?: Date | undefined;
    accessExpiresAt?: Date | undefined;
    paymentStatus?: "failed" | "free" | "paid" | "pending" | undefined;
    completionCertificateId?: string | undefined;
    instructorFeedback?: string | undefined;
    finalGrade?: number | undefined;
}>;
export type Enrollment = z.infer<typeof EnrollmentSchema>;
export declare const TrainingScenarioSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    description: z.ZodString;
    category: z.ZodEnum<["incident-response", "forensics", "threat-hunting", "red-team", "blue-team", "purple-team"]>;
    difficulty: z.ZodEnum<["easy", "medium", "hard"]>;
    skillLevel: z.ZodEnum<["beginner", "intermediate", "advanced"]>;
    scenario: z.ZodObject<{
        background: z.ZodString;
        timeline: z.ZodArray<z.ZodObject<{
            timestamp: z.ZodString;
            event: z.ZodString;
            source: z.ZodString;
            evidence: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            timestamp: string;
            event: string;
            source: string;
            evidence: string[];
        }, {
            timestamp: string;
            event: string;
            source: string;
            evidence?: string[] | undefined;
        }>, "many">;
        environment: z.ZodObject<{
            type: z.ZodEnum<["simulated", "live", "sandboxed", "cloud"]>;
            config: z.ZodObject<{
                containers: z.ZodDefault<z.ZodArray<z.ZodObject<{
                    name: z.ZodString;
                    image: z.ZodString;
                    ports: z.ZodDefault<z.ZodArray<z.ZodNumber, "many">>;
                    environment: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>;
                    volumes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
                }, "strip", z.ZodTypeAny, {
                    name: string;
                    image: string;
                    ports: number[];
                    environment: Record<string, string>;
                    volumes: string[];
                }, {
                    name: string;
                    image: string;
                    ports?: number[] | undefined;
                    environment?: Record<string, string> | undefined;
                    volumes?: string[] | undefined;
                }>, "many">>;
                network: z.ZodOptional<z.ZodObject<{
                    isolated: z.ZodDefault<z.ZodBoolean>;
                    allowInternet: z.ZodDefault<z.ZodBoolean>;
                    customTopology: z.ZodOptional<z.ZodAny>;
                }, "strip", z.ZodTypeAny, {
                    isolated: boolean;
                    allowInternet: boolean;
                    customTopology?: any;
                }, {
                    isolated?: boolean | undefined;
                    allowInternet?: boolean | undefined;
                    customTopology?: any;
                }>>;
                resources: z.ZodOptional<z.ZodObject<{
                    cpu: z.ZodDefault<z.ZodString>;
                    memory: z.ZodDefault<z.ZodString>;
                    storage: z.ZodDefault<z.ZodString>;
                }, "strip", z.ZodTypeAny, {
                    cpu: string;
                    memory: string;
                    storage: string;
                }, {
                    cpu?: string | undefined;
                    memory?: string | undefined;
                    storage?: string | undefined;
                }>>;
                timeout: z.ZodDefault<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                containers: {
                    name: string;
                    image: string;
                    ports: number[];
                    environment: Record<string, string>;
                    volumes: string[];
                }[];
                timeout: number;
                resources?: {
                    cpu: string;
                    memory: string;
                    storage: string;
                } | undefined;
                network?: {
                    isolated: boolean;
                    allowInternet: boolean;
                    customTopology?: any;
                } | undefined;
            }, {
                resources?: {
                    cpu?: string | undefined;
                    memory?: string | undefined;
                    storage?: string | undefined;
                } | undefined;
                containers?: {
                    name: string;
                    image: string;
                    ports?: number[] | undefined;
                    environment?: Record<string, string> | undefined;
                    volumes?: string[] | undefined;
                }[] | undefined;
                network?: {
                    isolated?: boolean | undefined;
                    allowInternet?: boolean | undefined;
                    customTopology?: any;
                } | undefined;
                timeout?: number | undefined;
            }>;
            provisioning: z.ZodOptional<z.ZodObject<{
                setupScript: z.ZodOptional<z.ZodString>;
                teardownScript: z.ZodOptional<z.ZodString>;
                healthCheck: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                setupScript?: string | undefined;
                teardownScript?: string | undefined;
                healthCheck?: string | undefined;
            }, {
                setupScript?: string | undefined;
                teardownScript?: string | undefined;
                healthCheck?: string | undefined;
            }>>;
        }, "strip", z.ZodTypeAny, {
            type: "simulated" | "live" | "sandboxed" | "cloud";
            config: {
                containers: {
                    name: string;
                    image: string;
                    ports: number[];
                    environment: Record<string, string>;
                    volumes: string[];
                }[];
                timeout: number;
                resources?: {
                    cpu: string;
                    memory: string;
                    storage: string;
                } | undefined;
                network?: {
                    isolated: boolean;
                    allowInternet: boolean;
                    customTopology?: any;
                } | undefined;
            };
            provisioning?: {
                setupScript?: string | undefined;
                teardownScript?: string | undefined;
                healthCheck?: string | undefined;
            } | undefined;
        }, {
            type: "simulated" | "live" | "sandboxed" | "cloud";
            config: {
                resources?: {
                    cpu?: string | undefined;
                    memory?: string | undefined;
                    storage?: string | undefined;
                } | undefined;
                containers?: {
                    name: string;
                    image: string;
                    ports?: number[] | undefined;
                    environment?: Record<string, string> | undefined;
                    volumes?: string[] | undefined;
                }[] | undefined;
                network?: {
                    isolated?: boolean | undefined;
                    allowInternet?: boolean | undefined;
                    customTopology?: any;
                } | undefined;
                timeout?: number | undefined;
            };
            provisioning?: {
                setupScript?: string | undefined;
                teardownScript?: string | undefined;
                healthCheck?: string | undefined;
            } | undefined;
        }>;
        objectives: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            description: z.ZodString;
            points: z.ZodNumber;
            required: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            points: number;
            description: string;
            required: boolean;
        }, {
            id: string;
            points: number;
            description: string;
            required?: boolean | undefined;
        }>, "many">;
        artifacts: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            type: z.ZodEnum<["log", "memory-dump", "disk-image", "network-capture", "file"]>;
            path: z.ZodString;
            description: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            type: "log" | "memory-dump" | "disk-image" | "network-capture" | "file";
            path: string;
            id: string;
            description: string;
            name: string;
        }, {
            type: "log" | "memory-dump" | "disk-image" | "network-capture" | "file";
            path: string;
            id: string;
            description: string;
            name: string;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        environment: {
            type: "simulated" | "live" | "sandboxed" | "cloud";
            config: {
                containers: {
                    name: string;
                    image: string;
                    ports: number[];
                    environment: Record<string, string>;
                    volumes: string[];
                }[];
                timeout: number;
                resources?: {
                    cpu: string;
                    memory: string;
                    storage: string;
                } | undefined;
                network?: {
                    isolated: boolean;
                    allowInternet: boolean;
                    customTopology?: any;
                } | undefined;
            };
            provisioning?: {
                setupScript?: string | undefined;
                teardownScript?: string | undefined;
                healthCheck?: string | undefined;
            } | undefined;
        };
        background: string;
        timeline: {
            timestamp: string;
            event: string;
            source: string;
            evidence: string[];
        }[];
        objectives: {
            id: string;
            points: number;
            description: string;
            required: boolean;
        }[];
        artifacts: {
            type: "log" | "memory-dump" | "disk-image" | "network-capture" | "file";
            path: string;
            id: string;
            description: string;
            name: string;
        }[];
    }, {
        environment: {
            type: "simulated" | "live" | "sandboxed" | "cloud";
            config: {
                resources?: {
                    cpu?: string | undefined;
                    memory?: string | undefined;
                    storage?: string | undefined;
                } | undefined;
                containers?: {
                    name: string;
                    image: string;
                    ports?: number[] | undefined;
                    environment?: Record<string, string> | undefined;
                    volumes?: string[] | undefined;
                }[] | undefined;
                network?: {
                    isolated?: boolean | undefined;
                    allowInternet?: boolean | undefined;
                    customTopology?: any;
                } | undefined;
                timeout?: number | undefined;
            };
            provisioning?: {
                setupScript?: string | undefined;
                teardownScript?: string | undefined;
                healthCheck?: string | undefined;
            } | undefined;
        };
        background: string;
        timeline: {
            timestamp: string;
            event: string;
            source: string;
            evidence?: string[] | undefined;
        }[];
        objectives: {
            id: string;
            points: number;
            description: string;
            required?: boolean | undefined;
        }[];
        artifacts?: {
            type: "log" | "memory-dump" | "disk-image" | "network-capture" | "file";
            path: string;
            id: string;
            description: string;
            name: string;
        }[] | undefined;
    }>;
    estimatedTime: z.ZodNumber;
    maxScore: z.ZodNumber;
    passingScore: z.ZodNumber;
    hints: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        order: z.ZodNumber;
        title: z.ZodString;
        content: z.ZodString;
        pointDeduction: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        title: string;
        content: string;
        order: number;
        pointDeduction: number;
    }, {
        id: string;
        title: string;
        content: string;
        order: number;
        pointDeduction?: number | undefined;
    }>, "many">>;
    solution: z.ZodObject<{
        summary: z.ZodString;
        steps: z.ZodArray<z.ZodString, "many">;
        explanation: z.ZodString;
        references: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        explanation: string;
        references: string[];
        summary: string;
        steps: string[];
    }, {
        explanation: string;
        summary: string;
        steps: string[];
        references?: string[] | undefined;
    }>;
    prerequisites: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    createdBy: z.ZodString;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    hints: {
        id: string;
        title: string;
        content: string;
        order: number;
        pointDeduction: number;
    }[];
    title: string;
    description: string;
    passingScore: number;
    prerequisites: string[];
    tags: string[];
    metadata: Record<string, any>;
    difficulty: "easy" | "medium" | "hard";
    skillLevel: "beginner" | "intermediate" | "advanced";
    solution: {
        explanation: string;
        references: string[];
        summary: string;
        steps: string[];
    };
    estimatedTime: number;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
    maxScore: number;
    category: "incident-response" | "forensics" | "threat-hunting" | "red-team" | "blue-team" | "purple-team";
    scenario: {
        environment: {
            type: "simulated" | "live" | "sandboxed" | "cloud";
            config: {
                containers: {
                    name: string;
                    image: string;
                    ports: number[];
                    environment: Record<string, string>;
                    volumes: string[];
                }[];
                timeout: number;
                resources?: {
                    cpu: string;
                    memory: string;
                    storage: string;
                } | undefined;
                network?: {
                    isolated: boolean;
                    allowInternet: boolean;
                    customTopology?: any;
                } | undefined;
            };
            provisioning?: {
                setupScript?: string | undefined;
                teardownScript?: string | undefined;
                healthCheck?: string | undefined;
            } | undefined;
        };
        background: string;
        timeline: {
            timestamp: string;
            event: string;
            source: string;
            evidence: string[];
        }[];
        objectives: {
            id: string;
            points: number;
            description: string;
            required: boolean;
        }[];
        artifacts: {
            type: "log" | "memory-dump" | "disk-image" | "network-capture" | "file";
            path: string;
            id: string;
            description: string;
            name: string;
        }[];
    };
}, {
    id: string;
    title: string;
    description: string;
    passingScore: number;
    difficulty: "easy" | "medium" | "hard";
    skillLevel: "beginner" | "intermediate" | "advanced";
    solution: {
        explanation: string;
        summary: string;
        steps: string[];
        references?: string[] | undefined;
    };
    estimatedTime: number;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
    maxScore: number;
    category: "incident-response" | "forensics" | "threat-hunting" | "red-team" | "blue-team" | "purple-team";
    scenario: {
        environment: {
            type: "simulated" | "live" | "sandboxed" | "cloud";
            config: {
                resources?: {
                    cpu?: string | undefined;
                    memory?: string | undefined;
                    storage?: string | undefined;
                } | undefined;
                containers?: {
                    name: string;
                    image: string;
                    ports?: number[] | undefined;
                    environment?: Record<string, string> | undefined;
                    volumes?: string[] | undefined;
                }[] | undefined;
                network?: {
                    isolated?: boolean | undefined;
                    allowInternet?: boolean | undefined;
                    customTopology?: any;
                } | undefined;
                timeout?: number | undefined;
            };
            provisioning?: {
                setupScript?: string | undefined;
                teardownScript?: string | undefined;
                healthCheck?: string | undefined;
            } | undefined;
        };
        background: string;
        timeline: {
            timestamp: string;
            event: string;
            source: string;
            evidence?: string[] | undefined;
        }[];
        objectives: {
            id: string;
            points: number;
            description: string;
            required?: boolean | undefined;
        }[];
        artifacts?: {
            type: "log" | "memory-dump" | "disk-image" | "network-capture" | "file";
            path: string;
            id: string;
            description: string;
            name: string;
        }[] | undefined;
    };
    hints?: {
        id: string;
        title: string;
        content: string;
        order: number;
        pointDeduction?: number | undefined;
    }[] | undefined;
    prerequisites?: string[] | undefined;
    tags?: string[] | undefined;
    metadata?: Record<string, any> | undefined;
}>;
export type TrainingScenario = z.infer<typeof TrainingScenarioSchema>;
export declare const KnowledgeBaseArticleSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    summary: z.ZodString;
    content: z.ZodString;
    category: z.ZodString;
    subcategory: z.ZodOptional<z.ZodString>;
    type: z.ZodEnum<["guide", "tutorial", "reference", "faq", "best-practice"]>;
    difficulty: z.ZodEnum<["easy", "medium", "hard"]>;
    tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    attachments: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        url: z.ZodString;
        type: z.ZodString;
        size: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        type: string;
        id: string;
        url: string;
        name: string;
        size: number;
    }, {
        type: string;
        id: string;
        url: string;
        name: string;
        size: number;
    }>, "many">>;
    relatedArticles: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    prerequisites: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    estimatedReadTime: z.ZodNumber;
    lastReviewed: z.ZodOptional<z.ZodDate>;
    reviewedBy: z.ZodOptional<z.ZodString>;
    version: z.ZodDefault<z.ZodString>;
    status: z.ZodDefault<z.ZodEnum<["draft", "published", "archived"]>>;
    votes: z.ZodDefault<z.ZodObject<{
        helpful: z.ZodDefault<z.ZodNumber>;
        notHelpful: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        helpful: number;
        notHelpful: number;
    }, {
        helpful?: number | undefined;
        notHelpful?: number | undefined;
    }>>;
    views: z.ZodDefault<z.ZodNumber>;
    author: z.ZodString;
    contributors: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
    publishedAt: z.ZodOptional<z.ZodDate>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    type: "tutorial" | "guide" | "reference" | "faq" | "best-practice";
    status: "draft" | "published" | "archived";
    id: string;
    title: string;
    content: string;
    prerequisites: string[];
    tags: string[];
    metadata: Record<string, any>;
    difficulty: "easy" | "medium" | "hard";
    createdAt: Date;
    updatedAt: Date;
    category: string;
    summary: string;
    attachments: {
        type: string;
        id: string;
        url: string;
        name: string;
        size: number;
    }[];
    relatedArticles: string[];
    estimatedReadTime: number;
    version: string;
    votes: {
        helpful: number;
        notHelpful: number;
    };
    views: number;
    author: string;
    contributors: string[];
    subcategory?: string | undefined;
    lastReviewed?: Date | undefined;
    reviewedBy?: string | undefined;
    publishedAt?: Date | undefined;
}, {
    type: "tutorial" | "guide" | "reference" | "faq" | "best-practice";
    id: string;
    title: string;
    content: string;
    difficulty: "easy" | "medium" | "hard";
    createdAt: Date;
    updatedAt: Date;
    category: string;
    summary: string;
    estimatedReadTime: number;
    author: string;
    status?: "draft" | "published" | "archived" | undefined;
    prerequisites?: string[] | undefined;
    tags?: string[] | undefined;
    metadata?: Record<string, any> | undefined;
    subcategory?: string | undefined;
    attachments?: {
        type: string;
        id: string;
        url: string;
        name: string;
        size: number;
    }[] | undefined;
    relatedArticles?: string[] | undefined;
    lastReviewed?: Date | undefined;
    reviewedBy?: string | undefined;
    version?: string | undefined;
    votes?: {
        helpful?: number | undefined;
        notHelpful?: number | undefined;
    } | undefined;
    views?: number | undefined;
    contributors?: string[] | undefined;
    publishedAt?: Date | undefined;
}>;
export type KnowledgeBaseArticle = z.infer<typeof KnowledgeBaseArticleSchema>;
export declare const ForumThreadSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    category: z.ZodString;
    tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    authorId: z.ZodString;
    status: z.ZodDefault<z.ZodEnum<["open", "closed", "pinned", "locked"]>>;
    priority: z.ZodDefault<z.ZodEnum<["low", "normal", "high"]>>;
    views: z.ZodDefault<z.ZodNumber>;
    replies: z.ZodDefault<z.ZodNumber>;
    lastReplyAt: z.ZodOptional<z.ZodDate>;
    lastReplyBy: z.ZodOptional<z.ZodString>;
    solved: z.ZodDefault<z.ZodBoolean>;
    solutionPostId: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    status: "open" | "closed" | "pinned" | "locked";
    id: string;
    title: string;
    tags: string[];
    metadata: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
    category: string;
    views: number;
    authorId: string;
    priority: "low" | "normal" | "high";
    replies: number;
    solved: boolean;
    lastReplyAt?: Date | undefined;
    lastReplyBy?: string | undefined;
    solutionPostId?: string | undefined;
}, {
    id: string;
    title: string;
    createdAt: Date;
    updatedAt: Date;
    category: string;
    authorId: string;
    status?: "open" | "closed" | "pinned" | "locked" | undefined;
    tags?: string[] | undefined;
    metadata?: Record<string, any> | undefined;
    views?: number | undefined;
    priority?: "low" | "normal" | "high" | undefined;
    replies?: number | undefined;
    lastReplyAt?: Date | undefined;
    lastReplyBy?: string | undefined;
    solved?: boolean | undefined;
    solutionPostId?: string | undefined;
}>;
export type ForumThread = z.infer<typeof ForumThreadSchema>;
export declare const ForumPostSchema: z.ZodObject<{
    id: z.ZodString;
    threadId: z.ZodString;
    authorId: z.ZodString;
    content: z.ZodString;
    parentPostId: z.ZodOptional<z.ZodString>;
    level: z.ZodDefault<z.ZodNumber>;
    votes: z.ZodDefault<z.ZodObject<{
        upvotes: z.ZodDefault<z.ZodNumber>;
        downvotes: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        upvotes: number;
        downvotes: number;
    }, {
        upvotes?: number | undefined;
        downvotes?: number | undefined;
    }>>;
    isSolution: z.ZodDefault<z.ZodBoolean>;
    isModerated: z.ZodDefault<z.ZodBoolean>;
    moderatedBy: z.ZodOptional<z.ZodString>;
    moderationReason: z.ZodOptional<z.ZodString>;
    attachments: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        url: z.ZodString;
        type: z.ZodString;
        size: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        type: string;
        id: string;
        url: string;
        name: string;
        size: number;
    }, {
        type: string;
        id: string;
        url: string;
        name: string;
        size: number;
    }>, "many">>;
    mentions: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    edited: z.ZodDefault<z.ZodBoolean>;
    editedAt: z.ZodOptional<z.ZodDate>;
    editedBy: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    content: string;
    metadata: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
    attachments: {
        type: string;
        id: string;
        url: string;
        name: string;
        size: number;
    }[];
    votes: {
        upvotes: number;
        downvotes: number;
    };
    authorId: string;
    threadId: string;
    level: number;
    isSolution: boolean;
    isModerated: boolean;
    mentions: string[];
    edited: boolean;
    parentPostId?: string | undefined;
    moderatedBy?: string | undefined;
    moderationReason?: string | undefined;
    editedAt?: Date | undefined;
    editedBy?: string | undefined;
}, {
    id: string;
    content: string;
    createdAt: Date;
    updatedAt: Date;
    authorId: string;
    threadId: string;
    metadata?: Record<string, any> | undefined;
    attachments?: {
        type: string;
        id: string;
        url: string;
        name: string;
        size: number;
    }[] | undefined;
    votes?: {
        upvotes?: number | undefined;
        downvotes?: number | undefined;
    } | undefined;
    parentPostId?: string | undefined;
    level?: number | undefined;
    isSolution?: boolean | undefined;
    isModerated?: boolean | undefined;
    moderatedBy?: string | undefined;
    moderationReason?: string | undefined;
    mentions?: string[] | undefined;
    edited?: boolean | undefined;
    editedAt?: Date | undefined;
    editedBy?: string | undefined;
}>;
export type ForumPost = z.infer<typeof ForumPostSchema>;
export declare const InstructorSchema: z.ZodObject<{
    id: z.ZodString;
    userId: z.ZodString;
    bio: z.ZodString;
    specializations: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    certifications: z.ZodDefault<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        issuer: z.ZodString;
        dateObtained: z.ZodDate;
        expirationDate: z.ZodOptional<z.ZodDate>;
        credentialUrl: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        issuer: string;
        dateObtained: Date;
        expirationDate?: Date | undefined;
        credentialUrl?: string | undefined;
    }, {
        name: string;
        issuer: string;
        dateObtained: Date;
        expirationDate?: Date | undefined;
        credentialUrl?: string | undefined;
    }>, "many">>;
    experience: z.ZodObject<{
        yearsInField: z.ZodNumber;
        currentRole: z.ZodString;
        organization: z.ZodOptional<z.ZodString>;
        previousRoles: z.ZodDefault<z.ZodArray<z.ZodObject<{
            title: z.ZodString;
            organization: z.ZodString;
            duration: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            title: string;
            duration: string;
            organization: string;
        }, {
            title: string;
            duration: string;
            organization: string;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        yearsInField: number;
        currentRole: string;
        previousRoles: {
            title: string;
            duration: string;
            organization: string;
        }[];
        organization?: string | undefined;
    }, {
        yearsInField: number;
        currentRole: string;
        organization?: string | undefined;
        previousRoles?: {
            title: string;
            duration: string;
            organization: string;
        }[] | undefined;
    }>;
    teaching: z.ZodObject<{
        yearsTeaching: z.ZodNumber;
        coursesCreated: z.ZodDefault<z.ZodNumber>;
        studentsGraduated: z.ZodDefault<z.ZodNumber>;
        averageRating: z.ZodDefault<z.ZodNumber>;
        totalRatings: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        yearsTeaching: number;
        coursesCreated: number;
        studentsGraduated: number;
        averageRating: number;
        totalRatings: number;
    }, {
        yearsTeaching: number;
        coursesCreated?: number | undefined;
        studentsGraduated?: number | undefined;
        averageRating?: number | undefined;
        totalRatings?: number | undefined;
    }>;
    availability: z.ZodOptional<z.ZodObject<{
        timezone: z.ZodString;
        weeklyHours: z.ZodNumber;
        schedule: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodArray<z.ZodString, "many">>>;
    }, "strip", z.ZodTypeAny, {
        timezone: string;
        weeklyHours: number;
        schedule: Record<string, string[]>;
    }, {
        timezone: string;
        weeklyHours: number;
        schedule?: Record<string, string[]> | undefined;
    }>>;
    socialMedia: z.ZodDefault<z.ZodObject<{
        linkedin: z.ZodOptional<z.ZodString>;
        twitter: z.ZodOptional<z.ZodString>;
        github: z.ZodOptional<z.ZodString>;
        website: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        linkedin?: string | undefined;
        twitter?: string | undefined;
        github?: string | undefined;
        website?: string | undefined;
    }, {
        linkedin?: string | undefined;
        twitter?: string | undefined;
        github?: string | undefined;
        website?: string | undefined;
    }>>;
    verified: z.ZodDefault<z.ZodBoolean>;
    verifiedAt: z.ZodOptional<z.ZodDate>;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    metadata: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
    userId: string;
    bio: string;
    specializations: string[];
    certifications: {
        name: string;
        issuer: string;
        dateObtained: Date;
        expirationDate?: Date | undefined;
        credentialUrl?: string | undefined;
    }[];
    experience: {
        yearsInField: number;
        currentRole: string;
        previousRoles: {
            title: string;
            duration: string;
            organization: string;
        }[];
        organization?: string | undefined;
    };
    teaching: {
        yearsTeaching: number;
        coursesCreated: number;
        studentsGraduated: number;
        averageRating: number;
        totalRatings: number;
    };
    socialMedia: {
        linkedin?: string | undefined;
        twitter?: string | undefined;
        github?: string | undefined;
        website?: string | undefined;
    };
    verified: boolean;
    availability?: {
        timezone: string;
        weeklyHours: number;
        schedule: Record<string, string[]>;
    } | undefined;
    verifiedAt?: Date | undefined;
}, {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    userId: string;
    bio: string;
    experience: {
        yearsInField: number;
        currentRole: string;
        organization?: string | undefined;
        previousRoles?: {
            title: string;
            duration: string;
            organization: string;
        }[] | undefined;
    };
    teaching: {
        yearsTeaching: number;
        coursesCreated?: number | undefined;
        studentsGraduated?: number | undefined;
        averageRating?: number | undefined;
        totalRatings?: number | undefined;
    };
    metadata?: Record<string, any> | undefined;
    specializations?: string[] | undefined;
    certifications?: {
        name: string;
        issuer: string;
        dateObtained: Date;
        expirationDate?: Date | undefined;
        credentialUrl?: string | undefined;
    }[] | undefined;
    availability?: {
        timezone: string;
        weeklyHours: number;
        schedule?: Record<string, string[]> | undefined;
    } | undefined;
    socialMedia?: {
        linkedin?: string | undefined;
        twitter?: string | undefined;
        github?: string | undefined;
        website?: string | undefined;
    } | undefined;
    verified?: boolean | undefined;
    verifiedAt?: Date | undefined;
}>;
export type Instructor = z.infer<typeof InstructorSchema>;
export declare const DatabaseConfigSchema: z.ZodObject<{
    type: z.ZodEnum<["sqlite", "mysql", "postgresql"]>;
    connection: z.ZodUnion<[z.ZodString, z.ZodObject<{
        host: z.ZodString;
        port: z.ZodNumber;
        database: z.ZodString;
        user: z.ZodString;
        password: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        host: string;
        port: number;
        database: string;
        user: string;
        password: string;
    }, {
        host: string;
        port: number;
        database: string;
        user: string;
        password: string;
    }>]>;
}, "strip", z.ZodTypeAny, {
    type: "sqlite" | "mysql" | "postgresql";
    connection: string | {
        host: string;
        port: number;
        database: string;
        user: string;
        password: string;
    };
}, {
    type: "sqlite" | "mysql" | "postgresql";
    connection: string | {
        host: string;
        port: number;
        database: string;
        user: string;
        password: string;
    };
}>;
export type DatabaseConfig = z.infer<typeof DatabaseConfigSchema>;
export declare const EducationalConfigSchema: z.ZodObject<{
    features: z.ZodObject<{
        enrollmentRequired: z.ZodDefault<z.ZodBoolean>;
        allowGuestAccess: z.ZodDefault<z.ZodBoolean>;
        enableCertifications: z.ZodDefault<z.ZodBoolean>;
        enableForums: z.ZodDefault<z.ZodBoolean>;
        enableLabs: z.ZodDefault<z.ZodBoolean>;
        enableAssessments: z.ZodDefault<z.ZodBoolean>;
        enableProgressTracking: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        enrollmentRequired: boolean;
        allowGuestAccess: boolean;
        enableCertifications: boolean;
        enableForums: boolean;
        enableLabs: boolean;
        enableAssessments: boolean;
        enableProgressTracking: boolean;
    }, {
        enrollmentRequired?: boolean | undefined;
        allowGuestAccess?: boolean | undefined;
        enableCertifications?: boolean | undefined;
        enableForums?: boolean | undefined;
        enableLabs?: boolean | undefined;
        enableAssessments?: boolean | undefined;
        enableProgressTracking?: boolean | undefined;
    }>;
    limits: z.ZodObject<{
        maxEnrollmentsPerUser: z.ZodDefault<z.ZodNumber>;
        maxLabDuration: z.ZodDefault<z.ZodNumber>;
        maxFileUploadSize: z.ZodDefault<z.ZodNumber>;
        maxLabAttempts: z.ZodDefault<z.ZodNumber>;
        maxAssessmentAttempts: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        maxEnrollmentsPerUser: number;
        maxLabDuration: number;
        maxFileUploadSize: number;
        maxLabAttempts: number;
        maxAssessmentAttempts: number;
    }, {
        maxEnrollmentsPerUser?: number | undefined;
        maxLabDuration?: number | undefined;
        maxFileUploadSize?: number | undefined;
        maxLabAttempts?: number | undefined;
        maxAssessmentAttempts?: number | undefined;
    }>;
    notifications: z.ZodObject<{
        enableEmailNotifications: z.ZodDefault<z.ZodBoolean>;
        enablePushNotifications: z.ZodDefault<z.ZodBoolean>;
        enrollmentReminders: z.ZodDefault<z.ZodBoolean>;
        assessmentReminders: z.ZodDefault<z.ZodBoolean>;
        certificateNotifications: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        enableEmailNotifications: boolean;
        enablePushNotifications: boolean;
        enrollmentReminders: boolean;
        assessmentReminders: boolean;
        certificateNotifications: boolean;
    }, {
        enableEmailNotifications?: boolean | undefined;
        enablePushNotifications?: boolean | undefined;
        enrollmentReminders?: boolean | undefined;
        assessmentReminders?: boolean | undefined;
        certificateNotifications?: boolean | undefined;
    }>;
    labs: z.ZodObject<{
        defaultEnvironment: z.ZodDefault<z.ZodEnum<["docker", "kubernetes", "vm"]>>;
        resourceLimits: z.ZodObject<{
            cpu: z.ZodDefault<z.ZodString>;
            memory: z.ZodDefault<z.ZodString>;
            storage: z.ZodDefault<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            cpu: string;
            memory: string;
            storage: string;
        }, {
            cpu?: string | undefined;
            memory?: string | undefined;
            storage?: string | undefined;
        }>;
        networkIsolation: z.ZodDefault<z.ZodBoolean>;
        autoCleanup: z.ZodDefault<z.ZodBoolean>;
        cleanupDelay: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        defaultEnvironment: "docker" | "kubernetes" | "vm";
        resourceLimits: {
            cpu: string;
            memory: string;
            storage: string;
        };
        networkIsolation: boolean;
        autoCleanup: boolean;
        cleanupDelay: number;
    }, {
        resourceLimits: {
            cpu?: string | undefined;
            memory?: string | undefined;
            storage?: string | undefined;
        };
        defaultEnvironment?: "docker" | "kubernetes" | "vm" | undefined;
        networkIsolation?: boolean | undefined;
        autoCleanup?: boolean | undefined;
        cleanupDelay?: number | undefined;
    }>;
    assessment: z.ZodObject<{
        randomizeQuestions: z.ZodDefault<z.ZodBoolean>;
        showCorrectAnswers: z.ZodDefault<z.ZodBoolean>;
        allowRetakes: z.ZodDefault<z.ZodBoolean>;
        proctoring: z.ZodObject<{
            enabled: z.ZodDefault<z.ZodBoolean>;
            requireWebcam: z.ZodDefault<z.ZodBoolean>;
            requireScreenShare: z.ZodDefault<z.ZodBoolean>;
            plagiarismDetection: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            enabled: boolean;
            requireWebcam: boolean;
            requireScreenShare: boolean;
            plagiarismDetection: boolean;
        }, {
            enabled?: boolean | undefined;
            requireWebcam?: boolean | undefined;
            requireScreenShare?: boolean | undefined;
            plagiarismDetection?: boolean | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        randomizeQuestions: boolean;
        showCorrectAnswers: boolean;
        allowRetakes: boolean;
        proctoring: {
            enabled: boolean;
            requireWebcam: boolean;
            requireScreenShare: boolean;
            plagiarismDetection: boolean;
        };
    }, {
        proctoring: {
            enabled?: boolean | undefined;
            requireWebcam?: boolean | undefined;
            requireScreenShare?: boolean | undefined;
            plagiarismDetection?: boolean | undefined;
        };
        randomizeQuestions?: boolean | undefined;
        showCorrectAnswers?: boolean | undefined;
        allowRetakes?: boolean | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    labs: {
        defaultEnvironment: "docker" | "kubernetes" | "vm";
        resourceLimits: {
            cpu: string;
            memory: string;
            storage: string;
        };
        networkIsolation: boolean;
        autoCleanup: boolean;
        cleanupDelay: number;
    };
    assessment: {
        randomizeQuestions: boolean;
        showCorrectAnswers: boolean;
        allowRetakes: boolean;
        proctoring: {
            enabled: boolean;
            requireWebcam: boolean;
            requireScreenShare: boolean;
            plagiarismDetection: boolean;
        };
    };
    features: {
        enrollmentRequired: boolean;
        allowGuestAccess: boolean;
        enableCertifications: boolean;
        enableForums: boolean;
        enableLabs: boolean;
        enableAssessments: boolean;
        enableProgressTracking: boolean;
    };
    limits: {
        maxEnrollmentsPerUser: number;
        maxLabDuration: number;
        maxFileUploadSize: number;
        maxLabAttempts: number;
        maxAssessmentAttempts: number;
    };
    notifications: {
        enableEmailNotifications: boolean;
        enablePushNotifications: boolean;
        enrollmentReminders: boolean;
        assessmentReminders: boolean;
        certificateNotifications: boolean;
    };
}, {
    labs: {
        resourceLimits: {
            cpu?: string | undefined;
            memory?: string | undefined;
            storage?: string | undefined;
        };
        defaultEnvironment?: "docker" | "kubernetes" | "vm" | undefined;
        networkIsolation?: boolean | undefined;
        autoCleanup?: boolean | undefined;
        cleanupDelay?: number | undefined;
    };
    assessment: {
        proctoring: {
            enabled?: boolean | undefined;
            requireWebcam?: boolean | undefined;
            requireScreenShare?: boolean | undefined;
            plagiarismDetection?: boolean | undefined;
        };
        randomizeQuestions?: boolean | undefined;
        showCorrectAnswers?: boolean | undefined;
        allowRetakes?: boolean | undefined;
    };
    features: {
        enrollmentRequired?: boolean | undefined;
        allowGuestAccess?: boolean | undefined;
        enableCertifications?: boolean | undefined;
        enableForums?: boolean | undefined;
        enableLabs?: boolean | undefined;
        enableAssessments?: boolean | undefined;
        enableProgressTracking?: boolean | undefined;
    };
    limits: {
        maxEnrollmentsPerUser?: number | undefined;
        maxLabDuration?: number | undefined;
        maxFileUploadSize?: number | undefined;
        maxLabAttempts?: number | undefined;
        maxAssessmentAttempts?: number | undefined;
    };
    notifications: {
        enableEmailNotifications?: boolean | undefined;
        enablePushNotifications?: boolean | undefined;
        enrollmentReminders?: boolean | undefined;
        assessmentReminders?: boolean | undefined;
        certificateNotifications?: boolean | undefined;
    };
}>;
export type EducationalConfig = z.infer<typeof EducationalConfigSchema>;
export declare const SearchFiltersSchema: z.ZodObject<{
    query: z.ZodOptional<z.ZodString>;
    category: z.ZodOptional<z.ZodString>;
    skillLevel: z.ZodOptional<z.ZodEnum<["beginner", "intermediate", "advanced"]>>;
    difficulty: z.ZodOptional<z.ZodEnum<["easy", "medium", "hard"]>>;
    tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    duration: z.ZodOptional<z.ZodObject<{
        min: z.ZodOptional<z.ZodNumber>;
        max: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        min?: number | undefined;
        max?: number | undefined;
    }, {
        min?: number | undefined;
        max?: number | undefined;
    }>>;
    type: z.ZodOptional<z.ZodString>;
    instructor: z.ZodOptional<z.ZodString>;
    certification: z.ZodOptional<z.ZodBoolean>;
    free: z.ZodOptional<z.ZodBoolean>;
    trending: z.ZodOptional<z.ZodBoolean>;
    featured: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    tags: string[];
    instructor?: string | undefined;
    type?: string | undefined;
    duration?: {
        min?: number | undefined;
        max?: number | undefined;
    } | undefined;
    difficulty?: "easy" | "medium" | "hard" | undefined;
    skillLevel?: "beginner" | "intermediate" | "advanced" | undefined;
    certification?: boolean | undefined;
    category?: string | undefined;
    trending?: boolean | undefined;
    featured?: boolean | undefined;
    free?: boolean | undefined;
    query?: string | undefined;
}, {
    instructor?: string | undefined;
    type?: string | undefined;
    duration?: {
        min?: number | undefined;
        max?: number | undefined;
    } | undefined;
    tags?: string[] | undefined;
    difficulty?: "easy" | "medium" | "hard" | undefined;
    skillLevel?: "beginner" | "intermediate" | "advanced" | undefined;
    certification?: boolean | undefined;
    category?: string | undefined;
    trending?: boolean | undefined;
    featured?: boolean | undefined;
    free?: boolean | undefined;
    query?: string | undefined;
}>;
export type SearchFilters = z.infer<typeof SearchFiltersSchema>;
export declare const PaginationSchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    sortBy: z.ZodDefault<z.ZodString>;
    sortOrder: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    sortBy: string;
    sortOrder: "asc" | "desc";
}, {
    page?: number | undefined;
    limit?: number | undefined;
    sortBy?: string | undefined;
    sortOrder?: "asc" | "desc" | undefined;
}>;
export type Pagination = z.infer<typeof PaginationSchema>;
export declare const LearningStatisticsSchema: z.ZodObject<{
    totalLearningPaths: z.ZodNumber;
    totalModules: z.ZodNumber;
    totalLessons: z.ZodNumber;
    totalLabs: z.ZodNumber;
    totalAssessments: z.ZodNumber;
    totalStudents: z.ZodNumber;
    totalInstructors: z.ZodNumber;
    totalEnrollments: z.ZodNumber;
    completionRate: z.ZodNumber;
    averageScore: z.ZodNumber;
    popularPaths: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        title: z.ZodString;
        enrollments: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        id: string;
        title: string;
        enrollments: number;
    }, {
        id: string;
        title: string;
        enrollments: number;
    }>, "many">;
    recentActivity: z.ZodArray<z.ZodObject<{
        type: z.ZodString;
        description: z.ZodString;
        timestamp: z.ZodDate;
    }, "strip", z.ZodTypeAny, {
        type: string;
        description: string;
        timestamp: Date;
    }, {
        type: string;
        description: string;
        timestamp: Date;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    totalLearningPaths: number;
    totalModules: number;
    totalLessons: number;
    totalLabs: number;
    totalAssessments: number;
    totalStudents: number;
    totalInstructors: number;
    totalEnrollments: number;
    completionRate: number;
    averageScore: number;
    popularPaths: {
        id: string;
        title: string;
        enrollments: number;
    }[];
    recentActivity: {
        type: string;
        description: string;
        timestamp: Date;
    }[];
}, {
    totalLearningPaths: number;
    totalModules: number;
    totalLessons: number;
    totalLabs: number;
    totalAssessments: number;
    totalStudents: number;
    totalInstructors: number;
    totalEnrollments: number;
    completionRate: number;
    averageScore: number;
    popularPaths: {
        id: string;
        title: string;
        enrollments: number;
    }[];
    recentActivity: {
        type: string;
        description: string;
        timestamp: Date;
    }[];
}>;
export type LearningStatistics = z.infer<typeof LearningStatisticsSchema>;
export declare const EducationalSchemas: {
    SkillLevelSchema: z.ZodEnum<["beginner", "intermediate", "advanced"]>;
    DifficultySchema: z.ZodEnum<["easy", "medium", "hard"]>;
    ContentTypeSchema: z.ZodEnum<["video", "article", "interactive", "simulation", "document"]>;
    AssessmentTypeSchema: z.ZodEnum<["quiz", "practical", "project", "simulation", "essay"]>;
    UserRoleSchema: z.ZodEnum<["student", "instructor", "admin", "mentor"]>;
    LabEnvironmentTypeSchema: z.ZodEnum<["simulated", "live", "sandboxed", "cloud"]>;
    QuestionTypeSchema: z.ZodEnum<["multiple-choice", "true-false", "fill-blank", "essay", "code", "simulation"]>;
    ProgressStatusSchema: z.ZodEnum<["not-started", "in-progress", "completed", "failed", "paused"]>;
    InteractiveContentSchema: z.ZodObject<{
        type: z.ZodEnum<["simulation", "diagram", "code-editor", "terminal", "network-map"]>;
        config: z.ZodRecord<z.ZodString, z.ZodAny>;
        data: z.ZodOptional<z.ZodAny>;
        instructions: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: "simulation" | "diagram" | "code-editor" | "terminal" | "network-map";
        config: Record<string, any>;
        instructions: string;
        data?: any;
    }, {
        type: "simulation" | "diagram" | "code-editor" | "terminal" | "network-map";
        config: Record<string, any>;
        instructions: string;
        data?: any;
    }>;
    QuizQuestionSchema: z.ZodObject<{
        id: z.ZodString;
        type: z.ZodEnum<["multiple-choice", "true-false", "fill-blank", "essay", "code", "simulation"]>;
        question: z.ZodString;
        options: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        correctAnswer: z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>;
        explanation: z.ZodOptional<z.ZodString>;
        points: z.ZodDefault<z.ZodNumber>;
        timeLimit: z.ZodOptional<z.ZodNumber>;
        hints: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
        id: string;
        question: string;
        correctAnswer: string | string[];
        points: number;
        hints: string[];
        options?: string[] | undefined;
        explanation?: string | undefined;
        timeLimit?: number | undefined;
    }, {
        type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
        id: string;
        question: string;
        correctAnswer: string | string[];
        options?: string[] | undefined;
        explanation?: string | undefined;
        points?: number | undefined;
        timeLimit?: number | undefined;
        hints?: string[] | undefined;
    }>;
    QuizSchema: z.ZodObject<{
        id: z.ZodString;
        title: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        questions: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            type: z.ZodEnum<["multiple-choice", "true-false", "fill-blank", "essay", "code", "simulation"]>;
            question: z.ZodString;
            options: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            correctAnswer: z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>;
            explanation: z.ZodOptional<z.ZodString>;
            points: z.ZodDefault<z.ZodNumber>;
            timeLimit: z.ZodOptional<z.ZodNumber>;
            hints: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
            id: string;
            question: string;
            correctAnswer: string | string[];
            points: number;
            hints: string[];
            options?: string[] | undefined;
            explanation?: string | undefined;
            timeLimit?: number | undefined;
        }, {
            type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
            id: string;
            question: string;
            correctAnswer: string | string[];
            options?: string[] | undefined;
            explanation?: string | undefined;
            points?: number | undefined;
            timeLimit?: number | undefined;
            hints?: string[] | undefined;
        }>, "many">;
        timeLimit: z.ZodOptional<z.ZodNumber>;
        passingScore: z.ZodDefault<z.ZodNumber>;
        maxAttempts: z.ZodDefault<z.ZodNumber>;
        randomizeQuestions: z.ZodDefault<z.ZodBoolean>;
        showResults: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        title: string;
        questions: {
            type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
            id: string;
            question: string;
            correctAnswer: string | string[];
            points: number;
            hints: string[];
            options?: string[] | undefined;
            explanation?: string | undefined;
            timeLimit?: number | undefined;
        }[];
        passingScore: number;
        maxAttempts: number;
        randomizeQuestions: boolean;
        showResults: boolean;
        timeLimit?: number | undefined;
        description?: string | undefined;
    }, {
        id: string;
        title: string;
        questions: {
            type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
            id: string;
            question: string;
            correctAnswer: string | string[];
            options?: string[] | undefined;
            explanation?: string | undefined;
            points?: number | undefined;
            timeLimit?: number | undefined;
            hints?: string[] | undefined;
        }[];
        timeLimit?: number | undefined;
        description?: string | undefined;
        passingScore?: number | undefined;
        maxAttempts?: number | undefined;
        randomizeQuestions?: boolean | undefined;
        showResults?: boolean | undefined;
    }>;
    LessonSchema: z.ZodObject<{
        id: z.ZodString;
        title: z.ZodString;
        description: z.ZodString;
        type: z.ZodEnum<["video", "article", "interactive", "simulation", "document"]>;
        content: z.ZodUnion<[z.ZodString, z.ZodObject<{
            videoUrl: z.ZodString;
            transcript: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            videoUrl: string;
            transcript?: string | undefined;
        }, {
            videoUrl: string;
            transcript?: string | undefined;
        }>, z.ZodObject<{
            type: z.ZodEnum<["simulation", "diagram", "code-editor", "terminal", "network-map"]>;
            config: z.ZodRecord<z.ZodString, z.ZodAny>;
            data: z.ZodOptional<z.ZodAny>;
            instructions: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            type: "simulation" | "diagram" | "code-editor" | "terminal" | "network-map";
            config: Record<string, any>;
            instructions: string;
            data?: any;
        }, {
            type: "simulation" | "diagram" | "code-editor" | "terminal" | "network-map";
            config: Record<string, any>;
            instructions: string;
            data?: any;
        }>]>;
        duration: z.ZodNumber;
        order: z.ZodNumber;
        quiz: z.ZodOptional<z.ZodObject<{
            id: z.ZodString;
            title: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            questions: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                type: z.ZodEnum<["multiple-choice", "true-false", "fill-blank", "essay", "code", "simulation"]>;
                question: z.ZodString;
                options: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                correctAnswer: z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>;
                explanation: z.ZodOptional<z.ZodString>;
                points: z.ZodDefault<z.ZodNumber>;
                timeLimit: z.ZodOptional<z.ZodNumber>;
                hints: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            }, "strip", z.ZodTypeAny, {
                type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
                id: string;
                question: string;
                correctAnswer: string | string[];
                points: number;
                hints: string[];
                options?: string[] | undefined;
                explanation?: string | undefined;
                timeLimit?: number | undefined;
            }, {
                type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
                id: string;
                question: string;
                correctAnswer: string | string[];
                options?: string[] | undefined;
                explanation?: string | undefined;
                points?: number | undefined;
                timeLimit?: number | undefined;
                hints?: string[] | undefined;
            }>, "many">;
            timeLimit: z.ZodOptional<z.ZodNumber>;
            passingScore: z.ZodDefault<z.ZodNumber>;
            maxAttempts: z.ZodDefault<z.ZodNumber>;
            randomizeQuestions: z.ZodDefault<z.ZodBoolean>;
            showResults: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            title: string;
            questions: {
                type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
                id: string;
                question: string;
                correctAnswer: string | string[];
                points: number;
                hints: string[];
                options?: string[] | undefined;
                explanation?: string | undefined;
                timeLimit?: number | undefined;
            }[];
            passingScore: number;
            maxAttempts: number;
            randomizeQuestions: boolean;
            showResults: boolean;
            timeLimit?: number | undefined;
            description?: string | undefined;
        }, {
            id: string;
            title: string;
            questions: {
                type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
                id: string;
                question: string;
                correctAnswer: string | string[];
                options?: string[] | undefined;
                explanation?: string | undefined;
                points?: number | undefined;
                timeLimit?: number | undefined;
                hints?: string[] | undefined;
            }[];
            timeLimit?: number | undefined;
            description?: string | undefined;
            passingScore?: number | undefined;
            maxAttempts?: number | undefined;
            randomizeQuestions?: boolean | undefined;
            showResults?: boolean | undefined;
        }>>;
        prerequisites: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        resources: z.ZodDefault<z.ZodArray<z.ZodObject<{
            title: z.ZodString;
            url: z.ZodString;
            type: z.ZodEnum<["document", "link", "tool"]>;
        }, "strip", z.ZodTypeAny, {
            type: "document" | "link" | "tool";
            title: string;
            url: string;
        }, {
            type: "document" | "link" | "tool";
            title: string;
            url: string;
        }>, "many">>;
        metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
    }, "strip", z.ZodTypeAny, {
        type: "video" | "article" | "interactive" | "simulation" | "document";
        id: string;
        title: string;
        description: string;
        content: string | {
            type: "simulation" | "diagram" | "code-editor" | "terminal" | "network-map";
            config: Record<string, any>;
            instructions: string;
            data?: any;
        } | {
            videoUrl: string;
            transcript?: string | undefined;
        };
        duration: number;
        order: number;
        prerequisites: string[];
        tags: string[];
        resources: {
            type: "document" | "link" | "tool";
            title: string;
            url: string;
        }[];
        metadata: Record<string, any>;
        quiz?: {
            id: string;
            title: string;
            questions: {
                type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
                id: string;
                question: string;
                correctAnswer: string | string[];
                points: number;
                hints: string[];
                options?: string[] | undefined;
                explanation?: string | undefined;
                timeLimit?: number | undefined;
            }[];
            passingScore: number;
            maxAttempts: number;
            randomizeQuestions: boolean;
            showResults: boolean;
            timeLimit?: number | undefined;
            description?: string | undefined;
        } | undefined;
    }, {
        type: "video" | "article" | "interactive" | "simulation" | "document";
        id: string;
        title: string;
        description: string;
        content: string | {
            type: "simulation" | "diagram" | "code-editor" | "terminal" | "network-map";
            config: Record<string, any>;
            instructions: string;
            data?: any;
        } | {
            videoUrl: string;
            transcript?: string | undefined;
        };
        duration: number;
        order: number;
        quiz?: {
            id: string;
            title: string;
            questions: {
                type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
                id: string;
                question: string;
                correctAnswer: string | string[];
                options?: string[] | undefined;
                explanation?: string | undefined;
                points?: number | undefined;
                timeLimit?: number | undefined;
                hints?: string[] | undefined;
            }[];
            timeLimit?: number | undefined;
            description?: string | undefined;
            passingScore?: number | undefined;
            maxAttempts?: number | undefined;
            randomizeQuestions?: boolean | undefined;
            showResults?: boolean | undefined;
        } | undefined;
        prerequisites?: string[] | undefined;
        tags?: string[] | undefined;
        resources?: {
            type: "document" | "link" | "tool";
            title: string;
            url: string;
        }[] | undefined;
        metadata?: Record<string, any> | undefined;
    }>;
    LabHintSchema: z.ZodObject<{
        id: z.ZodString;
        order: z.ZodNumber;
        title: z.ZodString;
        content: z.ZodString;
        pointDeduction: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        title: string;
        content: string;
        order: number;
        pointDeduction: number;
    }, {
        id: string;
        title: string;
        content: string;
        order: number;
        pointDeduction?: number | undefined;
    }>;
    LabTaskSchema: z.ZodObject<{
        id: z.ZodString;
        title: z.ZodString;
        description: z.ZodString;
        order: z.ZodNumber;
        instructions: z.ZodString;
        expectedOutput: z.ZodOptional<z.ZodString>;
        validationScript: z.ZodOptional<z.ZodString>;
        points: z.ZodDefault<z.ZodNumber>;
        timeLimit: z.ZodOptional<z.ZodNumber>;
        prerequisites: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        tools: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        flags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        instructions: string;
        id: string;
        points: number;
        title: string;
        description: string;
        order: number;
        prerequisites: string[];
        tools: string[];
        flags: string[];
        timeLimit?: number | undefined;
        expectedOutput?: string | undefined;
        validationScript?: string | undefined;
    }, {
        instructions: string;
        id: string;
        title: string;
        description: string;
        order: number;
        points?: number | undefined;
        timeLimit?: number | undefined;
        prerequisites?: string[] | undefined;
        expectedOutput?: string | undefined;
        validationScript?: string | undefined;
        tools?: string[] | undefined;
        flags?: string[] | undefined;
    }>;
    LabEnvironmentSchema: z.ZodObject<{
        type: z.ZodEnum<["simulated", "live", "sandboxed", "cloud"]>;
        config: z.ZodObject<{
            containers: z.ZodDefault<z.ZodArray<z.ZodObject<{
                name: z.ZodString;
                image: z.ZodString;
                ports: z.ZodDefault<z.ZodArray<z.ZodNumber, "many">>;
                environment: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>;
                volumes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            }, "strip", z.ZodTypeAny, {
                name: string;
                image: string;
                ports: number[];
                environment: Record<string, string>;
                volumes: string[];
            }, {
                name: string;
                image: string;
                ports?: number[] | undefined;
                environment?: Record<string, string> | undefined;
                volumes?: string[] | undefined;
            }>, "many">>;
            network: z.ZodOptional<z.ZodObject<{
                isolated: z.ZodDefault<z.ZodBoolean>;
                allowInternet: z.ZodDefault<z.ZodBoolean>;
                customTopology: z.ZodOptional<z.ZodAny>;
            }, "strip", z.ZodTypeAny, {
                isolated: boolean;
                allowInternet: boolean;
                customTopology?: any;
            }, {
                isolated?: boolean | undefined;
                allowInternet?: boolean | undefined;
                customTopology?: any;
            }>>;
            resources: z.ZodOptional<z.ZodObject<{
                cpu: z.ZodDefault<z.ZodString>;
                memory: z.ZodDefault<z.ZodString>;
                storage: z.ZodDefault<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                cpu: string;
                memory: string;
                storage: string;
            }, {
                cpu?: string | undefined;
                memory?: string | undefined;
                storage?: string | undefined;
            }>>;
            timeout: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            containers: {
                name: string;
                image: string;
                ports: number[];
                environment: Record<string, string>;
                volumes: string[];
            }[];
            timeout: number;
            resources?: {
                cpu: string;
                memory: string;
                storage: string;
            } | undefined;
            network?: {
                isolated: boolean;
                allowInternet: boolean;
                customTopology?: any;
            } | undefined;
        }, {
            resources?: {
                cpu?: string | undefined;
                memory?: string | undefined;
                storage?: string | undefined;
            } | undefined;
            containers?: {
                name: string;
                image: string;
                ports?: number[] | undefined;
                environment?: Record<string, string> | undefined;
                volumes?: string[] | undefined;
            }[] | undefined;
            network?: {
                isolated?: boolean | undefined;
                allowInternet?: boolean | undefined;
                customTopology?: any;
            } | undefined;
            timeout?: number | undefined;
        }>;
        provisioning: z.ZodOptional<z.ZodObject<{
            setupScript: z.ZodOptional<z.ZodString>;
            teardownScript: z.ZodOptional<z.ZodString>;
            healthCheck: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            setupScript?: string | undefined;
            teardownScript?: string | undefined;
            healthCheck?: string | undefined;
        }, {
            setupScript?: string | undefined;
            teardownScript?: string | undefined;
            healthCheck?: string | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        type: "simulated" | "live" | "sandboxed" | "cloud";
        config: {
            containers: {
                name: string;
                image: string;
                ports: number[];
                environment: Record<string, string>;
                volumes: string[];
            }[];
            timeout: number;
            resources?: {
                cpu: string;
                memory: string;
                storage: string;
            } | undefined;
            network?: {
                isolated: boolean;
                allowInternet: boolean;
                customTopology?: any;
            } | undefined;
        };
        provisioning?: {
            setupScript?: string | undefined;
            teardownScript?: string | undefined;
            healthCheck?: string | undefined;
        } | undefined;
    }, {
        type: "simulated" | "live" | "sandboxed" | "cloud";
        config: {
            resources?: {
                cpu?: string | undefined;
                memory?: string | undefined;
                storage?: string | undefined;
            } | undefined;
            containers?: {
                name: string;
                image: string;
                ports?: number[] | undefined;
                environment?: Record<string, string> | undefined;
                volumes?: string[] | undefined;
            }[] | undefined;
            network?: {
                isolated?: boolean | undefined;
                allowInternet?: boolean | undefined;
                customTopology?: any;
            } | undefined;
            timeout?: number | undefined;
        };
        provisioning?: {
            setupScript?: string | undefined;
            teardownScript?: string | undefined;
            healthCheck?: string | undefined;
        } | undefined;
    }>;
    LabSchema: z.ZodObject<{
        id: z.ZodString;
        title: z.ZodString;
        description: z.ZodString;
        difficulty: z.ZodEnum<["easy", "medium", "hard"]>;
        skillLevel: z.ZodEnum<["beginner", "intermediate", "advanced"]>;
        environment: z.ZodObject<{
            type: z.ZodEnum<["simulated", "live", "sandboxed", "cloud"]>;
            config: z.ZodObject<{
                containers: z.ZodDefault<z.ZodArray<z.ZodObject<{
                    name: z.ZodString;
                    image: z.ZodString;
                    ports: z.ZodDefault<z.ZodArray<z.ZodNumber, "many">>;
                    environment: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>;
                    volumes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
                }, "strip", z.ZodTypeAny, {
                    name: string;
                    image: string;
                    ports: number[];
                    environment: Record<string, string>;
                    volumes: string[];
                }, {
                    name: string;
                    image: string;
                    ports?: number[] | undefined;
                    environment?: Record<string, string> | undefined;
                    volumes?: string[] | undefined;
                }>, "many">>;
                network: z.ZodOptional<z.ZodObject<{
                    isolated: z.ZodDefault<z.ZodBoolean>;
                    allowInternet: z.ZodDefault<z.ZodBoolean>;
                    customTopology: z.ZodOptional<z.ZodAny>;
                }, "strip", z.ZodTypeAny, {
                    isolated: boolean;
                    allowInternet: boolean;
                    customTopology?: any;
                }, {
                    isolated?: boolean | undefined;
                    allowInternet?: boolean | undefined;
                    customTopology?: any;
                }>>;
                resources: z.ZodOptional<z.ZodObject<{
                    cpu: z.ZodDefault<z.ZodString>;
                    memory: z.ZodDefault<z.ZodString>;
                    storage: z.ZodDefault<z.ZodString>;
                }, "strip", z.ZodTypeAny, {
                    cpu: string;
                    memory: string;
                    storage: string;
                }, {
                    cpu?: string | undefined;
                    memory?: string | undefined;
                    storage?: string | undefined;
                }>>;
                timeout: z.ZodDefault<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                containers: {
                    name: string;
                    image: string;
                    ports: number[];
                    environment: Record<string, string>;
                    volumes: string[];
                }[];
                timeout: number;
                resources?: {
                    cpu: string;
                    memory: string;
                    storage: string;
                } | undefined;
                network?: {
                    isolated: boolean;
                    allowInternet: boolean;
                    customTopology?: any;
                } | undefined;
            }, {
                resources?: {
                    cpu?: string | undefined;
                    memory?: string | undefined;
                    storage?: string | undefined;
                } | undefined;
                containers?: {
                    name: string;
                    image: string;
                    ports?: number[] | undefined;
                    environment?: Record<string, string> | undefined;
                    volumes?: string[] | undefined;
                }[] | undefined;
                network?: {
                    isolated?: boolean | undefined;
                    allowInternet?: boolean | undefined;
                    customTopology?: any;
                } | undefined;
                timeout?: number | undefined;
            }>;
            provisioning: z.ZodOptional<z.ZodObject<{
                setupScript: z.ZodOptional<z.ZodString>;
                teardownScript: z.ZodOptional<z.ZodString>;
                healthCheck: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                setupScript?: string | undefined;
                teardownScript?: string | undefined;
                healthCheck?: string | undefined;
            }, {
                setupScript?: string | undefined;
                teardownScript?: string | undefined;
                healthCheck?: string | undefined;
            }>>;
        }, "strip", z.ZodTypeAny, {
            type: "simulated" | "live" | "sandboxed" | "cloud";
            config: {
                containers: {
                    name: string;
                    image: string;
                    ports: number[];
                    environment: Record<string, string>;
                    volumes: string[];
                }[];
                timeout: number;
                resources?: {
                    cpu: string;
                    memory: string;
                    storage: string;
                } | undefined;
                network?: {
                    isolated: boolean;
                    allowInternet: boolean;
                    customTopology?: any;
                } | undefined;
            };
            provisioning?: {
                setupScript?: string | undefined;
                teardownScript?: string | undefined;
                healthCheck?: string | undefined;
            } | undefined;
        }, {
            type: "simulated" | "live" | "sandboxed" | "cloud";
            config: {
                resources?: {
                    cpu?: string | undefined;
                    memory?: string | undefined;
                    storage?: string | undefined;
                } | undefined;
                containers?: {
                    name: string;
                    image: string;
                    ports?: number[] | undefined;
                    environment?: Record<string, string> | undefined;
                    volumes?: string[] | undefined;
                }[] | undefined;
                network?: {
                    isolated?: boolean | undefined;
                    allowInternet?: boolean | undefined;
                    customTopology?: any;
                } | undefined;
                timeout?: number | undefined;
            };
            provisioning?: {
                setupScript?: string | undefined;
                teardownScript?: string | undefined;
                healthCheck?: string | undefined;
            } | undefined;
        }>;
        tasks: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            title: z.ZodString;
            description: z.ZodString;
            order: z.ZodNumber;
            instructions: z.ZodString;
            expectedOutput: z.ZodOptional<z.ZodString>;
            validationScript: z.ZodOptional<z.ZodString>;
            points: z.ZodDefault<z.ZodNumber>;
            timeLimit: z.ZodOptional<z.ZodNumber>;
            prerequisites: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            tools: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            flags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            instructions: string;
            id: string;
            points: number;
            title: string;
            description: string;
            order: number;
            prerequisites: string[];
            tools: string[];
            flags: string[];
            timeLimit?: number | undefined;
            expectedOutput?: string | undefined;
            validationScript?: string | undefined;
        }, {
            instructions: string;
            id: string;
            title: string;
            description: string;
            order: number;
            points?: number | undefined;
            timeLimit?: number | undefined;
            prerequisites?: string[] | undefined;
            expectedOutput?: string | undefined;
            validationScript?: string | undefined;
            tools?: string[] | undefined;
            flags?: string[] | undefined;
        }>, "many">;
        hints: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            order: z.ZodNumber;
            title: z.ZodString;
            content: z.ZodString;
            pointDeduction: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            title: string;
            content: string;
            order: number;
            pointDeduction: number;
        }, {
            id: string;
            title: string;
            content: string;
            order: number;
            pointDeduction?: number | undefined;
        }>, "many">>;
        solution: z.ZodString;
        estimatedTime: z.ZodNumber;
        maxAttempts: z.ZodDefault<z.ZodNumber>;
        order: z.ZodNumber;
        prerequisites: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        learningObjectives: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        references: z.ZodDefault<z.ZodArray<z.ZodObject<{
            title: z.ZodString;
            url: z.ZodString;
            type: z.ZodEnum<["documentation", "tutorial", "tool", "research"]>;
        }, "strip", z.ZodTypeAny, {
            type: "tool" | "documentation" | "tutorial" | "research";
            title: string;
            url: string;
        }, {
            type: "tool" | "documentation" | "tutorial" | "research";
            title: string;
            url: string;
        }>, "many">>;
        createdBy: z.ZodString;
        createdAt: z.ZodDate;
        updatedAt: z.ZodDate;
        metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        hints: {
            id: string;
            title: string;
            content: string;
            order: number;
            pointDeduction: number;
        }[];
        title: string;
        description: string;
        maxAttempts: number;
        order: number;
        prerequisites: string[];
        tags: string[];
        metadata: Record<string, any>;
        environment: {
            type: "simulated" | "live" | "sandboxed" | "cloud";
            config: {
                containers: {
                    name: string;
                    image: string;
                    ports: number[];
                    environment: Record<string, string>;
                    volumes: string[];
                }[];
                timeout: number;
                resources?: {
                    cpu: string;
                    memory: string;
                    storage: string;
                } | undefined;
                network?: {
                    isolated: boolean;
                    allowInternet: boolean;
                    customTopology?: any;
                } | undefined;
            };
            provisioning?: {
                setupScript?: string | undefined;
                teardownScript?: string | undefined;
                healthCheck?: string | undefined;
            } | undefined;
        };
        difficulty: "easy" | "medium" | "hard";
        skillLevel: "beginner" | "intermediate" | "advanced";
        tasks: {
            instructions: string;
            id: string;
            points: number;
            title: string;
            description: string;
            order: number;
            prerequisites: string[];
            tools: string[];
            flags: string[];
            timeLimit?: number | undefined;
            expectedOutput?: string | undefined;
            validationScript?: string | undefined;
        }[];
        solution: string;
        estimatedTime: number;
        learningObjectives: string[];
        references: {
            type: "tool" | "documentation" | "tutorial" | "research";
            title: string;
            url: string;
        }[];
        createdBy: string;
        createdAt: Date;
        updatedAt: Date;
    }, {
        id: string;
        title: string;
        description: string;
        order: number;
        environment: {
            type: "simulated" | "live" | "sandboxed" | "cloud";
            config: {
                resources?: {
                    cpu?: string | undefined;
                    memory?: string | undefined;
                    storage?: string | undefined;
                } | undefined;
                containers?: {
                    name: string;
                    image: string;
                    ports?: number[] | undefined;
                    environment?: Record<string, string> | undefined;
                    volumes?: string[] | undefined;
                }[] | undefined;
                network?: {
                    isolated?: boolean | undefined;
                    allowInternet?: boolean | undefined;
                    customTopology?: any;
                } | undefined;
                timeout?: number | undefined;
            };
            provisioning?: {
                setupScript?: string | undefined;
                teardownScript?: string | undefined;
                healthCheck?: string | undefined;
            } | undefined;
        };
        difficulty: "easy" | "medium" | "hard";
        skillLevel: "beginner" | "intermediate" | "advanced";
        tasks: {
            instructions: string;
            id: string;
            title: string;
            description: string;
            order: number;
            points?: number | undefined;
            timeLimit?: number | undefined;
            prerequisites?: string[] | undefined;
            expectedOutput?: string | undefined;
            validationScript?: string | undefined;
            tools?: string[] | undefined;
            flags?: string[] | undefined;
        }[];
        solution: string;
        estimatedTime: number;
        createdBy: string;
        createdAt: Date;
        updatedAt: Date;
        hints?: {
            id: string;
            title: string;
            content: string;
            order: number;
            pointDeduction?: number | undefined;
        }[] | undefined;
        maxAttempts?: number | undefined;
        prerequisites?: string[] | undefined;
        tags?: string[] | undefined;
        metadata?: Record<string, any> | undefined;
        learningObjectives?: string[] | undefined;
        references?: {
            type: "tool" | "documentation" | "tutorial" | "research";
            title: string;
            url: string;
        }[] | undefined;
    }>;
    AssessmentResultSchema: z.ZodObject<{
        id: z.ZodString;
        assessmentId: z.ZodString;
        studentId: z.ZodString;
        type: z.ZodEnum<["quiz", "practical", "project", "simulation", "essay"]>;
        score: z.ZodNumber;
        maxScore: z.ZodNumber;
        passed: z.ZodBoolean;
        startedAt: z.ZodDate;
        completedAt: z.ZodOptional<z.ZodDate>;
        timeSpent: z.ZodNumber;
        answers: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
        feedback: z.ZodOptional<z.ZodString>;
        graderNotes: z.ZodOptional<z.ZodString>;
        attempt: z.ZodDefault<z.ZodNumber>;
        metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
    }, "strip", z.ZodTypeAny, {
        type: "simulation" | "quiz" | "practical" | "project" | "essay";
        id: string;
        metadata: Record<string, any>;
        assessmentId: string;
        studentId: string;
        score: number;
        maxScore: number;
        passed: boolean;
        startedAt: Date;
        timeSpent: number;
        answers: Record<string, any>;
        attempt: number;
        completedAt?: Date | undefined;
        feedback?: string | undefined;
        graderNotes?: string | undefined;
    }, {
        type: "simulation" | "quiz" | "practical" | "project" | "essay";
        id: string;
        assessmentId: string;
        studentId: string;
        score: number;
        maxScore: number;
        passed: boolean;
        startedAt: Date;
        timeSpent: number;
        metadata?: Record<string, any> | undefined;
        completedAt?: Date | undefined;
        answers?: Record<string, any> | undefined;
        feedback?: string | undefined;
        graderNotes?: string | undefined;
        attempt?: number | undefined;
    }>;
    AssessmentSchema: z.ZodObject<{
        id: z.ZodString;
        title: z.ZodString;
        description: z.ZodString;
        type: z.ZodEnum<["quiz", "practical", "project", "simulation", "essay"]>;
        difficulty: z.ZodEnum<["easy", "medium", "hard"]>;
        timeLimit: z.ZodOptional<z.ZodNumber>;
        passingScore: z.ZodDefault<z.ZodNumber>;
        maxAttempts: z.ZodDefault<z.ZodNumber>;
        questions: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            type: z.ZodEnum<["multiple-choice", "true-false", "fill-blank", "essay", "code", "simulation"]>;
            question: z.ZodString;
            options: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            correctAnswer: z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>;
            explanation: z.ZodOptional<z.ZodString>;
            points: z.ZodDefault<z.ZodNumber>;
            timeLimit: z.ZodOptional<z.ZodNumber>;
            hints: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
            id: string;
            question: string;
            correctAnswer: string | string[];
            points: number;
            hints: string[];
            options?: string[] | undefined;
            explanation?: string | undefined;
            timeLimit?: number | undefined;
        }, {
            type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
            id: string;
            question: string;
            correctAnswer: string | string[];
            options?: string[] | undefined;
            explanation?: string | undefined;
            points?: number | undefined;
            timeLimit?: number | undefined;
            hints?: string[] | undefined;
        }>, "many">>;
        practicalTasks: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            title: z.ZodString;
            description: z.ZodString;
            order: z.ZodNumber;
            instructions: z.ZodString;
            expectedOutput: z.ZodOptional<z.ZodString>;
            validationScript: z.ZodOptional<z.ZodString>;
            points: z.ZodDefault<z.ZodNumber>;
            timeLimit: z.ZodOptional<z.ZodNumber>;
            prerequisites: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            tools: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            flags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            instructions: string;
            id: string;
            points: number;
            title: string;
            description: string;
            order: number;
            prerequisites: string[];
            tools: string[];
            flags: string[];
            timeLimit?: number | undefined;
            expectedOutput?: string | undefined;
            validationScript?: string | undefined;
        }, {
            instructions: string;
            id: string;
            title: string;
            description: string;
            order: number;
            points?: number | undefined;
            timeLimit?: number | undefined;
            prerequisites?: string[] | undefined;
            expectedOutput?: string | undefined;
            validationScript?: string | undefined;
            tools?: string[] | undefined;
            flags?: string[] | undefined;
        }>, "many">>;
        rubric: z.ZodOptional<z.ZodObject<{
            criteria: z.ZodArray<z.ZodObject<{
                name: z.ZodString;
                description: z.ZodString;
                maxPoints: z.ZodNumber;
                weight: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                description: string;
                name: string;
                maxPoints: number;
                weight: number;
            }, {
                description: string;
                name: string;
                maxPoints: number;
                weight: number;
            }>, "many">;
        }, "strip", z.ZodTypeAny, {
            criteria: {
                description: string;
                name: string;
                maxPoints: number;
                weight: number;
            }[];
        }, {
            criteria: {
                description: string;
                name: string;
                maxPoints: number;
                weight: number;
            }[];
        }>>;
        autoGrading: z.ZodDefault<z.ZodBoolean>;
        order: z.ZodNumber;
        prerequisites: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        createdBy: z.ZodString;
        createdAt: z.ZodDate;
        updatedAt: z.ZodDate;
        metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
    }, "strip", z.ZodTypeAny, {
        type: "simulation" | "quiz" | "practical" | "project" | "essay";
        id: string;
        title: string;
        description: string;
        passingScore: number;
        maxAttempts: number;
        order: number;
        prerequisites: string[];
        tags: string[];
        metadata: Record<string, any>;
        difficulty: "easy" | "medium" | "hard";
        createdBy: string;
        createdAt: Date;
        updatedAt: Date;
        autoGrading: boolean;
        timeLimit?: number | undefined;
        questions?: {
            type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
            id: string;
            question: string;
            correctAnswer: string | string[];
            points: number;
            hints: string[];
            options?: string[] | undefined;
            explanation?: string | undefined;
            timeLimit?: number | undefined;
        }[] | undefined;
        practicalTasks?: {
            instructions: string;
            id: string;
            points: number;
            title: string;
            description: string;
            order: number;
            prerequisites: string[];
            tools: string[];
            flags: string[];
            timeLimit?: number | undefined;
            expectedOutput?: string | undefined;
            validationScript?: string | undefined;
        }[] | undefined;
        rubric?: {
            criteria: {
                description: string;
                name: string;
                maxPoints: number;
                weight: number;
            }[];
        } | undefined;
    }, {
        type: "simulation" | "quiz" | "practical" | "project" | "essay";
        id: string;
        title: string;
        description: string;
        order: number;
        difficulty: "easy" | "medium" | "hard";
        createdBy: string;
        createdAt: Date;
        updatedAt: Date;
        timeLimit?: number | undefined;
        questions?: {
            type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
            id: string;
            question: string;
            correctAnswer: string | string[];
            options?: string[] | undefined;
            explanation?: string | undefined;
            points?: number | undefined;
            timeLimit?: number | undefined;
            hints?: string[] | undefined;
        }[] | undefined;
        passingScore?: number | undefined;
        maxAttempts?: number | undefined;
        prerequisites?: string[] | undefined;
        tags?: string[] | undefined;
        metadata?: Record<string, any> | undefined;
        practicalTasks?: {
            instructions: string;
            id: string;
            title: string;
            description: string;
            order: number;
            points?: number | undefined;
            timeLimit?: number | undefined;
            prerequisites?: string[] | undefined;
            expectedOutput?: string | undefined;
            validationScript?: string | undefined;
            tools?: string[] | undefined;
            flags?: string[] | undefined;
        }[] | undefined;
        rubric?: {
            criteria: {
                description: string;
                name: string;
                maxPoints: number;
                weight: number;
            }[];
        } | undefined;
        autoGrading?: boolean | undefined;
    }>;
    CompletionCriteriaSchema: z.ZodObject<{
        requiredLessons: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        requiredLabs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        requiredAssessments: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        minimumAssessmentScore: z.ZodDefault<z.ZodNumber>;
        minimumLabScore: z.ZodDefault<z.ZodNumber>;
        requireAllLessons: z.ZodDefault<z.ZodBoolean>;
        requireAllLabs: z.ZodDefault<z.ZodBoolean>;
        requireAllAssessments: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        requiredLessons: string[];
        requiredLabs: string[];
        requiredAssessments: string[];
        minimumAssessmentScore: number;
        minimumLabScore: number;
        requireAllLessons: boolean;
        requireAllLabs: boolean;
        requireAllAssessments: boolean;
    }, {
        requiredLessons?: string[] | undefined;
        requiredLabs?: string[] | undefined;
        requiredAssessments?: string[] | undefined;
        minimumAssessmentScore?: number | undefined;
        minimumLabScore?: number | undefined;
        requireAllLessons?: boolean | undefined;
        requireAllLabs?: boolean | undefined;
        requireAllAssessments?: boolean | undefined;
    }>;
    LearningModuleSchema: z.ZodObject<{
        id: z.ZodString;
        title: z.ZodString;
        description: z.ZodString;
        order: z.ZodNumber;
        estimatedHours: z.ZodNumber;
        skillLevel: z.ZodEnum<["beginner", "intermediate", "advanced"]>;
        content: z.ZodObject<{
            lessons: z.ZodDefault<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                title: z.ZodString;
                description: z.ZodString;
                type: z.ZodEnum<["video", "article", "interactive", "simulation", "document"]>;
                content: z.ZodUnion<[z.ZodString, z.ZodObject<{
                    videoUrl: z.ZodString;
                    transcript: z.ZodOptional<z.ZodString>;
                }, "strip", z.ZodTypeAny, {
                    videoUrl: string;
                    transcript?: string | undefined;
                }, {
                    videoUrl: string;
                    transcript?: string | undefined;
                }>, z.ZodObject<{
                    type: z.ZodEnum<["simulation", "diagram", "code-editor", "terminal", "network-map"]>;
                    config: z.ZodRecord<z.ZodString, z.ZodAny>;
                    data: z.ZodOptional<z.ZodAny>;
                    instructions: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    type: "simulation" | "diagram" | "code-editor" | "terminal" | "network-map";
                    config: Record<string, any>;
                    instructions: string;
                    data?: any;
                }, {
                    type: "simulation" | "diagram" | "code-editor" | "terminal" | "network-map";
                    config: Record<string, any>;
                    instructions: string;
                    data?: any;
                }>]>;
                duration: z.ZodNumber;
                order: z.ZodNumber;
                quiz: z.ZodOptional<z.ZodObject<{
                    id: z.ZodString;
                    title: z.ZodString;
                    description: z.ZodOptional<z.ZodString>;
                    questions: z.ZodArray<z.ZodObject<{
                        id: z.ZodString;
                        type: z.ZodEnum<["multiple-choice", "true-false", "fill-blank", "essay", "code", "simulation"]>;
                        question: z.ZodString;
                        options: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                        correctAnswer: z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>;
                        explanation: z.ZodOptional<z.ZodString>;
                        points: z.ZodDefault<z.ZodNumber>;
                        timeLimit: z.ZodOptional<z.ZodNumber>;
                        hints: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
                    }, "strip", z.ZodTypeAny, {
                        type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
                        id: string;
                        question: string;
                        correctAnswer: string | string[];
                        points: number;
                        hints: string[];
                        options?: string[] | undefined;
                        explanation?: string | undefined;
                        timeLimit?: number | undefined;
                    }, {
                        type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
                        id: string;
                        question: string;
                        correctAnswer: string | string[];
                        options?: string[] | undefined;
                        explanation?: string | undefined;
                        points?: number | undefined;
                        timeLimit?: number | undefined;
                        hints?: string[] | undefined;
                    }>, "many">;
                    timeLimit: z.ZodOptional<z.ZodNumber>;
                    passingScore: z.ZodDefault<z.ZodNumber>;
                    maxAttempts: z.ZodDefault<z.ZodNumber>;
                    randomizeQuestions: z.ZodDefault<z.ZodBoolean>;
                    showResults: z.ZodDefault<z.ZodBoolean>;
                }, "strip", z.ZodTypeAny, {
                    id: string;
                    title: string;
                    questions: {
                        type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
                        id: string;
                        question: string;
                        correctAnswer: string | string[];
                        points: number;
                        hints: string[];
                        options?: string[] | undefined;
                        explanation?: string | undefined;
                        timeLimit?: number | undefined;
                    }[];
                    passingScore: number;
                    maxAttempts: number;
                    randomizeQuestions: boolean;
                    showResults: boolean;
                    timeLimit?: number | undefined;
                    description?: string | undefined;
                }, {
                    id: string;
                    title: string;
                    questions: {
                        type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
                        id: string;
                        question: string;
                        correctAnswer: string | string[];
                        options?: string[] | undefined;
                        explanation?: string | undefined;
                        points?: number | undefined;
                        timeLimit?: number | undefined;
                        hints?: string[] | undefined;
                    }[];
                    timeLimit?: number | undefined;
                    description?: string | undefined;
                    passingScore?: number | undefined;
                    maxAttempts?: number | undefined;
                    randomizeQuestions?: boolean | undefined;
                    showResults?: boolean | undefined;
                }>>;
                prerequisites: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
                tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
                resources: z.ZodDefault<z.ZodArray<z.ZodObject<{
                    title: z.ZodString;
                    url: z.ZodString;
                    type: z.ZodEnum<["document", "link", "tool"]>;
                }, "strip", z.ZodTypeAny, {
                    type: "document" | "link" | "tool";
                    title: string;
                    url: string;
                }, {
                    type: "document" | "link" | "tool";
                    title: string;
                    url: string;
                }>, "many">>;
                metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
            }, "strip", z.ZodTypeAny, {
                type: "video" | "article" | "interactive" | "simulation" | "document";
                id: string;
                title: string;
                description: string;
                content: string | {
                    type: "simulation" | "diagram" | "code-editor" | "terminal" | "network-map";
                    config: Record<string, any>;
                    instructions: string;
                    data?: any;
                } | {
                    videoUrl: string;
                    transcript?: string | undefined;
                };
                duration: number;
                order: number;
                prerequisites: string[];
                tags: string[];
                resources: {
                    type: "document" | "link" | "tool";
                    title: string;
                    url: string;
                }[];
                metadata: Record<string, any>;
                quiz?: {
                    id: string;
                    title: string;
                    questions: {
                        type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
                        id: string;
                        question: string;
                        correctAnswer: string | string[];
                        points: number;
                        hints: string[];
                        options?: string[] | undefined;
                        explanation?: string | undefined;
                        timeLimit?: number | undefined;
                    }[];
                    passingScore: number;
                    maxAttempts: number;
                    randomizeQuestions: boolean;
                    showResults: boolean;
                    timeLimit?: number | undefined;
                    description?: string | undefined;
                } | undefined;
            }, {
                type: "video" | "article" | "interactive" | "simulation" | "document";
                id: string;
                title: string;
                description: string;
                content: string | {
                    type: "simulation" | "diagram" | "code-editor" | "terminal" | "network-map";
                    config: Record<string, any>;
                    instructions: string;
                    data?: any;
                } | {
                    videoUrl: string;
                    transcript?: string | undefined;
                };
                duration: number;
                order: number;
                quiz?: {
                    id: string;
                    title: string;
                    questions: {
                        type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
                        id: string;
                        question: string;
                        correctAnswer: string | string[];
                        options?: string[] | undefined;
                        explanation?: string | undefined;
                        points?: number | undefined;
                        timeLimit?: number | undefined;
                        hints?: string[] | undefined;
                    }[];
                    timeLimit?: number | undefined;
                    description?: string | undefined;
                    passingScore?: number | undefined;
                    maxAttempts?: number | undefined;
                    randomizeQuestions?: boolean | undefined;
                    showResults?: boolean | undefined;
                } | undefined;
                prerequisites?: string[] | undefined;
                tags?: string[] | undefined;
                resources?: {
                    type: "document" | "link" | "tool";
                    title: string;
                    url: string;
                }[] | undefined;
                metadata?: Record<string, any> | undefined;
            }>, "many">>;
            labs: z.ZodDefault<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                title: z.ZodString;
                description: z.ZodString;
                difficulty: z.ZodEnum<["easy", "medium", "hard"]>;
                skillLevel: z.ZodEnum<["beginner", "intermediate", "advanced"]>;
                environment: z.ZodObject<{
                    type: z.ZodEnum<["simulated", "live", "sandboxed", "cloud"]>;
                    config: z.ZodObject<{
                        containers: z.ZodDefault<z.ZodArray<z.ZodObject<{
                            name: z.ZodString;
                            image: z.ZodString;
                            ports: z.ZodDefault<z.ZodArray<z.ZodNumber, "many">>;
                            environment: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>;
                            volumes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
                        }, "strip", z.ZodTypeAny, {
                            name: string;
                            image: string;
                            ports: number[];
                            environment: Record<string, string>;
                            volumes: string[];
                        }, {
                            name: string;
                            image: string;
                            ports?: number[] | undefined;
                            environment?: Record<string, string> | undefined;
                            volumes?: string[] | undefined;
                        }>, "many">>;
                        network: z.ZodOptional<z.ZodObject<{
                            isolated: z.ZodDefault<z.ZodBoolean>;
                            allowInternet: z.ZodDefault<z.ZodBoolean>;
                            customTopology: z.ZodOptional<z.ZodAny>;
                        }, "strip", z.ZodTypeAny, {
                            isolated: boolean;
                            allowInternet: boolean;
                            customTopology?: any;
                        }, {
                            isolated?: boolean | undefined;
                            allowInternet?: boolean | undefined;
                            customTopology?: any;
                        }>>;
                        resources: z.ZodOptional<z.ZodObject<{
                            cpu: z.ZodDefault<z.ZodString>;
                            memory: z.ZodDefault<z.ZodString>;
                            storage: z.ZodDefault<z.ZodString>;
                        }, "strip", z.ZodTypeAny, {
                            cpu: string;
                            memory: string;
                            storage: string;
                        }, {
                            cpu?: string | undefined;
                            memory?: string | undefined;
                            storage?: string | undefined;
                        }>>;
                        timeout: z.ZodDefault<z.ZodNumber>;
                    }, "strip", z.ZodTypeAny, {
                        containers: {
                            name: string;
                            image: string;
                            ports: number[];
                            environment: Record<string, string>;
                            volumes: string[];
                        }[];
                        timeout: number;
                        resources?: {
                            cpu: string;
                            memory: string;
                            storage: string;
                        } | undefined;
                        network?: {
                            isolated: boolean;
                            allowInternet: boolean;
                            customTopology?: any;
                        } | undefined;
                    }, {
                        resources?: {
                            cpu?: string | undefined;
                            memory?: string | undefined;
                            storage?: string | undefined;
                        } | undefined;
                        containers?: {
                            name: string;
                            image: string;
                            ports?: number[] | undefined;
                            environment?: Record<string, string> | undefined;
                            volumes?: string[] | undefined;
                        }[] | undefined;
                        network?: {
                            isolated?: boolean | undefined;
                            allowInternet?: boolean | undefined;
                            customTopology?: any;
                        } | undefined;
                        timeout?: number | undefined;
                    }>;
                    provisioning: z.ZodOptional<z.ZodObject<{
                        setupScript: z.ZodOptional<z.ZodString>;
                        teardownScript: z.ZodOptional<z.ZodString>;
                        healthCheck: z.ZodOptional<z.ZodString>;
                    }, "strip", z.ZodTypeAny, {
                        setupScript?: string | undefined;
                        teardownScript?: string | undefined;
                        healthCheck?: string | undefined;
                    }, {
                        setupScript?: string | undefined;
                        teardownScript?: string | undefined;
                        healthCheck?: string | undefined;
                    }>>;
                }, "strip", z.ZodTypeAny, {
                    type: "simulated" | "live" | "sandboxed" | "cloud";
                    config: {
                        containers: {
                            name: string;
                            image: string;
                            ports: number[];
                            environment: Record<string, string>;
                            volumes: string[];
                        }[];
                        timeout: number;
                        resources?: {
                            cpu: string;
                            memory: string;
                            storage: string;
                        } | undefined;
                        network?: {
                            isolated: boolean;
                            allowInternet: boolean;
                            customTopology?: any;
                        } | undefined;
                    };
                    provisioning?: {
                        setupScript?: string | undefined;
                        teardownScript?: string | undefined;
                        healthCheck?: string | undefined;
                    } | undefined;
                }, {
                    type: "simulated" | "live" | "sandboxed" | "cloud";
                    config: {
                        resources?: {
                            cpu?: string | undefined;
                            memory?: string | undefined;
                            storage?: string | undefined;
                        } | undefined;
                        containers?: {
                            name: string;
                            image: string;
                            ports?: number[] | undefined;
                            environment?: Record<string, string> | undefined;
                            volumes?: string[] | undefined;
                        }[] | undefined;
                        network?: {
                            isolated?: boolean | undefined;
                            allowInternet?: boolean | undefined;
                            customTopology?: any;
                        } | undefined;
                        timeout?: number | undefined;
                    };
                    provisioning?: {
                        setupScript?: string | undefined;
                        teardownScript?: string | undefined;
                        healthCheck?: string | undefined;
                    } | undefined;
                }>;
                tasks: z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    title: z.ZodString;
                    description: z.ZodString;
                    order: z.ZodNumber;
                    instructions: z.ZodString;
                    expectedOutput: z.ZodOptional<z.ZodString>;
                    validationScript: z.ZodOptional<z.ZodString>;
                    points: z.ZodDefault<z.ZodNumber>;
                    timeLimit: z.ZodOptional<z.ZodNumber>;
                    prerequisites: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
                    tools: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
                    flags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
                }, "strip", z.ZodTypeAny, {
                    instructions: string;
                    id: string;
                    points: number;
                    title: string;
                    description: string;
                    order: number;
                    prerequisites: string[];
                    tools: string[];
                    flags: string[];
                    timeLimit?: number | undefined;
                    expectedOutput?: string | undefined;
                    validationScript?: string | undefined;
                }, {
                    instructions: string;
                    id: string;
                    title: string;
                    description: string;
                    order: number;
                    points?: number | undefined;
                    timeLimit?: number | undefined;
                    prerequisites?: string[] | undefined;
                    expectedOutput?: string | undefined;
                    validationScript?: string | undefined;
                    tools?: string[] | undefined;
                    flags?: string[] | undefined;
                }>, "many">;
                hints: z.ZodDefault<z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    order: z.ZodNumber;
                    title: z.ZodString;
                    content: z.ZodString;
                    pointDeduction: z.ZodDefault<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    id: string;
                    title: string;
                    content: string;
                    order: number;
                    pointDeduction: number;
                }, {
                    id: string;
                    title: string;
                    content: string;
                    order: number;
                    pointDeduction?: number | undefined;
                }>, "many">>;
                solution: z.ZodString;
                estimatedTime: z.ZodNumber;
                maxAttempts: z.ZodDefault<z.ZodNumber>;
                order: z.ZodNumber;
                prerequisites: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
                tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
                learningObjectives: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
                references: z.ZodDefault<z.ZodArray<z.ZodObject<{
                    title: z.ZodString;
                    url: z.ZodString;
                    type: z.ZodEnum<["documentation", "tutorial", "tool", "research"]>;
                }, "strip", z.ZodTypeAny, {
                    type: "tool" | "documentation" | "tutorial" | "research";
                    title: string;
                    url: string;
                }, {
                    type: "tool" | "documentation" | "tutorial" | "research";
                    title: string;
                    url: string;
                }>, "many">>;
                createdBy: z.ZodString;
                createdAt: z.ZodDate;
                updatedAt: z.ZodDate;
                metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
            }, "strip", z.ZodTypeAny, {
                id: string;
                hints: {
                    id: string;
                    title: string;
                    content: string;
                    order: number;
                    pointDeduction: number;
                }[];
                title: string;
                description: string;
                maxAttempts: number;
                order: number;
                prerequisites: string[];
                tags: string[];
                metadata: Record<string, any>;
                environment: {
                    type: "simulated" | "live" | "sandboxed" | "cloud";
                    config: {
                        containers: {
                            name: string;
                            image: string;
                            ports: number[];
                            environment: Record<string, string>;
                            volumes: string[];
                        }[];
                        timeout: number;
                        resources?: {
                            cpu: string;
                            memory: string;
                            storage: string;
                        } | undefined;
                        network?: {
                            isolated: boolean;
                            allowInternet: boolean;
                            customTopology?: any;
                        } | undefined;
                    };
                    provisioning?: {
                        setupScript?: string | undefined;
                        teardownScript?: string | undefined;
                        healthCheck?: string | undefined;
                    } | undefined;
                };
                difficulty: "easy" | "medium" | "hard";
                skillLevel: "beginner" | "intermediate" | "advanced";
                tasks: {
                    instructions: string;
                    id: string;
                    points: number;
                    title: string;
                    description: string;
                    order: number;
                    prerequisites: string[];
                    tools: string[];
                    flags: string[];
                    timeLimit?: number | undefined;
                    expectedOutput?: string | undefined;
                    validationScript?: string | undefined;
                }[];
                solution: string;
                estimatedTime: number;
                learningObjectives: string[];
                references: {
                    type: "tool" | "documentation" | "tutorial" | "research";
                    title: string;
                    url: string;
                }[];
                createdBy: string;
                createdAt: Date;
                updatedAt: Date;
            }, {
                id: string;
                title: string;
                description: string;
                order: number;
                environment: {
                    type: "simulated" | "live" | "sandboxed" | "cloud";
                    config: {
                        resources?: {
                            cpu?: string | undefined;
                            memory?: string | undefined;
                            storage?: string | undefined;
                        } | undefined;
                        containers?: {
                            name: string;
                            image: string;
                            ports?: number[] | undefined;
                            environment?: Record<string, string> | undefined;
                            volumes?: string[] | undefined;
                        }[] | undefined;
                        network?: {
                            isolated?: boolean | undefined;
                            allowInternet?: boolean | undefined;
                            customTopology?: any;
                        } | undefined;
                        timeout?: number | undefined;
                    };
                    provisioning?: {
                        setupScript?: string | undefined;
                        teardownScript?: string | undefined;
                        healthCheck?: string | undefined;
                    } | undefined;
                };
                difficulty: "easy" | "medium" | "hard";
                skillLevel: "beginner" | "intermediate" | "advanced";
                tasks: {
                    instructions: string;
                    id: string;
                    title: string;
                    description: string;
                    order: number;
                    points?: number | undefined;
                    timeLimit?: number | undefined;
                    prerequisites?: string[] | undefined;
                    expectedOutput?: string | undefined;
                    validationScript?: string | undefined;
                    tools?: string[] | undefined;
                    flags?: string[] | undefined;
                }[];
                solution: string;
                estimatedTime: number;
                createdBy: string;
                createdAt: Date;
                updatedAt: Date;
                hints?: {
                    id: string;
                    title: string;
                    content: string;
                    order: number;
                    pointDeduction?: number | undefined;
                }[] | undefined;
                maxAttempts?: number | undefined;
                prerequisites?: string[] | undefined;
                tags?: string[] | undefined;
                metadata?: Record<string, any> | undefined;
                learningObjectives?: string[] | undefined;
                references?: {
                    type: "tool" | "documentation" | "tutorial" | "research";
                    title: string;
                    url: string;
                }[] | undefined;
            }>, "many">>;
            assessments: z.ZodDefault<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                title: z.ZodString;
                description: z.ZodString;
                type: z.ZodEnum<["quiz", "practical", "project", "simulation", "essay"]>;
                difficulty: z.ZodEnum<["easy", "medium", "hard"]>;
                timeLimit: z.ZodOptional<z.ZodNumber>;
                passingScore: z.ZodDefault<z.ZodNumber>;
                maxAttempts: z.ZodDefault<z.ZodNumber>;
                questions: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    type: z.ZodEnum<["multiple-choice", "true-false", "fill-blank", "essay", "code", "simulation"]>;
                    question: z.ZodString;
                    options: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                    correctAnswer: z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>;
                    explanation: z.ZodOptional<z.ZodString>;
                    points: z.ZodDefault<z.ZodNumber>;
                    timeLimit: z.ZodOptional<z.ZodNumber>;
                    hints: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
                }, "strip", z.ZodTypeAny, {
                    type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
                    id: string;
                    question: string;
                    correctAnswer: string | string[];
                    points: number;
                    hints: string[];
                    options?: string[] | undefined;
                    explanation?: string | undefined;
                    timeLimit?: number | undefined;
                }, {
                    type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
                    id: string;
                    question: string;
                    correctAnswer: string | string[];
                    options?: string[] | undefined;
                    explanation?: string | undefined;
                    points?: number | undefined;
                    timeLimit?: number | undefined;
                    hints?: string[] | undefined;
                }>, "many">>;
                practicalTasks: z.ZodOptional<z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    title: z.ZodString;
                    description: z.ZodString;
                    order: z.ZodNumber;
                    instructions: z.ZodString;
                    expectedOutput: z.ZodOptional<z.ZodString>;
                    validationScript: z.ZodOptional<z.ZodString>;
                    points: z.ZodDefault<z.ZodNumber>;
                    timeLimit: z.ZodOptional<z.ZodNumber>;
                    prerequisites: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
                    tools: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
                    flags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
                }, "strip", z.ZodTypeAny, {
                    instructions: string;
                    id: string;
                    points: number;
                    title: string;
                    description: string;
                    order: number;
                    prerequisites: string[];
                    tools: string[];
                    flags: string[];
                    timeLimit?: number | undefined;
                    expectedOutput?: string | undefined;
                    validationScript?: string | undefined;
                }, {
                    instructions: string;
                    id: string;
                    title: string;
                    description: string;
                    order: number;
                    points?: number | undefined;
                    timeLimit?: number | undefined;
                    prerequisites?: string[] | undefined;
                    expectedOutput?: string | undefined;
                    validationScript?: string | undefined;
                    tools?: string[] | undefined;
                    flags?: string[] | undefined;
                }>, "many">>;
                rubric: z.ZodOptional<z.ZodObject<{
                    criteria: z.ZodArray<z.ZodObject<{
                        name: z.ZodString;
                        description: z.ZodString;
                        maxPoints: z.ZodNumber;
                        weight: z.ZodNumber;
                    }, "strip", z.ZodTypeAny, {
                        description: string;
                        name: string;
                        maxPoints: number;
                        weight: number;
                    }, {
                        description: string;
                        name: string;
                        maxPoints: number;
                        weight: number;
                    }>, "many">;
                }, "strip", z.ZodTypeAny, {
                    criteria: {
                        description: string;
                        name: string;
                        maxPoints: number;
                        weight: number;
                    }[];
                }, {
                    criteria: {
                        description: string;
                        name: string;
                        maxPoints: number;
                        weight: number;
                    }[];
                }>>;
                autoGrading: z.ZodDefault<z.ZodBoolean>;
                order: z.ZodNumber;
                prerequisites: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
                tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
                createdBy: z.ZodString;
                createdAt: z.ZodDate;
                updatedAt: z.ZodDate;
                metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
            }, "strip", z.ZodTypeAny, {
                type: "simulation" | "quiz" | "practical" | "project" | "essay";
                id: string;
                title: string;
                description: string;
                passingScore: number;
                maxAttempts: number;
                order: number;
                prerequisites: string[];
                tags: string[];
                metadata: Record<string, any>;
                difficulty: "easy" | "medium" | "hard";
                createdBy: string;
                createdAt: Date;
                updatedAt: Date;
                autoGrading: boolean;
                timeLimit?: number | undefined;
                questions?: {
                    type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
                    id: string;
                    question: string;
                    correctAnswer: string | string[];
                    points: number;
                    hints: string[];
                    options?: string[] | undefined;
                    explanation?: string | undefined;
                    timeLimit?: number | undefined;
                }[] | undefined;
                practicalTasks?: {
                    instructions: string;
                    id: string;
                    points: number;
                    title: string;
                    description: string;
                    order: number;
                    prerequisites: string[];
                    tools: string[];
                    flags: string[];
                    timeLimit?: number | undefined;
                    expectedOutput?: string | undefined;
                    validationScript?: string | undefined;
                }[] | undefined;
                rubric?: {
                    criteria: {
                        description: string;
                        name: string;
                        maxPoints: number;
                        weight: number;
                    }[];
                } | undefined;
            }, {
                type: "simulation" | "quiz" | "practical" | "project" | "essay";
                id: string;
                title: string;
                description: string;
                order: number;
                difficulty: "easy" | "medium" | "hard";
                createdBy: string;
                createdAt: Date;
                updatedAt: Date;
                timeLimit?: number | undefined;
                questions?: {
                    type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
                    id: string;
                    question: string;
                    correctAnswer: string | string[];
                    options?: string[] | undefined;
                    explanation?: string | undefined;
                    points?: number | undefined;
                    timeLimit?: number | undefined;
                    hints?: string[] | undefined;
                }[] | undefined;
                passingScore?: number | undefined;
                maxAttempts?: number | undefined;
                prerequisites?: string[] | undefined;
                tags?: string[] | undefined;
                metadata?: Record<string, any> | undefined;
                practicalTasks?: {
                    instructions: string;
                    id: string;
                    title: string;
                    description: string;
                    order: number;
                    points?: number | undefined;
                    timeLimit?: number | undefined;
                    prerequisites?: string[] | undefined;
                    expectedOutput?: string | undefined;
                    validationScript?: string | undefined;
                    tools?: string[] | undefined;
                    flags?: string[] | undefined;
                }[] | undefined;
                rubric?: {
                    criteria: {
                        description: string;
                        name: string;
                        maxPoints: number;
                        weight: number;
                    }[];
                } | undefined;
                autoGrading?: boolean | undefined;
            }>, "many">>;
        }, "strip", z.ZodTypeAny, {
            lessons: {
                type: "video" | "article" | "interactive" | "simulation" | "document";
                id: string;
                title: string;
                description: string;
                content: string | {
                    type: "simulation" | "diagram" | "code-editor" | "terminal" | "network-map";
                    config: Record<string, any>;
                    instructions: string;
                    data?: any;
                } | {
                    videoUrl: string;
                    transcript?: string | undefined;
                };
                duration: number;
                order: number;
                prerequisites: string[];
                tags: string[];
                resources: {
                    type: "document" | "link" | "tool";
                    title: string;
                    url: string;
                }[];
                metadata: Record<string, any>;
                quiz?: {
                    id: string;
                    title: string;
                    questions: {
                        type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
                        id: string;
                        question: string;
                        correctAnswer: string | string[];
                        points: number;
                        hints: string[];
                        options?: string[] | undefined;
                        explanation?: string | undefined;
                        timeLimit?: number | undefined;
                    }[];
                    passingScore: number;
                    maxAttempts: number;
                    randomizeQuestions: boolean;
                    showResults: boolean;
                    timeLimit?: number | undefined;
                    description?: string | undefined;
                } | undefined;
            }[];
            labs: {
                id: string;
                hints: {
                    id: string;
                    title: string;
                    content: string;
                    order: number;
                    pointDeduction: number;
                }[];
                title: string;
                description: string;
                maxAttempts: number;
                order: number;
                prerequisites: string[];
                tags: string[];
                metadata: Record<string, any>;
                environment: {
                    type: "simulated" | "live" | "sandboxed" | "cloud";
                    config: {
                        containers: {
                            name: string;
                            image: string;
                            ports: number[];
                            environment: Record<string, string>;
                            volumes: string[];
                        }[];
                        timeout: number;
                        resources?: {
                            cpu: string;
                            memory: string;
                            storage: string;
                        } | undefined;
                        network?: {
                            isolated: boolean;
                            allowInternet: boolean;
                            customTopology?: any;
                        } | undefined;
                    };
                    provisioning?: {
                        setupScript?: string | undefined;
                        teardownScript?: string | undefined;
                        healthCheck?: string | undefined;
                    } | undefined;
                };
                difficulty: "easy" | "medium" | "hard";
                skillLevel: "beginner" | "intermediate" | "advanced";
                tasks: {
                    instructions: string;
                    id: string;
                    points: number;
                    title: string;
                    description: string;
                    order: number;
                    prerequisites: string[];
                    tools: string[];
                    flags: string[];
                    timeLimit?: number | undefined;
                    expectedOutput?: string | undefined;
                    validationScript?: string | undefined;
                }[];
                solution: string;
                estimatedTime: number;
                learningObjectives: string[];
                references: {
                    type: "tool" | "documentation" | "tutorial" | "research";
                    title: string;
                    url: string;
                }[];
                createdBy: string;
                createdAt: Date;
                updatedAt: Date;
            }[];
            assessments: {
                type: "simulation" | "quiz" | "practical" | "project" | "essay";
                id: string;
                title: string;
                description: string;
                passingScore: number;
                maxAttempts: number;
                order: number;
                prerequisites: string[];
                tags: string[];
                metadata: Record<string, any>;
                difficulty: "easy" | "medium" | "hard";
                createdBy: string;
                createdAt: Date;
                updatedAt: Date;
                autoGrading: boolean;
                timeLimit?: number | undefined;
                questions?: {
                    type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
                    id: string;
                    question: string;
                    correctAnswer: string | string[];
                    points: number;
                    hints: string[];
                    options?: string[] | undefined;
                    explanation?: string | undefined;
                    timeLimit?: number | undefined;
                }[] | undefined;
                practicalTasks?: {
                    instructions: string;
                    id: string;
                    points: number;
                    title: string;
                    description: string;
                    order: number;
                    prerequisites: string[];
                    tools: string[];
                    flags: string[];
                    timeLimit?: number | undefined;
                    expectedOutput?: string | undefined;
                    validationScript?: string | undefined;
                }[] | undefined;
                rubric?: {
                    criteria: {
                        description: string;
                        name: string;
                        maxPoints: number;
                        weight: number;
                    }[];
                } | undefined;
            }[];
        }, {
            lessons?: {
                type: "video" | "article" | "interactive" | "simulation" | "document";
                id: string;
                title: string;
                description: string;
                content: string | {
                    type: "simulation" | "diagram" | "code-editor" | "terminal" | "network-map";
                    config: Record<string, any>;
                    instructions: string;
                    data?: any;
                } | {
                    videoUrl: string;
                    transcript?: string | undefined;
                };
                duration: number;
                order: number;
                quiz?: {
                    id: string;
                    title: string;
                    questions: {
                        type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
                        id: string;
                        question: string;
                        correctAnswer: string | string[];
                        options?: string[] | undefined;
                        explanation?: string | undefined;
                        points?: number | undefined;
                        timeLimit?: number | undefined;
                        hints?: string[] | undefined;
                    }[];
                    timeLimit?: number | undefined;
                    description?: string | undefined;
                    passingScore?: number | undefined;
                    maxAttempts?: number | undefined;
                    randomizeQuestions?: boolean | undefined;
                    showResults?: boolean | undefined;
                } | undefined;
                prerequisites?: string[] | undefined;
                tags?: string[] | undefined;
                resources?: {
                    type: "document" | "link" | "tool";
                    title: string;
                    url: string;
                }[] | undefined;
                metadata?: Record<string, any> | undefined;
            }[] | undefined;
            labs?: {
                id: string;
                title: string;
                description: string;
                order: number;
                environment: {
                    type: "simulated" | "live" | "sandboxed" | "cloud";
                    config: {
                        resources?: {
                            cpu?: string | undefined;
                            memory?: string | undefined;
                            storage?: string | undefined;
                        } | undefined;
                        containers?: {
                            name: string;
                            image: string;
                            ports?: number[] | undefined;
                            environment?: Record<string, string> | undefined;
                            volumes?: string[] | undefined;
                        }[] | undefined;
                        network?: {
                            isolated?: boolean | undefined;
                            allowInternet?: boolean | undefined;
                            customTopology?: any;
                        } | undefined;
                        timeout?: number | undefined;
                    };
                    provisioning?: {
                        setupScript?: string | undefined;
                        teardownScript?: string | undefined;
                        healthCheck?: string | undefined;
                    } | undefined;
                };
                difficulty: "easy" | "medium" | "hard";
                skillLevel: "beginner" | "intermediate" | "advanced";
                tasks: {
                    instructions: string;
                    id: string;
                    title: string;
                    description: string;
                    order: number;
                    points?: number | undefined;
                    timeLimit?: number | undefined;
                    prerequisites?: string[] | undefined;
                    expectedOutput?: string | undefined;
                    validationScript?: string | undefined;
                    tools?: string[] | undefined;
                    flags?: string[] | undefined;
                }[];
                solution: string;
                estimatedTime: number;
                createdBy: string;
                createdAt: Date;
                updatedAt: Date;
                hints?: {
                    id: string;
                    title: string;
                    content: string;
                    order: number;
                    pointDeduction?: number | undefined;
                }[] | undefined;
                maxAttempts?: number | undefined;
                prerequisites?: string[] | undefined;
                tags?: string[] | undefined;
                metadata?: Record<string, any> | undefined;
                learningObjectives?: string[] | undefined;
                references?: {
                    type: "tool" | "documentation" | "tutorial" | "research";
                    title: string;
                    url: string;
                }[] | undefined;
            }[] | undefined;
            assessments?: {
                type: "simulation" | "quiz" | "practical" | "project" | "essay";
                id: string;
                title: string;
                description: string;
                order: number;
                difficulty: "easy" | "medium" | "hard";
                createdBy: string;
                createdAt: Date;
                updatedAt: Date;
                timeLimit?: number | undefined;
                questions?: {
                    type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
                    id: string;
                    question: string;
                    correctAnswer: string | string[];
                    options?: string[] | undefined;
                    explanation?: string | undefined;
                    points?: number | undefined;
                    timeLimit?: number | undefined;
                    hints?: string[] | undefined;
                }[] | undefined;
                passingScore?: number | undefined;
                maxAttempts?: number | undefined;
                prerequisites?: string[] | undefined;
                tags?: string[] | undefined;
                metadata?: Record<string, any> | undefined;
                practicalTasks?: {
                    instructions: string;
                    id: string;
                    title: string;
                    description: string;
                    order: number;
                    points?: number | undefined;
                    timeLimit?: number | undefined;
                    prerequisites?: string[] | undefined;
                    expectedOutput?: string | undefined;
                    validationScript?: string | undefined;
                    tools?: string[] | undefined;
                    flags?: string[] | undefined;
                }[] | undefined;
                rubric?: {
                    criteria: {
                        description: string;
                        name: string;
                        maxPoints: number;
                        weight: number;
                    }[];
                } | undefined;
                autoGrading?: boolean | undefined;
            }[] | undefined;
        }>;
        completionCriteria: z.ZodObject<{
            requiredLessons: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            requiredLabs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            requiredAssessments: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            minimumAssessmentScore: z.ZodDefault<z.ZodNumber>;
            minimumLabScore: z.ZodDefault<z.ZodNumber>;
            requireAllLessons: z.ZodDefault<z.ZodBoolean>;
            requireAllLabs: z.ZodDefault<z.ZodBoolean>;
            requireAllAssessments: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            requiredLessons: string[];
            requiredLabs: string[];
            requiredAssessments: string[];
            minimumAssessmentScore: number;
            minimumLabScore: number;
            requireAllLessons: boolean;
            requireAllLabs: boolean;
            requireAllAssessments: boolean;
        }, {
            requiredLessons?: string[] | undefined;
            requiredLabs?: string[] | undefined;
            requiredAssessments?: string[] | undefined;
            minimumAssessmentScore?: number | undefined;
            minimumLabScore?: number | undefined;
            requireAllLessons?: boolean | undefined;
            requireAllLabs?: boolean | undefined;
            requireAllAssessments?: boolean | undefined;
        }>;
        prerequisites: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        learningObjectives: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        createdBy: z.ZodString;
        createdAt: z.ZodDate;
        updatedAt: z.ZodDate;
        metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        title: string;
        description: string;
        content: {
            lessons: {
                type: "video" | "article" | "interactive" | "simulation" | "document";
                id: string;
                title: string;
                description: string;
                content: string | {
                    type: "simulation" | "diagram" | "code-editor" | "terminal" | "network-map";
                    config: Record<string, any>;
                    instructions: string;
                    data?: any;
                } | {
                    videoUrl: string;
                    transcript?: string | undefined;
                };
                duration: number;
                order: number;
                prerequisites: string[];
                tags: string[];
                resources: {
                    type: "document" | "link" | "tool";
                    title: string;
                    url: string;
                }[];
                metadata: Record<string, any>;
                quiz?: {
                    id: string;
                    title: string;
                    questions: {
                        type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
                        id: string;
                        question: string;
                        correctAnswer: string | string[];
                        points: number;
                        hints: string[];
                        options?: string[] | undefined;
                        explanation?: string | undefined;
                        timeLimit?: number | undefined;
                    }[];
                    passingScore: number;
                    maxAttempts: number;
                    randomizeQuestions: boolean;
                    showResults: boolean;
                    timeLimit?: number | undefined;
                    description?: string | undefined;
                } | undefined;
            }[];
            labs: {
                id: string;
                hints: {
                    id: string;
                    title: string;
                    content: string;
                    order: number;
                    pointDeduction: number;
                }[];
                title: string;
                description: string;
                maxAttempts: number;
                order: number;
                prerequisites: string[];
                tags: string[];
                metadata: Record<string, any>;
                environment: {
                    type: "simulated" | "live" | "sandboxed" | "cloud";
                    config: {
                        containers: {
                            name: string;
                            image: string;
                            ports: number[];
                            environment: Record<string, string>;
                            volumes: string[];
                        }[];
                        timeout: number;
                        resources?: {
                            cpu: string;
                            memory: string;
                            storage: string;
                        } | undefined;
                        network?: {
                            isolated: boolean;
                            allowInternet: boolean;
                            customTopology?: any;
                        } | undefined;
                    };
                    provisioning?: {
                        setupScript?: string | undefined;
                        teardownScript?: string | undefined;
                        healthCheck?: string | undefined;
                    } | undefined;
                };
                difficulty: "easy" | "medium" | "hard";
                skillLevel: "beginner" | "intermediate" | "advanced";
                tasks: {
                    instructions: string;
                    id: string;
                    points: number;
                    title: string;
                    description: string;
                    order: number;
                    prerequisites: string[];
                    tools: string[];
                    flags: string[];
                    timeLimit?: number | undefined;
                    expectedOutput?: string | undefined;
                    validationScript?: string | undefined;
                }[];
                solution: string;
                estimatedTime: number;
                learningObjectives: string[];
                references: {
                    type: "tool" | "documentation" | "tutorial" | "research";
                    title: string;
                    url: string;
                }[];
                createdBy: string;
                createdAt: Date;
                updatedAt: Date;
            }[];
            assessments: {
                type: "simulation" | "quiz" | "practical" | "project" | "essay";
                id: string;
                title: string;
                description: string;
                passingScore: number;
                maxAttempts: number;
                order: number;
                prerequisites: string[];
                tags: string[];
                metadata: Record<string, any>;
                difficulty: "easy" | "medium" | "hard";
                createdBy: string;
                createdAt: Date;
                updatedAt: Date;
                autoGrading: boolean;
                timeLimit?: number | undefined;
                questions?: {
                    type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
                    id: string;
                    question: string;
                    correctAnswer: string | string[];
                    points: number;
                    hints: string[];
                    options?: string[] | undefined;
                    explanation?: string | undefined;
                    timeLimit?: number | undefined;
                }[] | undefined;
                practicalTasks?: {
                    instructions: string;
                    id: string;
                    points: number;
                    title: string;
                    description: string;
                    order: number;
                    prerequisites: string[];
                    tools: string[];
                    flags: string[];
                    timeLimit?: number | undefined;
                    expectedOutput?: string | undefined;
                    validationScript?: string | undefined;
                }[] | undefined;
                rubric?: {
                    criteria: {
                        description: string;
                        name: string;
                        maxPoints: number;
                        weight: number;
                    }[];
                } | undefined;
            }[];
        };
        order: number;
        prerequisites: string[];
        tags: string[];
        metadata: Record<string, any>;
        skillLevel: "beginner" | "intermediate" | "advanced";
        learningObjectives: string[];
        createdBy: string;
        createdAt: Date;
        updatedAt: Date;
        estimatedHours: number;
        completionCriteria: {
            requiredLessons: string[];
            requiredLabs: string[];
            requiredAssessments: string[];
            minimumAssessmentScore: number;
            minimumLabScore: number;
            requireAllLessons: boolean;
            requireAllLabs: boolean;
            requireAllAssessments: boolean;
        };
    }, {
        id: string;
        title: string;
        description: string;
        content: {
            lessons?: {
                type: "video" | "article" | "interactive" | "simulation" | "document";
                id: string;
                title: string;
                description: string;
                content: string | {
                    type: "simulation" | "diagram" | "code-editor" | "terminal" | "network-map";
                    config: Record<string, any>;
                    instructions: string;
                    data?: any;
                } | {
                    videoUrl: string;
                    transcript?: string | undefined;
                };
                duration: number;
                order: number;
                quiz?: {
                    id: string;
                    title: string;
                    questions: {
                        type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
                        id: string;
                        question: string;
                        correctAnswer: string | string[];
                        options?: string[] | undefined;
                        explanation?: string | undefined;
                        points?: number | undefined;
                        timeLimit?: number | undefined;
                        hints?: string[] | undefined;
                    }[];
                    timeLimit?: number | undefined;
                    description?: string | undefined;
                    passingScore?: number | undefined;
                    maxAttempts?: number | undefined;
                    randomizeQuestions?: boolean | undefined;
                    showResults?: boolean | undefined;
                } | undefined;
                prerequisites?: string[] | undefined;
                tags?: string[] | undefined;
                resources?: {
                    type: "document" | "link" | "tool";
                    title: string;
                    url: string;
                }[] | undefined;
                metadata?: Record<string, any> | undefined;
            }[] | undefined;
            labs?: {
                id: string;
                title: string;
                description: string;
                order: number;
                environment: {
                    type: "simulated" | "live" | "sandboxed" | "cloud";
                    config: {
                        resources?: {
                            cpu?: string | undefined;
                            memory?: string | undefined;
                            storage?: string | undefined;
                        } | undefined;
                        containers?: {
                            name: string;
                            image: string;
                            ports?: number[] | undefined;
                            environment?: Record<string, string> | undefined;
                            volumes?: string[] | undefined;
                        }[] | undefined;
                        network?: {
                            isolated?: boolean | undefined;
                            allowInternet?: boolean | undefined;
                            customTopology?: any;
                        } | undefined;
                        timeout?: number | undefined;
                    };
                    provisioning?: {
                        setupScript?: string | undefined;
                        teardownScript?: string | undefined;
                        healthCheck?: string | undefined;
                    } | undefined;
                };
                difficulty: "easy" | "medium" | "hard";
                skillLevel: "beginner" | "intermediate" | "advanced";
                tasks: {
                    instructions: string;
                    id: string;
                    title: string;
                    description: string;
                    order: number;
                    points?: number | undefined;
                    timeLimit?: number | undefined;
                    prerequisites?: string[] | undefined;
                    expectedOutput?: string | undefined;
                    validationScript?: string | undefined;
                    tools?: string[] | undefined;
                    flags?: string[] | undefined;
                }[];
                solution: string;
                estimatedTime: number;
                createdBy: string;
                createdAt: Date;
                updatedAt: Date;
                hints?: {
                    id: string;
                    title: string;
                    content: string;
                    order: number;
                    pointDeduction?: number | undefined;
                }[] | undefined;
                maxAttempts?: number | undefined;
                prerequisites?: string[] | undefined;
                tags?: string[] | undefined;
                metadata?: Record<string, any> | undefined;
                learningObjectives?: string[] | undefined;
                references?: {
                    type: "tool" | "documentation" | "tutorial" | "research";
                    title: string;
                    url: string;
                }[] | undefined;
            }[] | undefined;
            assessments?: {
                type: "simulation" | "quiz" | "practical" | "project" | "essay";
                id: string;
                title: string;
                description: string;
                order: number;
                difficulty: "easy" | "medium" | "hard";
                createdBy: string;
                createdAt: Date;
                updatedAt: Date;
                timeLimit?: number | undefined;
                questions?: {
                    type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
                    id: string;
                    question: string;
                    correctAnswer: string | string[];
                    options?: string[] | undefined;
                    explanation?: string | undefined;
                    points?: number | undefined;
                    timeLimit?: number | undefined;
                    hints?: string[] | undefined;
                }[] | undefined;
                passingScore?: number | undefined;
                maxAttempts?: number | undefined;
                prerequisites?: string[] | undefined;
                tags?: string[] | undefined;
                metadata?: Record<string, any> | undefined;
                practicalTasks?: {
                    instructions: string;
                    id: string;
                    title: string;
                    description: string;
                    order: number;
                    points?: number | undefined;
                    timeLimit?: number | undefined;
                    prerequisites?: string[] | undefined;
                    expectedOutput?: string | undefined;
                    validationScript?: string | undefined;
                    tools?: string[] | undefined;
                    flags?: string[] | undefined;
                }[] | undefined;
                rubric?: {
                    criteria: {
                        description: string;
                        name: string;
                        maxPoints: number;
                        weight: number;
                    }[];
                } | undefined;
                autoGrading?: boolean | undefined;
            }[] | undefined;
        };
        order: number;
        skillLevel: "beginner" | "intermediate" | "advanced";
        createdBy: string;
        createdAt: Date;
        updatedAt: Date;
        estimatedHours: number;
        completionCriteria: {
            requiredLessons?: string[] | undefined;
            requiredLabs?: string[] | undefined;
            requiredAssessments?: string[] | undefined;
            minimumAssessmentScore?: number | undefined;
            minimumLabScore?: number | undefined;
            requireAllLessons?: boolean | undefined;
            requireAllLabs?: boolean | undefined;
            requireAllAssessments?: boolean | undefined;
        };
        prerequisites?: string[] | undefined;
        tags?: string[] | undefined;
        metadata?: Record<string, any> | undefined;
        learningObjectives?: string[] | undefined;
    }>;
    CertificationSchema: z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        description: z.ZodString;
        issuer: z.ZodString;
        validityPeriod: z.ZodOptional<z.ZodNumber>;
        examRequirements: z.ZodString;
        prerequisites: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        competencies: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            description: z.ZodString;
            weight: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            id: string;
            description: string;
            name: string;
            weight: number;
        }, {
            id: string;
            description: string;
            name: string;
            weight: number;
        }>, "many">>;
        passingCriteria: z.ZodObject<{
            minimumScore: z.ZodDefault<z.ZodNumber>;
            requiredCompetencies: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            timeLimit: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            minimumScore: number;
            requiredCompetencies: string[];
            timeLimit?: number | undefined;
        }, {
            timeLimit?: number | undefined;
            minimumScore?: number | undefined;
            requiredCompetencies?: string[] | undefined;
        }>;
        badgeUrl: z.ZodOptional<z.ZodString>;
        credentialTemplate: z.ZodOptional<z.ZodString>;
        metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        description: string;
        prerequisites: string[];
        metadata: Record<string, any>;
        name: string;
        issuer: string;
        examRequirements: string;
        competencies: {
            id: string;
            description: string;
            name: string;
            weight: number;
        }[];
        passingCriteria: {
            minimumScore: number;
            requiredCompetencies: string[];
            timeLimit?: number | undefined;
        };
        validityPeriod?: number | undefined;
        badgeUrl?: string | undefined;
        credentialTemplate?: string | undefined;
    }, {
        id: string;
        description: string;
        name: string;
        issuer: string;
        examRequirements: string;
        passingCriteria: {
            timeLimit?: number | undefined;
            minimumScore?: number | undefined;
            requiredCompetencies?: string[] | undefined;
        };
        prerequisites?: string[] | undefined;
        metadata?: Record<string, any> | undefined;
        validityPeriod?: number | undefined;
        competencies?: {
            id: string;
            description: string;
            name: string;
            weight: number;
        }[] | undefined;
        badgeUrl?: string | undefined;
        credentialTemplate?: string | undefined;
    }>;
    LearningPathSchema: z.ZodObject<{
        id: z.ZodString;
        title: z.ZodString;
        description: z.ZodString;
        skillLevel: z.ZodEnum<["beginner", "intermediate", "advanced"]>;
        estimatedHours: z.ZodNumber;
        modules: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            title: z.ZodString;
            description: z.ZodString;
            order: z.ZodNumber;
            estimatedHours: z.ZodNumber;
            skillLevel: z.ZodEnum<["beginner", "intermediate", "advanced"]>;
            content: z.ZodObject<{
                lessons: z.ZodDefault<z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    title: z.ZodString;
                    description: z.ZodString;
                    type: z.ZodEnum<["video", "article", "interactive", "simulation", "document"]>;
                    content: z.ZodUnion<[z.ZodString, z.ZodObject<{
                        videoUrl: z.ZodString;
                        transcript: z.ZodOptional<z.ZodString>;
                    }, "strip", z.ZodTypeAny, {
                        videoUrl: string;
                        transcript?: string | undefined;
                    }, {
                        videoUrl: string;
                        transcript?: string | undefined;
                    }>, z.ZodObject<{
                        type: z.ZodEnum<["simulation", "diagram", "code-editor", "terminal", "network-map"]>;
                        config: z.ZodRecord<z.ZodString, z.ZodAny>;
                        data: z.ZodOptional<z.ZodAny>;
                        instructions: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        type: "simulation" | "diagram" | "code-editor" | "terminal" | "network-map";
                        config: Record<string, any>;
                        instructions: string;
                        data?: any;
                    }, {
                        type: "simulation" | "diagram" | "code-editor" | "terminal" | "network-map";
                        config: Record<string, any>;
                        instructions: string;
                        data?: any;
                    }>]>;
                    duration: z.ZodNumber;
                    order: z.ZodNumber;
                    quiz: z.ZodOptional<z.ZodObject<{
                        id: z.ZodString;
                        title: z.ZodString;
                        description: z.ZodOptional<z.ZodString>;
                        questions: z.ZodArray<z.ZodObject<{
                            id: z.ZodString;
                            type: z.ZodEnum<["multiple-choice", "true-false", "fill-blank", "essay", "code", "simulation"]>;
                            question: z.ZodString;
                            options: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                            correctAnswer: z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>;
                            explanation: z.ZodOptional<z.ZodString>;
                            points: z.ZodDefault<z.ZodNumber>;
                            timeLimit: z.ZodOptional<z.ZodNumber>;
                            hints: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
                        }, "strip", z.ZodTypeAny, {
                            type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
                            id: string;
                            question: string;
                            correctAnswer: string | string[];
                            points: number;
                            hints: string[];
                            options?: string[] | undefined;
                            explanation?: string | undefined;
                            timeLimit?: number | undefined;
                        }, {
                            type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
                            id: string;
                            question: string;
                            correctAnswer: string | string[];
                            options?: string[] | undefined;
                            explanation?: string | undefined;
                            points?: number | undefined;
                            timeLimit?: number | undefined;
                            hints?: string[] | undefined;
                        }>, "many">;
                        timeLimit: z.ZodOptional<z.ZodNumber>;
                        passingScore: z.ZodDefault<z.ZodNumber>;
                        maxAttempts: z.ZodDefault<z.ZodNumber>;
                        randomizeQuestions: z.ZodDefault<z.ZodBoolean>;
                        showResults: z.ZodDefault<z.ZodBoolean>;
                    }, "strip", z.ZodTypeAny, {
                        id: string;
                        title: string;
                        questions: {
                            type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
                            id: string;
                            question: string;
                            correctAnswer: string | string[];
                            points: number;
                            hints: string[];
                            options?: string[] | undefined;
                            explanation?: string | undefined;
                            timeLimit?: number | undefined;
                        }[];
                        passingScore: number;
                        maxAttempts: number;
                        randomizeQuestions: boolean;
                        showResults: boolean;
                        timeLimit?: number | undefined;
                        description?: string | undefined;
                    }, {
                        id: string;
                        title: string;
                        questions: {
                            type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
                            id: string;
                            question: string;
                            correctAnswer: string | string[];
                            options?: string[] | undefined;
                            explanation?: string | undefined;
                            points?: number | undefined;
                            timeLimit?: number | undefined;
                            hints?: string[] | undefined;
                        }[];
                        timeLimit?: number | undefined;
                        description?: string | undefined;
                        passingScore?: number | undefined;
                        maxAttempts?: number | undefined;
                        randomizeQuestions?: boolean | undefined;
                        showResults?: boolean | undefined;
                    }>>;
                    prerequisites: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
                    tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
                    resources: z.ZodDefault<z.ZodArray<z.ZodObject<{
                        title: z.ZodString;
                        url: z.ZodString;
                        type: z.ZodEnum<["document", "link", "tool"]>;
                    }, "strip", z.ZodTypeAny, {
                        type: "document" | "link" | "tool";
                        title: string;
                        url: string;
                    }, {
                        type: "document" | "link" | "tool";
                        title: string;
                        url: string;
                    }>, "many">>;
                    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
                }, "strip", z.ZodTypeAny, {
                    type: "video" | "article" | "interactive" | "simulation" | "document";
                    id: string;
                    title: string;
                    description: string;
                    content: string | {
                        type: "simulation" | "diagram" | "code-editor" | "terminal" | "network-map";
                        config: Record<string, any>;
                        instructions: string;
                        data?: any;
                    } | {
                        videoUrl: string;
                        transcript?: string | undefined;
                    };
                    duration: number;
                    order: number;
                    prerequisites: string[];
                    tags: string[];
                    resources: {
                        type: "document" | "link" | "tool";
                        title: string;
                        url: string;
                    }[];
                    metadata: Record<string, any>;
                    quiz?: {
                        id: string;
                        title: string;
                        questions: {
                            type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
                            id: string;
                            question: string;
                            correctAnswer: string | string[];
                            points: number;
                            hints: string[];
                            options?: string[] | undefined;
                            explanation?: string | undefined;
                            timeLimit?: number | undefined;
                        }[];
                        passingScore: number;
                        maxAttempts: number;
                        randomizeQuestions: boolean;
                        showResults: boolean;
                        timeLimit?: number | undefined;
                        description?: string | undefined;
                    } | undefined;
                }, {
                    type: "video" | "article" | "interactive" | "simulation" | "document";
                    id: string;
                    title: string;
                    description: string;
                    content: string | {
                        type: "simulation" | "diagram" | "code-editor" | "terminal" | "network-map";
                        config: Record<string, any>;
                        instructions: string;
                        data?: any;
                    } | {
                        videoUrl: string;
                        transcript?: string | undefined;
                    };
                    duration: number;
                    order: number;
                    quiz?: {
                        id: string;
                        title: string;
                        questions: {
                            type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
                            id: string;
                            question: string;
                            correctAnswer: string | string[];
                            options?: string[] | undefined;
                            explanation?: string | undefined;
                            points?: number | undefined;
                            timeLimit?: number | undefined;
                            hints?: string[] | undefined;
                        }[];
                        timeLimit?: number | undefined;
                        description?: string | undefined;
                        passingScore?: number | undefined;
                        maxAttempts?: number | undefined;
                        randomizeQuestions?: boolean | undefined;
                        showResults?: boolean | undefined;
                    } | undefined;
                    prerequisites?: string[] | undefined;
                    tags?: string[] | undefined;
                    resources?: {
                        type: "document" | "link" | "tool";
                        title: string;
                        url: string;
                    }[] | undefined;
                    metadata?: Record<string, any> | undefined;
                }>, "many">>;
                labs: z.ZodDefault<z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    title: z.ZodString;
                    description: z.ZodString;
                    difficulty: z.ZodEnum<["easy", "medium", "hard"]>;
                    skillLevel: z.ZodEnum<["beginner", "intermediate", "advanced"]>;
                    environment: z.ZodObject<{
                        type: z.ZodEnum<["simulated", "live", "sandboxed", "cloud"]>;
                        config: z.ZodObject<{
                            containers: z.ZodDefault<z.ZodArray<z.ZodObject<{
                                name: z.ZodString;
                                image: z.ZodString;
                                ports: z.ZodDefault<z.ZodArray<z.ZodNumber, "many">>;
                                environment: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>;
                                volumes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
                            }, "strip", z.ZodTypeAny, {
                                name: string;
                                image: string;
                                ports: number[];
                                environment: Record<string, string>;
                                volumes: string[];
                            }, {
                                name: string;
                                image: string;
                                ports?: number[] | undefined;
                                environment?: Record<string, string> | undefined;
                                volumes?: string[] | undefined;
                            }>, "many">>;
                            network: z.ZodOptional<z.ZodObject<{
                                isolated: z.ZodDefault<z.ZodBoolean>;
                                allowInternet: z.ZodDefault<z.ZodBoolean>;
                                customTopology: z.ZodOptional<z.ZodAny>;
                            }, "strip", z.ZodTypeAny, {
                                isolated: boolean;
                                allowInternet: boolean;
                                customTopology?: any;
                            }, {
                                isolated?: boolean | undefined;
                                allowInternet?: boolean | undefined;
                                customTopology?: any;
                            }>>;
                            resources: z.ZodOptional<z.ZodObject<{
                                cpu: z.ZodDefault<z.ZodString>;
                                memory: z.ZodDefault<z.ZodString>;
                                storage: z.ZodDefault<z.ZodString>;
                            }, "strip", z.ZodTypeAny, {
                                cpu: string;
                                memory: string;
                                storage: string;
                            }, {
                                cpu?: string | undefined;
                                memory?: string | undefined;
                                storage?: string | undefined;
                            }>>;
                            timeout: z.ZodDefault<z.ZodNumber>;
                        }, "strip", z.ZodTypeAny, {
                            containers: {
                                name: string;
                                image: string;
                                ports: number[];
                                environment: Record<string, string>;
                                volumes: string[];
                            }[];
                            timeout: number;
                            resources?: {
                                cpu: string;
                                memory: string;
                                storage: string;
                            } | undefined;
                            network?: {
                                isolated: boolean;
                                allowInternet: boolean;
                                customTopology?: any;
                            } | undefined;
                        }, {
                            resources?: {
                                cpu?: string | undefined;
                                memory?: string | undefined;
                                storage?: string | undefined;
                            } | undefined;
                            containers?: {
                                name: string;
                                image: string;
                                ports?: number[] | undefined;
                                environment?: Record<string, string> | undefined;
                                volumes?: string[] | undefined;
                            }[] | undefined;
                            network?: {
                                isolated?: boolean | undefined;
                                allowInternet?: boolean | undefined;
                                customTopology?: any;
                            } | undefined;
                            timeout?: number | undefined;
                        }>;
                        provisioning: z.ZodOptional<z.ZodObject<{
                            setupScript: z.ZodOptional<z.ZodString>;
                            teardownScript: z.ZodOptional<z.ZodString>;
                            healthCheck: z.ZodOptional<z.ZodString>;
                        }, "strip", z.ZodTypeAny, {
                            setupScript?: string | undefined;
                            teardownScript?: string | undefined;
                            healthCheck?: string | undefined;
                        }, {
                            setupScript?: string | undefined;
                            teardownScript?: string | undefined;
                            healthCheck?: string | undefined;
                        }>>;
                    }, "strip", z.ZodTypeAny, {
                        type: "simulated" | "live" | "sandboxed" | "cloud";
                        config: {
                            containers: {
                                name: string;
                                image: string;
                                ports: number[];
                                environment: Record<string, string>;
                                volumes: string[];
                            }[];
                            timeout: number;
                            resources?: {
                                cpu: string;
                                memory: string;
                                storage: string;
                            } | undefined;
                            network?: {
                                isolated: boolean;
                                allowInternet: boolean;
                                customTopology?: any;
                            } | undefined;
                        };
                        provisioning?: {
                            setupScript?: string | undefined;
                            teardownScript?: string | undefined;
                            healthCheck?: string | undefined;
                        } | undefined;
                    }, {
                        type: "simulated" | "live" | "sandboxed" | "cloud";
                        config: {
                            resources?: {
                                cpu?: string | undefined;
                                memory?: string | undefined;
                                storage?: string | undefined;
                            } | undefined;
                            containers?: {
                                name: string;
                                image: string;
                                ports?: number[] | undefined;
                                environment?: Record<string, string> | undefined;
                                volumes?: string[] | undefined;
                            }[] | undefined;
                            network?: {
                                isolated?: boolean | undefined;
                                allowInternet?: boolean | undefined;
                                customTopology?: any;
                            } | undefined;
                            timeout?: number | undefined;
                        };
                        provisioning?: {
                            setupScript?: string | undefined;
                            teardownScript?: string | undefined;
                            healthCheck?: string | undefined;
                        } | undefined;
                    }>;
                    tasks: z.ZodArray<z.ZodObject<{
                        id: z.ZodString;
                        title: z.ZodString;
                        description: z.ZodString;
                        order: z.ZodNumber;
                        instructions: z.ZodString;
                        expectedOutput: z.ZodOptional<z.ZodString>;
                        validationScript: z.ZodOptional<z.ZodString>;
                        points: z.ZodDefault<z.ZodNumber>;
                        timeLimit: z.ZodOptional<z.ZodNumber>;
                        prerequisites: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
                        tools: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
                        flags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
                    }, "strip", z.ZodTypeAny, {
                        instructions: string;
                        id: string;
                        points: number;
                        title: string;
                        description: string;
                        order: number;
                        prerequisites: string[];
                        tools: string[];
                        flags: string[];
                        timeLimit?: number | undefined;
                        expectedOutput?: string | undefined;
                        validationScript?: string | undefined;
                    }, {
                        instructions: string;
                        id: string;
                        title: string;
                        description: string;
                        order: number;
                        points?: number | undefined;
                        timeLimit?: number | undefined;
                        prerequisites?: string[] | undefined;
                        expectedOutput?: string | undefined;
                        validationScript?: string | undefined;
                        tools?: string[] | undefined;
                        flags?: string[] | undefined;
                    }>, "many">;
                    hints: z.ZodDefault<z.ZodArray<z.ZodObject<{
                        id: z.ZodString;
                        order: z.ZodNumber;
                        title: z.ZodString;
                        content: z.ZodString;
                        pointDeduction: z.ZodDefault<z.ZodNumber>;
                    }, "strip", z.ZodTypeAny, {
                        id: string;
                        title: string;
                        content: string;
                        order: number;
                        pointDeduction: number;
                    }, {
                        id: string;
                        title: string;
                        content: string;
                        order: number;
                        pointDeduction?: number | undefined;
                    }>, "many">>;
                    solution: z.ZodString;
                    estimatedTime: z.ZodNumber;
                    maxAttempts: z.ZodDefault<z.ZodNumber>;
                    order: z.ZodNumber;
                    prerequisites: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
                    tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
                    learningObjectives: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
                    references: z.ZodDefault<z.ZodArray<z.ZodObject<{
                        title: z.ZodString;
                        url: z.ZodString;
                        type: z.ZodEnum<["documentation", "tutorial", "tool", "research"]>;
                    }, "strip", z.ZodTypeAny, {
                        type: "tool" | "documentation" | "tutorial" | "research";
                        title: string;
                        url: string;
                    }, {
                        type: "tool" | "documentation" | "tutorial" | "research";
                        title: string;
                        url: string;
                    }>, "many">>;
                    createdBy: z.ZodString;
                    createdAt: z.ZodDate;
                    updatedAt: z.ZodDate;
                    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
                }, "strip", z.ZodTypeAny, {
                    id: string;
                    hints: {
                        id: string;
                        title: string;
                        content: string;
                        order: number;
                        pointDeduction: number;
                    }[];
                    title: string;
                    description: string;
                    maxAttempts: number;
                    order: number;
                    prerequisites: string[];
                    tags: string[];
                    metadata: Record<string, any>;
                    environment: {
                        type: "simulated" | "live" | "sandboxed" | "cloud";
                        config: {
                            containers: {
                                name: string;
                                image: string;
                                ports: number[];
                                environment: Record<string, string>;
                                volumes: string[];
                            }[];
                            timeout: number;
                            resources?: {
                                cpu: string;
                                memory: string;
                                storage: string;
                            } | undefined;
                            network?: {
                                isolated: boolean;
                                allowInternet: boolean;
                                customTopology?: any;
                            } | undefined;
                        };
                        provisioning?: {
                            setupScript?: string | undefined;
                            teardownScript?: string | undefined;
                            healthCheck?: string | undefined;
                        } | undefined;
                    };
                    difficulty: "easy" | "medium" | "hard";
                    skillLevel: "beginner" | "intermediate" | "advanced";
                    tasks: {
                        instructions: string;
                        id: string;
                        points: number;
                        title: string;
                        description: string;
                        order: number;
                        prerequisites: string[];
                        tools: string[];
                        flags: string[];
                        timeLimit?: number | undefined;
                        expectedOutput?: string | undefined;
                        validationScript?: string | undefined;
                    }[];
                    solution: string;
                    estimatedTime: number;
                    learningObjectives: string[];
                    references: {
                        type: "tool" | "documentation" | "tutorial" | "research";
                        title: string;
                        url: string;
                    }[];
                    createdBy: string;
                    createdAt: Date;
                    updatedAt: Date;
                }, {
                    id: string;
                    title: string;
                    description: string;
                    order: number;
                    environment: {
                        type: "simulated" | "live" | "sandboxed" | "cloud";
                        config: {
                            resources?: {
                                cpu?: string | undefined;
                                memory?: string | undefined;
                                storage?: string | undefined;
                            } | undefined;
                            containers?: {
                                name: string;
                                image: string;
                                ports?: number[] | undefined;
                                environment?: Record<string, string> | undefined;
                                volumes?: string[] | undefined;
                            }[] | undefined;
                            network?: {
                                isolated?: boolean | undefined;
                                allowInternet?: boolean | undefined;
                                customTopology?: any;
                            } | undefined;
                            timeout?: number | undefined;
                        };
                        provisioning?: {
                            setupScript?: string | undefined;
                            teardownScript?: string | undefined;
                            healthCheck?: string | undefined;
                        } | undefined;
                    };
                    difficulty: "easy" | "medium" | "hard";
                    skillLevel: "beginner" | "intermediate" | "advanced";
                    tasks: {
                        instructions: string;
                        id: string;
                        title: string;
                        description: string;
                        order: number;
                        points?: number | undefined;
                        timeLimit?: number | undefined;
                        prerequisites?: string[] | undefined;
                        expectedOutput?: string | undefined;
                        validationScript?: string | undefined;
                        tools?: string[] | undefined;
                        flags?: string[] | undefined;
                    }[];
                    solution: string;
                    estimatedTime: number;
                    createdBy: string;
                    createdAt: Date;
                    updatedAt: Date;
                    hints?: {
                        id: string;
                        title: string;
                        content: string;
                        order: number;
                        pointDeduction?: number | undefined;
                    }[] | undefined;
                    maxAttempts?: number | undefined;
                    prerequisites?: string[] | undefined;
                    tags?: string[] | undefined;
                    metadata?: Record<string, any> | undefined;
                    learningObjectives?: string[] | undefined;
                    references?: {
                        type: "tool" | "documentation" | "tutorial" | "research";
                        title: string;
                        url: string;
                    }[] | undefined;
                }>, "many">>;
                assessments: z.ZodDefault<z.ZodArray<z.ZodObject<{
                    id: z.ZodString;
                    title: z.ZodString;
                    description: z.ZodString;
                    type: z.ZodEnum<["quiz", "practical", "project", "simulation", "essay"]>;
                    difficulty: z.ZodEnum<["easy", "medium", "hard"]>;
                    timeLimit: z.ZodOptional<z.ZodNumber>;
                    passingScore: z.ZodDefault<z.ZodNumber>;
                    maxAttempts: z.ZodDefault<z.ZodNumber>;
                    questions: z.ZodOptional<z.ZodArray<z.ZodObject<{
                        id: z.ZodString;
                        type: z.ZodEnum<["multiple-choice", "true-false", "fill-blank", "essay", "code", "simulation"]>;
                        question: z.ZodString;
                        options: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                        correctAnswer: z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>;
                        explanation: z.ZodOptional<z.ZodString>;
                        points: z.ZodDefault<z.ZodNumber>;
                        timeLimit: z.ZodOptional<z.ZodNumber>;
                        hints: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
                    }, "strip", z.ZodTypeAny, {
                        type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
                        id: string;
                        question: string;
                        correctAnswer: string | string[];
                        points: number;
                        hints: string[];
                        options?: string[] | undefined;
                        explanation?: string | undefined;
                        timeLimit?: number | undefined;
                    }, {
                        type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
                        id: string;
                        question: string;
                        correctAnswer: string | string[];
                        options?: string[] | undefined;
                        explanation?: string | undefined;
                        points?: number | undefined;
                        timeLimit?: number | undefined;
                        hints?: string[] | undefined;
                    }>, "many">>;
                    practicalTasks: z.ZodOptional<z.ZodArray<z.ZodObject<{
                        id: z.ZodString;
                        title: z.ZodString;
                        description: z.ZodString;
                        order: z.ZodNumber;
                        instructions: z.ZodString;
                        expectedOutput: z.ZodOptional<z.ZodString>;
                        validationScript: z.ZodOptional<z.ZodString>;
                        points: z.ZodDefault<z.ZodNumber>;
                        timeLimit: z.ZodOptional<z.ZodNumber>;
                        prerequisites: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
                        tools: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
                        flags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
                    }, "strip", z.ZodTypeAny, {
                        instructions: string;
                        id: string;
                        points: number;
                        title: string;
                        description: string;
                        order: number;
                        prerequisites: string[];
                        tools: string[];
                        flags: string[];
                        timeLimit?: number | undefined;
                        expectedOutput?: string | undefined;
                        validationScript?: string | undefined;
                    }, {
                        instructions: string;
                        id: string;
                        title: string;
                        description: string;
                        order: number;
                        points?: number | undefined;
                        timeLimit?: number | undefined;
                        prerequisites?: string[] | undefined;
                        expectedOutput?: string | undefined;
                        validationScript?: string | undefined;
                        tools?: string[] | undefined;
                        flags?: string[] | undefined;
                    }>, "many">>;
                    rubric: z.ZodOptional<z.ZodObject<{
                        criteria: z.ZodArray<z.ZodObject<{
                            name: z.ZodString;
                            description: z.ZodString;
                            maxPoints: z.ZodNumber;
                            weight: z.ZodNumber;
                        }, "strip", z.ZodTypeAny, {
                            description: string;
                            name: string;
                            maxPoints: number;
                            weight: number;
                        }, {
                            description: string;
                            name: string;
                            maxPoints: number;
                            weight: number;
                        }>, "many">;
                    }, "strip", z.ZodTypeAny, {
                        criteria: {
                            description: string;
                            name: string;
                            maxPoints: number;
                            weight: number;
                        }[];
                    }, {
                        criteria: {
                            description: string;
                            name: string;
                            maxPoints: number;
                            weight: number;
                        }[];
                    }>>;
                    autoGrading: z.ZodDefault<z.ZodBoolean>;
                    order: z.ZodNumber;
                    prerequisites: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
                    tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
                    createdBy: z.ZodString;
                    createdAt: z.ZodDate;
                    updatedAt: z.ZodDate;
                    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
                }, "strip", z.ZodTypeAny, {
                    type: "simulation" | "quiz" | "practical" | "project" | "essay";
                    id: string;
                    title: string;
                    description: string;
                    passingScore: number;
                    maxAttempts: number;
                    order: number;
                    prerequisites: string[];
                    tags: string[];
                    metadata: Record<string, any>;
                    difficulty: "easy" | "medium" | "hard";
                    createdBy: string;
                    createdAt: Date;
                    updatedAt: Date;
                    autoGrading: boolean;
                    timeLimit?: number | undefined;
                    questions?: {
                        type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
                        id: string;
                        question: string;
                        correctAnswer: string | string[];
                        points: number;
                        hints: string[];
                        options?: string[] | undefined;
                        explanation?: string | undefined;
                        timeLimit?: number | undefined;
                    }[] | undefined;
                    practicalTasks?: {
                        instructions: string;
                        id: string;
                        points: number;
                        title: string;
                        description: string;
                        order: number;
                        prerequisites: string[];
                        tools: string[];
                        flags: string[];
                        timeLimit?: number | undefined;
                        expectedOutput?: string | undefined;
                        validationScript?: string | undefined;
                    }[] | undefined;
                    rubric?: {
                        criteria: {
                            description: string;
                            name: string;
                            maxPoints: number;
                            weight: number;
                        }[];
                    } | undefined;
                }, {
                    type: "simulation" | "quiz" | "practical" | "project" | "essay";
                    id: string;
                    title: string;
                    description: string;
                    order: number;
                    difficulty: "easy" | "medium" | "hard";
                    createdBy: string;
                    createdAt: Date;
                    updatedAt: Date;
                    timeLimit?: number | undefined;
                    questions?: {
                        type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
                        id: string;
                        question: string;
                        correctAnswer: string | string[];
                        options?: string[] | undefined;
                        explanation?: string | undefined;
                        points?: number | undefined;
                        timeLimit?: number | undefined;
                        hints?: string[] | undefined;
                    }[] | undefined;
                    passingScore?: number | undefined;
                    maxAttempts?: number | undefined;
                    prerequisites?: string[] | undefined;
                    tags?: string[] | undefined;
                    metadata?: Record<string, any> | undefined;
                    practicalTasks?: {
                        instructions: string;
                        id: string;
                        title: string;
                        description: string;
                        order: number;
                        points?: number | undefined;
                        timeLimit?: number | undefined;
                        prerequisites?: string[] | undefined;
                        expectedOutput?: string | undefined;
                        validationScript?: string | undefined;
                        tools?: string[] | undefined;
                        flags?: string[] | undefined;
                    }[] | undefined;
                    rubric?: {
                        criteria: {
                            description: string;
                            name: string;
                            maxPoints: number;
                            weight: number;
                        }[];
                    } | undefined;
                    autoGrading?: boolean | undefined;
                }>, "many">>;
            }, "strip", z.ZodTypeAny, {
                lessons: {
                    type: "video" | "article" | "interactive" | "simulation" | "document";
                    id: string;
                    title: string;
                    description: string;
                    content: string | {
                        type: "simulation" | "diagram" | "code-editor" | "terminal" | "network-map";
                        config: Record<string, any>;
                        instructions: string;
                        data?: any;
                    } | {
                        videoUrl: string;
                        transcript?: string | undefined;
                    };
                    duration: number;
                    order: number;
                    prerequisites: string[];
                    tags: string[];
                    resources: {
                        type: "document" | "link" | "tool";
                        title: string;
                        url: string;
                    }[];
                    metadata: Record<string, any>;
                    quiz?: {
                        id: string;
                        title: string;
                        questions: {
                            type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
                            id: string;
                            question: string;
                            correctAnswer: string | string[];
                            points: number;
                            hints: string[];
                            options?: string[] | undefined;
                            explanation?: string | undefined;
                            timeLimit?: number | undefined;
                        }[];
                        passingScore: number;
                        maxAttempts: number;
                        randomizeQuestions: boolean;
                        showResults: boolean;
                        timeLimit?: number | undefined;
                        description?: string | undefined;
                    } | undefined;
                }[];
                labs: {
                    id: string;
                    hints: {
                        id: string;
                        title: string;
                        content: string;
                        order: number;
                        pointDeduction: number;
                    }[];
                    title: string;
                    description: string;
                    maxAttempts: number;
                    order: number;
                    prerequisites: string[];
                    tags: string[];
                    metadata: Record<string, any>;
                    environment: {
                        type: "simulated" | "live" | "sandboxed" | "cloud";
                        config: {
                            containers: {
                                name: string;
                                image: string;
                                ports: number[];
                                environment: Record<string, string>;
                                volumes: string[];
                            }[];
                            timeout: number;
                            resources?: {
                                cpu: string;
                                memory: string;
                                storage: string;
                            } | undefined;
                            network?: {
                                isolated: boolean;
                                allowInternet: boolean;
                                customTopology?: any;
                            } | undefined;
                        };
                        provisioning?: {
                            setupScript?: string | undefined;
                            teardownScript?: string | undefined;
                            healthCheck?: string | undefined;
                        } | undefined;
                    };
                    difficulty: "easy" | "medium" | "hard";
                    skillLevel: "beginner" | "intermediate" | "advanced";
                    tasks: {
                        instructions: string;
                        id: string;
                        points: number;
                        title: string;
                        description: string;
                        order: number;
                        prerequisites: string[];
                        tools: string[];
                        flags: string[];
                        timeLimit?: number | undefined;
                        expectedOutput?: string | undefined;
                        validationScript?: string | undefined;
                    }[];
                    solution: string;
                    estimatedTime: number;
                    learningObjectives: string[];
                    references: {
                        type: "tool" | "documentation" | "tutorial" | "research";
                        title: string;
                        url: string;
                    }[];
                    createdBy: string;
                    createdAt: Date;
                    updatedAt: Date;
                }[];
                assessments: {
                    type: "simulation" | "quiz" | "practical" | "project" | "essay";
                    id: string;
                    title: string;
                    description: string;
                    passingScore: number;
                    maxAttempts: number;
                    order: number;
                    prerequisites: string[];
                    tags: string[];
                    metadata: Record<string, any>;
                    difficulty: "easy" | "medium" | "hard";
                    createdBy: string;
                    createdAt: Date;
                    updatedAt: Date;
                    autoGrading: boolean;
                    timeLimit?: number | undefined;
                    questions?: {
                        type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
                        id: string;
                        question: string;
                        correctAnswer: string | string[];
                        points: number;
                        hints: string[];
                        options?: string[] | undefined;
                        explanation?: string | undefined;
                        timeLimit?: number | undefined;
                    }[] | undefined;
                    practicalTasks?: {
                        instructions: string;
                        id: string;
                        points: number;
                        title: string;
                        description: string;
                        order: number;
                        prerequisites: string[];
                        tools: string[];
                        flags: string[];
                        timeLimit?: number | undefined;
                        expectedOutput?: string | undefined;
                        validationScript?: string | undefined;
                    }[] | undefined;
                    rubric?: {
                        criteria: {
                            description: string;
                            name: string;
                            maxPoints: number;
                            weight: number;
                        }[];
                    } | undefined;
                }[];
            }, {
                lessons?: {
                    type: "video" | "article" | "interactive" | "simulation" | "document";
                    id: string;
                    title: string;
                    description: string;
                    content: string | {
                        type: "simulation" | "diagram" | "code-editor" | "terminal" | "network-map";
                        config: Record<string, any>;
                        instructions: string;
                        data?: any;
                    } | {
                        videoUrl: string;
                        transcript?: string | undefined;
                    };
                    duration: number;
                    order: number;
                    quiz?: {
                        id: string;
                        title: string;
                        questions: {
                            type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
                            id: string;
                            question: string;
                            correctAnswer: string | string[];
                            options?: string[] | undefined;
                            explanation?: string | undefined;
                            points?: number | undefined;
                            timeLimit?: number | undefined;
                            hints?: string[] | undefined;
                        }[];
                        timeLimit?: number | undefined;
                        description?: string | undefined;
                        passingScore?: number | undefined;
                        maxAttempts?: number | undefined;
                        randomizeQuestions?: boolean | undefined;
                        showResults?: boolean | undefined;
                    } | undefined;
                    prerequisites?: string[] | undefined;
                    tags?: string[] | undefined;
                    resources?: {
                        type: "document" | "link" | "tool";
                        title: string;
                        url: string;
                    }[] | undefined;
                    metadata?: Record<string, any> | undefined;
                }[] | undefined;
                labs?: {
                    id: string;
                    title: string;
                    description: string;
                    order: number;
                    environment: {
                        type: "simulated" | "live" | "sandboxed" | "cloud";
                        config: {
                            resources?: {
                                cpu?: string | undefined;
                                memory?: string | undefined;
                                storage?: string | undefined;
                            } | undefined;
                            containers?: {
                                name: string;
                                image: string;
                                ports?: number[] | undefined;
                                environment?: Record<string, string> | undefined;
                                volumes?: string[] | undefined;
                            }[] | undefined;
                            network?: {
                                isolated?: boolean | undefined;
                                allowInternet?: boolean | undefined;
                                customTopology?: any;
                            } | undefined;
                            timeout?: number | undefined;
                        };
                        provisioning?: {
                            setupScript?: string | undefined;
                            teardownScript?: string | undefined;
                            healthCheck?: string | undefined;
                        } | undefined;
                    };
                    difficulty: "easy" | "medium" | "hard";
                    skillLevel: "beginner" | "intermediate" | "advanced";
                    tasks: {
                        instructions: string;
                        id: string;
                        title: string;
                        description: string;
                        order: number;
                        points?: number | undefined;
                        timeLimit?: number | undefined;
                        prerequisites?: string[] | undefined;
                        expectedOutput?: string | undefined;
                        validationScript?: string | undefined;
                        tools?: string[] | undefined;
                        flags?: string[] | undefined;
                    }[];
                    solution: string;
                    estimatedTime: number;
                    createdBy: string;
                    createdAt: Date;
                    updatedAt: Date;
                    hints?: {
                        id: string;
                        title: string;
                        content: string;
                        order: number;
                        pointDeduction?: number | undefined;
                    }[] | undefined;
                    maxAttempts?: number | undefined;
                    prerequisites?: string[] | undefined;
                    tags?: string[] | undefined;
                    metadata?: Record<string, any> | undefined;
                    learningObjectives?: string[] | undefined;
                    references?: {
                        type: "tool" | "documentation" | "tutorial" | "research";
                        title: string;
                        url: string;
                    }[] | undefined;
                }[] | undefined;
                assessments?: {
                    type: "simulation" | "quiz" | "practical" | "project" | "essay";
                    id: string;
                    title: string;
                    description: string;
                    order: number;
                    difficulty: "easy" | "medium" | "hard";
                    createdBy: string;
                    createdAt: Date;
                    updatedAt: Date;
                    timeLimit?: number | undefined;
                    questions?: {
                        type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
                        id: string;
                        question: string;
                        correctAnswer: string | string[];
                        options?: string[] | undefined;
                        explanation?: string | undefined;
                        points?: number | undefined;
                        timeLimit?: number | undefined;
                        hints?: string[] | undefined;
                    }[] | undefined;
                    passingScore?: number | undefined;
                    maxAttempts?: number | undefined;
                    prerequisites?: string[] | undefined;
                    tags?: string[] | undefined;
                    metadata?: Record<string, any> | undefined;
                    practicalTasks?: {
                        instructions: string;
                        id: string;
                        title: string;
                        description: string;
                        order: number;
                        points?: number | undefined;
                        timeLimit?: number | undefined;
                        prerequisites?: string[] | undefined;
                        expectedOutput?: string | undefined;
                        validationScript?: string | undefined;
                        tools?: string[] | undefined;
                        flags?: string[] | undefined;
                    }[] | undefined;
                    rubric?: {
                        criteria: {
                            description: string;
                            name: string;
                            maxPoints: number;
                            weight: number;
                        }[];
                    } | undefined;
                    autoGrading?: boolean | undefined;
                }[] | undefined;
            }>;
            completionCriteria: z.ZodObject<{
                requiredLessons: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
                requiredLabs: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
                requiredAssessments: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
                minimumAssessmentScore: z.ZodDefault<z.ZodNumber>;
                minimumLabScore: z.ZodDefault<z.ZodNumber>;
                requireAllLessons: z.ZodDefault<z.ZodBoolean>;
                requireAllLabs: z.ZodDefault<z.ZodBoolean>;
                requireAllAssessments: z.ZodDefault<z.ZodBoolean>;
            }, "strip", z.ZodTypeAny, {
                requiredLessons: string[];
                requiredLabs: string[];
                requiredAssessments: string[];
                minimumAssessmentScore: number;
                minimumLabScore: number;
                requireAllLessons: boolean;
                requireAllLabs: boolean;
                requireAllAssessments: boolean;
            }, {
                requiredLessons?: string[] | undefined;
                requiredLabs?: string[] | undefined;
                requiredAssessments?: string[] | undefined;
                minimumAssessmentScore?: number | undefined;
                minimumLabScore?: number | undefined;
                requireAllLessons?: boolean | undefined;
                requireAllLabs?: boolean | undefined;
                requireAllAssessments?: boolean | undefined;
            }>;
            prerequisites: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            learningObjectives: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            createdBy: z.ZodString;
            createdAt: z.ZodDate;
            updatedAt: z.ZodDate;
            metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            title: string;
            description: string;
            content: {
                lessons: {
                    type: "video" | "article" | "interactive" | "simulation" | "document";
                    id: string;
                    title: string;
                    description: string;
                    content: string | {
                        type: "simulation" | "diagram" | "code-editor" | "terminal" | "network-map";
                        config: Record<string, any>;
                        instructions: string;
                        data?: any;
                    } | {
                        videoUrl: string;
                        transcript?: string | undefined;
                    };
                    duration: number;
                    order: number;
                    prerequisites: string[];
                    tags: string[];
                    resources: {
                        type: "document" | "link" | "tool";
                        title: string;
                        url: string;
                    }[];
                    metadata: Record<string, any>;
                    quiz?: {
                        id: string;
                        title: string;
                        questions: {
                            type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
                            id: string;
                            question: string;
                            correctAnswer: string | string[];
                            points: number;
                            hints: string[];
                            options?: string[] | undefined;
                            explanation?: string | undefined;
                            timeLimit?: number | undefined;
                        }[];
                        passingScore: number;
                        maxAttempts: number;
                        randomizeQuestions: boolean;
                        showResults: boolean;
                        timeLimit?: number | undefined;
                        description?: string | undefined;
                    } | undefined;
                }[];
                labs: {
                    id: string;
                    hints: {
                        id: string;
                        title: string;
                        content: string;
                        order: number;
                        pointDeduction: number;
                    }[];
                    title: string;
                    description: string;
                    maxAttempts: number;
                    order: number;
                    prerequisites: string[];
                    tags: string[];
                    metadata: Record<string, any>;
                    environment: {
                        type: "simulated" | "live" | "sandboxed" | "cloud";
                        config: {
                            containers: {
                                name: string;
                                image: string;
                                ports: number[];
                                environment: Record<string, string>;
                                volumes: string[];
                            }[];
                            timeout: number;
                            resources?: {
                                cpu: string;
                                memory: string;
                                storage: string;
                            } | undefined;
                            network?: {
                                isolated: boolean;
                                allowInternet: boolean;
                                customTopology?: any;
                            } | undefined;
                        };
                        provisioning?: {
                            setupScript?: string | undefined;
                            teardownScript?: string | undefined;
                            healthCheck?: string | undefined;
                        } | undefined;
                    };
                    difficulty: "easy" | "medium" | "hard";
                    skillLevel: "beginner" | "intermediate" | "advanced";
                    tasks: {
                        instructions: string;
                        id: string;
                        points: number;
                        title: string;
                        description: string;
                        order: number;
                        prerequisites: string[];
                        tools: string[];
                        flags: string[];
                        timeLimit?: number | undefined;
                        expectedOutput?: string | undefined;
                        validationScript?: string | undefined;
                    }[];
                    solution: string;
                    estimatedTime: number;
                    learningObjectives: string[];
                    references: {
                        type: "tool" | "documentation" | "tutorial" | "research";
                        title: string;
                        url: string;
                    }[];
                    createdBy: string;
                    createdAt: Date;
                    updatedAt: Date;
                }[];
                assessments: {
                    type: "simulation" | "quiz" | "practical" | "project" | "essay";
                    id: string;
                    title: string;
                    description: string;
                    passingScore: number;
                    maxAttempts: number;
                    order: number;
                    prerequisites: string[];
                    tags: string[];
                    metadata: Record<string, any>;
                    difficulty: "easy" | "medium" | "hard";
                    createdBy: string;
                    createdAt: Date;
                    updatedAt: Date;
                    autoGrading: boolean;
                    timeLimit?: number | undefined;
                    questions?: {
                        type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
                        id: string;
                        question: string;
                        correctAnswer: string | string[];
                        points: number;
                        hints: string[];
                        options?: string[] | undefined;
                        explanation?: string | undefined;
                        timeLimit?: number | undefined;
                    }[] | undefined;
                    practicalTasks?: {
                        instructions: string;
                        id: string;
                        points: number;
                        title: string;
                        description: string;
                        order: number;
                        prerequisites: string[];
                        tools: string[];
                        flags: string[];
                        timeLimit?: number | undefined;
                        expectedOutput?: string | undefined;
                        validationScript?: string | undefined;
                    }[] | undefined;
                    rubric?: {
                        criteria: {
                            description: string;
                            name: string;
                            maxPoints: number;
                            weight: number;
                        }[];
                    } | undefined;
                }[];
            };
            order: number;
            prerequisites: string[];
            tags: string[];
            metadata: Record<string, any>;
            skillLevel: "beginner" | "intermediate" | "advanced";
            learningObjectives: string[];
            createdBy: string;
            createdAt: Date;
            updatedAt: Date;
            estimatedHours: number;
            completionCriteria: {
                requiredLessons: string[];
                requiredLabs: string[];
                requiredAssessments: string[];
                minimumAssessmentScore: number;
                minimumLabScore: number;
                requireAllLessons: boolean;
                requireAllLabs: boolean;
                requireAllAssessments: boolean;
            };
        }, {
            id: string;
            title: string;
            description: string;
            content: {
                lessons?: {
                    type: "video" | "article" | "interactive" | "simulation" | "document";
                    id: string;
                    title: string;
                    description: string;
                    content: string | {
                        type: "simulation" | "diagram" | "code-editor" | "terminal" | "network-map";
                        config: Record<string, any>;
                        instructions: string;
                        data?: any;
                    } | {
                        videoUrl: string;
                        transcript?: string | undefined;
                    };
                    duration: number;
                    order: number;
                    quiz?: {
                        id: string;
                        title: string;
                        questions: {
                            type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
                            id: string;
                            question: string;
                            correctAnswer: string | string[];
                            options?: string[] | undefined;
                            explanation?: string | undefined;
                            points?: number | undefined;
                            timeLimit?: number | undefined;
                            hints?: string[] | undefined;
                        }[];
                        timeLimit?: number | undefined;
                        description?: string | undefined;
                        passingScore?: number | undefined;
                        maxAttempts?: number | undefined;
                        randomizeQuestions?: boolean | undefined;
                        showResults?: boolean | undefined;
                    } | undefined;
                    prerequisites?: string[] | undefined;
                    tags?: string[] | undefined;
                    resources?: {
                        type: "document" | "link" | "tool";
                        title: string;
                        url: string;
                    }[] | undefined;
                    metadata?: Record<string, any> | undefined;
                }[] | undefined;
                labs?: {
                    id: string;
                    title: string;
                    description: string;
                    order: number;
                    environment: {
                        type: "simulated" | "live" | "sandboxed" | "cloud";
                        config: {
                            resources?: {
                                cpu?: string | undefined;
                                memory?: string | undefined;
                                storage?: string | undefined;
                            } | undefined;
                            containers?: {
                                name: string;
                                image: string;
                                ports?: number[] | undefined;
                                environment?: Record<string, string> | undefined;
                                volumes?: string[] | undefined;
                            }[] | undefined;
                            network?: {
                                isolated?: boolean | undefined;
                                allowInternet?: boolean | undefined;
                                customTopology?: any;
                            } | undefined;
                            timeout?: number | undefined;
                        };
                        provisioning?: {
                            setupScript?: string | undefined;
                            teardownScript?: string | undefined;
                            healthCheck?: string | undefined;
                        } | undefined;
                    };
                    difficulty: "easy" | "medium" | "hard";
                    skillLevel: "beginner" | "intermediate" | "advanced";
                    tasks: {
                        instructions: string;
                        id: string;
                        title: string;
                        description: string;
                        order: number;
                        points?: number | undefined;
                        timeLimit?: number | undefined;
                        prerequisites?: string[] | undefined;
                        expectedOutput?: string | undefined;
                        validationScript?: string | undefined;
                        tools?: string[] | undefined;
                        flags?: string[] | undefined;
                    }[];
                    solution: string;
                    estimatedTime: number;
                    createdBy: string;
                    createdAt: Date;
                    updatedAt: Date;
                    hints?: {
                        id: string;
                        title: string;
                        content: string;
                        order: number;
                        pointDeduction?: number | undefined;
                    }[] | undefined;
                    maxAttempts?: number | undefined;
                    prerequisites?: string[] | undefined;
                    tags?: string[] | undefined;
                    metadata?: Record<string, any> | undefined;
                    learningObjectives?: string[] | undefined;
                    references?: {
                        type: "tool" | "documentation" | "tutorial" | "research";
                        title: string;
                        url: string;
                    }[] | undefined;
                }[] | undefined;
                assessments?: {
                    type: "simulation" | "quiz" | "practical" | "project" | "essay";
                    id: string;
                    title: string;
                    description: string;
                    order: number;
                    difficulty: "easy" | "medium" | "hard";
                    createdBy: string;
                    createdAt: Date;
                    updatedAt: Date;
                    timeLimit?: number | undefined;
                    questions?: {
                        type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
                        id: string;
                        question: string;
                        correctAnswer: string | string[];
                        options?: string[] | undefined;
                        explanation?: string | undefined;
                        points?: number | undefined;
                        timeLimit?: number | undefined;
                        hints?: string[] | undefined;
                    }[] | undefined;
                    passingScore?: number | undefined;
                    maxAttempts?: number | undefined;
                    prerequisites?: string[] | undefined;
                    tags?: string[] | undefined;
                    metadata?: Record<string, any> | undefined;
                    practicalTasks?: {
                        instructions: string;
                        id: string;
                        title: string;
                        description: string;
                        order: number;
                        points?: number | undefined;
                        timeLimit?: number | undefined;
                        prerequisites?: string[] | undefined;
                        expectedOutput?: string | undefined;
                        validationScript?: string | undefined;
                        tools?: string[] | undefined;
                        flags?: string[] | undefined;
                    }[] | undefined;
                    rubric?: {
                        criteria: {
                            description: string;
                            name: string;
                            maxPoints: number;
                            weight: number;
                        }[];
                    } | undefined;
                    autoGrading?: boolean | undefined;
                }[] | undefined;
            };
            order: number;
            skillLevel: "beginner" | "intermediate" | "advanced";
            createdBy: string;
            createdAt: Date;
            updatedAt: Date;
            estimatedHours: number;
            completionCriteria: {
                requiredLessons?: string[] | undefined;
                requiredLabs?: string[] | undefined;
                requiredAssessments?: string[] | undefined;
                minimumAssessmentScore?: number | undefined;
                minimumLabScore?: number | undefined;
                requireAllLessons?: boolean | undefined;
                requireAllLabs?: boolean | undefined;
                requireAllAssessments?: boolean | undefined;
            };
            prerequisites?: string[] | undefined;
            tags?: string[] | undefined;
            metadata?: Record<string, any> | undefined;
            learningObjectives?: string[] | undefined;
        }>, "many">;
        prerequisites: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        certification: z.ZodOptional<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            description: z.ZodString;
            issuer: z.ZodString;
            validityPeriod: z.ZodOptional<z.ZodNumber>;
            examRequirements: z.ZodString;
            prerequisites: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            competencies: z.ZodDefault<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                name: z.ZodString;
                description: z.ZodString;
                weight: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                id: string;
                description: string;
                name: string;
                weight: number;
            }, {
                id: string;
                description: string;
                name: string;
                weight: number;
            }>, "many">>;
            passingCriteria: z.ZodObject<{
                minimumScore: z.ZodDefault<z.ZodNumber>;
                requiredCompetencies: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
                timeLimit: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                minimumScore: number;
                requiredCompetencies: string[];
                timeLimit?: number | undefined;
            }, {
                timeLimit?: number | undefined;
                minimumScore?: number | undefined;
                requiredCompetencies?: string[] | undefined;
            }>;
            badgeUrl: z.ZodOptional<z.ZodString>;
            credentialTemplate: z.ZodOptional<z.ZodString>;
            metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            description: string;
            prerequisites: string[];
            metadata: Record<string, any>;
            name: string;
            issuer: string;
            examRequirements: string;
            competencies: {
                id: string;
                description: string;
                name: string;
                weight: number;
            }[];
            passingCriteria: {
                minimumScore: number;
                requiredCompetencies: string[];
                timeLimit?: number | undefined;
            };
            validityPeriod?: number | undefined;
            badgeUrl?: string | undefined;
            credentialTemplate?: string | undefined;
        }, {
            id: string;
            description: string;
            name: string;
            issuer: string;
            examRequirements: string;
            passingCriteria: {
                timeLimit?: number | undefined;
                minimumScore?: number | undefined;
                requiredCompetencies?: string[] | undefined;
            };
            prerequisites?: string[] | undefined;
            metadata?: Record<string, any> | undefined;
            validityPeriod?: number | undefined;
            competencies?: {
                id: string;
                description: string;
                name: string;
                weight: number;
            }[] | undefined;
            badgeUrl?: string | undefined;
            credentialTemplate?: string | undefined;
        }>>;
        tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        category: z.ZodString;
        difficulty: z.ZodEnum<["easy", "medium", "hard"]>;
        learningObjectives: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        targetAudience: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        industry: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        trending: z.ZodDefault<z.ZodBoolean>;
        featured: z.ZodDefault<z.ZodBoolean>;
        price: z.ZodDefault<z.ZodNumber>;
        enrollmentLimit: z.ZodOptional<z.ZodNumber>;
        startDate: z.ZodOptional<z.ZodDate>;
        endDate: z.ZodOptional<z.ZodDate>;
        instructors: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        createdBy: z.ZodString;
        createdAt: z.ZodDate;
        updatedAt: z.ZodDate;
        metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        title: string;
        description: string;
        prerequisites: string[];
        tags: string[];
        metadata: Record<string, any>;
        difficulty: "easy" | "medium" | "hard";
        skillLevel: "beginner" | "intermediate" | "advanced";
        learningObjectives: string[];
        createdBy: string;
        createdAt: Date;
        updatedAt: Date;
        estimatedHours: number;
        modules: {
            id: string;
            title: string;
            description: string;
            content: {
                lessons: {
                    type: "video" | "article" | "interactive" | "simulation" | "document";
                    id: string;
                    title: string;
                    description: string;
                    content: string | {
                        type: "simulation" | "diagram" | "code-editor" | "terminal" | "network-map";
                        config: Record<string, any>;
                        instructions: string;
                        data?: any;
                    } | {
                        videoUrl: string;
                        transcript?: string | undefined;
                    };
                    duration: number;
                    order: number;
                    prerequisites: string[];
                    tags: string[];
                    resources: {
                        type: "document" | "link" | "tool";
                        title: string;
                        url: string;
                    }[];
                    metadata: Record<string, any>;
                    quiz?: {
                        id: string;
                        title: string;
                        questions: {
                            type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
                            id: string;
                            question: string;
                            correctAnswer: string | string[];
                            points: number;
                            hints: string[];
                            options?: string[] | undefined;
                            explanation?: string | undefined;
                            timeLimit?: number | undefined;
                        }[];
                        passingScore: number;
                        maxAttempts: number;
                        randomizeQuestions: boolean;
                        showResults: boolean;
                        timeLimit?: number | undefined;
                        description?: string | undefined;
                    } | undefined;
                }[];
                labs: {
                    id: string;
                    hints: {
                        id: string;
                        title: string;
                        content: string;
                        order: number;
                        pointDeduction: number;
                    }[];
                    title: string;
                    description: string;
                    maxAttempts: number;
                    order: number;
                    prerequisites: string[];
                    tags: string[];
                    metadata: Record<string, any>;
                    environment: {
                        type: "simulated" | "live" | "sandboxed" | "cloud";
                        config: {
                            containers: {
                                name: string;
                                image: string;
                                ports: number[];
                                environment: Record<string, string>;
                                volumes: string[];
                            }[];
                            timeout: number;
                            resources?: {
                                cpu: string;
                                memory: string;
                                storage: string;
                            } | undefined;
                            network?: {
                                isolated: boolean;
                                allowInternet: boolean;
                                customTopology?: any;
                            } | undefined;
                        };
                        provisioning?: {
                            setupScript?: string | undefined;
                            teardownScript?: string | undefined;
                            healthCheck?: string | undefined;
                        } | undefined;
                    };
                    difficulty: "easy" | "medium" | "hard";
                    skillLevel: "beginner" | "intermediate" | "advanced";
                    tasks: {
                        instructions: string;
                        id: string;
                        points: number;
                        title: string;
                        description: string;
                        order: number;
                        prerequisites: string[];
                        tools: string[];
                        flags: string[];
                        timeLimit?: number | undefined;
                        expectedOutput?: string | undefined;
                        validationScript?: string | undefined;
                    }[];
                    solution: string;
                    estimatedTime: number;
                    learningObjectives: string[];
                    references: {
                        type: "tool" | "documentation" | "tutorial" | "research";
                        title: string;
                        url: string;
                    }[];
                    createdBy: string;
                    createdAt: Date;
                    updatedAt: Date;
                }[];
                assessments: {
                    type: "simulation" | "quiz" | "practical" | "project" | "essay";
                    id: string;
                    title: string;
                    description: string;
                    passingScore: number;
                    maxAttempts: number;
                    order: number;
                    prerequisites: string[];
                    tags: string[];
                    metadata: Record<string, any>;
                    difficulty: "easy" | "medium" | "hard";
                    createdBy: string;
                    createdAt: Date;
                    updatedAt: Date;
                    autoGrading: boolean;
                    timeLimit?: number | undefined;
                    questions?: {
                        type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
                        id: string;
                        question: string;
                        correctAnswer: string | string[];
                        points: number;
                        hints: string[];
                        options?: string[] | undefined;
                        explanation?: string | undefined;
                        timeLimit?: number | undefined;
                    }[] | undefined;
                    practicalTasks?: {
                        instructions: string;
                        id: string;
                        points: number;
                        title: string;
                        description: string;
                        order: number;
                        prerequisites: string[];
                        tools: string[];
                        flags: string[];
                        timeLimit?: number | undefined;
                        expectedOutput?: string | undefined;
                        validationScript?: string | undefined;
                    }[] | undefined;
                    rubric?: {
                        criteria: {
                            description: string;
                            name: string;
                            maxPoints: number;
                            weight: number;
                        }[];
                    } | undefined;
                }[];
            };
            order: number;
            prerequisites: string[];
            tags: string[];
            metadata: Record<string, any>;
            skillLevel: "beginner" | "intermediate" | "advanced";
            learningObjectives: string[];
            createdBy: string;
            createdAt: Date;
            updatedAt: Date;
            estimatedHours: number;
            completionCriteria: {
                requiredLessons: string[];
                requiredLabs: string[];
                requiredAssessments: string[];
                minimumAssessmentScore: number;
                minimumLabScore: number;
                requireAllLessons: boolean;
                requireAllLabs: boolean;
                requireAllAssessments: boolean;
            };
        }[];
        category: string;
        targetAudience: string[];
        industry: string[];
        trending: boolean;
        featured: boolean;
        price: number;
        instructors: string[];
        certification?: {
            id: string;
            description: string;
            prerequisites: string[];
            metadata: Record<string, any>;
            name: string;
            issuer: string;
            examRequirements: string;
            competencies: {
                id: string;
                description: string;
                name: string;
                weight: number;
            }[];
            passingCriteria: {
                minimumScore: number;
                requiredCompetencies: string[];
                timeLimit?: number | undefined;
            };
            validityPeriod?: number | undefined;
            badgeUrl?: string | undefined;
            credentialTemplate?: string | undefined;
        } | undefined;
        enrollmentLimit?: number | undefined;
        startDate?: Date | undefined;
        endDate?: Date | undefined;
    }, {
        id: string;
        title: string;
        description: string;
        difficulty: "easy" | "medium" | "hard";
        skillLevel: "beginner" | "intermediate" | "advanced";
        createdBy: string;
        createdAt: Date;
        updatedAt: Date;
        estimatedHours: number;
        modules: {
            id: string;
            title: string;
            description: string;
            content: {
                lessons?: {
                    type: "video" | "article" | "interactive" | "simulation" | "document";
                    id: string;
                    title: string;
                    description: string;
                    content: string | {
                        type: "simulation" | "diagram" | "code-editor" | "terminal" | "network-map";
                        config: Record<string, any>;
                        instructions: string;
                        data?: any;
                    } | {
                        videoUrl: string;
                        transcript?: string | undefined;
                    };
                    duration: number;
                    order: number;
                    quiz?: {
                        id: string;
                        title: string;
                        questions: {
                            type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
                            id: string;
                            question: string;
                            correctAnswer: string | string[];
                            options?: string[] | undefined;
                            explanation?: string | undefined;
                            points?: number | undefined;
                            timeLimit?: number | undefined;
                            hints?: string[] | undefined;
                        }[];
                        timeLimit?: number | undefined;
                        description?: string | undefined;
                        passingScore?: number | undefined;
                        maxAttempts?: number | undefined;
                        randomizeQuestions?: boolean | undefined;
                        showResults?: boolean | undefined;
                    } | undefined;
                    prerequisites?: string[] | undefined;
                    tags?: string[] | undefined;
                    resources?: {
                        type: "document" | "link" | "tool";
                        title: string;
                        url: string;
                    }[] | undefined;
                    metadata?: Record<string, any> | undefined;
                }[] | undefined;
                labs?: {
                    id: string;
                    title: string;
                    description: string;
                    order: number;
                    environment: {
                        type: "simulated" | "live" | "sandboxed" | "cloud";
                        config: {
                            resources?: {
                                cpu?: string | undefined;
                                memory?: string | undefined;
                                storage?: string | undefined;
                            } | undefined;
                            containers?: {
                                name: string;
                                image: string;
                                ports?: number[] | undefined;
                                environment?: Record<string, string> | undefined;
                                volumes?: string[] | undefined;
                            }[] | undefined;
                            network?: {
                                isolated?: boolean | undefined;
                                allowInternet?: boolean | undefined;
                                customTopology?: any;
                            } | undefined;
                            timeout?: number | undefined;
                        };
                        provisioning?: {
                            setupScript?: string | undefined;
                            teardownScript?: string | undefined;
                            healthCheck?: string | undefined;
                        } | undefined;
                    };
                    difficulty: "easy" | "medium" | "hard";
                    skillLevel: "beginner" | "intermediate" | "advanced";
                    tasks: {
                        instructions: string;
                        id: string;
                        title: string;
                        description: string;
                        order: number;
                        points?: number | undefined;
                        timeLimit?: number | undefined;
                        prerequisites?: string[] | undefined;
                        expectedOutput?: string | undefined;
                        validationScript?: string | undefined;
                        tools?: string[] | undefined;
                        flags?: string[] | undefined;
                    }[];
                    solution: string;
                    estimatedTime: number;
                    createdBy: string;
                    createdAt: Date;
                    updatedAt: Date;
                    hints?: {
                        id: string;
                        title: string;
                        content: string;
                        order: number;
                        pointDeduction?: number | undefined;
                    }[] | undefined;
                    maxAttempts?: number | undefined;
                    prerequisites?: string[] | undefined;
                    tags?: string[] | undefined;
                    metadata?: Record<string, any> | undefined;
                    learningObjectives?: string[] | undefined;
                    references?: {
                        type: "tool" | "documentation" | "tutorial" | "research";
                        title: string;
                        url: string;
                    }[] | undefined;
                }[] | undefined;
                assessments?: {
                    type: "simulation" | "quiz" | "practical" | "project" | "essay";
                    id: string;
                    title: string;
                    description: string;
                    order: number;
                    difficulty: "easy" | "medium" | "hard";
                    createdBy: string;
                    createdAt: Date;
                    updatedAt: Date;
                    timeLimit?: number | undefined;
                    questions?: {
                        type: "simulation" | "essay" | "multiple-choice" | "true-false" | "fill-blank" | "code";
                        id: string;
                        question: string;
                        correctAnswer: string | string[];
                        options?: string[] | undefined;
                        explanation?: string | undefined;
                        points?: number | undefined;
                        timeLimit?: number | undefined;
                        hints?: string[] | undefined;
                    }[] | undefined;
                    passingScore?: number | undefined;
                    maxAttempts?: number | undefined;
                    prerequisites?: string[] | undefined;
                    tags?: string[] | undefined;
                    metadata?: Record<string, any> | undefined;
                    practicalTasks?: {
                        instructions: string;
                        id: string;
                        title: string;
                        description: string;
                        order: number;
                        points?: number | undefined;
                        timeLimit?: number | undefined;
                        prerequisites?: string[] | undefined;
                        expectedOutput?: string | undefined;
                        validationScript?: string | undefined;
                        tools?: string[] | undefined;
                        flags?: string[] | undefined;
                    }[] | undefined;
                    rubric?: {
                        criteria: {
                            description: string;
                            name: string;
                            maxPoints: number;
                            weight: number;
                        }[];
                    } | undefined;
                    autoGrading?: boolean | undefined;
                }[] | undefined;
            };
            order: number;
            skillLevel: "beginner" | "intermediate" | "advanced";
            createdBy: string;
            createdAt: Date;
            updatedAt: Date;
            estimatedHours: number;
            completionCriteria: {
                requiredLessons?: string[] | undefined;
                requiredLabs?: string[] | undefined;
                requiredAssessments?: string[] | undefined;
                minimumAssessmentScore?: number | undefined;
                minimumLabScore?: number | undefined;
                requireAllLessons?: boolean | undefined;
                requireAllLabs?: boolean | undefined;
                requireAllAssessments?: boolean | undefined;
            };
            prerequisites?: string[] | undefined;
            tags?: string[] | undefined;
            metadata?: Record<string, any> | undefined;
            learningObjectives?: string[] | undefined;
        }[];
        category: string;
        prerequisites?: string[] | undefined;
        tags?: string[] | undefined;
        metadata?: Record<string, any> | undefined;
        learningObjectives?: string[] | undefined;
        certification?: {
            id: string;
            description: string;
            name: string;
            issuer: string;
            examRequirements: string;
            passingCriteria: {
                timeLimit?: number | undefined;
                minimumScore?: number | undefined;
                requiredCompetencies?: string[] | undefined;
            };
            prerequisites?: string[] | undefined;
            metadata?: Record<string, any> | undefined;
            validityPeriod?: number | undefined;
            competencies?: {
                id: string;
                description: string;
                name: string;
                weight: number;
            }[] | undefined;
            badgeUrl?: string | undefined;
            credentialTemplate?: string | undefined;
        } | undefined;
        targetAudience?: string[] | undefined;
        industry?: string[] | undefined;
        trending?: boolean | undefined;
        featured?: boolean | undefined;
        price?: number | undefined;
        enrollmentLimit?: number | undefined;
        startDate?: Date | undefined;
        endDate?: Date | undefined;
        instructors?: string[] | undefined;
    }>;
    StudentProgressSchema: z.ZodObject<{
        id: z.ZodString;
        studentId: z.ZodString;
        learningPathId: z.ZodString;
        moduleId: z.ZodOptional<z.ZodString>;
        lessonId: z.ZodOptional<z.ZodString>;
        labId: z.ZodOptional<z.ZodString>;
        assessmentId: z.ZodOptional<z.ZodString>;
        status: z.ZodEnum<["not-started", "in-progress", "completed", "failed", "paused"]>;
        progress: z.ZodNumber;
        score: z.ZodOptional<z.ZodNumber>;
        timeSpent: z.ZodDefault<z.ZodNumber>;
        attempts: z.ZodDefault<z.ZodNumber>;
        lastAccessed: z.ZodOptional<z.ZodDate>;
        startedAt: z.ZodDate;
        completedAt: z.ZodOptional<z.ZodDate>;
        notes: z.ZodOptional<z.ZodString>;
        bookmarks: z.ZodDefault<z.ZodArray<z.ZodObject<{
            contentId: z.ZodString;
            contentType: z.ZodEnum<["lesson", "lab", "assessment"]>;
            note: z.ZodOptional<z.ZodString>;
            timestamp: z.ZodDate;
        }, "strip", z.ZodTypeAny, {
            contentId: string;
            contentType: "lesson" | "lab" | "assessment";
            timestamp: Date;
            note?: string | undefined;
        }, {
            contentId: string;
            contentType: "lesson" | "lab" | "assessment";
            timestamp: Date;
            note?: string | undefined;
        }>, "many">>;
        achievements: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
    }, "strip", z.ZodTypeAny, {
        status: "not-started" | "in-progress" | "completed" | "failed" | "paused";
        id: string;
        metadata: Record<string, any>;
        studentId: string;
        startedAt: Date;
        timeSpent: number;
        learningPathId: string;
        progress: number;
        attempts: number;
        bookmarks: {
            contentId: string;
            contentType: "lesson" | "lab" | "assessment";
            timestamp: Date;
            note?: string | undefined;
        }[];
        achievements: string[];
        assessmentId?: string | undefined;
        score?: number | undefined;
        completedAt?: Date | undefined;
        moduleId?: string | undefined;
        lessonId?: string | undefined;
        labId?: string | undefined;
        lastAccessed?: Date | undefined;
        notes?: string | undefined;
    }, {
        status: "not-started" | "in-progress" | "completed" | "failed" | "paused";
        id: string;
        studentId: string;
        startedAt: Date;
        learningPathId: string;
        progress: number;
        metadata?: Record<string, any> | undefined;
        assessmentId?: string | undefined;
        score?: number | undefined;
        completedAt?: Date | undefined;
        timeSpent?: number | undefined;
        moduleId?: string | undefined;
        lessonId?: string | undefined;
        labId?: string | undefined;
        attempts?: number | undefined;
        lastAccessed?: Date | undefined;
        notes?: string | undefined;
        bookmarks?: {
            contentId: string;
            contentType: "lesson" | "lab" | "assessment";
            timestamp: Date;
            note?: string | undefined;
        }[] | undefined;
        achievements?: string[] | undefined;
    }>;
    EnrollmentSchema: z.ZodObject<{
        id: z.ZodString;
        studentId: z.ZodString;
        learningPathId: z.ZodString;
        enrolledAt: z.ZodDate;
        status: z.ZodEnum<["active", "completed", "dropped", "suspended"]>;
        dueDate: z.ZodOptional<z.ZodDate>;
        accessExpiresAt: z.ZodOptional<z.ZodDate>;
        paymentStatus: z.ZodDefault<z.ZodEnum<["free", "paid", "pending", "failed"]>>;
        completionCertificateId: z.ZodOptional<z.ZodString>;
        instructorFeedback: z.ZodOptional<z.ZodString>;
        finalGrade: z.ZodOptional<z.ZodNumber>;
        metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
    }, "strip", z.ZodTypeAny, {
        status: "completed" | "active" | "dropped" | "suspended";
        id: string;
        metadata: Record<string, any>;
        studentId: string;
        learningPathId: string;
        enrolledAt: Date;
        paymentStatus: "failed" | "free" | "paid" | "pending";
        dueDate?: Date | undefined;
        accessExpiresAt?: Date | undefined;
        completionCertificateId?: string | undefined;
        instructorFeedback?: string | undefined;
        finalGrade?: number | undefined;
    }, {
        status: "completed" | "active" | "dropped" | "suspended";
        id: string;
        studentId: string;
        learningPathId: string;
        enrolledAt: Date;
        metadata?: Record<string, any> | undefined;
        dueDate?: Date | undefined;
        accessExpiresAt?: Date | undefined;
        paymentStatus?: "failed" | "free" | "paid" | "pending" | undefined;
        completionCertificateId?: string | undefined;
        instructorFeedback?: string | undefined;
        finalGrade?: number | undefined;
    }>;
    TrainingScenarioSchema: z.ZodObject<{
        id: z.ZodString;
        title: z.ZodString;
        description: z.ZodString;
        category: z.ZodEnum<["incident-response", "forensics", "threat-hunting", "red-team", "blue-team", "purple-team"]>;
        difficulty: z.ZodEnum<["easy", "medium", "hard"]>;
        skillLevel: z.ZodEnum<["beginner", "intermediate", "advanced"]>;
        scenario: z.ZodObject<{
            background: z.ZodString;
            timeline: z.ZodArray<z.ZodObject<{
                timestamp: z.ZodString;
                event: z.ZodString;
                source: z.ZodString;
                evidence: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            }, "strip", z.ZodTypeAny, {
                timestamp: string;
                event: string;
                source: string;
                evidence: string[];
            }, {
                timestamp: string;
                event: string;
                source: string;
                evidence?: string[] | undefined;
            }>, "many">;
            environment: z.ZodObject<{
                type: z.ZodEnum<["simulated", "live", "sandboxed", "cloud"]>;
                config: z.ZodObject<{
                    containers: z.ZodDefault<z.ZodArray<z.ZodObject<{
                        name: z.ZodString;
                        image: z.ZodString;
                        ports: z.ZodDefault<z.ZodArray<z.ZodNumber, "many">>;
                        environment: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>;
                        volumes: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
                    }, "strip", z.ZodTypeAny, {
                        name: string;
                        image: string;
                        ports: number[];
                        environment: Record<string, string>;
                        volumes: string[];
                    }, {
                        name: string;
                        image: string;
                        ports?: number[] | undefined;
                        environment?: Record<string, string> | undefined;
                        volumes?: string[] | undefined;
                    }>, "many">>;
                    network: z.ZodOptional<z.ZodObject<{
                        isolated: z.ZodDefault<z.ZodBoolean>;
                        allowInternet: z.ZodDefault<z.ZodBoolean>;
                        customTopology: z.ZodOptional<z.ZodAny>;
                    }, "strip", z.ZodTypeAny, {
                        isolated: boolean;
                        allowInternet: boolean;
                        customTopology?: any;
                    }, {
                        isolated?: boolean | undefined;
                        allowInternet?: boolean | undefined;
                        customTopology?: any;
                    }>>;
                    resources: z.ZodOptional<z.ZodObject<{
                        cpu: z.ZodDefault<z.ZodString>;
                        memory: z.ZodDefault<z.ZodString>;
                        storage: z.ZodDefault<z.ZodString>;
                    }, "strip", z.ZodTypeAny, {
                        cpu: string;
                        memory: string;
                        storage: string;
                    }, {
                        cpu?: string | undefined;
                        memory?: string | undefined;
                        storage?: string | undefined;
                    }>>;
                    timeout: z.ZodDefault<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    containers: {
                        name: string;
                        image: string;
                        ports: number[];
                        environment: Record<string, string>;
                        volumes: string[];
                    }[];
                    timeout: number;
                    resources?: {
                        cpu: string;
                        memory: string;
                        storage: string;
                    } | undefined;
                    network?: {
                        isolated: boolean;
                        allowInternet: boolean;
                        customTopology?: any;
                    } | undefined;
                }, {
                    resources?: {
                        cpu?: string | undefined;
                        memory?: string | undefined;
                        storage?: string | undefined;
                    } | undefined;
                    containers?: {
                        name: string;
                        image: string;
                        ports?: number[] | undefined;
                        environment?: Record<string, string> | undefined;
                        volumes?: string[] | undefined;
                    }[] | undefined;
                    network?: {
                        isolated?: boolean | undefined;
                        allowInternet?: boolean | undefined;
                        customTopology?: any;
                    } | undefined;
                    timeout?: number | undefined;
                }>;
                provisioning: z.ZodOptional<z.ZodObject<{
                    setupScript: z.ZodOptional<z.ZodString>;
                    teardownScript: z.ZodOptional<z.ZodString>;
                    healthCheck: z.ZodOptional<z.ZodString>;
                }, "strip", z.ZodTypeAny, {
                    setupScript?: string | undefined;
                    teardownScript?: string | undefined;
                    healthCheck?: string | undefined;
                }, {
                    setupScript?: string | undefined;
                    teardownScript?: string | undefined;
                    healthCheck?: string | undefined;
                }>>;
            }, "strip", z.ZodTypeAny, {
                type: "simulated" | "live" | "sandboxed" | "cloud";
                config: {
                    containers: {
                        name: string;
                        image: string;
                        ports: number[];
                        environment: Record<string, string>;
                        volumes: string[];
                    }[];
                    timeout: number;
                    resources?: {
                        cpu: string;
                        memory: string;
                        storage: string;
                    } | undefined;
                    network?: {
                        isolated: boolean;
                        allowInternet: boolean;
                        customTopology?: any;
                    } | undefined;
                };
                provisioning?: {
                    setupScript?: string | undefined;
                    teardownScript?: string | undefined;
                    healthCheck?: string | undefined;
                } | undefined;
            }, {
                type: "simulated" | "live" | "sandboxed" | "cloud";
                config: {
                    resources?: {
                        cpu?: string | undefined;
                        memory?: string | undefined;
                        storage?: string | undefined;
                    } | undefined;
                    containers?: {
                        name: string;
                        image: string;
                        ports?: number[] | undefined;
                        environment?: Record<string, string> | undefined;
                        volumes?: string[] | undefined;
                    }[] | undefined;
                    network?: {
                        isolated?: boolean | undefined;
                        allowInternet?: boolean | undefined;
                        customTopology?: any;
                    } | undefined;
                    timeout?: number | undefined;
                };
                provisioning?: {
                    setupScript?: string | undefined;
                    teardownScript?: string | undefined;
                    healthCheck?: string | undefined;
                } | undefined;
            }>;
            objectives: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                description: z.ZodString;
                points: z.ZodNumber;
                required: z.ZodDefault<z.ZodBoolean>;
            }, "strip", z.ZodTypeAny, {
                id: string;
                points: number;
                description: string;
                required: boolean;
            }, {
                id: string;
                points: number;
                description: string;
                required?: boolean | undefined;
            }>, "many">;
            artifacts: z.ZodDefault<z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                name: z.ZodString;
                type: z.ZodEnum<["log", "memory-dump", "disk-image", "network-capture", "file"]>;
                path: z.ZodString;
                description: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                type: "log" | "memory-dump" | "disk-image" | "network-capture" | "file";
                path: string;
                id: string;
                description: string;
                name: string;
            }, {
                type: "log" | "memory-dump" | "disk-image" | "network-capture" | "file";
                path: string;
                id: string;
                description: string;
                name: string;
            }>, "many">>;
        }, "strip", z.ZodTypeAny, {
            environment: {
                type: "simulated" | "live" | "sandboxed" | "cloud";
                config: {
                    containers: {
                        name: string;
                        image: string;
                        ports: number[];
                        environment: Record<string, string>;
                        volumes: string[];
                    }[];
                    timeout: number;
                    resources?: {
                        cpu: string;
                        memory: string;
                        storage: string;
                    } | undefined;
                    network?: {
                        isolated: boolean;
                        allowInternet: boolean;
                        customTopology?: any;
                    } | undefined;
                };
                provisioning?: {
                    setupScript?: string | undefined;
                    teardownScript?: string | undefined;
                    healthCheck?: string | undefined;
                } | undefined;
            };
            background: string;
            timeline: {
                timestamp: string;
                event: string;
                source: string;
                evidence: string[];
            }[];
            objectives: {
                id: string;
                points: number;
                description: string;
                required: boolean;
            }[];
            artifacts: {
                type: "log" | "memory-dump" | "disk-image" | "network-capture" | "file";
                path: string;
                id: string;
                description: string;
                name: string;
            }[];
        }, {
            environment: {
                type: "simulated" | "live" | "sandboxed" | "cloud";
                config: {
                    resources?: {
                        cpu?: string | undefined;
                        memory?: string | undefined;
                        storage?: string | undefined;
                    } | undefined;
                    containers?: {
                        name: string;
                        image: string;
                        ports?: number[] | undefined;
                        environment?: Record<string, string> | undefined;
                        volumes?: string[] | undefined;
                    }[] | undefined;
                    network?: {
                        isolated?: boolean | undefined;
                        allowInternet?: boolean | undefined;
                        customTopology?: any;
                    } | undefined;
                    timeout?: number | undefined;
                };
                provisioning?: {
                    setupScript?: string | undefined;
                    teardownScript?: string | undefined;
                    healthCheck?: string | undefined;
                } | undefined;
            };
            background: string;
            timeline: {
                timestamp: string;
                event: string;
                source: string;
                evidence?: string[] | undefined;
            }[];
            objectives: {
                id: string;
                points: number;
                description: string;
                required?: boolean | undefined;
            }[];
            artifacts?: {
                type: "log" | "memory-dump" | "disk-image" | "network-capture" | "file";
                path: string;
                id: string;
                description: string;
                name: string;
            }[] | undefined;
        }>;
        estimatedTime: z.ZodNumber;
        maxScore: z.ZodNumber;
        passingScore: z.ZodNumber;
        hints: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            order: z.ZodNumber;
            title: z.ZodString;
            content: z.ZodString;
            pointDeduction: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            title: string;
            content: string;
            order: number;
            pointDeduction: number;
        }, {
            id: string;
            title: string;
            content: string;
            order: number;
            pointDeduction?: number | undefined;
        }>, "many">>;
        solution: z.ZodObject<{
            summary: z.ZodString;
            steps: z.ZodArray<z.ZodString, "many">;
            explanation: z.ZodString;
            references: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            explanation: string;
            references: string[];
            summary: string;
            steps: string[];
        }, {
            explanation: string;
            summary: string;
            steps: string[];
            references?: string[] | undefined;
        }>;
        prerequisites: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        createdBy: z.ZodString;
        createdAt: z.ZodDate;
        updatedAt: z.ZodDate;
        metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        hints: {
            id: string;
            title: string;
            content: string;
            order: number;
            pointDeduction: number;
        }[];
        title: string;
        description: string;
        passingScore: number;
        prerequisites: string[];
        tags: string[];
        metadata: Record<string, any>;
        difficulty: "easy" | "medium" | "hard";
        skillLevel: "beginner" | "intermediate" | "advanced";
        solution: {
            explanation: string;
            references: string[];
            summary: string;
            steps: string[];
        };
        estimatedTime: number;
        createdBy: string;
        createdAt: Date;
        updatedAt: Date;
        maxScore: number;
        category: "incident-response" | "forensics" | "threat-hunting" | "red-team" | "blue-team" | "purple-team";
        scenario: {
            environment: {
                type: "simulated" | "live" | "sandboxed" | "cloud";
                config: {
                    containers: {
                        name: string;
                        image: string;
                        ports: number[];
                        environment: Record<string, string>;
                        volumes: string[];
                    }[];
                    timeout: number;
                    resources?: {
                        cpu: string;
                        memory: string;
                        storage: string;
                    } | undefined;
                    network?: {
                        isolated: boolean;
                        allowInternet: boolean;
                        customTopology?: any;
                    } | undefined;
                };
                provisioning?: {
                    setupScript?: string | undefined;
                    teardownScript?: string | undefined;
                    healthCheck?: string | undefined;
                } | undefined;
            };
            background: string;
            timeline: {
                timestamp: string;
                event: string;
                source: string;
                evidence: string[];
            }[];
            objectives: {
                id: string;
                points: number;
                description: string;
                required: boolean;
            }[];
            artifacts: {
                type: "log" | "memory-dump" | "disk-image" | "network-capture" | "file";
                path: string;
                id: string;
                description: string;
                name: string;
            }[];
        };
    }, {
        id: string;
        title: string;
        description: string;
        passingScore: number;
        difficulty: "easy" | "medium" | "hard";
        skillLevel: "beginner" | "intermediate" | "advanced";
        solution: {
            explanation: string;
            summary: string;
            steps: string[];
            references?: string[] | undefined;
        };
        estimatedTime: number;
        createdBy: string;
        createdAt: Date;
        updatedAt: Date;
        maxScore: number;
        category: "incident-response" | "forensics" | "threat-hunting" | "red-team" | "blue-team" | "purple-team";
        scenario: {
            environment: {
                type: "simulated" | "live" | "sandboxed" | "cloud";
                config: {
                    resources?: {
                        cpu?: string | undefined;
                        memory?: string | undefined;
                        storage?: string | undefined;
                    } | undefined;
                    containers?: {
                        name: string;
                        image: string;
                        ports?: number[] | undefined;
                        environment?: Record<string, string> | undefined;
                        volumes?: string[] | undefined;
                    }[] | undefined;
                    network?: {
                        isolated?: boolean | undefined;
                        allowInternet?: boolean | undefined;
                        customTopology?: any;
                    } | undefined;
                    timeout?: number | undefined;
                };
                provisioning?: {
                    setupScript?: string | undefined;
                    teardownScript?: string | undefined;
                    healthCheck?: string | undefined;
                } | undefined;
            };
            background: string;
            timeline: {
                timestamp: string;
                event: string;
                source: string;
                evidence?: string[] | undefined;
            }[];
            objectives: {
                id: string;
                points: number;
                description: string;
                required?: boolean | undefined;
            }[];
            artifacts?: {
                type: "log" | "memory-dump" | "disk-image" | "network-capture" | "file";
                path: string;
                id: string;
                description: string;
                name: string;
            }[] | undefined;
        };
        hints?: {
            id: string;
            title: string;
            content: string;
            order: number;
            pointDeduction?: number | undefined;
        }[] | undefined;
        prerequisites?: string[] | undefined;
        tags?: string[] | undefined;
        metadata?: Record<string, any> | undefined;
    }>;
    KnowledgeBaseArticleSchema: z.ZodObject<{
        id: z.ZodString;
        title: z.ZodString;
        summary: z.ZodString;
        content: z.ZodString;
        category: z.ZodString;
        subcategory: z.ZodOptional<z.ZodString>;
        type: z.ZodEnum<["guide", "tutorial", "reference", "faq", "best-practice"]>;
        difficulty: z.ZodEnum<["easy", "medium", "hard"]>;
        tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        attachments: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            url: z.ZodString;
            type: z.ZodString;
            size: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            type: string;
            id: string;
            url: string;
            name: string;
            size: number;
        }, {
            type: string;
            id: string;
            url: string;
            name: string;
            size: number;
        }>, "many">>;
        relatedArticles: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        prerequisites: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        estimatedReadTime: z.ZodNumber;
        lastReviewed: z.ZodOptional<z.ZodDate>;
        reviewedBy: z.ZodOptional<z.ZodString>;
        version: z.ZodDefault<z.ZodString>;
        status: z.ZodDefault<z.ZodEnum<["draft", "published", "archived"]>>;
        votes: z.ZodDefault<z.ZodObject<{
            helpful: z.ZodDefault<z.ZodNumber>;
            notHelpful: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            helpful: number;
            notHelpful: number;
        }, {
            helpful?: number | undefined;
            notHelpful?: number | undefined;
        }>>;
        views: z.ZodDefault<z.ZodNumber>;
        author: z.ZodString;
        contributors: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        createdAt: z.ZodDate;
        updatedAt: z.ZodDate;
        publishedAt: z.ZodOptional<z.ZodDate>;
        metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
    }, "strip", z.ZodTypeAny, {
        type: "tutorial" | "guide" | "reference" | "faq" | "best-practice";
        status: "draft" | "published" | "archived";
        id: string;
        title: string;
        content: string;
        prerequisites: string[];
        tags: string[];
        metadata: Record<string, any>;
        difficulty: "easy" | "medium" | "hard";
        createdAt: Date;
        updatedAt: Date;
        category: string;
        summary: string;
        attachments: {
            type: string;
            id: string;
            url: string;
            name: string;
            size: number;
        }[];
        relatedArticles: string[];
        estimatedReadTime: number;
        version: string;
        votes: {
            helpful: number;
            notHelpful: number;
        };
        views: number;
        author: string;
        contributors: string[];
        subcategory?: string | undefined;
        lastReviewed?: Date | undefined;
        reviewedBy?: string | undefined;
        publishedAt?: Date | undefined;
    }, {
        type: "tutorial" | "guide" | "reference" | "faq" | "best-practice";
        id: string;
        title: string;
        content: string;
        difficulty: "easy" | "medium" | "hard";
        createdAt: Date;
        updatedAt: Date;
        category: string;
        summary: string;
        estimatedReadTime: number;
        author: string;
        status?: "draft" | "published" | "archived" | undefined;
        prerequisites?: string[] | undefined;
        tags?: string[] | undefined;
        metadata?: Record<string, any> | undefined;
        subcategory?: string | undefined;
        attachments?: {
            type: string;
            id: string;
            url: string;
            name: string;
            size: number;
        }[] | undefined;
        relatedArticles?: string[] | undefined;
        lastReviewed?: Date | undefined;
        reviewedBy?: string | undefined;
        version?: string | undefined;
        votes?: {
            helpful?: number | undefined;
            notHelpful?: number | undefined;
        } | undefined;
        views?: number | undefined;
        contributors?: string[] | undefined;
        publishedAt?: Date | undefined;
    }>;
    ForumThreadSchema: z.ZodObject<{
        id: z.ZodString;
        title: z.ZodString;
        category: z.ZodString;
        tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        authorId: z.ZodString;
        status: z.ZodDefault<z.ZodEnum<["open", "closed", "pinned", "locked"]>>;
        priority: z.ZodDefault<z.ZodEnum<["low", "normal", "high"]>>;
        views: z.ZodDefault<z.ZodNumber>;
        replies: z.ZodDefault<z.ZodNumber>;
        lastReplyAt: z.ZodOptional<z.ZodDate>;
        lastReplyBy: z.ZodOptional<z.ZodString>;
        solved: z.ZodDefault<z.ZodBoolean>;
        solutionPostId: z.ZodOptional<z.ZodString>;
        createdAt: z.ZodDate;
        updatedAt: z.ZodDate;
        metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
    }, "strip", z.ZodTypeAny, {
        status: "open" | "closed" | "pinned" | "locked";
        id: string;
        title: string;
        tags: string[];
        metadata: Record<string, any>;
        createdAt: Date;
        updatedAt: Date;
        category: string;
        views: number;
        authorId: string;
        priority: "low" | "normal" | "high";
        replies: number;
        solved: boolean;
        lastReplyAt?: Date | undefined;
        lastReplyBy?: string | undefined;
        solutionPostId?: string | undefined;
    }, {
        id: string;
        title: string;
        createdAt: Date;
        updatedAt: Date;
        category: string;
        authorId: string;
        status?: "open" | "closed" | "pinned" | "locked" | undefined;
        tags?: string[] | undefined;
        metadata?: Record<string, any> | undefined;
        views?: number | undefined;
        priority?: "low" | "normal" | "high" | undefined;
        replies?: number | undefined;
        lastReplyAt?: Date | undefined;
        lastReplyBy?: string | undefined;
        solved?: boolean | undefined;
        solutionPostId?: string | undefined;
    }>;
    ForumPostSchema: z.ZodObject<{
        id: z.ZodString;
        threadId: z.ZodString;
        authorId: z.ZodString;
        content: z.ZodString;
        parentPostId: z.ZodOptional<z.ZodString>;
        level: z.ZodDefault<z.ZodNumber>;
        votes: z.ZodDefault<z.ZodObject<{
            upvotes: z.ZodDefault<z.ZodNumber>;
            downvotes: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            upvotes: number;
            downvotes: number;
        }, {
            upvotes?: number | undefined;
            downvotes?: number | undefined;
        }>>;
        isSolution: z.ZodDefault<z.ZodBoolean>;
        isModerated: z.ZodDefault<z.ZodBoolean>;
        moderatedBy: z.ZodOptional<z.ZodString>;
        moderationReason: z.ZodOptional<z.ZodString>;
        attachments: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            url: z.ZodString;
            type: z.ZodString;
            size: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            type: string;
            id: string;
            url: string;
            name: string;
            size: number;
        }, {
            type: string;
            id: string;
            url: string;
            name: string;
            size: number;
        }>, "many">>;
        mentions: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        edited: z.ZodDefault<z.ZodBoolean>;
        editedAt: z.ZodOptional<z.ZodDate>;
        editedBy: z.ZodOptional<z.ZodString>;
        createdAt: z.ZodDate;
        updatedAt: z.ZodDate;
        metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        content: string;
        metadata: Record<string, any>;
        createdAt: Date;
        updatedAt: Date;
        attachments: {
            type: string;
            id: string;
            url: string;
            name: string;
            size: number;
        }[];
        votes: {
            upvotes: number;
            downvotes: number;
        };
        authorId: string;
        threadId: string;
        level: number;
        isSolution: boolean;
        isModerated: boolean;
        mentions: string[];
        edited: boolean;
        parentPostId?: string | undefined;
        moderatedBy?: string | undefined;
        moderationReason?: string | undefined;
        editedAt?: Date | undefined;
        editedBy?: string | undefined;
    }, {
        id: string;
        content: string;
        createdAt: Date;
        updatedAt: Date;
        authorId: string;
        threadId: string;
        metadata?: Record<string, any> | undefined;
        attachments?: {
            type: string;
            id: string;
            url: string;
            name: string;
            size: number;
        }[] | undefined;
        votes?: {
            upvotes?: number | undefined;
            downvotes?: number | undefined;
        } | undefined;
        parentPostId?: string | undefined;
        level?: number | undefined;
        isSolution?: boolean | undefined;
        isModerated?: boolean | undefined;
        moderatedBy?: string | undefined;
        moderationReason?: string | undefined;
        mentions?: string[] | undefined;
        edited?: boolean | undefined;
        editedAt?: Date | undefined;
        editedBy?: string | undefined;
    }>;
    InstructorSchema: z.ZodObject<{
        id: z.ZodString;
        userId: z.ZodString;
        bio: z.ZodString;
        specializations: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        certifications: z.ZodDefault<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            issuer: z.ZodString;
            dateObtained: z.ZodDate;
            expirationDate: z.ZodOptional<z.ZodDate>;
            credentialUrl: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            issuer: string;
            dateObtained: Date;
            expirationDate?: Date | undefined;
            credentialUrl?: string | undefined;
        }, {
            name: string;
            issuer: string;
            dateObtained: Date;
            expirationDate?: Date | undefined;
            credentialUrl?: string | undefined;
        }>, "many">>;
        experience: z.ZodObject<{
            yearsInField: z.ZodNumber;
            currentRole: z.ZodString;
            organization: z.ZodOptional<z.ZodString>;
            previousRoles: z.ZodDefault<z.ZodArray<z.ZodObject<{
                title: z.ZodString;
                organization: z.ZodString;
                duration: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                title: string;
                duration: string;
                organization: string;
            }, {
                title: string;
                duration: string;
                organization: string;
            }>, "many">>;
        }, "strip", z.ZodTypeAny, {
            yearsInField: number;
            currentRole: string;
            previousRoles: {
                title: string;
                duration: string;
                organization: string;
            }[];
            organization?: string | undefined;
        }, {
            yearsInField: number;
            currentRole: string;
            organization?: string | undefined;
            previousRoles?: {
                title: string;
                duration: string;
                organization: string;
            }[] | undefined;
        }>;
        teaching: z.ZodObject<{
            yearsTeaching: z.ZodNumber;
            coursesCreated: z.ZodDefault<z.ZodNumber>;
            studentsGraduated: z.ZodDefault<z.ZodNumber>;
            averageRating: z.ZodDefault<z.ZodNumber>;
            totalRatings: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            yearsTeaching: number;
            coursesCreated: number;
            studentsGraduated: number;
            averageRating: number;
            totalRatings: number;
        }, {
            yearsTeaching: number;
            coursesCreated?: number | undefined;
            studentsGraduated?: number | undefined;
            averageRating?: number | undefined;
            totalRatings?: number | undefined;
        }>;
        availability: z.ZodOptional<z.ZodObject<{
            timezone: z.ZodString;
            weeklyHours: z.ZodNumber;
            schedule: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodArray<z.ZodString, "many">>>;
        }, "strip", z.ZodTypeAny, {
            timezone: string;
            weeklyHours: number;
            schedule: Record<string, string[]>;
        }, {
            timezone: string;
            weeklyHours: number;
            schedule?: Record<string, string[]> | undefined;
        }>>;
        socialMedia: z.ZodDefault<z.ZodObject<{
            linkedin: z.ZodOptional<z.ZodString>;
            twitter: z.ZodOptional<z.ZodString>;
            github: z.ZodOptional<z.ZodString>;
            website: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            linkedin?: string | undefined;
            twitter?: string | undefined;
            github?: string | undefined;
            website?: string | undefined;
        }, {
            linkedin?: string | undefined;
            twitter?: string | undefined;
            github?: string | undefined;
            website?: string | undefined;
        }>>;
        verified: z.ZodDefault<z.ZodBoolean>;
        verifiedAt: z.ZodOptional<z.ZodDate>;
        createdAt: z.ZodDate;
        updatedAt: z.ZodDate;
        metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodAny>>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        metadata: Record<string, any>;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        bio: string;
        specializations: string[];
        certifications: {
            name: string;
            issuer: string;
            dateObtained: Date;
            expirationDate?: Date | undefined;
            credentialUrl?: string | undefined;
        }[];
        experience: {
            yearsInField: number;
            currentRole: string;
            previousRoles: {
                title: string;
                duration: string;
                organization: string;
            }[];
            organization?: string | undefined;
        };
        teaching: {
            yearsTeaching: number;
            coursesCreated: number;
            studentsGraduated: number;
            averageRating: number;
            totalRatings: number;
        };
        socialMedia: {
            linkedin?: string | undefined;
            twitter?: string | undefined;
            github?: string | undefined;
            website?: string | undefined;
        };
        verified: boolean;
        availability?: {
            timezone: string;
            weeklyHours: number;
            schedule: Record<string, string[]>;
        } | undefined;
        verifiedAt?: Date | undefined;
    }, {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        bio: string;
        experience: {
            yearsInField: number;
            currentRole: string;
            organization?: string | undefined;
            previousRoles?: {
                title: string;
                duration: string;
                organization: string;
            }[] | undefined;
        };
        teaching: {
            yearsTeaching: number;
            coursesCreated?: number | undefined;
            studentsGraduated?: number | undefined;
            averageRating?: number | undefined;
            totalRatings?: number | undefined;
        };
        metadata?: Record<string, any> | undefined;
        specializations?: string[] | undefined;
        certifications?: {
            name: string;
            issuer: string;
            dateObtained: Date;
            expirationDate?: Date | undefined;
            credentialUrl?: string | undefined;
        }[] | undefined;
        availability?: {
            timezone: string;
            weeklyHours: number;
            schedule?: Record<string, string[]> | undefined;
        } | undefined;
        socialMedia?: {
            linkedin?: string | undefined;
            twitter?: string | undefined;
            github?: string | undefined;
            website?: string | undefined;
        } | undefined;
        verified?: boolean | undefined;
        verifiedAt?: Date | undefined;
    }>;
    DatabaseConfigSchema: z.ZodObject<{
        type: z.ZodEnum<["sqlite", "mysql", "postgresql"]>;
        connection: z.ZodUnion<[z.ZodString, z.ZodObject<{
            host: z.ZodString;
            port: z.ZodNumber;
            database: z.ZodString;
            user: z.ZodString;
            password: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            host: string;
            port: number;
            database: string;
            user: string;
            password: string;
        }, {
            host: string;
            port: number;
            database: string;
            user: string;
            password: string;
        }>]>;
    }, "strip", z.ZodTypeAny, {
        type: "sqlite" | "mysql" | "postgresql";
        connection: string | {
            host: string;
            port: number;
            database: string;
            user: string;
            password: string;
        };
    }, {
        type: "sqlite" | "mysql" | "postgresql";
        connection: string | {
            host: string;
            port: number;
            database: string;
            user: string;
            password: string;
        };
    }>;
    EducationalConfigSchema: z.ZodObject<{
        features: z.ZodObject<{
            enrollmentRequired: z.ZodDefault<z.ZodBoolean>;
            allowGuestAccess: z.ZodDefault<z.ZodBoolean>;
            enableCertifications: z.ZodDefault<z.ZodBoolean>;
            enableForums: z.ZodDefault<z.ZodBoolean>;
            enableLabs: z.ZodDefault<z.ZodBoolean>;
            enableAssessments: z.ZodDefault<z.ZodBoolean>;
            enableProgressTracking: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            enrollmentRequired: boolean;
            allowGuestAccess: boolean;
            enableCertifications: boolean;
            enableForums: boolean;
            enableLabs: boolean;
            enableAssessments: boolean;
            enableProgressTracking: boolean;
        }, {
            enrollmentRequired?: boolean | undefined;
            allowGuestAccess?: boolean | undefined;
            enableCertifications?: boolean | undefined;
            enableForums?: boolean | undefined;
            enableLabs?: boolean | undefined;
            enableAssessments?: boolean | undefined;
            enableProgressTracking?: boolean | undefined;
        }>;
        limits: z.ZodObject<{
            maxEnrollmentsPerUser: z.ZodDefault<z.ZodNumber>;
            maxLabDuration: z.ZodDefault<z.ZodNumber>;
            maxFileUploadSize: z.ZodDefault<z.ZodNumber>;
            maxLabAttempts: z.ZodDefault<z.ZodNumber>;
            maxAssessmentAttempts: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            maxEnrollmentsPerUser: number;
            maxLabDuration: number;
            maxFileUploadSize: number;
            maxLabAttempts: number;
            maxAssessmentAttempts: number;
        }, {
            maxEnrollmentsPerUser?: number | undefined;
            maxLabDuration?: number | undefined;
            maxFileUploadSize?: number | undefined;
            maxLabAttempts?: number | undefined;
            maxAssessmentAttempts?: number | undefined;
        }>;
        notifications: z.ZodObject<{
            enableEmailNotifications: z.ZodDefault<z.ZodBoolean>;
            enablePushNotifications: z.ZodDefault<z.ZodBoolean>;
            enrollmentReminders: z.ZodDefault<z.ZodBoolean>;
            assessmentReminders: z.ZodDefault<z.ZodBoolean>;
            certificateNotifications: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            enableEmailNotifications: boolean;
            enablePushNotifications: boolean;
            enrollmentReminders: boolean;
            assessmentReminders: boolean;
            certificateNotifications: boolean;
        }, {
            enableEmailNotifications?: boolean | undefined;
            enablePushNotifications?: boolean | undefined;
            enrollmentReminders?: boolean | undefined;
            assessmentReminders?: boolean | undefined;
            certificateNotifications?: boolean | undefined;
        }>;
        labs: z.ZodObject<{
            defaultEnvironment: z.ZodDefault<z.ZodEnum<["docker", "kubernetes", "vm"]>>;
            resourceLimits: z.ZodObject<{
                cpu: z.ZodDefault<z.ZodString>;
                memory: z.ZodDefault<z.ZodString>;
                storage: z.ZodDefault<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                cpu: string;
                memory: string;
                storage: string;
            }, {
                cpu?: string | undefined;
                memory?: string | undefined;
                storage?: string | undefined;
            }>;
            networkIsolation: z.ZodDefault<z.ZodBoolean>;
            autoCleanup: z.ZodDefault<z.ZodBoolean>;
            cleanupDelay: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            defaultEnvironment: "docker" | "kubernetes" | "vm";
            resourceLimits: {
                cpu: string;
                memory: string;
                storage: string;
            };
            networkIsolation: boolean;
            autoCleanup: boolean;
            cleanupDelay: number;
        }, {
            resourceLimits: {
                cpu?: string | undefined;
                memory?: string | undefined;
                storage?: string | undefined;
            };
            defaultEnvironment?: "docker" | "kubernetes" | "vm" | undefined;
            networkIsolation?: boolean | undefined;
            autoCleanup?: boolean | undefined;
            cleanupDelay?: number | undefined;
        }>;
        assessment: z.ZodObject<{
            randomizeQuestions: z.ZodDefault<z.ZodBoolean>;
            showCorrectAnswers: z.ZodDefault<z.ZodBoolean>;
            allowRetakes: z.ZodDefault<z.ZodBoolean>;
            proctoring: z.ZodObject<{
                enabled: z.ZodDefault<z.ZodBoolean>;
                requireWebcam: z.ZodDefault<z.ZodBoolean>;
                requireScreenShare: z.ZodDefault<z.ZodBoolean>;
                plagiarismDetection: z.ZodDefault<z.ZodBoolean>;
            }, "strip", z.ZodTypeAny, {
                enabled: boolean;
                requireWebcam: boolean;
                requireScreenShare: boolean;
                plagiarismDetection: boolean;
            }, {
                enabled?: boolean | undefined;
                requireWebcam?: boolean | undefined;
                requireScreenShare?: boolean | undefined;
                plagiarismDetection?: boolean | undefined;
            }>;
        }, "strip", z.ZodTypeAny, {
            randomizeQuestions: boolean;
            showCorrectAnswers: boolean;
            allowRetakes: boolean;
            proctoring: {
                enabled: boolean;
                requireWebcam: boolean;
                requireScreenShare: boolean;
                plagiarismDetection: boolean;
            };
        }, {
            proctoring: {
                enabled?: boolean | undefined;
                requireWebcam?: boolean | undefined;
                requireScreenShare?: boolean | undefined;
                plagiarismDetection?: boolean | undefined;
            };
            randomizeQuestions?: boolean | undefined;
            showCorrectAnswers?: boolean | undefined;
            allowRetakes?: boolean | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        labs: {
            defaultEnvironment: "docker" | "kubernetes" | "vm";
            resourceLimits: {
                cpu: string;
                memory: string;
                storage: string;
            };
            networkIsolation: boolean;
            autoCleanup: boolean;
            cleanupDelay: number;
        };
        assessment: {
            randomizeQuestions: boolean;
            showCorrectAnswers: boolean;
            allowRetakes: boolean;
            proctoring: {
                enabled: boolean;
                requireWebcam: boolean;
                requireScreenShare: boolean;
                plagiarismDetection: boolean;
            };
        };
        features: {
            enrollmentRequired: boolean;
            allowGuestAccess: boolean;
            enableCertifications: boolean;
            enableForums: boolean;
            enableLabs: boolean;
            enableAssessments: boolean;
            enableProgressTracking: boolean;
        };
        limits: {
            maxEnrollmentsPerUser: number;
            maxLabDuration: number;
            maxFileUploadSize: number;
            maxLabAttempts: number;
            maxAssessmentAttempts: number;
        };
        notifications: {
            enableEmailNotifications: boolean;
            enablePushNotifications: boolean;
            enrollmentReminders: boolean;
            assessmentReminders: boolean;
            certificateNotifications: boolean;
        };
    }, {
        labs: {
            resourceLimits: {
                cpu?: string | undefined;
                memory?: string | undefined;
                storage?: string | undefined;
            };
            defaultEnvironment?: "docker" | "kubernetes" | "vm" | undefined;
            networkIsolation?: boolean | undefined;
            autoCleanup?: boolean | undefined;
            cleanupDelay?: number | undefined;
        };
        assessment: {
            proctoring: {
                enabled?: boolean | undefined;
                requireWebcam?: boolean | undefined;
                requireScreenShare?: boolean | undefined;
                plagiarismDetection?: boolean | undefined;
            };
            randomizeQuestions?: boolean | undefined;
            showCorrectAnswers?: boolean | undefined;
            allowRetakes?: boolean | undefined;
        };
        features: {
            enrollmentRequired?: boolean | undefined;
            allowGuestAccess?: boolean | undefined;
            enableCertifications?: boolean | undefined;
            enableForums?: boolean | undefined;
            enableLabs?: boolean | undefined;
            enableAssessments?: boolean | undefined;
            enableProgressTracking?: boolean | undefined;
        };
        limits: {
            maxEnrollmentsPerUser?: number | undefined;
            maxLabDuration?: number | undefined;
            maxFileUploadSize?: number | undefined;
            maxLabAttempts?: number | undefined;
            maxAssessmentAttempts?: number | undefined;
        };
        notifications: {
            enableEmailNotifications?: boolean | undefined;
            enablePushNotifications?: boolean | undefined;
            enrollmentReminders?: boolean | undefined;
            assessmentReminders?: boolean | undefined;
            certificateNotifications?: boolean | undefined;
        };
    }>;
    SearchFiltersSchema: z.ZodObject<{
        query: z.ZodOptional<z.ZodString>;
        category: z.ZodOptional<z.ZodString>;
        skillLevel: z.ZodOptional<z.ZodEnum<["beginner", "intermediate", "advanced"]>>;
        difficulty: z.ZodOptional<z.ZodEnum<["easy", "medium", "hard"]>>;
        tags: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        duration: z.ZodOptional<z.ZodObject<{
            min: z.ZodOptional<z.ZodNumber>;
            max: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            min?: number | undefined;
            max?: number | undefined;
        }, {
            min?: number | undefined;
            max?: number | undefined;
        }>>;
        type: z.ZodOptional<z.ZodString>;
        instructor: z.ZodOptional<z.ZodString>;
        certification: z.ZodOptional<z.ZodBoolean>;
        free: z.ZodOptional<z.ZodBoolean>;
        trending: z.ZodOptional<z.ZodBoolean>;
        featured: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        tags: string[];
        instructor?: string | undefined;
        type?: string | undefined;
        duration?: {
            min?: number | undefined;
            max?: number | undefined;
        } | undefined;
        difficulty?: "easy" | "medium" | "hard" | undefined;
        skillLevel?: "beginner" | "intermediate" | "advanced" | undefined;
        certification?: boolean | undefined;
        category?: string | undefined;
        trending?: boolean | undefined;
        featured?: boolean | undefined;
        free?: boolean | undefined;
        query?: string | undefined;
    }, {
        instructor?: string | undefined;
        type?: string | undefined;
        duration?: {
            min?: number | undefined;
            max?: number | undefined;
        } | undefined;
        tags?: string[] | undefined;
        difficulty?: "easy" | "medium" | "hard" | undefined;
        skillLevel?: "beginner" | "intermediate" | "advanced" | undefined;
        certification?: boolean | undefined;
        category?: string | undefined;
        trending?: boolean | undefined;
        featured?: boolean | undefined;
        free?: boolean | undefined;
        query?: string | undefined;
    }>;
    PaginationSchema: z.ZodObject<{
        page: z.ZodDefault<z.ZodNumber>;
        limit: z.ZodDefault<z.ZodNumber>;
        sortBy: z.ZodDefault<z.ZodString>;
        sortOrder: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
    }, "strip", z.ZodTypeAny, {
        page: number;
        limit: number;
        sortBy: string;
        sortOrder: "asc" | "desc";
    }, {
        page?: number | undefined;
        limit?: number | undefined;
        sortBy?: string | undefined;
        sortOrder?: "asc" | "desc" | undefined;
    }>;
    LearningStatisticsSchema: z.ZodObject<{
        totalLearningPaths: z.ZodNumber;
        totalModules: z.ZodNumber;
        totalLessons: z.ZodNumber;
        totalLabs: z.ZodNumber;
        totalAssessments: z.ZodNumber;
        totalStudents: z.ZodNumber;
        totalInstructors: z.ZodNumber;
        totalEnrollments: z.ZodNumber;
        completionRate: z.ZodNumber;
        averageScore: z.ZodNumber;
        popularPaths: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            title: z.ZodString;
            enrollments: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            id: string;
            title: string;
            enrollments: number;
        }, {
            id: string;
            title: string;
            enrollments: number;
        }>, "many">;
        recentActivity: z.ZodArray<z.ZodObject<{
            type: z.ZodString;
            description: z.ZodString;
            timestamp: z.ZodDate;
        }, "strip", z.ZodTypeAny, {
            type: string;
            description: string;
            timestamp: Date;
        }, {
            type: string;
            description: string;
            timestamp: Date;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        totalLearningPaths: number;
        totalModules: number;
        totalLessons: number;
        totalLabs: number;
        totalAssessments: number;
        totalStudents: number;
        totalInstructors: number;
        totalEnrollments: number;
        completionRate: number;
        averageScore: number;
        popularPaths: {
            id: string;
            title: string;
            enrollments: number;
        }[];
        recentActivity: {
            type: string;
            description: string;
            timestamp: Date;
        }[];
    }, {
        totalLearningPaths: number;
        totalModules: number;
        totalLessons: number;
        totalLabs: number;
        totalAssessments: number;
        totalStudents: number;
        totalInstructors: number;
        totalEnrollments: number;
        completionRate: number;
        averageScore: number;
        popularPaths: {
            id: string;
            title: string;
            enrollments: number;
        }[];
        recentActivity: {
            type: string;
            description: string;
            timestamp: Date;
        }[];
    }>;
};
//# sourceMappingURL=educational.types.d.ts.map