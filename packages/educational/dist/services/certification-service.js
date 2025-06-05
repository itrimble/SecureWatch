import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import knex from 'knex';
import { logger } from '../utils/logger';
import { CertificationSchema } from '../types/educational.types';
export class CertificationService extends EventEmitter {
    db;
    constructor(config) {
        super();
        this.db = knex({
            client: config.database.type,
            connection: config.database.connection,
            useNullAsDefault: true
        });
    }
    async initialize() {
        logger.info('Initializing Certification Service');
        await this.createTables();
        await this.seedDefaultCertifications();
        logger.info('Certification Service initialized successfully');
    }
    async createTables() {
        // Certifications table
        if (!(await this.db.schema.hasTable('certifications'))) {
            await this.db.schema.createTable('certifications', (table) => {
                table.string('id').primary();
                table.string('name').notNullable();
                table.text('description');
                table.string('issuer').notNullable();
                table.integer('validity_period'); // months
                table.text('exam_requirements');
                table.json('prerequisites');
                table.json('competencies');
                table.json('passing_criteria');
                table.string('badge_url');
                table.text('credential_template');
                table.boolean('active').defaultTo(true);
                table.dateTime('created_at').notNullable();
                table.dateTime('updated_at').notNullable();
                table.json('metadata');
                table.index(['issuer']);
                table.index(['active']);
                table.index(['created_at']);
            });
        }
        // Certification exams table
        if (!(await this.db.schema.hasTable('certification_exams'))) {
            await this.db.schema.createTable('certification_exams', (table) => {
                table.string('id').primary();
                table.string('certification_id').notNullable();
                table.string('title').notNullable();
                table.text('description');
                table.integer('time_limit').notNullable(); // minutes
                table.integer('passing_score').notNullable(); // percentage
                table.integer('max_attempts').defaultTo(3);
                table.json('questions'); // assessment IDs
                table.json('practical_tasks'); // lab IDs
                table.boolean('randomize_questions').defaultTo(true);
                table.boolean('proctored').defaultTo(false);
                table.json('prerequisites');
                table.string('created_by').notNullable();
                table.dateTime('created_at').notNullable();
                table.dateTime('updated_at').notNullable();
                table.json('metadata');
                table.foreign('certification_id').references('certifications.id').onDelete('CASCADE');
                table.index(['certification_id']);
                table.index(['created_at']);
            });
        }
        // Certification exam results table
        if (!(await this.db.schema.hasTable('certification_exam_results'))) {
            await this.db.schema.createTable('certification_exam_results', (table) => {
                table.string('id').primary();
                table.string('exam_id').notNullable();
                table.string('student_id').notNullable();
                table.string('certification_id').notNullable();
                table.integer('score').notNullable(); // percentage
                table.integer('max_score').notNullable();
                table.boolean('passed').notNullable();
                table.dateTime('started_at').notNullable();
                table.dateTime('completed_at');
                table.integer('time_spent'); // minutes
                table.json('assessment_results'); // assessment result IDs
                table.json('practical_results'); // lab result IDs
                table.boolean('proctor_verified').defaultTo(false);
                table.string('certificate_id');
                table.integer('attempt').defaultTo(1);
                table.text('feedback');
                table.json('metadata');
                table.foreign('exam_id').references('certification_exams.id').onDelete('CASCADE');
                table.foreign('certification_id').references('certifications.id').onDelete('CASCADE');
                table.index(['student_id', 'certification_id']);
                table.index(['completed_at']);
                table.index(['passed']);
            });
        }
        // Certificates table
        if (!(await this.db.schema.hasTable('certificates'))) {
            await this.db.schema.createTable('certificates', (table) => {
                table.string('id').primary();
                table.string('certification_id').notNullable();
                table.string('student_id').notNullable();
                table.string('exam_result_id').notNullable();
                table.string('certificate_number').notNullable().unique();
                table.dateTime('issued_at').notNullable();
                table.dateTime('expires_at');
                table.string('status').notNullable(); // 'active', 'expired', 'revoked'
                table.text('digital_signature');
                table.string('verification_url');
                table.json('credential_data');
                table.json('metadata');
                table.foreign('certification_id').references('certifications.id').onDelete('CASCADE');
                table.foreign('exam_result_id').references('certification_exam_results.id').onDelete('CASCADE');
                table.index(['student_id']);
                table.index(['certificate_number']);
                table.index(['status']);
                table.index(['issued_at']);
                table.index(['expires_at']);
            });
        }
        // Study materials table
        if (!(await this.db.schema.hasTable('study_materials'))) {
            await this.db.schema.createTable('study_materials', (table) => {
                table.string('id').primary();
                table.string('certification_id').notNullable();
                table.string('title').notNullable();
                table.text('description');
                table.string('type').notNullable(); // 'guide', 'practice-exam', 'video', 'interactive', 'reference'
                table.json('content');
                table.string('difficulty').notNullable();
                table.integer('estimated_time').notNullable(); // minutes
                table.json('prerequisites');
                table.json('tags');
                table.integer('order').defaultTo(0);
                table.boolean('free').defaultTo(true);
                table.string('created_by').notNullable();
                table.dateTime('created_at').notNullable();
                table.dateTime('updated_at').notNullable();
                table.json('metadata');
                table.foreign('certification_id').references('certifications.id').onDelete('CASCADE');
                table.index(['certification_id', 'type']);
                table.index(['difficulty']);
                table.index(['free']);
                table.index(['order']);
            });
        }
        // Certification prerequisites table (for tracking completion)
        if (!(await this.db.schema.hasTable('certification_prerequisites'))) {
            await this.db.schema.createTable('certification_prerequisites', (table) => {
                table.string('id').primary();
                table.string('certification_id').notNullable();
                table.string('student_id').notNullable();
                table.string('prerequisite_type').notNullable(); // 'course', 'certification', 'experience'
                table.string('prerequisite_id').notNullable();
                table.boolean('completed').defaultTo(false);
                table.dateTime('completed_at');
                table.text('verification_notes');
                table.string('verified_by');
                table.dateTime('created_at').notNullable();
                table.dateTime('updated_at').notNullable();
                table.foreign('certification_id').references('certifications.id').onDelete('CASCADE');
                table.index(['student_id', 'certification_id']);
                table.index(['completed']);
                table.unique(['certification_id', 'student_id', 'prerequisite_id']);
            });
        }
        // Competency assessments table
        if (!(await this.db.schema.hasTable('competency_assessments'))) {
            await this.db.schema.createTable('competency_assessments', (table) => {
                table.string('id').primary();
                table.string('certification_id').notNullable();
                table.string('student_id').notNullable();
                table.string('competency_id').notNullable();
                table.integer('score').notNullable(); // percentage
                table.integer('weight').notNullable(); // percentage of total certification
                table.dateTime('assessed_at').notNullable();
                table.string('assessment_method'); // 'exam', 'practical', 'project'
                table.json('evidence'); // URLs or references to work
                table.text('assessor_notes');
                table.string('assessed_by');
                table.foreign('certification_id').references('certifications.id').onDelete('CASCADE');
                table.index(['student_id', 'certification_id']);
                table.index(['competency_id']);
                table.index(['assessed_at']);
            });
        }
    }
    async seedDefaultCertifications() {
        const count = await this.db('certifications').count('* as count').first();
        if (count?.count > 0)
            return;
        const defaultCertifications = [
            {
                id: uuidv4(),
                name: 'Certified Security Analyst (CSA)',
                description: 'Entry-level certification for security operations center analysts',
                issuer: 'SecureWatch Academy',
                validity_period: 36, // 3 years
                exam_requirements: 'Pass comprehensive exam covering incident response, threat analysis, and security monitoring',
                prerequisites: JSON.stringify([]),
                competencies: JSON.stringify([
                    {
                        id: 'incident-response',
                        name: 'Incident Response',
                        description: 'Ability to respond to and manage security incidents',
                        weight: 30
                    },
                    {
                        id: 'threat-analysis',
                        name: 'Threat Analysis',
                        description: 'Skills in analyzing and identifying security threats',
                        weight: 25
                    },
                    {
                        id: 'siem-operations',
                        name: 'SIEM Operations',
                        description: 'Proficiency in SIEM tools and log analysis',
                        weight: 25
                    },
                    {
                        id: 'security-monitoring',
                        name: 'Security Monitoring',
                        description: 'Continuous monitoring of security events and alerts',
                        weight: 20
                    }
                ]),
                passing_criteria: JSON.stringify({
                    minimumScore: 80,
                    requiredCompetencies: ['incident-response', 'threat-analysis'],
                    timeLimit: 180 // 3 hours
                }),
                badge_url: 'https://cdn.securewatch.edu/badges/csa.png',
                credential_template: 'standard-certificate-template',
                active: true,
                created_at: new Date(),
                updated_at: new Date(),
                metadata: JSON.stringify({})
            },
            {
                id: uuidv4(),
                name: 'Advanced Digital Forensics Specialist (ADFS)',
                description: 'Advanced certification for digital forensics investigators',
                issuer: 'SecureWatch Academy',
                validity_period: 24, // 2 years
                exam_requirements: 'Pass advanced exam including practical forensics scenarios and case studies',
                prerequisites: JSON.stringify(['csa-certification']),
                competencies: JSON.stringify([
                    {
                        id: 'disk-forensics',
                        name: 'Disk Forensics',
                        description: 'Advanced disk analysis and recovery techniques',
                        weight: 25
                    },
                    {
                        id: 'memory-forensics',
                        name: 'Memory Forensics',
                        description: 'Memory dump analysis and malware detection',
                        weight: 25
                    },
                    {
                        id: 'network-forensics',
                        name: 'Network Forensics',
                        description: 'Network traffic analysis and reconstruction',
                        weight: 25
                    },
                    {
                        id: 'mobile-forensics',
                        name: 'Mobile Forensics',
                        description: 'Mobile device analysis and data extraction',
                        weight: 25
                    }
                ]),
                passing_criteria: JSON.stringify({
                    minimumScore: 85,
                    requiredCompetencies: ['disk-forensics', 'memory-forensics'],
                    timeLimit: 240 // 4 hours
                }),
                badge_url: 'https://cdn.securewatch.edu/badges/adfs.png',
                credential_template: 'advanced-certificate-template',
                active: true,
                created_at: new Date(),
                updated_at: new Date(),
                metadata: JSON.stringify({})
            },
            {
                id: uuidv4(),
                name: 'Certified Penetration Testing Professional (CPTP)',
                description: 'Professional-level certification for penetration testers',
                issuer: 'SecureWatch Academy',
                validity_period: 36, // 3 years
                exam_requirements: 'Pass practical exam demonstrating penetration testing skills and methodology',
                prerequisites: JSON.stringify(['networking-fundamentals', 'linux-administration']),
                competencies: JSON.stringify([
                    {
                        id: 'reconnaissance',
                        name: 'Reconnaissance',
                        description: 'Information gathering and target enumeration',
                        weight: 20
                    },
                    {
                        id: 'vulnerability-assessment',
                        name: 'Vulnerability Assessment',
                        description: 'Identifying and prioritizing vulnerabilities',
                        weight: 25
                    },
                    {
                        id: 'exploitation',
                        name: 'Exploitation',
                        description: 'Safely exploiting vulnerabilities for testing',
                        weight: 30
                    },
                    {
                        id: 'reporting',
                        name: 'Reporting',
                        description: 'Professional penetration testing reporting',
                        weight: 25
                    }
                ]),
                passing_criteria: JSON.stringify({
                    minimumScore: 75,
                    requiredCompetencies: ['vulnerability-assessment', 'exploitation'],
                    timeLimit: 360 // 6 hours
                }),
                badge_url: 'https://cdn.securewatch.edu/badges/cptp.png',
                credential_template: 'professional-certificate-template',
                active: true,
                created_at: new Date(),
                updated_at: new Date(),
                metadata: JSON.stringify({})
            }
        ];
        await this.db('certifications').insert(defaultCertifications);
        logger.info(`Seeded ${defaultCertifications.length} default certifications`);
    }
    // Certification Management
    async createCertification(certificationData) {
        const newCertification = {
            id: uuidv4(),
            ...certificationData
        };
        const validatedCertification = CertificationSchema.parse(newCertification);
        await this.db('certifications').insert({
            id: validatedCertification.id,
            name: validatedCertification.name,
            description: validatedCertification.description,
            issuer: validatedCertification.issuer,
            validity_period: validatedCertification.validityPeriod,
            exam_requirements: validatedCertification.examRequirements,
            prerequisites: JSON.stringify(validatedCertification.prerequisites),
            competencies: JSON.stringify(validatedCertification.competencies),
            passing_criteria: JSON.stringify(validatedCertification.passingCriteria),
            badge_url: validatedCertification.badgeUrl,
            credential_template: validatedCertification.credentialTemplate,
            active: true,
            created_at: new Date(),
            updated_at: new Date(),
            metadata: JSON.stringify(validatedCertification.metadata)
        });
        this.emit('certification-created', { certificationId: validatedCertification.id, certification: validatedCertification });
        logger.info(`Created certification: ${validatedCertification.name}`);
        return validatedCertification;
    }
    async getCertification(certificationId) {
        const row = await this.db('certifications').where('id', certificationId).first();
        if (!row)
            return null;
        return {
            id: row.id,
            name: row.name,
            description: row.description,
            issuer: row.issuer,
            validityPeriod: row.validity_period,
            examRequirements: row.exam_requirements,
            prerequisites: JSON.parse(row.prerequisites || '[]'),
            competencies: JSON.parse(row.competencies || '[]'),
            passingCriteria: JSON.parse(row.passing_criteria),
            badgeUrl: row.badge_url,
            credentialTemplate: row.credential_template,
            metadata: JSON.parse(row.metadata || '{}')
        };
    }
    async searchCertifications(filters, pagination) {
        let query = this.db('certifications').where('active', true);
        if (filters.query) {
            query = query.where((builder) => {
                builder
                    .where('name', 'like', `%${filters.query}%`)
                    .orWhere('description', 'like', `%${filters.query}%`);
            });
        }
        if (filters.difficulty) {
            // Filter by competency difficulty (simplified)
            query = query.whereRaw('JSON_EXTRACT(competencies, "$") LIKE ?', [`%${filters.difficulty}%`]);
        }
        // Count total results
        const totalResult = await query.clone().count('* as total').first();
        const total = totalResult?.total || 0;
        // Apply pagination
        const offset = (pagination.page - 1) * pagination.limit;
        const rows = await query
            .orderBy(pagination.sortBy, pagination.sortOrder)
            .limit(pagination.limit)
            .offset(offset);
        const certifications = rows.map((row) => ({
            id: row.id,
            name: row.name,
            description: row.description,
            issuer: row.issuer,
            validityPeriod: row.validity_period,
            examRequirements: row.exam_requirements,
            prerequisites: JSON.parse(row.prerequisites || '[]'),
            competencies: JSON.parse(row.competencies || '[]'),
            passingCriteria: JSON.parse(row.passing_criteria),
            badgeUrl: row.badge_url,
            credentialTemplate: row.credential_template,
            metadata: JSON.parse(row.metadata || '{}')
        }));
        const totalPages = Math.ceil(total / pagination.limit);
        return {
            certifications,
            total,
            page: pagination.page,
            totalPages
        };
    }
    // Exam Management
    async createCertificationExam(examData) {
        const now = new Date();
        const newExam = {
            id: uuidv4(),
            createdAt: now,
            updatedAt: now,
            ...examData
        };
        await this.db('certification_exams').insert({
            id: newExam.id,
            certification_id: newExam.certificationId,
            title: newExam.title,
            description: newExam.description,
            time_limit: newExam.timeLimit,
            passing_score: newExam.passingScore,
            max_attempts: newExam.maxAttempts,
            questions: JSON.stringify(newExam.questions),
            practical_tasks: JSON.stringify(newExam.practicalTasks),
            randomize_questions: newExam.randomizeQuestions,
            proctored: newExam.proctored,
            prerequisites: JSON.stringify(newExam.prerequisites),
            created_by: newExam.createdBy,
            created_at: newExam.createdAt,
            updated_at: newExam.updatedAt,
            metadata: JSON.stringify(newExam.metadata)
        });
        this.emit('certification-exam-created', { examId: newExam.id, exam: newExam });
        logger.info(`Created certification exam: ${newExam.title}`);
        return newExam;
    }
    async startCertificationExam(examId, studentId) {
        const exam = await this.getCertificationExam(examId);
        if (!exam) {
            throw new Error(`Certification exam ${examId} not found`);
        }
        // Check prerequisites
        const prerequisitesMet = await this.checkExamPrerequisites(examId, studentId);
        if (!prerequisitesMet) {
            throw new Error('Exam prerequisites not met');
        }
        // Check attempt limits
        const previousAttempts = await this.getStudentExamAttempts(examId, studentId);
        if (previousAttempts.length >= exam.maxAttempts) {
            throw new Error(`Maximum attempts (${exam.maxAttempts}) exceeded for exam ${examId}`);
        }
        const now = new Date();
        const examResult = {
            id: uuidv4(),
            examId,
            studentId,
            certificationId: exam.certificationId,
            score: 0,
            maxScore: 100,
            passed: false,
            startedAt: now,
            timeSpent: 0,
            assessmentResults: [],
            practicalResults: [],
            proctorVerified: false,
            attempt: previousAttempts.length + 1,
            feedback: '',
            metadata: {}
        };
        await this.db('certification_exam_results').insert({
            id: examResult.id,
            exam_id: examResult.examId,
            student_id: examResult.studentId,
            certification_id: examResult.certificationId,
            score: examResult.score,
            max_score: examResult.maxScore,
            passed: examResult.passed,
            started_at: examResult.startedAt,
            time_spent: examResult.timeSpent,
            assessment_results: JSON.stringify(examResult.assessmentResults),
            practical_results: JSON.stringify(examResult.practicalResults),
            proctor_verified: examResult.proctorVerified,
            attempt: examResult.attempt,
            feedback: examResult.feedback,
            metadata: JSON.stringify(examResult.metadata)
        });
        this.emit('certification-exam-started', { examResultId: examResult.id, examId, studentId });
        logger.info(`Started certification exam ${examId} for student ${studentId}`);
        return examResult;
    }
    async submitCertificationExam(examResultId, assessmentResults, practicalResults) {
        const examResult = await this.getCertificationExamResult(examResultId);
        if (!examResult) {
            throw new Error(`Exam result ${examResultId} not found`);
        }
        const exam = await this.getCertificationExam(examResult.examId);
        if (!exam) {
            throw new Error(`Exam ${examResult.examId} not found`);
        }
        const certification = await this.getCertification(examResult.certificationId);
        if (!certification) {
            throw new Error(`Certification ${examResult.certificationId} not found`);
        }
        // Calculate final score based on competencies
        const competencyScores = await this.calculateCompetencyScores(examResult.certificationId, examResult.studentId, assessmentResults, practicalResults);
        const totalScore = competencyScores.reduce((sum, comp) => sum + (comp.score * comp.weight / 100), 0);
        const passed = totalScore >= certification.passingCriteria.minimumScore;
        const now = new Date();
        const timeSpent = Math.floor((now.getTime() - examResult.startedAt.getTime()) / 1000 / 60); // minutes
        // Update exam result
        await this.db('certification_exam_results')
            .where('id', examResultId)
            .update({
            score: Math.round(totalScore),
            passed,
            completed_at: now,
            time_spent: timeSpent,
            assessment_results: JSON.stringify(assessmentResults),
            practical_results: JSON.stringify(practicalResults),
            feedback: this.generateExamFeedback(totalScore, passed, competencyScores)
        });
        // Generate certificate if passed
        let certificateId;
        if (passed) {
            certificateId = await this.generateCertificate(examResultId);
        }
        const updatedResult = {
            ...examResult,
            score: Math.round(totalScore),
            passed,
            completedAt: now,
            timeSpent,
            assessmentResults,
            practicalResults,
            certificateId,
            feedback: this.generateExamFeedback(totalScore, passed, competencyScores)
        };
        this.emit('certification-exam-completed', {
            examResultId,
            passed,
            score: totalScore,
            certificateId
        });
        logger.info(`Completed certification exam ${examResult.examId} for student ${examResult.studentId}, passed: ${passed}`);
        return updatedResult;
    }
    // Certificate Management
    async generateCertificate(examResultId) {
        const examResult = await this.getCertificationExamResult(examResultId);
        if (!examResult || !examResult.passed) {
            throw new Error('Cannot generate certificate for failed exam');
        }
        const certification = await this.getCertification(examResult.certificationId);
        if (!certification) {
            throw new Error(`Certification ${examResult.certificationId} not found`);
        }
        const now = new Date();
        const certificateNumber = this.generateCertificateNumber(certification.name, examResult.studentId);
        const expiresAt = certification.validityPeriod
            ? new Date(now.getTime() + certification.validityPeriod * 30 * 24 * 60 * 60 * 1000)
            : undefined;
        const certificate = {
            id: uuidv4(),
            certificationId: examResult.certificationId,
            studentId: examResult.studentId,
            examResultId,
            certificateNumber,
            issuedAt: now,
            expiresAt,
            status: 'active',
            digitalSignature: this.generateDigitalSignature(certificateNumber, examResult.studentId),
            verificationUrl: `https://verify.securewatch.edu/certificates/${certificateNumber}`,
            credentialData: {
                studentName: 'Student Name', // Would be fetched from user service
                certificationName: certification.name,
                issueDate: now.toISOString().split('T')[0],
                expirationDate: expiresAt?.toISOString().split('T')[0],
                competencies: certification.competencies.map(c => c.name),
                score: examResult.score
            },
            metadata: {}
        };
        await this.db('certificates').insert({
            id: certificate.id,
            certification_id: certificate.certificationId,
            student_id: certificate.studentId,
            exam_result_id: certificate.examResultId,
            certificate_number: certificate.certificateNumber,
            issued_at: certificate.issuedAt,
            expires_at: certificate.expiresAt,
            status: certificate.status,
            digital_signature: certificate.digitalSignature,
            verification_url: certificate.verificationUrl,
            credential_data: JSON.stringify(certificate.credentialData),
            metadata: JSON.stringify(certificate.metadata)
        });
        // Update exam result with certificate ID
        await this.db('certification_exam_results')
            .where('id', examResultId)
            .update({ certificate_id: certificate.id });
        this.emit('certificate-generated', { certificateId: certificate.id, certificate });
        logger.info(`Generated certificate ${certificateNumber} for student ${examResult.studentId}`);
        return certificate.id;
    }
    async getCertificate(certificateId) {
        const row = await this.db('certificates').where('id', certificateId).first();
        if (!row)
            return null;
        return {
            id: row.id,
            certificationId: row.certification_id,
            studentId: row.student_id,
            examResultId: row.exam_result_id,
            certificateNumber: row.certificate_number,
            issuedAt: new Date(row.issued_at),
            expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
            status: row.status,
            digitalSignature: row.digital_signature,
            verificationUrl: row.verification_url,
            credentialData: JSON.parse(row.credential_data),
            metadata: JSON.parse(row.metadata || '{}')
        };
    }
    async verifyCertificate(certificateNumber) {
        const row = await this.db('certificates').where('certificate_number', certificateNumber).first();
        if (!row)
            return null;
        const certificate = await this.getCertificate(row.id);
        if (!certificate)
            return null;
        // Check if certificate is still valid
        if (certificate.status !== 'active')
            return null;
        if (certificate.expiresAt && certificate.expiresAt < new Date())
            return null;
        return certificate;
    }
    // Study Materials Management
    async createStudyMaterial(materialData) {
        const now = new Date();
        const newMaterial = {
            id: uuidv4(),
            createdAt: now,
            updatedAt: now,
            ...materialData
        };
        await this.db('study_materials').insert({
            id: newMaterial.id,
            certification_id: newMaterial.certificationId,
            title: newMaterial.title,
            description: newMaterial.description,
            type: newMaterial.type,
            content: JSON.stringify(newMaterial.content),
            difficulty: newMaterial.difficulty,
            estimated_time: newMaterial.estimatedTime,
            prerequisites: JSON.stringify(newMaterial.prerequisites),
            tags: JSON.stringify(newMaterial.tags),
            order: newMaterial.order,
            free: newMaterial.free,
            created_by: newMaterial.createdBy,
            created_at: newMaterial.createdAt,
            updated_at: newMaterial.updatedAt,
            metadata: JSON.stringify(newMaterial.metadata)
        });
        this.emit('study-material-created', { materialId: newMaterial.id, material: newMaterial });
        logger.info(`Created study material: ${newMaterial.title}`);
        return newMaterial;
    }
    async getStudyMaterials(certificationId) {
        const rows = await this.db('study_materials')
            .where('certification_id', certificationId)
            .orderBy('order');
        return rows.map((row) => ({
            id: row.id,
            certificationId: row.certification_id,
            title: row.title,
            description: row.description,
            type: row.type,
            content: JSON.parse(row.content),
            difficulty: row.difficulty,
            estimatedTime: row.estimated_time,
            prerequisites: JSON.parse(row.prerequisites || '[]'),
            tags: JSON.parse(row.tags || '[]'),
            order: row.order,
            free: row.free,
            createdBy: row.created_by,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
            metadata: JSON.parse(row.metadata || '{}')
        }));
    }
    // Helper Methods
    async getCertificationExam(examId) {
        const row = await this.db('certification_exams').where('id', examId).first();
        if (!row)
            return null;
        return {
            id: row.id,
            certificationId: row.certification_id,
            title: row.title,
            description: row.description,
            timeLimit: row.time_limit,
            passingScore: row.passing_score,
            maxAttempts: row.max_attempts,
            questions: JSON.parse(row.questions || '[]'),
            practicalTasks: JSON.parse(row.practical_tasks || '[]'),
            randomizeQuestions: row.randomize_questions,
            proctored: row.proctored,
            prerequisites: JSON.parse(row.prerequisites || '[]'),
            createdBy: row.created_by,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
            metadata: JSON.parse(row.metadata || '{}')
        };
    }
    async getCertificationExamResult(examResultId) {
        const row = await this.db('certification_exam_results').where('id', examResultId).first();
        if (!row)
            return null;
        return {
            id: row.id,
            examId: row.exam_id,
            studentId: row.student_id,
            certificationId: row.certification_id,
            score: row.score,
            maxScore: row.max_score,
            passed: row.passed,
            startedAt: new Date(row.started_at),
            completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
            timeSpent: row.time_spent,
            assessmentResults: JSON.parse(row.assessment_results || '[]'),
            practicalResults: JSON.parse(row.practical_results || '[]'),
            proctorVerified: row.proctor_verified,
            certificateId: row.certificate_id,
            attempt: row.attempt,
            feedback: row.feedback,
            metadata: JSON.parse(row.metadata || '{}')
        };
    }
    async checkExamPrerequisites(examId, studentId) {
        // Check if student has completed all required prerequisites
        // This would integrate with learning path and assessment services
        return true; // Simplified for now
    }
    async getStudentExamAttempts(examId, studentId) {
        const rows = await this.db('certification_exam_results')
            .where({ exam_id: examId, student_id: studentId })
            .orderBy('started_at', 'desc');
        return rows.map((row) => ({
            id: row.id,
            examId: row.exam_id,
            studentId: row.student_id,
            certificationId: row.certification_id,
            score: row.score,
            maxScore: row.max_score,
            passed: row.passed,
            startedAt: new Date(row.started_at),
            completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
            timeSpent: row.time_spent,
            assessmentResults: JSON.parse(row.assessment_results || '[]'),
            practicalResults: JSON.parse(row.practical_results || '[]'),
            proctorVerified: row.proctor_verified,
            certificateId: row.certificate_id,
            attempt: row.attempt,
            feedback: row.feedback,
            metadata: JSON.parse(row.metadata || '{}')
        }));
    }
    async calculateCompetencyScores(certificationId, studentId, assessmentResults, practicalResults) {
        // This would integrate with assessment and lab services to calculate
        // competency-based scores. For now, return mock data.
        const certification = await this.getCertification(certificationId);
        if (!certification)
            return [];
        return certification.competencies.map(comp => ({
            competencyId: comp.id,
            score: Math.floor(Math.random() * 30) + 70, // 70-100 range
            weight: comp.weight
        }));
    }
    generateExamFeedback(score, passed, competencyScores) {
        if (passed) {
            if (score >= 90) {
                return 'Excellent performance! You demonstrated outstanding competency across all areas.';
            }
            else if (score >= 80) {
                return 'Great job! You successfully passed the certification exam.';
            }
            else {
                return 'Congratulations on passing! Consider reviewing areas where you scored lower for continuous improvement.';
            }
        }
        else {
            const weakAreas = competencyScores
                .filter(comp => comp.score < 70)
                .map(comp => comp.competencyId);
            return `You did not pass this attempt. Focus on improving in these areas: ${weakAreas.join(', ')}. Review the study materials and try again.`;
        }
    }
    generateCertificateNumber(certificationName, studentId) {
        const prefix = certificationName.split(' ').map(w => w[0]).join('').toUpperCase();
        const timestamp = Date.now().toString().slice(-6);
        const studentHash = studentId.slice(-4).toUpperCase();
        return `${prefix}-${timestamp}-${studentHash}`;
    }
    generateDigitalSignature(certificateNumber, studentId) {
        // In production, this would use proper cryptographic signing
        const data = `${certificateNumber}:${studentId}:${Date.now()}`;
        return Buffer.from(data).toString('base64');
    }
    // Statistics
    async getCertificationStatistics() {
        const [totalCertifications, totalExams, totalCertificates, passRate, averageScore] = await Promise.all([
            this.db('certifications').where('active', true).count('* as count').first(),
            this.db('certification_exams').count('* as count').first(),
            this.db('certificates').where('status', 'active').count('* as count').first(),
            this.db('certification_exam_results').where('passed', true).count('* as count').first(),
            this.db('certification_exam_results').avg('score as avg').first()
        ]);
        const totalAttempts = await this.db('certification_exam_results').count('* as count').first();
        return {
            totalCertifications: totalCertifications?.count || 0,
            totalExams: totalExams?.count || 0,
            totalCertificates: totalCertificates?.count || 0,
            passRate: totalAttempts?.count > 0
                ? Math.round(((passRate?.count || 0) / totalAttempts.count) * 100)
                : 0,
            averageScore: Math.round(averageScore?.avg || 0),
            popularCertifications: [], // TODO: Implement
            recentCertificates: [], // TODO: Implement
            competencyAnalysis: [] // TODO: Implement
        };
    }
    async shutdown() {
        logger.info('Shutting down Certification Service');
        await this.db.destroy();
        logger.info('Certification Service shutdown complete');
    }
}
//# sourceMappingURL=certification-service.js.map