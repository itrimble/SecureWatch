import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import knex, { Knex } from 'knex';
import { logger } from '../utils/logger';
import {
  StudentProgress,
  StudentProgressSchema,
  Enrollment,
  EnrollmentSchema,
  ProgressStatus,
  DatabaseConfig
} from '../types/educational.types';

interface LearningAnalytics {
  studentId: string;
  totalEnrollments: number;
  activeEnrollments: number;
  completedPaths: number;
  totalTimeSpent: number; // minutes
  averageScore: number; // percentage
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
  overallProgress: number; // percentage
  completionRate: number; // percentage
  averageScore: number; // percentage
  timeSpent: number; // minutes
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

export class ProgressTrackingService extends EventEmitter {
  private db: Knex;
  private achievementDefinitions: Map<string, any> = new Map();

  constructor(config: { database: DatabaseConfig }) {
    super();
    this.db = knex({
      client: config.database.type,
      connection: config.database.connection,
      useNullAsDefault: true
    });
  }

  async initialize(): Promise<void> {
    logger.info('Initializing Progress Tracking Service');
    await this.createTables();
    await this.initializeAchievements();
    this.startProgressWorker();
    logger.info('Progress Tracking Service initialized successfully');
  }

  private async createTables(): Promise<void> {
    // Enrollments table
    if (!(await this.db.schema.hasTable('enrollments'))) {
      await this.db.schema.createTable('enrollments', (table) => {
        table.string('id').primary();
        table.string('student_id').notNullable();
        table.string('learning_path_id').notNullable();
        table.dateTime('enrolled_at').notNullable();
        table.string('status').notNullable(); // 'active', 'completed', 'dropped', 'suspended'
        table.dateTime('due_date');
        table.dateTime('access_expires_at');
        table.string('payment_status').defaultTo('free');
        table.string('completion_certificate_id');
        table.text('instructor_feedback');
        table.integer('final_grade'); // percentage
        table.json('metadata');
        
        table.index(['student_id']);
        table.index(['learning_path_id']);
        table.index(['status']);
        table.index(['enrolled_at']);
        table.unique(['student_id', 'learning_path_id']);
      });
    }

    // Student progress table
    if (!(await this.db.schema.hasTable('student_progress'))) {
      await this.db.schema.createTable('student_progress', (table) => {
        table.string('id').primary();
        table.string('student_id').notNullable();
        table.string('learning_path_id').notNullable();
        table.string('module_id');
        table.string('lesson_id');
        table.string('lab_id');
        table.string('assessment_id');
        table.string('status').notNullable();
        table.integer('progress').defaultTo(0); // percentage
        table.integer('score'); // percentage
        table.integer('time_spent').defaultTo(0); // minutes
        table.integer('attempts').defaultTo(0);
        table.dateTime('last_accessed');
        table.dateTime('started_at').notNullable();
        table.dateTime('completed_at');
        table.text('notes');
        table.json('bookmarks');
        table.json('achievements');
        table.json('metadata');
        
        table.index(['student_id', 'learning_path_id']);
        table.index(['student_id', 'status']);
        table.index(['last_accessed']);
      });
    }

    // Learning sessions table
    if (!(await this.db.schema.hasTable('learning_sessions'))) {
      await this.db.schema.createTable('learning_sessions', (table) => {
        table.string('id').primary();
        table.string('student_id').notNullable();
        table.string('learning_path_id').notNullable();
        table.string('content_id'); // lesson, lab, or assessment ID
        table.string('content_type'); // 'lesson', 'lab', 'assessment'
        table.dateTime('started_at').notNullable();
        table.dateTime('ended_at');
        table.integer('duration'); // seconds
        table.json('activities'); // activities performed during session
        table.string('device_type'); // 'desktop', 'mobile', 'tablet'
        table.string('browser');
        table.string('ip_address');
        table.json('metadata');
        
        table.index(['student_id', 'started_at']);
        table.index(['learning_path_id', 'started_at']);
        table.index(['content_id', 'content_type']);
      });
    }

    // Achievements table
    if (!(await this.db.schema.hasTable('achievements'))) {
      await this.db.schema.createTable('achievements', (table) => {
        table.string('id').primary();
        table.string('name').notNullable();
        table.text('description');
        table.string('icon').defaultTo('🏆');
        table.string('type').notNullable();
        table.json('criteria');
        table.string('rarity').defaultTo('common');
        table.boolean('active').defaultTo(true);
        table.dateTime('created_at').notNullable();
      });
    }

    // Student achievements table
    if (!(await this.db.schema.hasTable('student_achievements'))) {
      await this.db.schema.createTable('student_achievements', (table) => {
        table.string('id').primary();
        table.string('student_id').notNullable();
        table.string('achievement_id').notNullable();
        table.dateTime('earned_at').notNullable();
        table.json('context'); // additional context about how it was earned
        
        table.foreign('achievement_id').references('achievements.id').onDelete('CASCADE');
        table.index(['student_id']);
        table.index(['earned_at']);
        table.unique(['student_id', 'achievement_id']);
      });
    }

    // Learning streaks table
    if (!(await this.db.schema.hasTable('learning_streaks'))) {
      await this.db.schema.createTable('learning_streaks', (table) => {
        table.string('id').primary();
        table.string('student_id').notNullable();
        table.integer('current_streak').defaultTo(0);
        table.integer('longest_streak').defaultTo(0);
        table.dateTime('last_activity_date');
        table.dateTime('streak_started_at');
        table.dateTime('longest_streak_date');
        
        table.index(['student_id']);
        table.unique(['student_id']);
      });
    }

    // Performance analytics table
    if (!(await this.db.schema.hasTable('performance_analytics'))) {
      await this.db.schema.createTable('performance_analytics', (table) => {
        table.string('id').primary();
        table.string('student_id').notNullable();
        table.string('metric_type').notNullable(); // 'daily', 'weekly', 'monthly'
        table.date('period_date').notNullable();
        table.integer('time_spent').defaultTo(0); // minutes
        table.integer('activities_completed').defaultTo(0);
        table.integer('lessons_completed').defaultTo(0);
        table.integer('labs_completed').defaultTo(0);
        table.integer('assessments_completed').defaultTo(0);
        table.decimal('average_score', 5, 2).defaultTo(0);
        table.integer('streak_days').defaultTo(0);
        table.json('metadata');
        
        table.index(['student_id', 'metric_type', 'period_date']);
        table.unique(['student_id', 'metric_type', 'period_date']);
      });
    }
  }

  private async initializeAchievements(): Promise<void> {
    const defaultAchievements = [
      {
        id: 'first-enrollment',
        name: 'Getting Started',
        description: 'Enrolled in your first learning path',
        icon: '🎯',
        type: 'completion',
        criteria: { metric: 'enrollments', threshold: 1, operator: 'gte' },
        rarity: 'common'
      },
      {
        id: 'first-completion',
        name: 'Achiever',
        description: 'Completed your first learning path',
        icon: '🏆',
        type: 'completion',
        criteria: { metric: 'completed_paths', threshold: 1, operator: 'gte' },
        rarity: 'uncommon'
      },
      {
        id: 'perfect-score',
        name: 'Perfectionist',
        description: 'Achieved a perfect score on an assessment',
        icon: '💯',
        type: 'score',
        criteria: { metric: 'assessment_score', threshold: 100, operator: 'gte' },
        rarity: 'rare'
      },
      {
        id: 'week-streak',
        name: 'Dedicated Learner',
        description: 'Maintained a 7-day learning streak',
        icon: '🔥',
        type: 'streak',
        criteria: { metric: 'streak_days', threshold: 7, operator: 'gte' },
        rarity: 'uncommon'
      },
      {
        id: 'month-streak',
        name: 'Unstoppable',
        description: 'Maintained a 30-day learning streak',
        icon: '⚡',
        type: 'streak',
        criteria: { metric: 'streak_days', threshold: 30, operator: 'gte' },
        rarity: 'epic'
      },
      {
        id: 'fast-learner',
        name: 'Speed Demon',
        description: 'Completed a lab in under 50% of estimated time',
        icon: '💨',
        type: 'time',
        criteria: { metric: 'completion_time_ratio', threshold: 0.5, operator: 'lte' },
        rarity: 'rare'
      },
      {
        id: 'security-expert',
        name: 'Security Expert',
        description: 'Completed 5 cybersecurity learning paths',
        icon: '🛡️',
        type: 'completion',
        criteria: { metric: 'security_paths_completed', threshold: 5, operator: 'gte' },
        rarity: 'epic'
      },
      {
        id: 'night-owl',
        name: 'Night Owl',
        description: 'Completed learning activities between 10 PM and 6 AM',
        icon: '🦉',
        type: 'special',
        criteria: { metric: 'night_activities', threshold: 10, operator: 'gte' },
        rarity: 'uncommon'
      }
    ];

    for (const achievement of defaultAchievements) {
      this.achievementDefinitions.set(achievement.id, achievement);
      
      // Insert if not exists
      const existing = await this.db('achievements').where('id', achievement.id).first();
      if (!existing) {
        await this.db('achievements').insert({
          ...achievement,
          criteria: JSON.stringify(achievement.criteria),
          created_at: new Date()
        });
      }
    }

    logger.info(`Initialized ${defaultAchievements.length} achievement definitions`);
  }

  private startProgressWorker(): void {
    // Process analytics and achievements every hour
    setInterval(async () => {
      await this.processPerformanceAnalytics();
      await this.checkAchievements();
    }, 60 * 60 * 1000);

    logger.info('Progress tracking worker started');
  }

  // Enrollment Management
  async enrollStudent(studentId: string, learningPathId: string, enrollmentData?: Partial<Enrollment>): Promise<Enrollment> {
    const existingEnrollment = await this.db('enrollments')
      .where({ student_id: studentId, learning_path_id: learningPathId })
      .first();

    if (existingEnrollment) {
      throw new Error(`Student ${studentId} is already enrolled in learning path ${learningPathId}`);
    }

    const now = new Date();
    const enrollment: Enrollment = {
      id: uuidv4(),
      studentId,
      learningPathId,
      enrolledAt: now,
      status: 'active',
      paymentStatus: 'free',
      metadata: {},
      ...enrollmentData
    };

    const validatedEnrollment = EnrollmentSchema.parse(enrollment);

    await this.db('enrollments').insert({
      id: validatedEnrollment.id,
      student_id: validatedEnrollment.studentId,
      learning_path_id: validatedEnrollment.learningPathId,
      enrolled_at: validatedEnrollment.enrolledAt,
      status: validatedEnrollment.status,
      due_date: validatedEnrollment.dueDate,
      access_expires_at: validatedEnrollment.accessExpiresAt,
      payment_status: validatedEnrollment.paymentStatus,
      completion_certificate_id: validatedEnrollment.completionCertificateId,
      instructor_feedback: validatedEnrollment.instructorFeedback,
      final_grade: validatedEnrollment.finalGrade,
      metadata: JSON.stringify(validatedEnrollment.metadata)
    });

    // Initialize progress tracking
    await this.initializeProgressTracking(studentId, learningPathId);

    // Check for achievements
    await this.checkStudentAchievements(studentId);

    this.emit('student-enrolled', { studentId, learningPathId, enrollmentId: validatedEnrollment.id });
    logger.info(`Student ${studentId} enrolled in learning path ${learningPathId}`);

    return validatedEnrollment;
  }

  async getStudentEnrollments(studentId: string): Promise<Enrollment[]> {
    const rows = await this.db('enrollments').where('student_id', studentId);
    
    return rows.map((row: any) => ({
      id: row.id,
      studentId: row.student_id,
      learningPathId: row.learning_path_id,
      enrolledAt: new Date(row.enrolled_at),
      status: row.status,
      dueDate: row.due_date ? new Date(row.due_date) : undefined,
      accessExpiresAt: row.access_expires_at ? new Date(row.access_expires_at) : undefined,
      paymentStatus: row.payment_status,
      completionCertificateId: row.completion_certificate_id,
      instructorFeedback: row.instructor_feedback,
      finalGrade: row.final_grade,
      metadata: JSON.parse(row.metadata || '{}')
    }));
  }

  // Progress Tracking
  async updateProgress(progressData: Partial<StudentProgress>): Promise<StudentProgress> {
    const existingProgress = await this.db('student_progress')
      .where({
        student_id: progressData.studentId,
        learning_path_id: progressData.learningPathId,
        module_id: progressData.moduleId,
        lesson_id: progressData.lessonId,
        lab_id: progressData.labId,
        assessment_id: progressData.assessmentId
      })
      .first();

    const now = new Date();
    let progress: StudentProgress;

    if (existingProgress) {
      // Update existing progress
      progress = {
        id: existingProgress.id,
        studentId: existingProgress.student_id,
        learningPathId: existingProgress.learning_path_id,
        moduleId: existingProgress.module_id,
        lessonId: existingProgress.lesson_id,
        labId: existingProgress.lab_id,
        assessmentId: existingProgress.assessment_id,
        status: existingProgress.status,
        progress: existingProgress.progress,
        score: existingProgress.score,
        timeSpent: existingProgress.time_spent,
        attempts: existingProgress.attempts,
        lastAccessed: existingProgress.last_accessed ? new Date(existingProgress.last_accessed) : undefined,
        startedAt: new Date(existingProgress.started_at),
        completedAt: existingProgress.completed_at ? new Date(existingProgress.completed_at) : undefined,
        notes: existingProgress.notes,
        bookmarks: JSON.parse(existingProgress.bookmarks || '[]'),
        achievements: JSON.parse(existingProgress.achievements || '[]'),
        metadata: JSON.parse(existingProgress.metadata || '{}'),
        ...progressData,
        lastAccessed: now
      };

      const validatedProgress = StudentProgressSchema.parse(progress);

      await this.db('student_progress')
        .where('id', progress.id)
        .update({
          status: validatedProgress.status,
          progress: validatedProgress.progress,
          score: validatedProgress.score,
          time_spent: validatedProgress.timeSpent,
          attempts: validatedProgress.attempts,
          last_accessed: validatedProgress.lastAccessed,
          completed_at: validatedProgress.completedAt,
          notes: validatedProgress.notes,
          bookmarks: JSON.stringify(validatedProgress.bookmarks),
          achievements: JSON.stringify(validatedProgress.achievements),
          metadata: JSON.stringify(validatedProgress.metadata)
        });
    } else {
      // Create new progress record
      progress = {
        id: uuidv4(),
        startedAt: now,
        lastAccessed: now,
        status: 'in-progress',
        progress: 0,
        timeSpent: 0,
        attempts: 0,
        bookmarks: [],
        achievements: [],
        metadata: {},
        ...progressData
      };

      const validatedProgress = StudentProgressSchema.parse(progress);

      await this.db('student_progress').insert({
        id: validatedProgress.id,
        student_id: validatedProgress.studentId,
        learning_path_id: validatedProgress.learningPathId,
        module_id: validatedProgress.moduleId,
        lesson_id: validatedProgress.lessonId,
        lab_id: validatedProgress.labId,
        assessment_id: validatedProgress.assessmentId,
        status: validatedProgress.status,
        progress: validatedProgress.progress,
        score: validatedProgress.score,
        time_spent: validatedProgress.timeSpent,
        attempts: validatedProgress.attempts,
        last_accessed: validatedProgress.lastAccessed,
        started_at: validatedProgress.startedAt,
        completed_at: validatedProgress.completedAt,
        notes: validatedProgress.notes,
        bookmarks: JSON.stringify(validatedProgress.bookmarks),
        achievements: JSON.stringify(validatedProgress.achievements),
        metadata: JSON.stringify(validatedProgress.metadata)
      });
    }

    // Update learning streak
    await this.updateLearningStreak(progressData.studentId!);

    // Record learning session
    if (progressData.lessonId || progressData.labId || progressData.assessmentId) {
      await this.recordLearningSession(progressData.studentId!, {
        learningPathId: progressData.learningPathId!,
        contentId: progressData.lessonId || progressData.labId || progressData.assessmentId!,
        contentType: progressData.lessonId ? 'lesson' : progressData.labId ? 'lab' : 'assessment',
        duration: 0 // Will be calculated based on session tracking
      });
    }

    // Check for achievements
    await this.checkStudentAchievements(progressData.studentId!);

    this.emit('progress-updated', { progress });
    return progress;
  }

  async getStudentProgress(
    studentId: string,
    learningPathId?: string,
    contentType?: string
  ): Promise<StudentProgress[]> {
    let query = this.db('student_progress').where('student_id', studentId);

    if (learningPathId) {
      query = query.where('learning_path_id', learningPathId);
    }

    if (contentType) {
      switch (contentType) {
        case 'lesson':
          query = query.whereNotNull('lesson_id');
          break;
        case 'lab':
          query = query.whereNotNull('lab_id');
          break;
        case 'assessment':
          query = query.whereNotNull('assessment_id');
          break;
      }
    }

    const rows = await query.orderBy('last_accessed', 'desc');

    return rows.map((row: any) => ({
      id: row.id,
      studentId: row.student_id,
      learningPathId: row.learning_path_id,
      moduleId: row.module_id,
      lessonId: row.lesson_id,
      labId: row.lab_id,
      assessmentId: row.assessment_id,
      status: row.status,
      progress: row.progress,
      score: row.score,
      timeSpent: row.time_spent,
      attempts: row.attempts,
      lastAccessed: row.last_accessed ? new Date(row.last_accessed) : undefined,
      startedAt: new Date(row.started_at),
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      notes: row.notes,
      bookmarks: JSON.parse(row.bookmarks || '[]'),
      achievements: JSON.parse(row.achievements || '[]'),
      metadata: JSON.parse(row.metadata || '{}')
    }));
  }

  // Analytics and Performance Metrics
  async getLearningAnalytics(studentId: string): Promise<LearningAnalytics> {
    const [enrollments, progressData, streakData, achievements, sessions] = await Promise.all([
      this.getStudentEnrollments(studentId),
      this.getStudentProgress(studentId),
      this.getLearningStreak(studentId),
      this.getStudentAchievements(studentId),
      this.getRecentSessions(studentId, 30) // Last 30 days
    ]);

    const totalTimeSpent = progressData.reduce((sum, p) => sum + p.timeSpent, 0);
    const completedPaths = enrollments.filter(e => e.status === 'completed').length;
    const averageScore = progressData.length > 0 
      ? progressData.filter(p => p.score !== undefined).reduce((sum, p) => sum + (p.score || 0), 0) / progressData.filter(p => p.score !== undefined).length
      : 0;

    // Calculate weekly activity
    const weeklyActivity = await this.getWeeklyActivity(studentId);

    // Calculate performance trends
    const performanceTrends = await this.getPerformanceTrends(studentId);

    // Calculate skill and category progress
    const skillProgress = await this.getSkillProgress(studentId);
    const categoryProgress = await this.getCategoryProgress(studentId);

    return {
      studentId,
      totalEnrollments: enrollments.length,
      activeEnrollments: enrollments.filter(e => e.status === 'active').length,
      completedPaths,
      totalTimeSpent,
      averageScore,
      streakDays: streakData?.current_streak || 0,
      lastActivity: sessions.length > 0 ? sessions[0].started_at : new Date(),
      skillProgress,
      categoryProgress,
      achievements,
      weeklyActivity,
      performanceTrends
    };
  }

  async getPerformanceMetrics(studentId: string): Promise<PerformanceMetrics> {
    const analytics = await this.getLearningAnalytics(studentId);
    
    // Calculate overall progress (average across all enrolled paths)
    const progressData = await this.getStudentProgress(studentId);
    const overallProgress = progressData.length > 0
      ? progressData.reduce((sum, p) => sum + p.progress, 0) / progressData.length
      : 0;

    // Calculate completion rate
    const completionRate = analytics.totalEnrollments > 0
      ? (analytics.completedPaths / analytics.totalEnrollments) * 100
      : 0;

    // Get rank and percentile (simplified - in production would compare against all students)
    const rank = Math.floor(Math.random() * 1000) + 1; // Mock ranking
    const percentile = Math.floor(Math.random() * 100) + 1;

    // Identify strength and improvement areas
    const strengthAreas = await this.identifyStrengthAreas(studentId);
    const improvementAreas = await this.identifyImprovementAreas(studentId);

    // Calculate next milestones
    const nextMilestones = await this.getNextMilestones(studentId);

    return {
      overallProgress,
      completionRate,
      averageScore: analytics.averageScore,
      timeSpent: analytics.totalTimeSpent,
      streakDays: analytics.streakDays,
      rank,
      percentile,
      strengthAreas,
      improvementAreas,
      nextMilestones
    };
  }

  // Achievement System
  async checkStudentAchievements(studentId: string): Promise<Achievement[]> {
    const newAchievements: Achievement[] = [];
    const analytics = await this.getLearningAnalytics(studentId);

    for (const [achievementId, definition] of this.achievementDefinitions) {
      // Check if already earned
      const existing = await this.db('student_achievements')
        .where({ student_id: studentId, achievement_id: achievementId })
        .first();

      if (existing) continue;

      // Check criteria
      const earned = this.evaluateAchievementCriteria(definition.criteria, analytics);
      
      if (earned) {
        const achievement: Achievement = {
          id: achievementId,
          name: definition.name,
          description: definition.description,
          icon: definition.icon,
          type: definition.type,
          criteria: definition.criteria,
          earnedAt: new Date(),
          rarity: definition.rarity
        };

        // Award achievement
        await this.db('student_achievements').insert({
          id: uuidv4(),
          student_id: studentId,
          achievement_id: achievementId,
          earned_at: achievement.earnedAt,
          context: JSON.stringify({})
        });

        newAchievements.push(achievement);
        this.emit('achievement-earned', { studentId, achievement });
      }
    }

    return newAchievements;
  }

  async getStudentAchievements(studentId: string): Promise<Achievement[]> {
    const rows = await this.db('student_achievements as sa')
      .join('achievements as a', 'sa.achievement_id', 'a.id')
      .where('sa.student_id', studentId)
      .select('a.*', 'sa.earned_at', 'sa.context')
      .orderBy('sa.earned_at', 'desc');

    return rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      icon: row.icon,
      type: row.type,
      criteria: JSON.parse(row.criteria),
      earnedAt: new Date(row.earned_at),
      rarity: row.rarity
    }));
  }

  // Helper Methods
  private async initializeProgressTracking(studentId: string, learningPathId: string): Promise<void> {
    // Create initial progress record for the learning path
    await this.updateProgress({
      studentId,
      learningPathId,
      status: 'not-started',
      progress: 0,
      timeSpent: 0,
      attempts: 0
    });
  }

  private async updateLearningStreak(studentId: string): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    
    let streakData = await this.db('learning_streaks').where('student_id', studentId).first();
    
    if (!streakData) {
      // Create new streak record
      streakData = {
        id: uuidv4(),
        student_id: studentId,
        current_streak: 1,
        longest_streak: 1,
        last_activity_date: today,
        streak_started_at: new Date(),
        longest_streak_date: new Date()
      };

      await this.db('learning_streaks').insert(streakData);
    } else {
      const lastActivityDate = new Date(streakData.last_activity_date);
      const todayDate = new Date(today);
      const diffDays = Math.floor((todayDate.getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        // Continue streak
        streakData.current_streak++;
        
        if (streakData.current_streak > streakData.longest_streak) {
          streakData.longest_streak = streakData.current_streak;
          streakData.longest_streak_date = new Date();
        }
      } else if (diffDays > 1) {
        // Reset streak
        streakData.current_streak = 1;
        streakData.streak_started_at = new Date();
      }
      // If diffDays === 0, activity already recorded today

      streakData.last_activity_date = today;

      await this.db('learning_streaks')
        .where('student_id', studentId)
        .update({
          current_streak: streakData.current_streak,
          longest_streak: streakData.longest_streak,
          last_activity_date: streakData.last_activity_date,
          streak_started_at: streakData.streak_started_at,
          longest_streak_date: streakData.longest_streak_date
        });
    }
  }

  private async getLearningStreak(studentId: string): Promise<any> {
    return await this.db('learning_streaks').where('student_id', studentId).first();
  }

  private async recordLearningSession(studentId: string, sessionData: any): Promise<void> {
    await this.db('learning_sessions').insert({
      id: uuidv4(),
      student_id: studentId,
      learning_path_id: sessionData.learningPathId,
      content_id: sessionData.contentId,
      content_type: sessionData.contentType,
      started_at: new Date(),
      duration: sessionData.duration,
      activities: JSON.stringify(sessionData.activities || []),
      device_type: sessionData.deviceType || 'desktop',
      browser: sessionData.browser,
      ip_address: sessionData.ipAddress,
      metadata: JSON.stringify(sessionData.metadata || {})
    });
  }

  private async getRecentSessions(studentId: string, days: number): Promise<any[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    return await this.db('learning_sessions')
      .where('student_id', studentId)
      .where('started_at', '>=', cutoff)
      .orderBy('started_at', 'desc');
  }

  private evaluateAchievementCriteria(criteria: any, analytics: LearningAnalytics): boolean {
    const value = this.getMetricValue(criteria.metric, analytics);
    
    switch (criteria.operator) {
      case 'gte':
        return value >= criteria.threshold;
      case 'lte':
        return value <= criteria.threshold;
      case 'eq':
        return value === criteria.threshold;
      default:
        return false;
    }
  }

  private getMetricValue(metric: string, analytics: LearningAnalytics): number {
    switch (metric) {
      case 'enrollments':
        return analytics.totalEnrollments;
      case 'completed_paths':
        return analytics.completedPaths;
      case 'streak_days':
        return analytics.streakDays;
      case 'time_spent':
        return analytics.totalTimeSpent;
      case 'average_score':
        return analytics.averageScore;
      default:
        return 0;
    }
  }

  private async processPerformanceAnalytics(): Promise<void> {
    // Process daily, weekly, and monthly analytics for all active students
    logger.info('Processing performance analytics...');
    // Implementation would aggregate data and update performance_analytics table
  }

  private async checkAchievements(): Promise<void> {
    // Check achievements for all active students
    logger.info('Checking achievements for all students...');
    // Implementation would check achievements for all students
  }

  // Placeholder methods for detailed analytics
  private async getWeeklyActivity(studentId: string): Promise<any[]> {
    // Return mock weekly activity data
    return [];
  }

  private async getPerformanceTrends(studentId: string): Promise<any[]> {
    // Return mock performance trends
    return [];
  }

  private async getSkillProgress(studentId: string): Promise<any[]> {
    // Return mock skill progress
    return [];
  }

  private async getCategoryProgress(studentId: string): Promise<any[]> {
    // Return mock category progress
    return [];
  }

  private async identifyStrengthAreas(studentId: string): Promise<string[]> {
    // Analyze performance to identify strength areas
    return ['Incident Response', 'Network Security'];
  }

  private async identifyImprovementAreas(studentId: string): Promise<string[]> {
    // Analyze performance to identify improvement areas
    return ['Digital Forensics', 'Malware Analysis'];
  }

  private async getNextMilestones(studentId: string): Promise<any[]> {
    // Calculate next milestones for the student
    return [
      {
        type: 'completion',
        description: 'Complete Security Operations path',
        progress: 65,
        target: 100
      },
      {
        type: 'streak',
        description: 'Reach 14-day learning streak',
        progress: 7,
        target: 14
      }
    ];
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down Progress Tracking Service');
    await this.db.destroy();
    logger.info('Progress Tracking Service shutdown complete');
  }
}