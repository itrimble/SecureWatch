import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import knex from 'knex';
import { logger } from '../utils/logger';
import { KnowledgeBaseArticleSchema, ForumThreadSchema, ForumPostSchema } from '../types/educational.types';
export class KnowledgeBaseService extends EventEmitter {
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
        logger.info('Initializing Knowledge Base Service');
        await this.createTables();
        await this.seedDefaultContent();
        logger.info('Knowledge Base Service initialized successfully');
    }
    async createTables() {
        // Knowledge base articles table
        if (!(await this.db.schema.hasTable('kb_articles'))) {
            await this.db.schema.createTable('kb_articles', (table) => {
                table.string('id').primary();
                table.string('title').notNullable();
                table.text('summary');
                table.text('content');
                table.string('category').notNullable();
                table.string('subcategory');
                table.string('type').notNullable(); // 'guide', 'tutorial', 'reference', 'faq', 'best-practice'
                table.string('difficulty').notNullable();
                table.json('tags');
                table.json('attachments');
                table.json('related_articles');
                table.json('prerequisites');
                table.integer('estimated_read_time').notNullable(); // minutes
                table.dateTime('last_reviewed');
                table.string('reviewed_by');
                table.string('version').defaultTo('1.0');
                table.string('status').defaultTo('draft'); // 'draft', 'published', 'archived'
                table.integer('helpful_votes').defaultTo(0);
                table.integer('not_helpful_votes').defaultTo(0);
                table.integer('views').defaultTo(0);
                table.string('author').notNullable();
                table.json('contributors');
                table.dateTime('created_at').notNullable();
                table.dateTime('updated_at').notNullable();
                table.dateTime('published_at');
                table.json('metadata');
                table.index(['category', 'status']);
                table.index(['type', 'difficulty']);
                table.index(['status', 'published_at']);
                table.index(['views']);
                table.index(['helpful_votes']);
                table.fulltext(['title', 'summary', 'content'], 'kb_articles_fulltext');
            });
        }
        // Knowledge base categories table
        if (!(await this.db.schema.hasTable('kb_categories'))) {
            await this.db.schema.createTable('kb_categories', (table) => {
                table.string('id').primary();
                table.string('name').notNullable();
                table.string('slug').notNullable().unique();
                table.text('description');
                table.string('parent_id');
                table.string('icon').defaultTo('📚');
                table.integer('order').defaultTo(0);
                table.boolean('active').defaultTo(true);
                table.integer('article_count').defaultTo(0);
                table.dateTime('created_at').notNullable();
                table.dateTime('updated_at').notNullable();
                table.foreign('parent_id').references('kb_categories.id').onDelete('SET NULL');
                table.index(['parent_id', 'order']);
                table.index(['active']);
            });
        }
        // Article votes table
        if (!(await this.db.schema.hasTable('kb_article_votes'))) {
            await this.db.schema.createTable('kb_article_votes', (table) => {
                table.string('id').primary();
                table.string('article_id').notNullable();
                table.string('user_id').notNullable();
                table.string('vote_type').notNullable(); // 'helpful', 'not-helpful'
                table.dateTime('voted_at').notNullable();
                table.foreign('article_id').references('kb_articles.id').onDelete('CASCADE');
                table.unique(['article_id', 'user_id']);
                table.index(['article_id', 'vote_type']);
            });
        }
        // Article comments table
        if (!(await this.db.schema.hasTable('kb_article_comments'))) {
            await this.db.schema.createTable('kb_article_comments', (table) => {
                table.string('id').primary();
                table.string('article_id').notNullable();
                table.string('user_id').notNullable();
                table.text('content');
                table.string('parent_comment_id');
                table.integer('level').defaultTo(0);
                table.boolean('edited').defaultTo(false);
                table.dateTime('edited_at');
                table.dateTime('created_at').notNullable();
                table.dateTime('updated_at').notNullable();
                table.foreign('article_id').references('kb_articles.id').onDelete('CASCADE');
                table.foreign('parent_comment_id').references('kb_article_comments.id').onDelete('CASCADE');
                table.index(['article_id', 'created_at']);
                table.index(['parent_comment_id']);
            });
        }
        // Forum threads table
        if (!(await this.db.schema.hasTable('forum_threads'))) {
            await this.db.schema.createTable('forum_threads', (table) => {
                table.string('id').primary();
                table.string('title').notNullable();
                table.string('category').notNullable();
                table.json('tags');
                table.string('author_id').notNullable();
                table.string('status').defaultTo('open'); // 'open', 'closed', 'pinned', 'locked'
                table.string('priority').defaultTo('normal'); // 'low', 'normal', 'high'
                table.integer('views').defaultTo(0);
                table.integer('replies').defaultTo(0);
                table.dateTime('last_reply_at');
                table.string('last_reply_by');
                table.boolean('solved').defaultTo(false);
                table.string('solution_post_id');
                table.dateTime('created_at').notNullable();
                table.dateTime('updated_at').notNullable();
                table.json('metadata');
                table.index(['category', 'status']);
                table.index(['author_id']);
                table.index(['status', 'priority']);
                table.index(['solved']);
                table.index(['last_reply_at']);
                table.fulltext(['title'], 'forum_threads_fulltext');
            });
        }
        // Forum posts table
        if (!(await this.db.schema.hasTable('forum_posts'))) {
            await this.db.schema.createTable('forum_posts', (table) => {
                table.string('id').primary();
                table.string('thread_id').notNullable();
                table.string('author_id').notNullable();
                table.text('content');
                table.string('parent_post_id');
                table.integer('level').defaultTo(0);
                table.integer('upvotes').defaultTo(0);
                table.integer('downvotes').defaultTo(0);
                table.boolean('is_solution').defaultTo(false);
                table.boolean('is_moderated').defaultTo(false);
                table.string('moderated_by');
                table.text('moderation_reason');
                table.json('attachments');
                table.json('mentions');
                table.boolean('edited').defaultTo(false);
                table.dateTime('edited_at');
                table.string('edited_by');
                table.dateTime('created_at').notNullable();
                table.dateTime('updated_at').notNullable();
                table.json('metadata');
                table.foreign('thread_id').references('forum_threads.id').onDelete('CASCADE');
                table.foreign('parent_post_id').references('forum_posts.id').onDelete('CASCADE');
                table.index(['thread_id', 'created_at']);
                table.index(['author_id']);
                table.index(['is_solution']);
                table.index(['parent_post_id']);
            });
        }
        // Post votes table
        if (!(await this.db.schema.hasTable('forum_post_votes'))) {
            await this.db.schema.createTable('forum_post_votes', (table) => {
                table.string('id').primary();
                table.string('post_id').notNullable();
                table.string('user_id').notNullable();
                table.string('vote_type').notNullable(); // 'upvote', 'downvote'
                table.dateTime('voted_at').notNullable();
                table.foreign('post_id').references('forum_posts.id').onDelete('CASCADE');
                table.unique(['post_id', 'user_id']);
                table.index(['post_id', 'vote_type']);
            });
        }
        // Document templates table
        if (!(await this.db.schema.hasTable('document_templates'))) {
            await this.db.schema.createTable('document_templates', (table) => {
                table.string('id').primary();
                table.string('name').notNullable();
                table.text('description');
                table.string('category').notNullable();
                table.text('template'); // Markdown template
                table.json('variables'); // Template variables
                table.boolean('active').defaultTo(true);
                table.integer('usage_count').defaultTo(0);
                table.string('created_by').notNullable();
                table.dateTime('created_at').notNullable();
                table.dateTime('updated_at').notNullable();
                table.json('metadata');
                table.index(['category']);
                table.index(['active']);
                table.index(['usage_count']);
            });
        }
        // Knowledge base analytics table
        if (!(await this.db.schema.hasTable('kb_analytics'))) {
            await this.db.schema.createTable('kb_analytics', (table) => {
                table.string('id').primary();
                table.string('article_id');
                table.string('user_id');
                table.string('event_type').notNullable(); // 'view', 'vote', 'comment', 'search'
                table.json('event_data');
                table.string('ip_address');
                table.string('user_agent');
                table.dateTime('timestamp').notNullable();
                table.foreign('article_id').references('kb_articles.id').onDelete('CASCADE');
                table.index(['article_id', 'event_type']);
                table.index(['user_id', 'timestamp']);
                table.index(['event_type', 'timestamp']);
            });
        }
    }
    async seedDefaultContent() {
        // Seed categories
        const categoriesCount = await this.db('kb_categories').count('* as count').first();
        if (categoriesCount?.count === 0) {
            const defaultCategories = [
                {
                    id: uuidv4(),
                    name: 'Getting Started',
                    slug: 'getting-started',
                    description: 'Essential guides for new users',
                    icon: '🚀',
                    order: 1,
                    created_at: new Date(),
                    updated_at: new Date()
                },
                {
                    id: uuidv4(),
                    name: 'Incident Response',
                    slug: 'incident-response',
                    description: 'Incident response procedures and playbooks',
                    icon: '🚨',
                    order: 2,
                    created_at: new Date(),
                    updated_at: new Date()
                },
                {
                    id: uuidv4(),
                    name: 'Digital Forensics',
                    slug: 'digital-forensics',
                    description: 'Digital forensics tools and techniques',
                    icon: '🔍',
                    order: 3,
                    created_at: new Date(),
                    updated_at: new Date()
                },
                {
                    id: uuidv4(),
                    name: 'Threat Intelligence',
                    slug: 'threat-intelligence',
                    description: 'Threat intelligence analysis and tools',
                    icon: '🎯',
                    order: 4,
                    created_at: new Date(),
                    updated_at: new Date()
                },
                {
                    id: uuidv4(),
                    name: 'Best Practices',
                    slug: 'best-practices',
                    description: 'Security best practices and guidelines',
                    icon: '✅',
                    order: 5,
                    created_at: new Date(),
                    updated_at: new Date()
                },
                {
                    id: uuidv4(),
                    name: 'Tools & Resources',
                    slug: 'tools-resources',
                    description: 'Security tools and resource documentation',
                    icon: '🛠️',
                    order: 6,
                    created_at: new Date(),
                    updated_at: new Date()
                }
            ];
            await this.db('kb_categories').insert(defaultCategories);
        }
        // Seed sample articles
        const articlesCount = await this.db('kb_articles').count('* as count').first();
        if (articlesCount?.count === 0) {
            const defaultArticles = [
                {
                    id: uuidv4(),
                    title: 'Introduction to Incident Response',
                    summary: 'A comprehensive guide to incident response fundamentals and best practices',
                    content: `# Introduction to Incident Response

## Overview
Incident response is a structured approach to handling and managing security breaches or cyberattacks. This guide covers the essential phases and best practices for effective incident response.

## The Incident Response Process

### 1. Preparation
- Develop incident response policies and procedures
- Establish an incident response team
- Implement monitoring and detection systems
- Create communication plans

### 2. Identification
- Detect and analyze potential security incidents
- Determine the scope and impact
- Classify the incident severity

### 3. Containment
- Implement short-term containment measures
- Preserve evidence for analysis
- Develop system recovery strategies

### 4. Eradication
- Remove malware and vulnerabilities
- Patch systems and close attack vectors
- Strengthen security controls

### 5. Recovery
- Restore systems to normal operations
- Monitor for signs of weakness
- Implement additional monitoring

### 6. Lessons Learned
- Document the incident and response
- Identify areas for improvement
- Update procedures and training

## Key Takeaways
- Preparation is crucial for effective incident response
- Quick identification and containment minimize damage
- Documentation helps improve future responses`,
                    category: 'incident-response',
                    type: 'guide',
                    difficulty: 'easy',
                    tags: JSON.stringify(['incident-response', 'fundamentals', 'process']),
                    attachments: JSON.stringify([]),
                    related_articles: JSON.stringify([]),
                    prerequisites: JSON.stringify([]),
                    estimated_read_time: 15,
                    version: '1.0',
                    status: 'published',
                    helpful_votes: 45,
                    not_helpful_votes: 3,
                    views: 1250,
                    author: 'system',
                    contributors: JSON.stringify(['expert1', 'expert2']),
                    created_at: new Date(),
                    updated_at: new Date(),
                    published_at: new Date(),
                    metadata: JSON.stringify({})
                },
                {
                    id: uuidv4(),
                    title: 'SIEM Log Analysis Best Practices',
                    summary: 'Essential techniques for effective SIEM log analysis and threat detection',
                    content: `# SIEM Log Analysis Best Practices

## Introduction
Security Information and Event Management (SIEM) systems are crucial for detecting and responding to security threats. This guide outlines best practices for effective log analysis.

## Key Principles

### 1. Understand Your Data Sources
- Identify all log sources feeding into your SIEM
- Understand the format and content of each log type
- Establish baseline behavior patterns

### 2. Develop Effective Search Strategies
- Use structured search queries
- Leverage field extractions and parsing
- Implement time-based analysis

### 3. Create Meaningful Alerts
- Focus on high-fidelity indicators
- Reduce false positives through tuning
- Implement alert escalation procedures

### 4. Correlation and Context
- Correlate events across multiple sources
- Add contextual information (asset criticality, user roles)
- Use threat intelligence feeds

## Common Analysis Techniques

### Authentication Analysis
- Failed login attempts
- Unusual login times or locations
- Privilege escalation events

### Network Analysis
- Unusual traffic patterns
- Command and control communications
- Data exfiltration indicators

### Host-based Analysis
- Process execution anomalies
- File system changes
- Registry modifications

## Tools and Techniques
- Use visualization tools for pattern recognition
- Implement automated analysis workflows
- Maintain investigation playbooks`,
                    category: 'tools-resources',
                    type: 'best-practice',
                    difficulty: 'medium',
                    tags: JSON.stringify(['siem', 'log-analysis', 'best-practices', 'threat-detection']),
                    attachments: JSON.stringify([]),
                    related_articles: JSON.stringify([]),
                    prerequisites: JSON.stringify(['siem-fundamentals']),
                    estimated_read_time: 20,
                    version: '1.2',
                    status: 'published',
                    helpful_votes: 78,
                    not_helpful_votes: 5,
                    views: 2100,
                    author: 'system',
                    contributors: JSON.stringify(['analyst1', 'analyst2']),
                    created_at: new Date(),
                    updated_at: new Date(),
                    published_at: new Date(),
                    metadata: JSON.stringify({})
                },
                {
                    id: uuidv4(),
                    title: 'Memory Forensics with Volatility',
                    summary: 'Step-by-step tutorial for conducting memory forensics analysis using Volatility',
                    content: `# Memory Forensics with Volatility

## Overview
Memory forensics is the analysis of volatile memory (RAM) to investigate security incidents. Volatility is a popular open-source framework for memory analysis.

## Getting Started

### Installation
\`\`\`bash
# Install Volatility 3
pip3 install volatility3

# Verify installation
vol -h
\`\`\`

### Basic Commands

#### Image Information
\`\`\`bash
vol -f memory.dmp windows.info
\`\`\`

#### Process Listing
\`\`\`bash
vol -f memory.dmp windows.pslist
vol -f memory.dmp windows.pstree
\`\`\`

#### Network Connections
\`\`\`bash
vol -f memory.dmp windows.netstat
vol -f memory.dmp windows.netscan
\`\`\`

## Advanced Analysis

### Malware Detection
\`\`\`bash
# Look for hidden processes
vol -f memory.dmp windows.psxview

# Check for injected code
vol -f memory.dmp windows.malfind

# Dump suspicious processes
vol -f memory.dmp windows.memmap --pid 1234 --dump
\`\`\`

### Registry Analysis
\`\`\`bash
# List registry hives
vol -f memory.dmp windows.registry.hivelist

# Print registry keys
vol -f memory.dmp windows.registry.printkey
\`\`\`

## Investigation Workflow
1. Acquire memory image
2. Identify operating system and profile
3. Analyze running processes
4. Examine network connections
5. Look for malware indicators
6. Extract artifacts and evidence

## Best Practices
- Always verify image integrity
- Document your analysis steps
- Use multiple analysis techniques
- Correlate findings with other evidence`,
                    category: 'digital-forensics',
                    type: 'tutorial',
                    difficulty: 'hard',
                    tags: JSON.stringify(['memory-forensics', 'volatility', 'malware-analysis', 'tutorial']),
                    attachments: JSON.stringify([
                        {
                            id: uuidv4(),
                            name: 'volatility-cheat-sheet.pdf',
                            url: '/attachments/volatility-cheat-sheet.pdf',
                            type: 'application/pdf',
                            size: 245760
                        }
                    ]),
                    related_articles: JSON.stringify([]),
                    prerequisites: JSON.stringify(['forensics-fundamentals', 'linux-basics']),
                    estimated_read_time: 25,
                    version: '1.0',
                    status: 'published',
                    helpful_votes: 92,
                    not_helpful_votes: 8,
                    views: 1850,
                    author: 'system',
                    contributors: JSON.stringify(['forensics-expert']),
                    created_at: new Date(),
                    updated_at: new Date(),
                    published_at: new Date(),
                    metadata: JSON.stringify({})
                }
            ];
            await this.db('kb_articles').insert(defaultArticles);
        }
        // Seed document templates
        const templatesCount = await this.db('document_templates').count('* as count').first();
        if (templatesCount?.count === 0) {
            const defaultTemplates = [
                {
                    id: uuidv4(),
                    name: 'Incident Report Template',
                    description: 'Standard template for documenting security incidents',
                    category: 'incident-response',
                    template: `# Incident Report

## Incident Summary
- **Incident ID:** {{incident_id}}
- **Date/Time Detected:** {{detection_time}}
- **Incident Type:** {{incident_type}}
- **Severity:** {{severity}}
- **Status:** {{status}}

## Initial Detection
{{initial_detection}}

## Investigation Summary
{{investigation_summary}}

## Impact Assessment
{{impact_assessment}}

## Containment Actions
{{containment_actions}}

## Eradication Steps
{{eradication_steps}}

## Recovery Actions
{{recovery_actions}}

## Lessons Learned
{{lessons_learned}}

## Recommendations
{{recommendations}}

---
**Report Prepared By:** {{prepared_by}}
**Date:** {{report_date}}`,
                    variables: JSON.stringify([
                        { name: 'incident_id', type: 'string', required: true },
                        { name: 'detection_time', type: 'date', required: true },
                        { name: 'incident_type', type: 'select', required: true, options: ['Malware', 'Data Breach', 'DDoS', 'Phishing', 'Other'] },
                        { name: 'severity', type: 'select', required: true, options: ['Low', 'Medium', 'High', 'Critical'] },
                        { name: 'status', type: 'select', required: true, options: ['Open', 'In Progress', 'Closed'] },
                        { name: 'initial_detection', type: 'string', required: true },
                        { name: 'investigation_summary', type: 'string', required: true },
                        { name: 'impact_assessment', type: 'string', required: true },
                        { name: 'containment_actions', type: 'string', required: false },
                        { name: 'eradication_steps', type: 'string', required: false },
                        { name: 'recovery_actions', type: 'string', required: false },
                        { name: 'lessons_learned', type: 'string', required: false },
                        { name: 'recommendations', type: 'string', required: false },
                        { name: 'prepared_by', type: 'string', required: true },
                        { name: 'report_date', type: 'date', required: true }
                    ]),
                    created_by: 'system',
                    created_at: new Date(),
                    updated_at: new Date(),
                    metadata: JSON.stringify({})
                },
                {
                    id: uuidv4(),
                    name: 'Vulnerability Assessment Report',
                    description: 'Template for documenting vulnerability assessment findings',
                    category: 'vulnerability-management',
                    template: `# Vulnerability Assessment Report

## Executive Summary
{{executive_summary}}

## Assessment Details
- **Assessment Date:** {{assessment_date}}
- **Assessment Type:** {{assessment_type}}
- **Scope:** {{scope}}
- **Methodology:** {{methodology}}

## Findings Summary
- **Critical Vulnerabilities:** {{critical_count}}
- **High Vulnerabilities:** {{high_count}}
- **Medium Vulnerabilities:** {{medium_count}}
- **Low Vulnerabilities:** {{low_count}}

## Critical Findings
{{critical_findings}}

## High Priority Findings
{{high_findings}}

## Recommendations
{{recommendations}}

## Risk Assessment
{{risk_assessment}}

## Remediation Timeline
{{remediation_timeline}}

---
**Assessed By:** {{assessed_by}}
**Report Date:** {{report_date}}`,
                    variables: JSON.stringify([
                        { name: 'executive_summary', type: 'string', required: true },
                        { name: 'assessment_date', type: 'date', required: true },
                        { name: 'assessment_type', type: 'select', required: true, options: ['Network Scan', 'Web Application', 'Internal', 'External'] },
                        { name: 'scope', type: 'string', required: true },
                        { name: 'methodology', type: 'string', required: true },
                        { name: 'critical_count', type: 'number', required: true, defaultValue: 0 },
                        { name: 'high_count', type: 'number', required: true, defaultValue: 0 },
                        { name: 'medium_count', type: 'number', required: true, defaultValue: 0 },
                        { name: 'low_count', type: 'number', required: true, defaultValue: 0 },
                        { name: 'critical_findings', type: 'string', required: false },
                        { name: 'high_findings', type: 'string', required: false },
                        { name: 'recommendations', type: 'string', required: true },
                        { name: 'risk_assessment', type: 'string', required: true },
                        { name: 'remediation_timeline', type: 'string', required: true },
                        { name: 'assessed_by', type: 'string', required: true },
                        { name: 'report_date', type: 'date', required: true }
                    ]),
                    created_by: 'system',
                    created_at: new Date(),
                    updated_at: new Date(),
                    metadata: JSON.stringify({})
                }
            ];
            await this.db('document_templates').insert(defaultTemplates);
        }
        logger.info('Seeded default knowledge base content');
    }
    // Article Management
    async createArticle(articleData) {
        const now = new Date();
        const newArticle = {
            id: uuidv4(),
            createdAt: now,
            updatedAt: now,
            votes: { helpful: 0, notHelpful: 0 },
            views: 0,
            contributors: [],
            ...articleData
        };
        const validatedArticle = KnowledgeBaseArticleSchema.parse(newArticle);
        await this.db('kb_articles').insert({
            id: validatedArticle.id,
            title: validatedArticle.title,
            summary: validatedArticle.summary,
            content: validatedArticle.content,
            category: validatedArticle.category,
            subcategory: validatedArticle.subcategory,
            type: validatedArticle.type,
            difficulty: validatedArticle.difficulty,
            tags: JSON.stringify(validatedArticle.tags),
            attachments: JSON.stringify(validatedArticle.attachments),
            related_articles: JSON.stringify(validatedArticle.relatedArticles),
            prerequisites: JSON.stringify(validatedArticle.prerequisites),
            estimated_read_time: validatedArticle.estimatedReadTime,
            last_reviewed: validatedArticle.lastReviewed,
            reviewed_by: validatedArticle.reviewedBy,
            version: validatedArticle.version,
            status: validatedArticle.status,
            helpful_votes: validatedArticle.votes.helpful,
            not_helpful_votes: validatedArticle.votes.notHelpful,
            views: validatedArticle.views,
            author: validatedArticle.author,
            contributors: JSON.stringify(validatedArticle.contributors),
            created_at: validatedArticle.createdAt,
            updated_at: validatedArticle.updatedAt,
            published_at: validatedArticle.publishedAt,
            metadata: JSON.stringify(validatedArticle.metadata)
        });
        // Update category article count
        await this.updateCategoryCount(validatedArticle.category);
        this.emit('article-created', { articleId: validatedArticle.id, article: validatedArticle });
        logger.info(`Created knowledge base article: ${validatedArticle.title}`);
        return validatedArticle;
    }
    async getArticle(articleId, incrementView = false) {
        const row = await this.db('kb_articles').where('id', articleId).first();
        if (!row)
            return null;
        const article = {
            id: row.id,
            title: row.title,
            summary: row.summary,
            content: row.content,
            category: row.category,
            subcategory: row.subcategory,
            type: row.type,
            difficulty: row.difficulty,
            tags: JSON.parse(row.tags || '[]'),
            attachments: JSON.parse(row.attachments || '[]'),
            relatedArticles: JSON.parse(row.related_articles || '[]'),
            prerequisites: JSON.parse(row.prerequisites || '[]'),
            estimatedReadTime: row.estimated_read_time,
            lastReviewed: row.last_reviewed ? new Date(row.last_reviewed) : undefined,
            reviewedBy: row.reviewed_by,
            version: row.version,
            status: row.status,
            votes: {
                helpful: row.helpful_votes,
                notHelpful: row.not_helpful_votes
            },
            views: row.views,
            author: row.author,
            contributors: JSON.parse(row.contributors || '[]'),
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
            publishedAt: row.published_at ? new Date(row.published_at) : undefined,
            metadata: JSON.parse(row.metadata || '{}')
        };
        // Increment view count if requested
        if (incrementView) {
            await this.db('kb_articles')
                .where('id', articleId)
                .increment('views', 1);
            article.views += 1;
            // Record analytics
            await this.recordAnalyticsEvent(articleId, null, 'view', {});
        }
        return article;
    }
    async updateArticle(articleId, updates) {
        const existingArticle = await this.getArticle(articleId);
        if (!existingArticle)
            return null;
        const updatedArticle = { ...existingArticle, ...updates, updatedAt: new Date() };
        const validatedArticle = KnowledgeBaseArticleSchema.parse(updatedArticle);
        await this.db('kb_articles')
            .where('id', articleId)
            .update({
            title: validatedArticle.title,
            summary: validatedArticle.summary,
            content: validatedArticle.content,
            category: validatedArticle.category,
            subcategory: validatedArticle.subcategory,
            type: validatedArticle.type,
            difficulty: validatedArticle.difficulty,
            tags: JSON.stringify(validatedArticle.tags),
            attachments: JSON.stringify(validatedArticle.attachments),
            related_articles: JSON.stringify(validatedArticle.relatedArticles),
            prerequisites: JSON.stringify(validatedArticle.prerequisites),
            estimated_read_time: validatedArticle.estimatedReadTime,
            last_reviewed: validatedArticle.lastReviewed,
            reviewed_by: validatedArticle.reviewedBy,
            version: validatedArticle.version,
            status: validatedArticle.status,
            contributors: JSON.stringify(validatedArticle.contributors),
            updated_at: validatedArticle.updatedAt,
            published_at: validatedArticle.publishedAt,
            metadata: JSON.stringify(validatedArticle.metadata)
        });
        this.emit('article-updated', { articleId, updates });
        return validatedArticle;
    }
    async searchArticles(filters, pagination) {
        let query = this.db('kb_articles').where('status', 'published');
        if (filters.query) {
            query = query.where((builder) => {
                builder
                    .where('title', 'like', `%${filters.query}%`)
                    .orWhere('summary', 'like', `%${filters.query}%`)
                    .orWhere('content', 'like', `%${filters.query}%`);
            });
        }
        if (filters.category) {
            query = query.where('category', filters.category);
        }
        if (filters.type) {
            query = query.where('type', filters.type);
        }
        if (filters.difficulty) {
            query = query.where('difficulty', filters.difficulty);
        }
        if (filters.tags && filters.tags.length > 0) {
            query = query.whereRaw('JSON_EXTRACT(tags, "$") LIKE ?', [`%${filters.tags.join('%')}%`]);
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
        const articles = rows.map((row) => ({
            id: row.id,
            title: row.title,
            summary: row.summary,
            content: row.content,
            category: row.category,
            subcategory: row.subcategory,
            type: row.type,
            difficulty: row.difficulty,
            tags: JSON.parse(row.tags || '[]'),
            attachments: JSON.parse(row.attachments || '[]'),
            relatedArticles: JSON.parse(row.related_articles || '[]'),
            prerequisites: JSON.parse(row.prerequisites || '[]'),
            estimatedReadTime: row.estimated_read_time,
            lastReviewed: row.last_reviewed ? new Date(row.last_reviewed) : undefined,
            reviewedBy: row.reviewed_by,
            version: row.version,
            status: row.status,
            votes: {
                helpful: row.helpful_votes,
                notHelpful: row.not_helpful_votes
            },
            views: row.views,
            author: row.author,
            contributors: JSON.parse(row.contributors || '[]'),
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
            publishedAt: row.published_at ? new Date(row.published_at) : undefined,
            metadata: JSON.parse(row.metadata || '{}')
        }));
        const totalPages = Math.ceil(total / pagination.limit);
        return {
            articles,
            total,
            page: pagination.page,
            totalPages
        };
    }
    // Voting System
    async voteOnArticle(articleId, userId, voteType) {
        // Check if user has already voted
        const existingVote = await this.db('kb_article_votes')
            .where({ article_id: articleId, user_id: userId })
            .first();
        if (existingVote) {
            // Update existing vote
            await this.db('kb_article_votes')
                .where('id', existingVote.id)
                .update({
                vote_type: voteType,
                voted_at: new Date()
            });
            // Update article vote counts
            await this.updateArticleVoteCounts(articleId);
            return {
                id: existingVote.id,
                articleId,
                userId,
                voteType,
                votedAt: new Date()
            };
        }
        else {
            // Create new vote
            const voteId = uuidv4();
            const vote = {
                id: voteId,
                articleId,
                userId,
                voteType,
                votedAt: new Date()
            };
            await this.db('kb_article_votes').insert({
                id: vote.id,
                article_id: vote.articleId,
                user_id: vote.userId,
                vote_type: vote.voteType,
                voted_at: vote.votedAt
            });
            // Update article vote counts
            await this.updateArticleVoteCounts(articleId);
            // Record analytics
            await this.recordAnalyticsEvent(articleId, userId, 'vote', { voteType });
            this.emit('article-voted', { articleId, userId, voteType });
            return vote;
        }
    }
    // Forum Management
    async createForumThread(threadData) {
        const now = new Date();
        const newThread = {
            id: uuidv4(),
            createdAt: now,
            updatedAt: now,
            views: 0,
            replies: 0,
            solved: false,
            ...threadData
        };
        const validatedThread = ForumThreadSchema.parse(newThread);
        await this.db('forum_threads').insert({
            id: validatedThread.id,
            title: validatedThread.title,
            category: validatedThread.category,
            tags: JSON.stringify(validatedThread.tags),
            author_id: validatedThread.authorId,
            status: validatedThread.status,
            priority: validatedThread.priority,
            views: validatedThread.views,
            replies: validatedThread.replies,
            last_reply_at: validatedThread.lastReplyAt,
            last_reply_by: validatedThread.lastReplyBy,
            solved: validatedThread.solved,
            solution_post_id: validatedThread.solutionPostId,
            created_at: validatedThread.createdAt,
            updated_at: validatedThread.updatedAt,
            metadata: JSON.stringify(validatedThread.metadata)
        });
        this.emit('forum-thread-created', { threadId: validatedThread.id, thread: validatedThread });
        logger.info(`Created forum thread: ${validatedThread.title}`);
        return validatedThread;
    }
    async createForumPost(postData) {
        const now = new Date();
        const newPost = {
            id: uuidv4(),
            createdAt: now,
            updatedAt: now,
            votes: { upvotes: 0, downvotes: 0 },
            isSolution: false,
            isModerated: false,
            attachments: [],
            mentions: [],
            edited: false,
            ...postData
        };
        const validatedPost = ForumPostSchema.parse(newPost);
        await this.db('forum_posts').insert({
            id: validatedPost.id,
            thread_id: validatedPost.threadId,
            author_id: validatedPost.authorId,
            content: validatedPost.content,
            parent_post_id: validatedPost.parentPostId,
            level: validatedPost.level,
            upvotes: validatedPost.votes.upvotes,
            downvotes: validatedPost.votes.downvotes,
            is_solution: validatedPost.isSolution,
            is_moderated: validatedPost.isModerated,
            moderated_by: validatedPost.moderatedBy,
            moderation_reason: validatedPost.moderationReason,
            attachments: JSON.stringify(validatedPost.attachments),
            mentions: JSON.stringify(validatedPost.mentions),
            edited: validatedPost.edited,
            edited_at: validatedPost.editedAt,
            edited_by: validatedPost.editedBy,
            created_at: validatedPost.createdAt,
            updated_at: validatedPost.updatedAt,
            metadata: JSON.stringify(validatedPost.metadata)
        });
        // Update thread reply count and last reply info
        await this.db('forum_threads')
            .where('id', validatedPost.threadId)
            .increment('replies', 1)
            .update({
            last_reply_at: validatedPost.createdAt,
            last_reply_by: validatedPost.authorId,
            updated_at: validatedPost.createdAt
        });
        this.emit('forum-post-created', { postId: validatedPost.id, post: validatedPost });
        logger.info(`Created forum post in thread ${validatedPost.threadId}`);
        return validatedPost;
    }
    // Document Templates
    async createDocumentTemplate(templateData) {
        const now = new Date();
        const newTemplate = {
            id: uuidv4(),
            createdAt: now,
            ...templateData
        };
        await this.db('document_templates').insert({
            id: newTemplate.id,
            name: newTemplate.name,
            description: newTemplate.description,
            category: newTemplate.category,
            template: newTemplate.template,
            variables: JSON.stringify(newTemplate.variables),
            created_by: newTemplate.createdBy,
            created_at: newTemplate.createdAt,
            updated_at: now,
            metadata: JSON.stringify(newTemplate.metadata)
        });
        this.emit('document-template-created', { templateId: newTemplate.id, template: newTemplate });
        logger.info(`Created document template: ${newTemplate.name}`);
        return newTemplate;
    }
    async getDocumentTemplates(category) {
        let query = this.db('document_templates').where('active', true);
        if (category) {
            query = query.where('category', category);
        }
        const rows = await query.orderBy('usage_count', 'desc');
        return rows.map((row) => ({
            id: row.id,
            name: row.name,
            description: row.description,
            category: row.category,
            template: row.template,
            variables: JSON.parse(row.variables || '[]'),
            createdBy: row.created_by,
            createdAt: new Date(row.created_at),
            metadata: JSON.parse(row.metadata || '{}')
        }));
    }
    async generateDocumentFromTemplate(templateId, variables) {
        const template = await this.db('document_templates').where('id', templateId).first();
        if (!template) {
            throw new Error(`Template ${templateId} not found`);
        }
        let content = template.template;
        // Replace variables in template
        const templateVariables = JSON.parse(template.variables || '[]');
        for (const variable of templateVariables) {
            const value = variables[variable.name] || variable.defaultValue || '';
            const regex = new RegExp(`{{${variable.name}}}`, 'g');
            content = content.replace(regex, value);
        }
        // Increment usage count
        await this.db('document_templates')
            .where('id', templateId)
            .increment('usage_count', 1);
        return content;
    }
    // Helper Methods
    async updateCategoryCount(category) {
        const count = await this.db('kb_articles')
            .where({ category, status: 'published' })
            .count('* as count')
            .first();
        await this.db('kb_categories')
            .where('slug', category)
            .update({ article_count: count?.count || 0 });
    }
    async updateArticleVoteCounts(articleId) {
        const [helpfulCount, notHelpfulCount] = await Promise.all([
            this.db('kb_article_votes')
                .where({ article_id: articleId, vote_type: 'helpful' })
                .count('* as count')
                .first(),
            this.db('kb_article_votes')
                .where({ article_id: articleId, vote_type: 'not-helpful' })
                .count('* as count')
                .first()
        ]);
        await this.db('kb_articles')
            .where('id', articleId)
            .update({
            helpful_votes: helpfulCount?.count || 0,
            not_helpful_votes: notHelpfulCount?.count || 0
        });
    }
    async recordAnalyticsEvent(articleId, userId, eventType, eventData) {
        await this.db('kb_analytics').insert({
            id: uuidv4(),
            article_id: articleId,
            user_id: userId,
            event_type: eventType,
            event_data: JSON.stringify(eventData),
            timestamp: new Date()
        });
    }
    // Categories
    async getCategories() {
        return await this.db('kb_categories')
            .where('active', true)
            .orderBy('order');
    }
    // Statistics
    async getKnowledgeBaseStatistics() {
        const [totalArticles, totalCategories, totalViews, totalVotes, averageRating] = await Promise.all([
            this.db('kb_articles').where('status', 'published').count('* as count').first(),
            this.db('kb_categories').where('active', true).count('* as count').first(),
            this.db('kb_articles').where('status', 'published').sum('views as total').first(),
            this.db('kb_article_votes').count('* as count').first(),
            this.db('kb_articles')
                .where('status', 'published')
                .avg('helpful_votes as avg')
                .first()
        ]);
        return {
            totalArticles: totalArticles?.count || 0,
            totalCategories: totalCategories?.count || 0,
            totalViews: totalViews?.total || 0,
            totalVotes: totalVotes?.count || 0,
            averageRating: Math.round(averageRating?.avg || 0),
            popularArticles: [], // TODO: Implement
            recentArticles: [], // TODO: Implement
            categoryDistribution: [], // TODO: Implement
            topContributors: [] // TODO: Implement
        };
    }
    async shutdown() {
        logger.info('Shutting down Knowledge Base Service');
        await this.db.destroy();
        logger.info('Knowledge Base Service shutdown complete');
    }
}
//# sourceMappingURL=knowledge-base-service.js.map