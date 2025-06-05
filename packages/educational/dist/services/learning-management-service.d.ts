import { EventEmitter } from 'events';
import { LearningPath, LearningModule, Lesson, DatabaseConfig, SearchFilters, Pagination } from '../types/educational.types';
interface LearningPathSearchResult {
    paths: LearningPath[];
    total: number;
    page: number;
    totalPages: number;
}
export declare class LearningManagementService extends EventEmitter {
    private db;
    constructor(config: {
        database: DatabaseConfig;
    });
    initialize(): Promise<void>;
    private createTables;
    private seedDefaultContent;
    createLearningPath(pathData: Omit<LearningPath, 'id' | 'createdAt' | 'updatedAt'>): Promise<LearningPath>;
    getLearningPath(pathId: string, includeModules?: boolean): Promise<LearningPath | null>;
    updateLearningPath(pathId: string, updates: Partial<LearningPath>): Promise<LearningPath | null>;
    deleteLearningPath(pathId: string): Promise<void>;
    searchLearningPaths(filters: SearchFilters, pagination: Pagination): Promise<LearningPathSearchResult>;
    createModule(moduleData: Omit<LearningModule, 'id' | 'createdAt' | 'updatedAt'>): Promise<LearningModule>;
    addModuleToPath(pathId: string, module: LearningModule, order: number): Promise<void>;
    getPathModules(pathId: string): Promise<LearningModule[]>;
    getModule(moduleId: string): Promise<LearningModule | null>;
    addLessonToModule(moduleId: string, lesson: Lesson): Promise<void>;
    getModuleLessons(moduleId: string): Promise<Lesson[]>;
    getLesson(lessonId: string): Promise<Lesson | null>;
    getCategories(): Promise<any[]>;
    getPopularTags(limit?: number): Promise<any[]>;
    searchTags(query: string, limit?: number): Promise<any[]>;
    getLearningPathStatistics(): Promise<any>;
    shutdown(): Promise<void>;
}
export {};
//# sourceMappingURL=learning-management-service.d.ts.map