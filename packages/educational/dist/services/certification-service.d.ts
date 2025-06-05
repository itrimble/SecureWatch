import { EventEmitter } from 'events';
import { Certification, DatabaseConfig, SearchFilters, Pagination, Difficulty } from '../types/educational.types';
interface CertificationExam {
    id: string;
    certificationId: string;
    title: string;
    description: string;
    timeLimit: number;
    passingScore: number;
    maxAttempts: number;
    questions: string[];
    practicalTasks: string[];
    randomizeQuestions: boolean;
    proctored: boolean;
    prerequisites: string[];
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
    metadata: Record<string, any>;
}
interface CertificationExamResult {
    id: string;
    examId: string;
    studentId: string;
    certificationId: string;
    score: number;
    maxScore: number;
    passed: boolean;
    startedAt: Date;
    completedAt?: Date;
    timeSpent: number;
    assessmentResults: string[];
    practicalResults: string[];
    proctorVerified: boolean;
    certificateId?: string;
    attempt: number;
    feedback: string;
    metadata: Record<string, any>;
}
interface Certificate {
    id: string;
    certificationId: string;
    studentId: string;
    examResultId: string;
    certificateNumber: string;
    issuedAt: Date;
    expiresAt?: Date;
    status: 'active' | 'expired' | 'revoked';
    digitalSignature: string;
    verificationUrl: string;
    credentialData: {
        studentName: string;
        certificationName: string;
        issueDate: string;
        expirationDate?: string;
        competencies: string[];
        score: number;
    };
    metadata: Record<string, any>;
}
interface StudyMaterial {
    id: string;
    certificationId: string;
    title: string;
    description: string;
    type: 'guide' | 'practice-exam' | 'video' | 'interactive' | 'reference';
    content: any;
    difficulty: Difficulty;
    estimatedTime: number;
    prerequisites: string[];
    tags: string[];
    order: number;
    free: boolean;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
    metadata: Record<string, any>;
}
interface CertificationStatistics {
    totalCertifications: number;
    totalExams: number;
    totalCertificates: number;
    passRate: number;
    averageScore: number;
    popularCertifications: {
        id: string;
        name: string;
        attempts: number;
        passRate: number;
    }[];
    recentCertificates: {
        certificateNumber: string;
        studentName: string;
        certificationName: string;
        issuedAt: Date;
    }[];
    competencyAnalysis: {
        competencyId: string;
        name: string;
        averageScore: number;
        attempts: number;
    }[];
}
export declare class CertificationService extends EventEmitter {
    private db;
    constructor(config: {
        database: DatabaseConfig;
    });
    initialize(): Promise<void>;
    private createTables;
    private seedDefaultCertifications;
    createCertification(certificationData: Omit<Certification, 'id'>): Promise<Certification>;
    getCertification(certificationId: string): Promise<Certification | null>;
    searchCertifications(filters: SearchFilters, pagination: Pagination): Promise<{
        certifications: Certification[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    createCertificationExam(examData: Omit<CertificationExam, 'id' | 'createdAt' | 'updatedAt'>): Promise<CertificationExam>;
    startCertificationExam(examId: string, studentId: string): Promise<CertificationExamResult>;
    submitCertificationExam(examResultId: string, assessmentResults: string[], practicalResults: string[]): Promise<CertificationExamResult>;
    private generateCertificate;
    getCertificate(certificateId: string): Promise<Certificate | null>;
    verifyCertificate(certificateNumber: string): Promise<Certificate | null>;
    createStudyMaterial(materialData: Omit<StudyMaterial, 'id' | 'createdAt' | 'updatedAt'>): Promise<StudyMaterial>;
    getStudyMaterials(certificationId: string): Promise<StudyMaterial[]>;
    private getCertificationExam;
    private getCertificationExamResult;
    private checkExamPrerequisites;
    private getStudentExamAttempts;
    private calculateCompetencyScores;
    private generateExamFeedback;
    private generateCertificateNumber;
    private generateDigitalSignature;
    getCertificationStatistics(): Promise<CertificationStatistics>;
    shutdown(): Promise<void>;
}
export {};
//# sourceMappingURL=certification-service.d.ts.map