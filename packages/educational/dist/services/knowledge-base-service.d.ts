import { EventEmitter } from 'events';
import { KnowledgeBaseArticle, ForumThread, ForumPost, DatabaseConfig, SearchFilters, Pagination } from '../types/educational.types';
interface KnowledgeBaseSearchResult {
    articles: KnowledgeBaseArticle[];
    total: number;
    page: number;
    totalPages: number;
}
interface ArticleVote {
    id: string;
    articleId: string;
    userId: string;
    voteType: 'helpful' | 'not-helpful';
    votedAt: Date;
}
interface DocumentTemplate {
    id: string;
    name: string;
    description: string;
    category: string;
    template: string;
    variables: {
        name: string;
        type: 'string' | 'number' | 'date' | 'select';
        required: boolean;
        defaultValue?: any;
        options?: string[];
    }[];
    createdBy: string;
    createdAt: Date;
    metadata: Record<string, any>;
}
interface KnowledgeBaseStatistics {
    totalArticles: number;
    totalCategories: number;
    totalViews: number;
    totalVotes: number;
    averageRating: number;
    popularArticles: {
        id: string;
        title: string;
        views: number;
        rating: number;
    }[];
    recentArticles: {
        id: string;
        title: string;
        createdAt: Date;
        views: number;
    }[];
    categoryDistribution: {
        category: string;
        count: number;
    }[];
    topContributors: {
        userId: string;
        articlesCount: number;
        totalViews: number;
    }[];
}
export declare class KnowledgeBaseService extends EventEmitter {
    private db;
    constructor(config: {
        database: DatabaseConfig;
    });
    initialize(): Promise<void>;
    private createTables;
    private seedDefaultContent;
    createArticle(articleData: Omit<KnowledgeBaseArticle, 'id' | 'createdAt' | 'updatedAt'>): Promise<KnowledgeBaseArticle>;
    getArticle(articleId: string, incrementView?: boolean): Promise<KnowledgeBaseArticle | null>;
    updateArticle(articleId: string, updates: Partial<KnowledgeBaseArticle>): Promise<KnowledgeBaseArticle | null>;
    searchArticles(filters: SearchFilters, pagination: Pagination): Promise<KnowledgeBaseSearchResult>;
    voteOnArticle(articleId: string, userId: string, voteType: 'helpful' | 'not-helpful'): Promise<ArticleVote>;
    createForumThread(threadData: Omit<ForumThread, 'id' | 'createdAt' | 'updatedAt'>): Promise<ForumThread>;
    createForumPost(postData: Omit<ForumPost, 'id' | 'createdAt' | 'updatedAt'>): Promise<ForumPost>;
    createDocumentTemplate(templateData: Omit<DocumentTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<DocumentTemplate>;
    getDocumentTemplates(category?: string): Promise<DocumentTemplate[]>;
    generateDocumentFromTemplate(templateId: string, variables: Record<string, any>): Promise<string>;
    private updateCategoryCount;
    private updateArticleVoteCounts;
    private recordAnalyticsEvent;
    getCategories(): Promise<any[]>;
    getKnowledgeBaseStatistics(): Promise<KnowledgeBaseStatistics>;
    shutdown(): Promise<void>;
}
export {};
//# sourceMappingURL=knowledge-base-service.d.ts.map