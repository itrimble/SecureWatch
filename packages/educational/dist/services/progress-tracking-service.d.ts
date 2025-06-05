import { EventEmitter } from 'events';
import { StudentProgress, Enrollment, DatabaseConfig } from '../types/educational.types';
interface LearningAnalytics {
    studentId: string;
    totalEnrollments: number;
    activeEnrollments: number;
    completedPaths: number;
    totalTimeSpent: number;
    averageScore: number;
    streakDays: number;
    lastActivity: Date;
    skillProgress: {
        skillLevel: string;
        pathsCompleted: number;
        averageScore: number;
    }[];
    categoryProgress: {
        category: string;
        pathsEnrolled: number;
        pathsCompleted: number;
        averageScore: number;
    }[];
    achievements: Achievement[];
    weeklyActivity: {
        week: string;
        timeSpent: number;
        activitiesCompleted: number;
    }[];
    performanceTrends: {
        period: string;
        averageScore: number;
        timeSpent: number;
        completion: number;
    }[];
}
interface Achievement {
    id: string;
    name: string;
    description: string;
    icon: string;
    type: 'completion' | 'streak' | 'score' | 'time' | 'special';
    criteria: {
        metric: string;
        threshold: number;
        operator: 'gte' | 'lte' | 'eq';
    };
    earnedAt: Date;
    rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
}
interface PerformanceMetrics {
    overallProgress: number;
    completionRate: number;
    averageScore: number;
    timeSpent: number;
    streakDays: number;
    rank: number;
    percentile: number;
    strengthAreas: string[];
    improvementAreas: string[];
    nextMilestones: {
        type: string;
        description: string;
        progress: number;
        target: number;
    }[];
}
export declare class ProgressTrackingService extends EventEmitter {
    private db;
    private achievementDefinitions;
    constructor(config: {
        database: DatabaseConfig;
    });
    initialize(): Promise<void>;
    private createTables;
    private initializeAchievements;
    private startProgressWorker;
    enrollStudent(studentId: string, learningPathId: string, enrollmentData?: Partial<Enrollment>): Promise<Enrollment>;
    getStudentEnrollments(studentId: string): Promise<Enrollment[]>;
    updateProgress(progressData: Partial<StudentProgress>): Promise<StudentProgress>;
    getStudentProgress(studentId: string, learningPathId?: string, contentType?: string): Promise<StudentProgress[]>;
    getLearningAnalytics(studentId: string): Promise<LearningAnalytics>;
    getPerformanceMetrics(studentId: string): Promise<PerformanceMetrics>;
    checkStudentAchievements(studentId: string): Promise<Achievement[]>;
    getStudentAchievements(studentId: string): Promise<Achievement[]>;
    private initializeProgressTracking;
    private updateLearningStreak;
    private getLearningStreak;
    private recordLearningSession;
    private getRecentSessions;
    private evaluateAchievementCriteria;
    private getMetricValue;
    private processPerformanceAnalytics;
    private checkAchievements;
    private getWeeklyActivity;
    private getPerformanceTrends;
    private getSkillProgress;
    private getCategoryProgress;
    private identifyStrengthAreas;
    private identifyImprovementAreas;
    private getNextMilestones;
    shutdown(): Promise<void>;
}
export {};
//# sourceMappingURL=progress-tracking-service.d.ts.map