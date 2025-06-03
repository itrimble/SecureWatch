import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import knex, { Knex } from 'knex';
import { logger } from '../utils/logger';
import {
  Instructor,
  InstructorSchema,
  LearningPath,
  Assessment,
  DatabaseConfig,
  SearchFilters,
  Pagination
} from '../types/educational.types';

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
  grade?: number; // percentage
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
  flags: string[]; // 'late', 'plagiarism', 'incomplete', etc.
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
  duration: number; // minutes
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

export class InstructorService extends EventEmitter {
  private db: Knex;

  constructor(config: { database: DatabaseConfig }) {
    super();
    this.db = knex({
      client: config.database.type,
      connection: config.database.connection,
      useNullAsDefault: true
    });
  }

  async initialize(): Promise<void> {
    logger.info('Initializing Instructor Service');
    await this.createTables();
    await this.seedDefaultData();
    logger.info('Instructor Service initialized successfully');
  }

  private async createTables(): Promise<void> {
    // Instructors table
    if (!(await this.db.schema.hasTable('instructors'))) {
      await this.db.schema.createTable('instructors', (table) => {
        table.string('id').primary();
        table.string('user_id').notNullable().unique();
        table.text('bio');
        table.json('specializations');
        table.json('certifications');
        table.json('experience');
        table.json('teaching');
        table.json('availability');
        table.json('social_media');
        table.boolean('verified').defaultTo(false);
        table.dateTime('verified_at');
        table.dateTime('created_at').notNullable();
        table.dateTime('updated_at').notNullable();
        table.json('metadata');
        
        table.index(['user_id']);
        table.index(['verified']);
      });
    }

    // Course management table (instructor-course assignments)
    if (!(await this.db.schema.hasTable('course_management'))) {
      await this.db.schema.createTable('course_management', (table) => {
        table.string('id').primary();
        table.string('instructor_id').notNullable();
        table.string('learning_path_id').notNullable();
        table.string('role').notNullable(); // 'owner', 'co-instructor', 'assistant'
        table.json('permissions');
        table.dateTime('assigned_at').notNullable();
        table.string('assigned_by');
        table.boolean('active').defaultTo(true);
        
        table.foreign('instructor_id').references('instructors.id').onDelete('CASCADE');
        table.index(['instructor_id']);
        table.index(['learning_path_id']);
        table.unique(['instructor_id', 'learning_path_id']);
      });
    }

    // Student enrollments managed by instructors
    if (!(await this.db.schema.hasTable('instructor_student_enrollments'))) {
      await this.db.schema.createTable('instructor_student_enrollments', (table) => {
        table.string('id').primary();
        table.string('student_id').notNullable();
        table.string('learning_path_id').notNullable();
        table.string('instructor_id').notNullable();
        table.dateTime('enrolled_at').notNullable();
        table.string('status').notNullable(); // 'pending', 'active', 'completed', 'dropped', 'suspended'
        table.integer('grade'); // percentage
        table.dateTime('completion_date');
        table.text('instructor_notes');
        table.dateTime('last_activity');
        table.json('metadata');
        
        table.foreign('instructor_id').references('instructors.id').onDelete('CASCADE');
        table.index(['instructor_id', 'learning_path_id']);
        table.index(['student_id', 'status']);
        table.index(['status']);
      });
    }

    // Grading queue
    if (!(await this.db.schema.hasTable('grading_items'))) {
      await this.db.schema.createTable('grading_items', (table) => {
        table.string('id').primary();
        table.string('student_id').notNullable();
        table.string('assessment_id');
        table.string('lab_id');
        table.string('submission_id').notNullable();
        table.string('instructor_id').notNullable();
        table.string('status').notNullable(); // 'pending', 'in-progress', 'completed'
        table.integer('score');
        table.integer('max_score').notNullable();
        table.text('feedback');
        table.json('rubric_scores');
        table.dateTime('graded_at');
        table.dateTime('due_date');
        table.string('priority').defaultTo('normal'); // 'low', 'normal', 'high'
        table.json('flags'); // 'late', 'plagiarism', 'incomplete'
        table.dateTime('created_at').notNullable();
        table.dateTime('updated_at').notNullable();
        
        table.foreign('instructor_id').references('instructors.id').onDelete('CASCADE');
        table.index(['instructor_id', 'status']);
        table.index(['status', 'due_date']);
        table.index(['created_at']);
      });
    }

    // Classroom sessions
    if (!(await this.db.schema.hasTable('classroom_sessions'))) {
      await this.db.schema.createTable('classroom_sessions', (table) => {
        table.string('id').primary();
        table.string('instructor_id').notNullable();
        table.string('learning_path_id').notNullable();
        table.string('title').notNullable();
        table.text('description');
        table.dateTime('scheduled_at').notNullable();
        table.integer('duration'); // minutes
        table.string('type').notNullable(); // 'lecture', 'lab', 'discussion', 'review'
        table.string('status').notNullable(); // 'scheduled', 'active', 'completed', 'cancelled'
        table.json('attendees');
        table.json('materials');
        table.json('recording');
        table.text('notes');
        table.dateTime('created_at').notNullable();
        table.dateTime('updated_at').notNullable();
        table.json('metadata');
        
        table.foreign('instructor_id').references('instructors.id').onDelete('CASCADE');
        table.index(['instructor_id', 'scheduled_at']);
        table.index(['learning_path_id', 'status']);
        table.index(['status', 'scheduled_at']);
      });
    }

    // Curriculum templates
    if (!(await this.db.schema.hasTable('curriculum_templates'))) {
      await this.db.schema.createTable('curriculum_templates', (table) => {
        table.string('id').primary();
        table.string('name').notNullable();
        table.text('description');
        table.string('category').notNullable();
        table.string('skill_level').notNullable();
        table.integer('estimated_hours').notNullable();
        table.json('modules');
        table.json('prerequisites');
        table.json('learning_objectives');
        table.string('created_by').notNullable();
        table.boolean('is_public').defaultTo(false);
        table.integer('usage_count').defaultTo(0);
        table.decimal('rating', 3, 2).defaultTo(0);
        table.boolean('active').defaultTo(true);
        table.dateTime('created_at').notNullable();
        table.dateTime('updated_at').notNullable();
        table.json('metadata');
        
        table.index(['category', 'skill_level']);
        table.index(['is_public', 'active']);
        table.index(['usage_count']);
        table.index(['rating']);
      });
    }

    // Instructor analytics
    if (!(await this.db.schema.hasTable('instructor_analytics'))) {
      await this.db.schema.createTable('instructor_analytics', (table) => {
        table.string('id').primary();
        table.string('instructor_id').notNullable();
        table.string('learning_path_id');
        table.string('student_id');
        table.string('event_type').notNullable(); // 'course_created', 'student_enrolled', 'grading_completed', 'session_conducted'
        table.json('event_data');
        table.dateTime('timestamp').notNullable();
        
        table.foreign('instructor_id').references('instructors.id').onDelete('CASCADE');
        table.index(['instructor_id', 'timestamp']);
        table.index(['event_type', 'timestamp']);
        table.index(['learning_path_id', 'timestamp']);
      });
    }

    // Instructor feedback and ratings
    if (!(await this.db.schema.hasTable('instructor_feedback'))) {
      await this.db.schema.createTable('instructor_feedback', (table) => {
        table.string('id').primary();
        table.string('instructor_id').notNullable();
        table.string('student_id').notNullable();
        table.string('learning_path_id').notNullable();
        table.integer('rating').notNullable(); // 1-5 scale
        table.text('feedback');
        table.json('ratings_breakdown'); // teaching_quality, communication, helpfulness, etc.
        table.boolean('anonymous').defaultTo(true);
        table.dateTime('submitted_at').notNullable();
        
        table.foreign('instructor_id').references('instructors.id').onDelete('CASCADE');
        table.index(['instructor_id']);
        table.index(['rating']);
        table.index(['submitted_at']);
        table.unique(['instructor_id', 'student_id', 'learning_path_id']);
      });
    }
  }

  private async seedDefaultData(): Promise<void> {
    // Seed default curriculum templates
    const templatesCount = await this.db('curriculum_templates').count('* as count').first();
    if (templatesCount?.count === 0) {
      const defaultTemplates = [
        {
          id: uuidv4(),
          name: 'Cybersecurity Fundamentals Course',
          description: 'Comprehensive introduction to cybersecurity concepts and practices',
          category: 'cybersecurity-fundamentals',
          skill_level: 'beginner',
          estimated_hours: 40,
          modules: JSON.stringify([
            {
              title: 'Introduction to Cybersecurity',
              description: 'Overview of cybersecurity landscape and threats',
              estimatedHours: 8,
              lessons: [
                { title: 'What is Cybersecurity?', type: 'video', duration: 30, content: {} },
                { title: 'Threat Landscape Overview', type: 'article', duration: 45, content: {} },
                { title: 'Security Frameworks', type: 'interactive', duration: 60, content: {} }
              ],
              assessments: [
                { title: 'Module 1 Quiz', type: 'quiz', points: 100 }
              ]
            },
            {
              title: 'Network Security',
              description: 'Network security fundamentals and best practices',
              estimatedHours: 12,
              lessons: [
                { title: 'Network Protocols', type: 'video', duration: 45, content: {} },
                { title: 'Firewalls and IDS', type: 'tutorial', duration: 90, content: {} },
                { title: 'VPNs and Encryption', type: 'hands-on', duration: 120, content: {} }
              ],
              assessments: [
                { title: 'Network Security Lab', type: 'practical', points: 150 },
                { title: 'Module 2 Quiz', type: 'quiz', points: 100 }
              ]
            }
          ]),
          prerequisites: JSON.stringify(['basic-networking', 'computer-literacy']),
          learning_objectives: JSON.stringify([
            'Understand fundamental cybersecurity concepts',
            'Identify common security threats and vulnerabilities',
            'Implement basic security controls',
            'Analyze security incidents'
          ]),
          created_by: 'system',
          is_public: true,
          created_at: new Date(),
          updated_at: new Date(),
          metadata: JSON.stringify({})
        },
        {
          id: uuidv4(),
          name: 'Digital Forensics Investigation Course',
          description: 'Advanced course in digital forensics and incident investigation',
          category: 'digital-forensics',
          skill_level: 'advanced',
          estimated_hours: 60,
          modules: JSON.stringify([
            {
              title: 'Forensics Fundamentals',
              description: 'Core principles of digital forensics',
              estimatedHours: 15,
              lessons: [
                { title: 'Legal and Ethical Considerations', type: 'lecture', duration: 60, content: {} },
                { title: 'Evidence Handling', type: 'tutorial', duration: 90, content: {} },
                { title: 'Forensics Tools Overview', type: 'demonstration', duration: 120, content: {} }
              ],
              assessments: [
                { title: 'Evidence Chain of Custody Lab', type: 'practical', points: 200 }
              ]
            },
            {
              title: 'Disk and File Analysis',
              description: 'Techniques for analyzing storage devices and file systems',
              estimatedHours: 20,
              lessons: [
                { title: 'File System Analysis', type: 'hands-on', duration: 180, content: {} },
                { title: 'Deleted File Recovery', type: 'lab', duration: 150, content: {} },
                { title: 'Timeline Analysis', type: 'case-study', duration: 120, content: {} }
              ],
              assessments: [
                { title: 'Disk Forensics Investigation', type: 'project', points: 300 }
              ]
            }
          ]),
          prerequisites: JSON.stringify(['cybersecurity-fundamentals', 'linux-administration']),
          learning_objectives: JSON.stringify([
            'Conduct forensic acquisition of digital evidence',
            'Analyze file systems and recover deleted data',
            'Perform memory and network forensics',
            'Create comprehensive forensic reports'
          ]),
          created_by: 'system',
          is_public: true,
          created_at: new Date(),
          updated_at: new Date(),
          metadata: JSON.stringify({})
        }
      ];

      await this.db('curriculum_templates').insert(defaultTemplates);
    }

    logger.info('Seeded default instructor data');
  }

  // Instructor Profile Management
  async createInstructorProfile(instructorData: Omit<Instructor, 'id' | 'createdAt' | 'updatedAt'>): Promise<Instructor> {
    const now = new Date();
    const newInstructor: Instructor = {
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
      verified: false,
      ...instructorData
    };

    const validatedInstructor = InstructorSchema.parse(newInstructor);

    await this.db('instructors').insert({
      id: validatedInstructor.id,
      user_id: validatedInstructor.userId,
      bio: validatedInstructor.bio,
      specializations: JSON.stringify(validatedInstructor.specializations),
      certifications: JSON.stringify(validatedInstructor.certifications),
      experience: JSON.stringify(validatedInstructor.experience),
      teaching: JSON.stringify(validatedInstructor.teaching),
      availability: validatedInstructor.availability ? JSON.stringify(validatedInstructor.availability) : null,
      social_media: JSON.stringify(validatedInstructor.socialMedia),
      verified: validatedInstructor.verified,
      verified_at: validatedInstructor.verifiedAt,
      created_at: validatedInstructor.createdAt,
      updated_at: validatedInstructor.updatedAt,
      metadata: JSON.stringify(validatedInstructor.metadata)
    });

    this.emit('instructor-profile-created', { instructorId: validatedInstructor.id, instructor: validatedInstructor });
    logger.info(`Created instructor profile for user ${validatedInstructor.userId}`);

    return validatedInstructor;
  }

  async getInstructorProfile(instructorId: string): Promise<Instructor | null> {
    const row = await this.db('instructors').where('id', instructorId).first();
    if (!row) return null;

    return {
      id: row.id,
      userId: row.user_id,
      bio: row.bio,
      specializations: JSON.parse(row.specializations || '[]'),
      certifications: JSON.parse(row.certifications || '[]'),
      experience: JSON.parse(row.experience),
      teaching: JSON.parse(row.teaching),
      availability: row.availability ? JSON.parse(row.availability) : undefined,
      socialMedia: JSON.parse(row.social_media || '{}'),
      verified: row.verified,
      verifiedAt: row.verified_at ? new Date(row.verified_at) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      metadata: JSON.parse(row.metadata || '{}')
    };
  }

  // Course Management
  async assignInstructorToCourse(
    instructorId: string,
    learningPathId: string,
    role: 'owner' | 'co-instructor' | 'assistant',
    permissions: any,
    assignedBy: string
  ): Promise<CourseManagement> {
    const assignment: CourseManagement = {
      id: uuidv4(),
      instructorId,
      learningPathId,
      role,
      permissions,
      assignedAt: new Date(),
      assignedBy
    };

    await this.db('course_management').insert({
      id: assignment.id,
      instructor_id: assignment.instructorId,
      learning_path_id: assignment.learningPathId,
      role: assignment.role,
      permissions: JSON.stringify(assignment.permissions),
      assigned_at: assignment.assignedAt,
      assigned_by: assignment.assignedBy
    });

    // Record analytics
    await this.recordAnalyticsEvent(instructorId, learningPathId, null, 'course_assigned', {
      role,
      assignedBy
    });

    this.emit('instructor-assigned-to-course', { instructorId, learningPathId, role });
    logger.info(`Assigned instructor ${instructorId} to course ${learningPathId} as ${role}`);

    return assignment;
  }

  async getInstructorCourses(instructorId: string): Promise<CourseManagement[]> {
    const rows = await this.db('course_management')
      .where({ instructor_id: instructorId, active: true });

    return rows.map((row: any) => ({
      id: row.id,
      instructorId: row.instructor_id,
      learningPathId: row.learning_path_id,
      role: row.role,
      permissions: JSON.parse(row.permissions),
      assignedAt: new Date(row.assigned_at),
      assignedBy: row.assigned_by
    }));
  }

  // Student Management
  async enrollStudentInCourse(
    instructorId: string,
    studentId: string,
    learningPathId: string,
    notes?: string
  ): Promise<StudentEnrollment> {
    const enrollment: StudentEnrollment = {
      id: uuidv4(),
      studentId,
      learningPathId,
      instructorId,
      enrolledAt: new Date(),
      status: 'active',
      instructorNotes: notes || '',
      metadata: {}
    };

    await this.db('instructor_student_enrollments').insert({
      id: enrollment.id,
      student_id: enrollment.studentId,
      learning_path_id: enrollment.learningPathId,
      instructor_id: enrollment.instructorId,
      enrolled_at: enrollment.enrolledAt,
      status: enrollment.status,
      instructor_notes: enrollment.instructorNotes,
      metadata: JSON.stringify(enrollment.metadata)
    });

    // Record analytics
    await this.recordAnalyticsEvent(instructorId, learningPathId, studentId, 'student_enrolled', {
      enrollmentId: enrollment.id
    });

    this.emit('student-enrolled-by-instructor', { enrollmentId: enrollment.id, instructorId, studentId, learningPathId });
    logger.info(`Instructor ${instructorId} enrolled student ${studentId} in course ${learningPathId}`);

    return enrollment;
  }

  async getInstructorStudents(instructorId: string, learningPathId?: string): Promise<StudentEnrollment[]> {
    let query = this.db('instructor_student_enrollments')
      .where('instructor_id', instructorId);

    if (learningPathId) {
      query = query.where('learning_path_id', learningPathId);
    }

    const rows = await query.orderBy('enrolled_at', 'desc');

    return rows.map((row: any) => ({
      id: row.id,
      studentId: row.student_id,
      learningPathId: row.learning_path_id,
      instructorId: row.instructor_id,
      enrolledAt: new Date(row.enrolled_at),
      status: row.status,
      grade: row.grade,
      completionDate: row.completion_date ? new Date(row.completion_date) : undefined,
      instructorNotes: row.instructor_notes,
      lastActivity: row.last_activity ? new Date(row.last_activity) : undefined,
      metadata: JSON.parse(row.metadata || '{}')
    }));
  }

  async updateStudentGrade(
    enrollmentId: string,
    grade: number,
    notes?: string
  ): Promise<void> {
    await this.db('instructor_student_enrollments')
      .where('id', enrollmentId)
      .update({
        grade,
        instructor_notes: notes,
        updated_at: new Date()
      });

    this.emit('student-grade-updated', { enrollmentId, grade });
    logger.info(`Updated grade for enrollment ${enrollmentId}: ${grade}%`);
  }

  // Grading Management
  async addToGradingQueue(
    studentId: string,
    submissionId: string,
    assessmentId: string | null,
    labId: string | null,
    instructorId: string,
    maxScore: number,
    dueDate?: Date
  ): Promise<GradingItem> {
    const gradingItem: GradingItem = {
      id: uuidv4(),
      studentId,
      assessmentId: assessmentId || undefined,
      labId: labId || undefined,
      submissionId,
      instructorId,
      status: 'pending',
      maxScore,
      feedback: '',
      dueDate,
      priority: 'normal',
      flags: []
    };

    await this.db('grading_items').insert({
      id: gradingItem.id,
      student_id: gradingItem.studentId,
      assessment_id: gradingItem.assessmentId,
      lab_id: gradingItem.labId,
      submission_id: gradingItem.submissionId,
      instructor_id: gradingItem.instructorId,
      status: gradingItem.status,
      max_score: gradingItem.maxScore,
      feedback: gradingItem.feedback,
      due_date: gradingItem.dueDate,
      priority: gradingItem.priority,
      flags: JSON.stringify(gradingItem.flags),
      created_at: new Date(),
      updated_at: new Date()
    });

    this.emit('grading-item-added', { gradingItemId: gradingItem.id, instructorId });
    return gradingItem;
  }

  async getGradingQueue(instructorId: string, status?: string): Promise<GradingItem[]> {
    let query = this.db('grading_items').where('instructor_id', instructorId);

    if (status) {
      query = query.where('status', status);
    }

    const rows = await query.orderBy([
      { column: 'priority', order: 'desc' },
      { column: 'due_date', order: 'asc' },
      { column: 'created_at', order: 'asc' }
    ]);

    return rows.map((row: any) => ({
      id: row.id,
      studentId: row.student_id,
      assessmentId: row.assessment_id,
      labId: row.lab_id,
      submissionId: row.submission_id,
      instructorId: row.instructor_id,
      status: row.status,
      score: row.score,
      maxScore: row.max_score,
      feedback: row.feedback,
      rubricScores: row.rubric_scores ? JSON.parse(row.rubric_scores) : undefined,
      gradedAt: row.graded_at ? new Date(row.graded_at) : undefined,
      dueDate: row.due_date ? new Date(row.due_date) : undefined,
      priority: row.priority,
      flags: JSON.parse(row.flags || '[]')
    }));
  }

  async submitGrade(
    gradingItemId: string,
    score: number,
    feedback: string,
    rubricScores?: any[]
  ): Promise<void> {
    const now = new Date();

    await this.db('grading_items')
      .where('id', gradingItemId)
      .update({
        status: 'completed',
        score,
        feedback,
        rubric_scores: rubricScores ? JSON.stringify(rubricScores) : null,
        graded_at: now,
        updated_at: now
      });

    // Record analytics
    const gradingItem = await this.db('grading_items').where('id', gradingItemId).first();
    if (gradingItem) {
      await this.recordAnalyticsEvent(
        gradingItem.instructor_id,
        null,
        gradingItem.student_id,
        'grading_completed',
        { gradingItemId, score, maxScore: gradingItem.max_score }
      );
    }

    this.emit('grade-submitted', { gradingItemId, score });
    logger.info(`Grade submitted for grading item ${gradingItemId}: ${score}`);
  }

  // Classroom Sessions
  async createClassroomSession(sessionData: Omit<ClassroomSession, 'id' | 'metadata'>): Promise<ClassroomSession> {
    const now = new Date();
    const newSession: ClassroomSession = {
      id: uuidv4(),
      attendees: [],
      materials: [],
      notes: '',
      metadata: {},
      ...sessionData
    };

    await this.db('classroom_sessions').insert({
      id: newSession.id,
      instructor_id: newSession.instructorId,
      learning_path_id: newSession.learningPathId,
      title: newSession.title,
      description: newSession.description,
      scheduled_at: newSession.scheduledAt,
      duration: newSession.duration,
      type: newSession.type,
      status: newSession.status,
      attendees: JSON.stringify(newSession.attendees),
      materials: JSON.stringify(newSession.materials),
      recording: newSession.recording ? JSON.stringify(newSession.recording) : null,
      notes: newSession.notes,
      created_at: now,
      updated_at: now,
      metadata: JSON.stringify(newSession.metadata)
    });

    this.emit('classroom-session-created', { sessionId: newSession.id, session: newSession });
    logger.info(`Created classroom session: ${newSession.title}`);

    return newSession;
  }

  async getInstructorSessions(instructorId: string, upcoming: boolean = false): Promise<ClassroomSession[]> {
    let query = this.db('classroom_sessions').where('instructor_id', instructorId);

    if (upcoming) {
      query = query.where('scheduled_at', '>', new Date()).where('status', 'scheduled');
    }

    const rows = await query.orderBy('scheduled_at', upcoming ? 'asc' : 'desc');

    return rows.map((row: any) => ({
      id: row.id,
      instructorId: row.instructor_id,
      learningPathId: row.learning_path_id,
      title: row.title,
      description: row.description,
      scheduledAt: new Date(row.scheduled_at),
      duration: row.duration,
      type: row.type,
      status: row.status,
      attendees: JSON.parse(row.attendees || '[]'),
      materials: JSON.parse(row.materials || '[]'),
      recording: row.recording ? JSON.parse(row.recording) : undefined,
      notes: row.notes,
      metadata: JSON.parse(row.metadata || '{}')
    }));
  }

  // Curriculum Templates
  async createCurriculumTemplate(templateData: Omit<CurriculumTemplate, 'id' | 'usageCount' | 'rating' | 'createdAt' | 'updatedAt'>): Promise<CurriculumTemplate> {
    const now = new Date();
    const newTemplate: CurriculumTemplate = {
      id: uuidv4(),
      usageCount: 0,
      rating: 0,
      createdAt: now,
      updatedAt: now,
      ...templateData
    };

    await this.db('curriculum_templates').insert({
      id: newTemplate.id,
      name: newTemplate.name,
      description: newTemplate.description,
      category: newTemplate.category,
      skill_level: newTemplate.skillLevel,
      estimated_hours: newTemplate.estimatedHours,
      modules: JSON.stringify(newTemplate.modules),
      prerequisites: JSON.stringify(newTemplate.prerequisites),
      learning_objectives: JSON.stringify(newTemplate.learningObjectives),
      created_by: newTemplate.createdBy,
      is_public: newTemplate.isPublic,
      created_at: newTemplate.createdAt,
      updated_at: newTemplate.updatedAt,
      metadata: JSON.stringify({})
    });

    this.emit('curriculum-template-created', { templateId: newTemplate.id, template: newTemplate });
    logger.info(`Created curriculum template: ${newTemplate.name}`);

    return newTemplate;
  }

  async getCurriculumTemplates(instructorId?: string, isPublic?: boolean): Promise<CurriculumTemplate[]> {
    let query = this.db('curriculum_templates').where('active', true);

    if (instructorId) {
      query = query.where('created_by', instructorId);
    }

    if (isPublic !== undefined) {
      query = query.where('is_public', isPublic);
    }

    const rows = await query.orderBy('usage_count', 'desc');

    return rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      category: row.category,
      skillLevel: row.skill_level,
      estimatedHours: row.estimated_hours,
      modules: JSON.parse(row.modules),
      prerequisites: JSON.parse(row.prerequisites || '[]'),
      learningObjectives: JSON.parse(row.learning_objectives || '[]'),
      createdBy: row.created_by,
      isPublic: row.is_public,
      usageCount: row.usage_count,
      rating: parseFloat(row.rating),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }));
  }

  // Dashboard and Analytics
  async getInstructorDashboard(instructorId: string): Promise<InstructorDashboard> {
    const [courses, students, gradingItems] = await Promise.all([
      this.getInstructorCourses(instructorId),
      this.getInstructorStudents(instructorId),
      this.getGradingQueue(instructorId, 'pending')
    ]);

    const activeStudents = students.filter(s => s.status === 'active');
    const totalProgress = students.reduce((sum, s) => sum + (s.grade || 0), 0);
    const avgStudentProgress = students.length > 0 ? totalProgress / students.length : 0;

    // Get recent activity (last 30 days)
    const recentActivity = await this.getRecentActivity(instructorId, 30);

    // Get upcoming deadlines
    const upcomingDeadlines = await this.getUpcomingDeadlines(instructorId);

    // Get performance metrics for each course
    const performanceMetrics = await this.getCoursePerformanceMetrics(instructorId);

    return {
      coursesManaged: courses.length,
      totalStudents: students.length,
      activeStudents: activeStudents.length,
      pendingGrading: gradingItems.length,
      avgStudentProgress,
      recentActivity,
      upcomingDeadlines,
      performanceMetrics
    };
  }

  private async getRecentActivity(instructorId: string, days: number): Promise<any[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const rows = await this.db('instructor_analytics')
      .where('instructor_id', instructorId)
      .where('timestamp', '>=', cutoff)
      .orderBy('timestamp', 'desc')
      .limit(20);

    return rows.map((row: any) => ({
      type: row.event_type,
      description: this.formatActivityDescription(row.event_type, JSON.parse(row.event_data || '{}')),
      timestamp: new Date(row.timestamp),
      studentId: row.student_id,
      courseId: row.learning_path_id
    }));
  }

  private async getUpcomingDeadlines(instructorId: string): Promise<any[]> {
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const rows = await this.db('grading_items')
      .where('instructor_id', instructorId)
      .where('status', 'pending')
      .whereBetween('due_date', [now, nextWeek])
      .select('due_date', 'assessment_id', 'lab_id')
      .count('* as count')
      .groupBy(['due_date', 'assessment_id', 'lab_id'])
      .orderBy('due_date', 'asc');

    return rows.map((row: any) => ({
      type: row.assessment_id ? 'assignment' : 'lab',
      title: `Grading Due`,
      dueDate: new Date(row.due_date),
      studentCount: row.count
    }));
  }

  private async getCoursePerformanceMetrics(instructorId: string): Promise<any[]> {
    const courses = await this.getInstructorCourses(instructorId);
    const metrics = [];

    for (const course of courses) {
      const students = await this.getInstructorStudents(instructorId, course.learningPathId);
      const enrollmentCount = students.length;
      const completedCount = students.filter(s => s.status === 'completed').length;
      const droppedCount = students.filter(s => s.status === 'dropped').length;
      const scores = students.filter(s => s.grade !== undefined).map(s => s.grade!);
      
      metrics.push({
        courseId: course.learningPathId,
        courseName: `Course ${course.learningPathId}`, // Would fetch actual name
        enrollmentCount,
        completionRate: enrollmentCount > 0 ? (completedCount / enrollmentCount) * 100 : 0,
        averageScore: scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0,
        dropoutRate: enrollmentCount > 0 ? (droppedCount / enrollmentCount) * 100 : 0
      });
    }

    return metrics;
  }

  private formatActivityDescription(eventType: string, eventData: any): string {
    switch (eventType) {
      case 'student_enrolled':
        return 'New student enrolled in course';
      case 'grading_completed':
        return `Graded assignment (${eventData.score}/${eventData.maxScore})`;
      case 'course_assigned':
        return `Assigned as ${eventData.role} to course`;
      case 'session_conducted':
        return 'Conducted classroom session';
      default:
        return eventType.replace(/_/g, ' ');
    }
  }

  // Helper Methods
  private async recordAnalyticsEvent(
    instructorId: string,
    learningPathId: string | null,
    studentId: string | null,
    eventType: string,
    eventData: any
  ): Promise<void> {
    await this.db('instructor_analytics').insert({
      id: uuidv4(),
      instructor_id: instructorId,
      learning_path_id: learningPathId,
      student_id: studentId,
      event_type: eventType,
      event_data: JSON.stringify(eventData),
      timestamp: new Date()
    });
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down Instructor Service');
    await this.db.destroy();
    logger.info('Instructor Service shutdown complete');
  }
}