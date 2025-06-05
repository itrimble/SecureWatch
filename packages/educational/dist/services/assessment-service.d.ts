import { EventEmitter } from 'events';
import { Assessment, AssessmentResult, QuizQuestion, DatabaseConfig } from '../types/educational.types';
interface AssessmentSession {
    id: string;
    assessmentId: string;
    studentId: string;
    startedAt: Date;
    timeLimit?: number;
    timeRemaining: number;
    currentQuestionIndex: number;
    answers: Record<string, any>;
    flags: string[];
    isProctored: boolean;
    status: 'active' | 'paused' | 'submitted' | 'expired';
    metadata: Record<string, any>;
}
interface QuestionResponse {
    questionId: string;
    answer: string | string[];
    timeSpent: number;
    confidence?: number;
    flagged?: boolean;
    metadata?: Record<string, any>;
}
interface AssessmentStatistics {
    totalAssessments: number;
    totalAttempts: number;
    averageScore: number;
    passRate: number;
    popularAssessments: {
        id: string;
        title: string;
        attempts: number;
        averageScore: number;
    }[];
    difficultyDistribution: Record<string, number>;
    questionTypeDistribution: Record<string, number>;
    recentActivity: {
        date: string;
        attempts: number;
        averageScore: number;
    }[];
}
export declare class AssessmentService extends EventEmitter {
    private db;
    private activeSessions;
    private questionBank;
    constructor(config: {
        database: DatabaseConfig;
    });
    initialize(): Promise<void>;
    private createTables;
    private loadQuestionBank;
    private loadActiveSessions;
    private startSessionWorker;
    createAssessment(assessmentData: Omit<Assessment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Assessment>;
    getAssessment(assessmentId: string): Promise<Assessment | null>;
    startAssessmentSession(assessmentId: string, studentId: string, options?: {
        proctored?: boolean;
        shuffleQuestions?: boolean;
        timeLimit?: number;
    }): Promise<AssessmentSession>;
    submitQuestionResponse(sessionId: string, questionId: string, response: QuestionResponse): Promise<void>;
    submitAssessment(sessionId: string): Promise<AssessmentResult>;
    addQuestionToBank(questionData: Omit<QuizQuestion, 'id'> & {
        category: string;
        difficulty: string;
        createdBy: string;
    }): Promise<QuizQuestion>;
    addQuestionsToAssessment(assessmentId: string, questions: QuizQuestion[]): Promise<void>;
    getAssessmentQuestions(assessmentId: string): Promise<QuizQuestion[]>;
    private gradeAssessment;
    private checkAnswer;
    private generateOverallFeedback;
    private generateRecommendations;
    private getActiveSessionForStudent;
    private getStudentAttempts;
    private getNextAttemptNumber;
    private validateQuestionResponse;
    private updateSession;
    private recordAnalyticsEvent;
    private checkExpiredSessions;
    getAssessmentStatistics(): Promise<AssessmentStatistics>;
    shutdown(): Promise<void>;
}
export {};
//# sourceMappingURL=assessment-service.d.ts.map