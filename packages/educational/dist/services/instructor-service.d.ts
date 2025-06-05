import { EventEmitter } from 'events';
import { Instructor, DatabaseConfig } from '../types/educational.types';
interface CourseManagement {
    id: string;
    instructorId: string;
    learningPathId: string;
    role: 'owner' | 'co-instructor' | 'assistant';
    permissions: {
        canEdit: boolean;
        canGrade: boolean;
        canViewAnalytics: boolean;
        canManageStudents: boolean;
        canPublish: boolean;
    };
    assignedAt: Date;
    assignedBy: string;
}
interface StudentEnrollment {
    id: string;
    studentId: string;
    learningPathId: string;
    instructorId: string;
    enrolledAt: Date;
    status: 'pending' | 'active' | 'completed' | 'dropped' | 'suspended';
    grade?: number;
    completionDate?: Date;
    instructorNotes: string;
    lastActivity?: Date;
    metadata: Record<string, any>;
}
interface GradingItem {
    id: string;
    studentId: string;
    assessmentId: string;
    labId?: string;
    submissionId: string;
    instructorId: string;
    status: 'pending' | 'in-progress' | 'completed';
    score?: number;
    maxScore: number;
    feedback: string;
    rubricScores?: {
        criteriaId: string;
        score: number;
        feedback: string;
    }[];
    gradedAt?: Date;
    dueDate?: Date;
    priority: 'low' | 'normal' | 'high';
    flags: string[];
}
interface InstructorDashboard {
    coursesManaged: number;
    totalStudents: number;
    activeStudents: number;
    pendingGrading: number;
    avgStudentProgress: number;
    recentActivity: {
        type: string;
        description: string;
        timestamp: Date;
        studentId?: string;
        courseId?: string;
    }[];
    upcomingDeadlines: {
        type: 'assignment' | 'exam' | 'lab';
        title: string;
        dueDate: Date;
        studentCount: number;
    }[];
    performanceMetrics: {
        courseId: string;
        courseName: string;
        enrollmentCount: number;
        completionRate: number;
        averageScore: number;
        dropoutRate: number;
    }[];
}
interface ClassroomSession {
    id: string;
    instructorId: string;
    learningPathId: string;
    title: string;
    description: string;
    scheduledAt: Date;
    duration: number;
    type: 'lecture' | 'lab' | 'discussion' | 'review';
    status: 'scheduled' | 'active' | 'completed' | 'cancelled';
    attendees: {
        studentId: string;
        joinedAt?: Date;
        leftAt?: Date;
        participationScore?: number;
    }[];
    materials: {
        id: string;
        name: string;
        type: 'presentation' | 'document' | 'video' | 'link';
        url: string;
    }[];
    recording?: {
        url: string;
        duration: number;
        transcription?: string;
    };
    notes: string;
    metadata: Record<string, any>;
}
interface CurriculumTemplate {
    id: string;
    name: string;
    description: string;
    category: string;
    skillLevel: string;
    estimatedHours: number;
    modules: {
        title: string;
        description: string;
        estimatedHours: number;
        lessons: {
            title: string;
            type: string;
            duration: number;
            content: any;
        }[];
        assessments: {
            title: string;
            type: string;
            points: number;
        }[];
    }[];
    prerequisites: string[];
    learningObjectives: string[];
    createdBy: string;
    isPublic: boolean;
    usageCount: number;
    rating: number;
    createdAt: Date;
    updatedAt: Date;
}
export declare class InstructorService extends EventEmitter {
    private db;
    constructor(config: {
        database: DatabaseConfig;
    });
    initialize(): Promise<void>;
    private createTables;
    private seedDefaultData;
    createInstructorProfile(instructorData: Omit<Instructor, 'id' | 'createdAt' | 'updatedAt'>): Promise<Instructor>;
    getInstructorProfile(instructorId: string): Promise<Instructor | null>;
    assignInstructorToCourse(instructorId: string, learningPathId: string, role: 'owner' | 'co-instructor' | 'assistant', permissions: any, assignedBy: string): Promise<CourseManagement>;
    getInstructorCourses(instructorId: string): Promise<CourseManagement[]>;
    enrollStudentInCourse(instructorId: string, studentId: string, learningPathId: string, notes?: string): Promise<StudentEnrollment>;
    getInstructorStudents(instructorId: string, learningPathId?: string): Promise<StudentEnrollment[]>;
    updateStudentGrade(enrollmentId: string, grade: number, notes?: string): Promise<void>;
    addToGradingQueue(studentId: string, submissionId: string, assessmentId: string | null, labId: string | null, instructorId: string, maxScore: number, dueDate?: Date): Promise<GradingItem>;
    getGradingQueue(instructorId: string, status?: string): Promise<GradingItem[]>;
    submitGrade(gradingItemId: string, score: number, feedback: string, rubricScores?: any[]): Promise<void>;
    createClassroomSession(sessionData: Omit<ClassroomSession, 'id' | 'metadata'>): Promise<ClassroomSession>;
    getInstructorSessions(instructorId: string, upcoming?: boolean): Promise<ClassroomSession[]>;
    createCurriculumTemplate(templateData: Omit<CurriculumTemplate, 'id' | 'usageCount' | 'rating' | 'createdAt' | 'updatedAt'>): Promise<CurriculumTemplate>;
    getCurriculumTemplates(instructorId?: string, isPublic?: boolean): Promise<CurriculumTemplate[]>;
    getInstructorDashboard(instructorId: string): Promise<InstructorDashboard>;
    private getRecentActivity;
    private getUpcomingDeadlines;
    private getCoursePerformanceMetrics;
    private formatActivityDescription;
    private recordAnalyticsEvent;
    shutdown(): Promise<void>;
}
export {};
//# sourceMappingURL=instructor-service.d.ts.map