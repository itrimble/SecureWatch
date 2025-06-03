import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import knex, { Knex } from 'knex';
import { logger } from '../utils/logger';
import {
  Assessment,
  AssessmentSchema,
  AssessmentResult,
  AssessmentResultSchema,
  Quiz,
  QuizQuestion,
  QuizQuestionSchema,
  AssessmentType,
  QuestionType,
  DatabaseConfig,
  SearchFilters,
  Pagination
} from '../types/educational.types';

interface AssessmentSession {
  id: string;
  assessmentId: string;
  studentId: string;
  startedAt: Date;
  timeLimit?: number; // minutes
  timeRemaining: number; // seconds
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
  timeSpent: number; // seconds
  confidence?: number; // 1-5 scale
  flagged?: boolean;
  metadata?: Record<string, any>;
}

interface GradingResult {
  totalScore: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  questionResults: {
    questionId: string;
    correct: boolean;
    score: number;
    maxScore: number;
    feedback?: string;
  }[];
  overallFeedback: string;
  recommendations: string[];
  timeAnalysis: {
    totalTime: number;
    averageTimePerQuestion: number;
    questionsAnsweredQuickly: number;
    questionsAnsweredSlowly: number;
  };
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

export class AssessmentService extends EventEmitter {
  private db: Knex;
  private activeSessions: Map<string, AssessmentSession> = new Map();
  private questionBank: Map<string, QuizQuestion> = new Map();

  constructor(config: { database: DatabaseConfig }) {
    super();
    this.db = knex({
      client: config.database.type,
      connection: config.database.connection,
      useNullAsDefault: true
    });
  }

  async initialize(): Promise<void> {
    logger.info('Initializing Assessment Service');
    await this.createTables();
    await this.loadQuestionBank();
    await this.loadActiveSessions();
    this.startSessionWorker();
    logger.info('Assessment Service initialized successfully');
  }

  private async createTables(): Promise<void> {
    // Assessments table
    if (!(await this.db.schema.hasTable('assessments'))) {
      await this.db.schema.createTable('assessments', (table) => {
        table.string('id').primary();
        table.string('title').notNullable();
        table.text('description');
        table.string('type').notNullable();
        table.string('difficulty').notNullable();
        table.integer('time_limit'); // minutes
        table.integer('passing_score').defaultTo(70); // percentage
        table.integer('max_attempts').defaultTo(3);
        table.boolean('auto_grading').defaultTo(false);
        table.integer('order').defaultTo(0);
        table.json('prerequisites');
        table.json('tags');
        table.json('rubric');
        table.string('created_by').notNullable();
        table.dateTime('created_at').notNullable();
        table.dateTime('updated_at').notNullable();
        table.json('metadata');
        
        table.index(['type', 'difficulty']);
        table.index(['created_at']);
      });
    }

    // Assessment questions table
    if (!(await this.db.schema.hasTable('assessment_questions'))) {
      await this.db.schema.createTable('assessment_questions', (table) => {
        table.string('id').primary();
        table.string('assessment_id').notNullable();
        table.string('type').notNullable();
        table.text('question').notNullable();
        table.json('options');
        table.json('correct_answer');
        table.text('explanation');
        table.integer('points').defaultTo(1);
        table.integer('time_limit'); // seconds
        table.json('hints');
        table.integer('order').defaultTo(0);
        table.json('metadata');
        
        table.foreign('assessment_id').references('assessments.id').onDelete('CASCADE');
        table.index(['assessment_id', 'order']);
        table.index(['type']);
      });
    }

    // Assessment sessions table
    if (!(await this.db.schema.hasTable('assessment_sessions'))) {
      await this.db.schema.createTable('assessment_sessions', (table) => {
        table.string('id').primary();
        table.string('assessment_id').notNullable();
        table.string('student_id').notNullable();
        table.dateTime('started_at').notNullable();
        table.integer('time_limit'); // minutes
        table.integer('time_remaining'); // seconds
        table.integer('current_question_index').defaultTo(0);
        table.json('answers');
        table.json('flags');
        table.boolean('is_proctored').defaultTo(false);
        table.string('status').notNullable();
        table.dateTime('submitted_at');
        table.json('metadata');
        
        table.foreign('assessment_id').references('assessments.id').onDelete('CASCADE');
        table.index(['student_id', 'status']);
        table.index(['started_at']);
      });
    }

    // Assessment results table
    if (!(await this.db.schema.hasTable('assessment_results'))) {
      await this.db.schema.createTable('assessment_results', (table) => {
        table.string('id').primary();
        table.string('assessment_id').notNullable();
        table.string('student_id').notNullable();
        table.string('session_id').notNullable();
        table.string('type').notNullable();
        table.integer('score').notNullable(); // percentage
        table.integer('max_score').notNullable();
        table.boolean('passed').notNullable();
        table.dateTime('started_at').notNullable();
        table.dateTime('completed_at');
        table.integer('time_spent'); // minutes
        table.json('answers');
        table.text('feedback');
        table.text('grader_notes');
        table.integer('attempt').defaultTo(1);
        table.json('question_results');
        table.json('metadata');
        
        table.foreign('assessment_id').references('assessments.id').onDelete('CASCADE');
        table.foreign('session_id').references('assessment_sessions.id').onDelete('CASCADE');
        table.index(['student_id', 'assessment_id']);
        table.index(['completed_at']);
        table.index(['passed']);
      });
    }

    // Question bank table (reusable questions)
    if (!(await this.db.schema.hasTable('question_bank'))) {
      await this.db.schema.createTable('question_bank', (table) => {
        table.string('id').primary();
        table.string('category').notNullable();
        table.string('subcategory');
        table.string('type').notNullable();
        table.string('difficulty').notNullable();
        table.text('question').notNullable();
        table.json('options');
        table.json('correct_answer');
        table.text('explanation');
        table.integer('points').defaultTo(1);
        table.json('tags');
        table.json('hints');
        table.integer('usage_count').defaultTo(0);
        table.decimal('success_rate', 5, 2).defaultTo(0); // percentage
        table.string('created_by').notNullable();
        table.dateTime('created_at').notNullable();
        table.dateTime('updated_at').notNullable();
        table.json('metadata');
        
        table.index(['category', 'type', 'difficulty']);
        table.index(['usage_count']);
        table.index(['success_rate']);
      });
    }

    // Assessment analytics table
    if (!(await this.db.schema.hasTable('assessment_analytics'))) {
      await this.db.schema.createTable('assessment_analytics', (table) => {
        table.string('id').primary();
        table.string('assessment_id').notNullable();
        table.string('question_id');
        table.string('student_id').notNullable();
        table.string('event_type').notNullable(); // 'start', 'answer', 'flag', 'submit', 'pause'
        table.json('event_data');
        table.dateTime('timestamp').notNullable();
        
        table.foreign('assessment_id').references('assessments.id').onDelete('CASCADE');
        table.index(['assessment_id', 'timestamp']);
        table.index(['student_id', 'timestamp']);
        table.index(['event_type']);
      });
    }
  }

  private async loadQuestionBank(): Promise<void> {
    const questions = await this.db('question_bank');
    
    for (const row of questions) {
      const question: QuizQuestion = {
        id: row.id,
        type: row.type,
        question: row.question,
        options: JSON.parse(row.options || '[]'),
        correctAnswer: JSON.parse(row.correct_answer),
        explanation: row.explanation,
        points: row.points,
        timeLimit: row.time_limit,
        hints: JSON.parse(row.hints || '[]')
      };

      this.questionBank.set(question.id, question);
    }

    logger.info(`Loaded ${this.questionBank.size} questions into question bank`);
  }

  private async loadActiveSessions(): Promise<void> {
    const sessions = await this.db('assessment_sessions')
      .whereIn('status', ['active', 'paused']);

    for (const row of sessions) {
      const session: AssessmentSession = {
        id: row.id,
        assessmentId: row.assessment_id,
        studentId: row.student_id,
        startedAt: new Date(row.started_at),
        timeLimit: row.time_limit,
        timeRemaining: row.time_remaining,
        currentQuestionIndex: row.current_question_index,
        answers: JSON.parse(row.answers || '{}'),
        flags: JSON.parse(row.flags || '[]'),
        isProctored: row.is_proctored,
        status: row.status,
        metadata: JSON.parse(row.metadata || '{}')
      };

      this.activeSessions.set(session.id, session);
    }

    logger.info(`Loaded ${this.activeSessions.size} active assessment sessions`);
  }

  private startSessionWorker(): void {
    // Check for expired sessions every minute
    setInterval(async () => {
      await this.checkExpiredSessions();
    }, 60000);

    logger.info('Assessment session worker started');
  }

  // Assessment Management
  async createAssessment(assessmentData: Omit<Assessment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Assessment> {
    const now = new Date();
    const newAssessment: Assessment = {
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
      ...assessmentData
    };

    const validatedAssessment = AssessmentSchema.parse(newAssessment);

    // Insert the assessment
    await this.db('assessments').insert({
      id: validatedAssessment.id,
      title: validatedAssessment.title,
      description: validatedAssessment.description,
      type: validatedAssessment.type,
      difficulty: validatedAssessment.difficulty,
      time_limit: validatedAssessment.timeLimit,
      passing_score: validatedAssessment.passingScore,
      max_attempts: validatedAssessment.maxAttempts,
      auto_grading: validatedAssessment.autoGrading,
      order: validatedAssessment.order,
      prerequisites: JSON.stringify(validatedAssessment.prerequisites),
      tags: JSON.stringify(validatedAssessment.tags),
      rubric: validatedAssessment.rubric ? JSON.stringify(validatedAssessment.rubric) : null,
      created_by: validatedAssessment.createdBy,
      created_at: validatedAssessment.createdAt,
      updated_at: validatedAssessment.updatedAt,
      metadata: JSON.stringify(validatedAssessment.metadata)
    });

    // Insert questions if provided
    if (validatedAssessment.questions && validatedAssessment.questions.length > 0) {
      await this.addQuestionsToAssessment(validatedAssessment.id, validatedAssessment.questions);
    }

    this.emit('assessment-created', { assessmentId: validatedAssessment.id, assessment: validatedAssessment });
    logger.info(`Created assessment: ${validatedAssessment.title}`);
    
    return validatedAssessment;
  }

  async getAssessment(assessmentId: string): Promise<Assessment | null> {
    const row = await this.db('assessments').where('id', assessmentId).first();
    if (!row) return null;

    const questions = await this.getAssessmentQuestions(assessmentId);

    const assessment: Assessment = {
      id: row.id,
      title: row.title,
      description: row.description,
      type: row.type,
      difficulty: row.difficulty,
      timeLimit: row.time_limit,
      passingScore: row.passing_score,
      maxAttempts: row.max_attempts,
      autoGrading: row.auto_grading,
      order: row.order,
      prerequisites: JSON.parse(row.prerequisites || '[]'),
      tags: JSON.parse(row.tags || '[]'),
      rubric: row.rubric ? JSON.parse(row.rubric) : undefined,
      createdBy: row.created_by,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      metadata: JSON.parse(row.metadata || '{}'),
      questions
    };

    return assessment;
  }

  // Assessment Session Management
  async startAssessmentSession(
    assessmentId: string,
    studentId: string,
    options: {
      proctored?: boolean;
      shuffleQuestions?: boolean;
      timeLimit?: number;
    } = {}
  ): Promise<AssessmentSession> {
    const assessment = await this.getAssessment(assessmentId);
    if (!assessment) {
      throw new Error(`Assessment ${assessmentId} not found`);
    }

    // Check if student has an active session
    const existingSession = this.getActiveSessionForStudent(assessmentId, studentId);
    if (existingSession) {
      return existingSession;
    }

    // Check attempt limits
    const previousAttempts = await this.getStudentAttempts(assessmentId, studentId);
    if (previousAttempts.length >= assessment.maxAttempts) {
      throw new Error(`Maximum attempts (${assessment.maxAttempts}) exceeded for assessment ${assessmentId}`);
    }

    const now = new Date();
    const timeLimit = options.timeLimit || assessment.timeLimit;
    const sessionId = uuidv4();

    const session: AssessmentSession = {
      id: sessionId,
      assessmentId,
      studentId,
      startedAt: now,
      timeLimit,
      timeRemaining: timeLimit ? timeLimit * 60 : 0, // Convert to seconds
      currentQuestionIndex: 0,
      answers: {},
      flags: [],
      isProctored: options.proctored || false,
      status: 'active',
      metadata: {}
    };

    // Save session to database
    await this.db('assessment_sessions').insert({
      id: session.id,
      assessment_id: session.assessmentId,
      student_id: session.studentId,
      started_at: session.startedAt,
      time_limit: session.timeLimit,
      time_remaining: session.timeRemaining,
      current_question_index: session.currentQuestionIndex,
      answers: JSON.stringify(session.answers),
      flags: JSON.stringify(session.flags),
      is_proctored: session.isProctored,
      status: session.status,
      metadata: JSON.stringify(session.metadata)
    });

    this.activeSessions.set(sessionId, session);

    // Record analytics
    await this.recordAnalyticsEvent(assessmentId, studentId, 'start', {
      sessionId,
      timeLimit: session.timeLimit,
      proctored: session.isProctored
    });

    this.emit('assessment-session-started', { sessionId, assessmentId, studentId });
    logger.info(`Started assessment session ${sessionId} for student ${studentId}`);

    return session;
  }

  async submitQuestionResponse(
    sessionId: string,
    questionId: string,
    response: QuestionResponse
  ): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session || session.status !== 'active') {
      throw new Error(`Session ${sessionId} not found or not active`);
    }

    // Validate response
    const validatedResponse = this.validateQuestionResponse(questionId, response);

    // Store answer
    session.answers[questionId] = validatedResponse;
    session.currentQuestionIndex++;

    // Update session in database
    await this.updateSession(session);

    // Record analytics
    await this.recordAnalyticsEvent(session.assessmentId, session.studentId, 'answer', {
      sessionId,
      questionId,
      answer: validatedResponse.answer,
      timeSpent: validatedResponse.timeSpent,
      confidence: validatedResponse.confidence
    });

    this.emit('question-answered', { sessionId, questionId, response: validatedResponse });
  }

  async submitAssessment(sessionId: string): Promise<AssessmentResult> {
    const session = this.activeSessions.get(sessionId);
    if (!session || session.status !== 'active') {
      throw new Error(`Session ${sessionId} not found or not active`);
    }

    const assessment = await this.getAssessment(session.assessmentId);
    if (!assessment) {
      throw new Error(`Assessment ${session.assessmentId} not found`);
    }

    const now = new Date();
    const timeSpent = Math.floor((now.getTime() - session.startedAt.getTime()) / 1000 / 60); // minutes

    // Grade the assessment
    const gradingResult = await this.gradeAssessment(assessment, session.answers);

    // Create result record
    const result: AssessmentResult = {
      id: uuidv4(),
      assessmentId: session.assessmentId,
      studentId: session.studentId,
      type: assessment.type,
      score: gradingResult.percentage,
      maxScore: gradingResult.maxScore,
      passed: gradingResult.passed,
      startedAt: session.startedAt,
      completedAt: now,
      timeSpent,
      answers: session.answers,
      feedback: gradingResult.overallFeedback,
      attempt: await this.getNextAttemptNumber(session.assessmentId, session.studentId),
      metadata: {
        gradingResult,
        sessionId,
        timeRemaining: session.timeRemaining
      }
    };

    const validatedResult = AssessmentResultSchema.parse(result);

    // Save result to database
    await this.db('assessment_results').insert({
      id: validatedResult.id,
      assessment_id: validatedResult.assessmentId,
      student_id: validatedResult.studentId,
      session_id: sessionId,
      type: validatedResult.type,
      score: validatedResult.score,
      max_score: validatedResult.maxScore,
      passed: validatedResult.passed,
      started_at: validatedResult.startedAt,
      completed_at: validatedResult.completedAt,
      time_spent: validatedResult.timeSpent,
      answers: JSON.stringify(validatedResult.answers),
      feedback: validatedResult.feedback,
      grader_notes: validatedResult.graderNotes,
      attempt: validatedResult.attempt,
      question_results: JSON.stringify(gradingResult.questionResults),
      metadata: JSON.stringify(validatedResult.metadata)
    });

    // Update session status
    session.status = 'submitted';
    session.metadata.submittedAt = now;
    await this.updateSession(session);

    // Remove from active sessions
    this.activeSessions.delete(sessionId);

    // Record analytics
    await this.recordAnalyticsEvent(session.assessmentId, session.studentId, 'submit', {
      sessionId,
      score: result.score,
      passed: result.passed,
      timeSpent
    });

    this.emit('assessment-submitted', { sessionId, result });
    logger.info(`Assessment submitted for session ${sessionId}, score: ${result.score}%`);

    return validatedResult;
  }

  // Question Management
  async addQuestionToBank(questionData: Omit<QuizQuestion, 'id'> & {
    category: string;
    difficulty: string;
    createdBy: string;
  }): Promise<QuizQuestion> {
    const now = new Date();
    const questionId = uuidv4();
    
    const question: QuizQuestion = {
      id: questionId,
      ...questionData
    };

    const validatedQuestion = QuizQuestionSchema.parse(question);

    await this.db('question_bank').insert({
      id: validatedQuestion.id,
      category: questionData.category,
      type: validatedQuestion.type,
      difficulty: questionData.difficulty,
      question: validatedQuestion.question,
      options: JSON.stringify(validatedQuestion.options),
      correct_answer: JSON.stringify(validatedQuestion.correctAnswer),
      explanation: validatedQuestion.explanation,
      points: validatedQuestion.points,
      tags: JSON.stringify([]),
      hints: JSON.stringify(validatedQuestion.hints),
      usage_count: 0,
      success_rate: 0,
      created_by: questionData.createdBy,
      created_at: now,
      updated_at: now,
      metadata: JSON.stringify({})
    });

    this.questionBank.set(questionId, validatedQuestion);
    this.emit('question-added-to-bank', { questionId, question: validatedQuestion });

    return validatedQuestion;
  }

  async addQuestionsToAssessment(assessmentId: string, questions: QuizQuestion[]): Promise<void> {
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      const validatedQuestion = QuizQuestionSchema.parse(question);

      await this.db('assessment_questions').insert({
        id: validatedQuestion.id,
        assessment_id: assessmentId,
        type: validatedQuestion.type,
        question: validatedQuestion.question,
        options: JSON.stringify(validatedQuestion.options),
        correct_answer: JSON.stringify(validatedQuestion.correctAnswer),
        explanation: validatedQuestion.explanation,
        points: validatedQuestion.points,
        time_limit: validatedQuestion.timeLimit,
        hints: JSON.stringify(validatedQuestion.hints),
        order: i,
        metadata: JSON.stringify({})
      });
    }
  }

  async getAssessmentQuestions(assessmentId: string): Promise<QuizQuestion[]> {
    const rows = await this.db('assessment_questions')
      .where('assessment_id', assessmentId)
      .orderBy('order');

    return rows.map((row: any) => ({
      id: row.id,
      type: row.type,
      question: row.question,
      options: JSON.parse(row.options || '[]'),
      correctAnswer: JSON.parse(row.correct_answer),
      explanation: row.explanation,
      points: row.points,
      timeLimit: row.time_limit,
      hints: JSON.parse(row.hints || '[]')
    }));
  }

  // Grading and Results
  private async gradeAssessment(assessment: Assessment, answers: Record<string, any>): Promise<GradingResult> {
    const questions = assessment.questions || [];
    let totalScore = 0;
    let maxScore = 0;
    const questionResults = [];

    for (const question of questions) {
      maxScore += question.points;
      const studentAnswer = answers[question.id];
      
      if (!studentAnswer) {
        questionResults.push({
          questionId: question.id,
          correct: false,
          score: 0,
          maxScore: question.points,
          feedback: 'No answer provided'
        });
        continue;
      }

      const isCorrect = this.checkAnswer(question, studentAnswer.answer);
      const score = isCorrect ? question.points : 0;
      totalScore += score;

      questionResults.push({
        questionId: question.id,
        correct: isCorrect,
        score,
        maxScore: question.points,
        feedback: isCorrect ? 'Correct!' : question.explanation || 'Incorrect'
      });
    }

    const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    const passed = percentage >= assessment.passingScore;

    const overallFeedback = this.generateOverallFeedback(percentage, passed, assessment.passingScore);
    const recommendations = this.generateRecommendations(questionResults, assessment);

    return {
      totalScore,
      maxScore,
      percentage,
      passed,
      questionResults,
      overallFeedback,
      recommendations,
      timeAnalysis: {
        totalTime: 0, // TODO: Calculate from session data
        averageTimePerQuestion: 0,
        questionsAnsweredQuickly: 0,
        questionsAnsweredSlowly: 0
      }
    };
  }

  private checkAnswer(question: QuizQuestion, studentAnswer: any): boolean {
    switch (question.type) {
      case 'multiple-choice':
        return studentAnswer === question.correctAnswer;
      case 'true-false':
        return studentAnswer === question.correctAnswer;
      case 'fill-blank':
        if (Array.isArray(question.correctAnswer)) {
          return question.correctAnswer.some(correct => 
            studentAnswer.toLowerCase().trim() === correct.toLowerCase().trim()
          );
        }
        return studentAnswer.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim();
      case 'code':
        // In production, this would run the code and check output
        return studentAnswer.includes(question.correctAnswer);
      default:
        return false;
    }
  }

  private generateOverallFeedback(percentage: number, passed: boolean, passingScore: number): string {
    if (passed) {
      if (percentage >= 90) {
        return 'Excellent work! You demonstrated outstanding understanding of the material.';
      } else if (percentage >= 80) {
        return 'Great job! You have a solid grasp of the concepts.';
      } else {
        return `Good work! You passed with ${percentage}%. Consider reviewing areas where you lost points.`;
      }
    } else {
      return `You scored ${percentage}%, which is below the passing score of ${passingScore}%. Please review the material and try again.`;
    }
  }

  private generateRecommendations(questionResults: any[], assessment: Assessment): string[] {
    const recommendations = [];
    const incorrectQuestions = questionResults.filter(q => !q.correct);
    
    if (incorrectQuestions.length > 0) {
      recommendations.push(`Review ${incorrectQuestions.length} questions you answered incorrectly`);
    }

    if (assessment.type === 'practical') {
      recommendations.push('Practice hands-on labs to reinforce practical skills');
    }

    recommendations.push('Review course materials and attempt practice questions');
    
    return recommendations;
  }

  // Helper Methods
  private getActiveSessionForStudent(assessmentId: string, studentId: string): AssessmentSession | null {
    for (const session of this.activeSessions.values()) {
      if (session.assessmentId === assessmentId && session.studentId === studentId && session.status === 'active') {
        return session;
      }
    }
    return null;
  }

  private async getStudentAttempts(assessmentId: string, studentId: string): Promise<AssessmentResult[]> {
    const rows = await this.db('assessment_results')
      .where({ assessment_id: assessmentId, student_id: studentId })
      .orderBy('completed_at', 'desc');

    return rows.map((row: any) => ({
      id: row.id,
      assessmentId: row.assessment_id,
      studentId: row.student_id,
      type: row.type,
      score: row.score,
      maxScore: row.max_score,
      passed: row.passed,
      startedAt: new Date(row.started_at),
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      timeSpent: row.time_spent,
      answers: JSON.parse(row.answers || '{}'),
      feedback: row.feedback,
      graderNotes: row.grader_notes,
      attempt: row.attempt,
      metadata: JSON.parse(row.metadata || '{}')
    }));
  }

  private async getNextAttemptNumber(assessmentId: string, studentId: string): Promise<number> {
    const attempts = await this.getStudentAttempts(assessmentId, studentId);
    return attempts.length + 1;
  }

  private validateQuestionResponse(questionId: string, response: QuestionResponse): QuestionResponse {
    // Basic validation - in production, this would be more comprehensive
    return {
      questionId,
      answer: response.answer,
      timeSpent: response.timeSpent || 0,
      confidence: response.confidence,
      flagged: response.flagged,
      metadata: response.metadata || {}
    };
  }

  private async updateSession(session: AssessmentSession): Promise<void> {
    await this.db('assessment_sessions')
      .where('id', session.id)
      .update({
        time_remaining: session.timeRemaining,
        current_question_index: session.currentQuestionIndex,
        answers: JSON.stringify(session.answers),
        flags: JSON.stringify(session.flags),
        status: session.status,
        metadata: JSON.stringify(session.metadata)
      });
  }

  private async recordAnalyticsEvent(
    assessmentId: string,
    studentId: string,
    eventType: string,
    eventData: any
  ): Promise<void> {
    await this.db('assessment_analytics').insert({
      id: uuidv4(),
      assessment_id: assessmentId,
      student_id: studentId,
      event_type: eventType,
      event_data: JSON.stringify(eventData),
      timestamp: new Date()
    });
  }

  private async checkExpiredSessions(): Promise<void> {
    const now = new Date();
    const expiredSessions = Array.from(this.activeSessions.values())
      .filter(session => {
        if (!session.timeLimit) return false;
        const elapsed = Math.floor((now.getTime() - session.startedAt.getTime()) / 1000);
        return elapsed >= (session.timeLimit * 60);
      });

    for (const session of expiredSessions) {
      try {
        session.status = 'expired';
        await this.updateSession(session);
        this.activeSessions.delete(session.id);
        
        this.emit('assessment-session-expired', { sessionId: session.id });
        logger.info(`Assessment session ${session.id} expired`);
      } catch (error) {
        logger.error(`Failed to expire session ${session.id}:`, error);
      }
    }
  }

  // Statistics
  async getAssessmentStatistics(): Promise<AssessmentStatistics> {
    const [
      totalAssessments,
      totalAttempts,
      averageScoreResult,
      passRateResult,
      difficultyStats
    ] = await Promise.all([
      this.db('assessments').count('* as count').first(),
      this.db('assessment_results').count('* as count').first(),
      this.db('assessment_results').avg('score as avg').first(),
      this.db('assessment_results').where('passed', true).count('* as count').first(),
      this.db('assessments').select('difficulty').count('* as count').groupBy('difficulty')
    ]);

    const popularAssessments = await this.db('assessment_results as ar')
      .join('assessments as a', 'ar.assessment_id', 'a.id')
      .select('a.id', 'a.title')
      .count('ar.id as attempts')
      .avg('ar.score as averageScore')
      .groupBy('a.id', 'a.title')
      .orderBy('attempts', 'desc')
      .limit(10);

    const questionTypeStats = await this.db('assessment_questions')
      .select('type')
      .count('* as count')
      .groupBy('type');

    return {
      totalAssessments: totalAssessments?.count || 0,
      totalAttempts: totalAttempts?.count || 0,
      averageScore: Math.round(averageScoreResult?.avg || 0),
      passRate: totalAttempts?.count > 0 
        ? Math.round(((passRateResult?.count || 0) / totalAttempts.count) * 100)
        : 0,
      popularAssessments: popularAssessments.map((row: any) => ({
        id: row.id,
        title: row.title,
        attempts: row.attempts,
        averageScore: Math.round(row.averageScore || 0)
      })),
      difficultyDistribution: difficultyStats.reduce((acc: any, row: any) => {
        acc[row.difficulty] = row.count;
        return acc;
      }, {}),
      questionTypeDistribution: questionTypeStats.reduce((acc: any, row: any) => {
        acc[row.type] = row.count;
        return acc;
      }, {}),
      recentActivity: [] // TODO: Implement recent activity calculation
    };
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down Assessment Service');
    
    // Save all active sessions
    for (const session of this.activeSessions.values()) {
      await this.updateSession(session);
    }

    await this.db.destroy();
    logger.info('Assessment Service shutdown complete');
  }
}