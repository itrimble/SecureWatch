"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryGenerationService = void 0;
const events_1 = require("events");
const ai_types_1 = require("../types/ai.types");
const logger_1 = require("../utils/logger");
/**
 * AI-Assisted KQL Generation Service
 * Converts natural language questions into KQL queries using AI models
 */
class QueryGenerationService extends events_1.EventEmitter {
    constructor(localProvider, cloudProvider) {
        super();
        this.queryExamples = new Map();
        this.queryCache = new Map();
        this.localProvider = localProvider;
        this.cloudProvider = cloudProvider;
        this.initializeQueryExamples();
    }
    /**
     * Generate KQL query from natural language
     */
    async generateKQLFromNaturalLanguage(request) {
        try {
            const cacheKey = this.createCacheKey(request);
            // Check cache first
            const cached = this.queryCache.get(cacheKey);
            if (cached) {
                logger_1.logger.debug('Returning cached query for:', request.question);
                return cached;
            }
            // Select appropriate model based on privacy level and complexity
            const model = this.selectAppropriateModel(request);
            // Build prompt with context and examples
            const prompt = this.buildPromptWithContext(request);
            // Generate KQL using selected model
            let kqlQuery;
            let confidence;
            if (model.type === 'local') {
                const response = await this.localProvider.generateResponse(model.id, prompt, request.context, {
                    temperature: 0.3, // Lower temperature for more deterministic code generation
                    maxTokens: 1000,
                    system: this.getSystemPrompt()
                });
                kqlQuery = this.extractKQLFromResponse(response.output);
                confidence = response.metadata.confidence || 0.7;
            }
            else {
                const response = await this.cloudProvider.generateResponse(model.id, prompt, request.context, {
                    temperature: 0.3,
                    maxTokens: 1000,
                    system: this.getSystemPrompt()
                });
                kqlQuery = this.extractKQLFromResponse(response.output);
                confidence = response.metadata.confidence || 0.8;
            }
            // Validate and potentially fix the generated KQL
            const validation = await this.validateKQLSyntax(kqlQuery);
            if (!validation.isValid && validation.fixedQuery) {
                kqlQuery = validation.fixedQuery;
                confidence *= 0.9; // Reduce confidence for fixed queries
            }
            // Determine complexity
            const complexity = this.determineQueryComplexity(kqlQuery);
            const result = {
                query: kqlQuery,
                confidence,
                explanation: this.generateExplanation(request.question, kqlQuery),
                complexity,
                warnings: validation.errors,
                suggestions: validation.suggestions,
                estimatedRows: this.estimateResultSize(kqlQuery)
            };
            // Cache the result
            this.queryCache.set(cacheKey, result);
            // Log for system improvement
            this.logQueryGeneration(request, result);
            this.emit('query:generated', { request, result });
            return result;
        }
        catch (error) {
            logger_1.logger.error('Error generating KQL from natural language:', error);
            throw new ai_types_1.AIEngineError(`Failed to generate KQL query: ${error instanceof Error ? error.message : 'Unknown error'}`, 'QUERY_GENERATION_FAILED', { question: request.question, error: error instanceof Error ? error.message : 'Unknown error' });
        }
    }
    /**
     * Improve query based on feedback
     */
    async improveQuery(originalQuery, feedback, context) {
        const improvementPrompt = `
Improve this KQL query based on the feedback provided:

Original Query:
${originalQuery}

Feedback:
${feedback}

Please provide an improved version of the query that addresses the feedback.
Focus on:
- Fixing any syntax errors
- Improving performance
- Making the query more accurate
- Following KQL best practices

Respond with only the improved KQL query, no explanation needed.
`;
        const model = this.selectAppropriateModel({
            question: feedback,
            context,
            queryType: 'kql',
            maxComplexity: 'complex'
        });
        let improvedQuery;
        if (model.type === 'local') {
            const response = await this.localProvider.generateResponse(model.id, improvementPrompt, context, { temperature: 0.2, maxTokens: 500 });
            improvedQuery = this.extractKQLFromResponse(response.output);
        }
        else {
            const response = await this.cloudProvider.generateResponse(model.id, improvementPrompt, context, { temperature: 0.2, maxTokens: 500 });
            improvedQuery = this.extractKQLFromResponse(response.output);
        }
        const validation = await this.validateKQLSyntax(improvedQuery);
        return {
            query: validation.fixedQuery || improvedQuery,
            confidence: validation.isValid ? 0.85 : 0.6,
            explanation: this.generateExplanation(feedback, improvedQuery),
            complexity: this.determineQueryComplexity(improvedQuery),
            warnings: validation.errors,
            suggestions: validation.suggestions
        };
    }
    /**
     * Explain an existing KQL query in natural language
     */
    async explainQuery(query, context) {
        const explanationPrompt = `
Explain this KQL query in simple, clear language:

${query}

Please provide:
1. What data this query is looking for
2. What conditions/filters are applied
3. How the results will be formatted
4. Any security implications or insights

Keep the explanation accessible to security analysts who may not be KQL experts.
`;
        const model = this.selectAppropriateModel({
            question: 'explain query',
            context,
            queryType: 'kql',
            maxComplexity: 'simple'
        });
        if (model.type === 'local') {
            const response = await this.localProvider.generateResponse(model.id, explanationPrompt, context, { temperature: 0.5, maxTokens: 800 });
            return response.output;
        }
        else {
            const response = await this.cloudProvider.generateResponse(model.id, explanationPrompt, context, { temperature: 0.5, maxTokens: 800 });
            return response.output;
        }
    }
    /**
     * Suggest query optimizations
     */
    async suggestOptimizations(query) {
        const suggestions = [];
        // Basic optimization rules
        if (!query.includes('| limit') && !query.includes('| take')) {
            suggestions.push('Consider adding a limit clause to prevent large result sets');
        }
        if (query.includes('*') && !query.includes('| where')) {
            suggestions.push('Avoid selecting all columns without filters for better performance');
        }
        if (query.includes('| sort') && !query.includes('| limit')) {
            suggestions.push('Sorting without a limit can be expensive - consider adding a limit');
        }
        const whereCount = (query.match(/\| where/g) || []).length;
        if (whereCount > 3) {
            suggestions.push('Consider combining multiple where clauses or using more specific filters');
        }
        if (query.includes('contains') && !query.includes('has')) {
            suggestions.push('Consider using "has" instead of "contains" for better performance with exact matches');
        }
        return suggestions;
    }
    selectAppropriateModel(request) {
        // For private data, always use local models
        if (request.context.privacyLevel === 'private') {
            // Return the first available local model (in a real implementation, this would be more sophisticated)
            return {
                id: 'local-default',
                name: 'Local LLM',
                type: 'local',
                provider: 'ollama',
                model: 'codellama',
                capabilities: ['chat', 'completion'],
                privacyLevel: 'private',
                temperature: 0.3,
                maxTokens: 1000,
                enabled: true
            };
        }
        // For complex queries or high-stakes scenarios, prefer cloud models
        if (request.maxComplexity === 'complex') {
            return {
                id: 'cloud-advanced',
                name: 'GPT-4',
                type: 'cloud',
                provider: 'openai',
                model: 'gpt-4',
                capabilities: ['chat', 'completion', 'analysis'],
                privacyLevel: 'restricted',
                temperature: 0.3,
                maxTokens: 1000,
                enabled: true
            };
        }
        // Default to local model for moderate complexity
        return {
            id: 'local-default',
            name: 'Local LLM',
            type: 'local',
            provider: 'ollama',
            model: 'codellama',
            capabilities: ['chat', 'completion'],
            privacyLevel: 'restricted',
            temperature: 0.3,
            maxTokens: 1000,
            enabled: true
        };
    }
    buildPromptWithContext(request) {
        const examples = this.getRelevantExamples(request.question);
        const dataSourceInfo = this.getDataSourceInfo(request.context.dataSources);
        return `
Convert this natural language question into a KQL query:

Question: "${request.question}"

Context:
- Time range: ${request.context.timeRange.start} to ${request.context.timeRange.end}
- Data sources: ${request.context.dataSources.join(', ')}
- User role: ${request.context.userRole}

Available data sources and their schemas:
${dataSourceInfo}

Example queries for reference:
${examples.map(ex => `Q: ${ex.natural}\nKQL: ${ex.kql}`).join('\n\n')}

Requirements:
- Return only valid KQL syntax
- Include appropriate time filtering based on the context
- Use efficient operators for better performance
- Include necessary security and access controls
- Follow KQL best practices

Respond with only the KQL query, no explanation or additional text.
`;
    }
    getSystemPrompt() {
        return `You are an expert KQL (Kusto Query Language) generator for security analytics. Your role is to convert natural language questions into efficient, accurate KQL queries for security data analysis.

Key principles:
1. Always generate syntactically correct KQL
2. Include appropriate time range filtering
3. Use efficient operators and functions
4. Consider security context and data sensitivity
5. Follow performance best practices
6. Include only necessary columns in output

Common KQL patterns for security:
- Use "| where" for filtering
- Use "| summarize" for aggregations
- Use "| join" for correlating data
- Use "| extend" to add computed columns
- Use "| project" to select specific columns
- Use "| limit" or "| take" to control result size

Always respond with clean, executable KQL queries only.`;
    }
    getRelevantExamples(question) {
        // Simple keyword matching to find relevant examples
        const keywords = question.toLowerCase().split(' ');
        const allExamples = Array.from(this.queryExamples.values()).flat();
        return allExamples
            .filter(example => keywords.some(keyword => example.natural.toLowerCase().includes(keyword) ||
            example.category.toLowerCase().includes(keyword)))
            .slice(0, 3); // Return top 3 relevant examples
    }
    getDataSourceInfo(dataSources) {
        // This would contain actual schema information in a real implementation
        const schemaInfo = {
            'SecurityEvent': 'EventID, Computer, Account, TimeGenerated, Activity, etc.',
            'SigninLogs': 'UserPrincipalName, AppDisplayName, IPAddress, Location, etc.',
            'AuditLogs': 'OperationName, Category, Result, InitiatedBy, TimeGenerated, etc.',
            'DeviceEvents': 'DeviceName, ActionType, FileName, ProcessName, TimeGenerated, etc.',
            'NetworkCommunicationEvents': 'DeviceName, RemoteIP, RemotePort, Protocol, etc.'
        };
        return dataSources
            .map(source => `${source}: ${schemaInfo[source] || 'Schema not available'}`)
            .join('\n');
    }
    extractKQLFromResponse(response) {
        // Remove code block markers and extract KQL
        let kql = response.trim();
        // Remove markdown code blocks
        kql = kql.replace(/```kql\n?/g, '').replace(/```\n?/g, '');
        // Remove common prefixes
        kql = kql.replace(/^(KQL|Query|Answer):\s*/i, '');
        // Take only the first line/statement if multiple are present
        const lines = kql.split('\n').filter(line => line.trim());
        if (lines.length > 0) {
            // Find the main query (usually starts with a table name or contains pipes)
            const mainQuery = lines.find(line => line.includes('|') ||
                /^[A-Za-z][A-Za-z0-9_]*/.test(line.trim()));
            if (mainQuery) {
                kql = mainQuery.trim();
            }
            else {
                kql = lines[0].trim();
            }
        }
        return kql;
    }
    async validateKQLSyntax(query) {
        const errors = [];
        const suggestions = [];
        let fixedQuery;
        // Basic syntax validation
        if (!query.trim()) {
            errors.push('Query is empty');
            return { isValid: false, errors, suggestions };
        }
        // Check for basic KQL structure
        if (!query.includes('|') && !/^[A-Za-z][A-Za-z0-9_]*/.test(query.trim())) {
            errors.push('Query should start with a table name or contain pipe operators');
        }
        // Check for common syntax errors
        if (query.includes('WHERE') && !query.includes('| where')) {
            errors.push('Use "| where" instead of "WHERE" in KQL');
            fixedQuery = query.replace(/WHERE/g, '| where');
        }
        if (query.includes('SELECT') && !query.includes('| project')) {
            errors.push('Use "| project" instead of "SELECT" in KQL');
            fixedQuery = query.replace(/SELECT/g, '| project');
        }
        // Check for missing quotes around string literals
        const stringLiteralRegex = /==\s*([^'"][^|\s]+)/g;
        if (stringLiteralRegex.test(query)) {
            suggestions.push('Consider quoting string literals for exact matches');
        }
        return {
            isValid: errors.length === 0,
            errors,
            suggestions,
            fixedQuery
        };
    }
    determineQueryComplexity(query) {
        const pipeCount = (query.match(/\|/g) || []).length;
        const hasJoin = query.includes('| join');
        const hasSubquery = query.includes('(') && query.includes(')');
        const hasAdvancedOperators = /\b(mv-expand|evaluate|invoke|union)\b/.test(query);
        if (hasAdvancedOperators || hasSubquery || pipeCount > 5) {
            return 'complex';
        }
        else if (hasJoin || pipeCount > 2) {
            return 'moderate';
        }
        else {
            return 'simple';
        }
    }
    generateExplanation(question, query) {
        // Generate a basic explanation based on the query structure
        let explanation = `This query addresses the question: "${question}"\n\n`;
        if (query.includes('| where')) {
            explanation += 'It filters data based on specific conditions. ';
        }
        if (query.includes('| summarize')) {
            explanation += 'It aggregates data to provide summary statistics. ';
        }
        if (query.includes('| join')) {
            explanation += 'It combines data from multiple sources. ';
        }
        if (query.includes('| project')) {
            explanation += 'It selects specific columns for the output. ';
        }
        if (query.includes('| limit') || query.includes('| take')) {
            explanation += 'It limits the number of results returned. ';
        }
        return explanation.trim();
    }
    estimateResultSize(query) {
        // Basic heuristic for estimating result size
        if (query.includes('| limit')) {
            const limitMatch = query.match(/\|\s*limit\s+(\d+)/i);
            if (limitMatch) {
                return parseInt(limitMatch[1]);
            }
        }
        if (query.includes('| take')) {
            const takeMatch = query.match(/\|\s*take\s+(\d+)/i);
            if (takeMatch) {
                return parseInt(takeMatch[1]);
            }
        }
        if (query.includes('| summarize')) {
            return 100; // Summaries usually return fewer rows
        }
        // Default estimate based on filters
        const whereCount = (query.match(/\| where/g) || []).length;
        return whereCount > 0 ? 1000 / whereCount : undefined;
    }
    createCacheKey(request) {
        return `${request.question}:${request.context.privacyLevel}:${request.maxComplexity}:${JSON.stringify(request.context.timeRange)}`;
    }
    logQueryGeneration(request, result) {
        logger_1.logger.info('Query generated', {
            question: request.question,
            query: result.query,
            confidence: result.confidence,
            complexity: result.complexity,
            privacyLevel: request.context.privacyLevel,
            userRole: request.context.userRole,
            hasWarnings: (result.warnings?.length || 0) > 0
        });
    }
    initializeQueryExamples() {
        const examples = [
            {
                natural: 'Show me failed login attempts in the last 24 hours',
                kql: 'SigninLogs | where TimeGenerated >= ago(24h) | where ResultType != "0" | project TimeGenerated, UserPrincipalName, IPAddress, ResultDescription',
                complexity: 'simple',
                category: 'authentication'
            },
            {
                natural: 'Find all PowerShell execution events',
                kql: 'SecurityEvent | where EventID == 4103 or EventID == 4104 | where TimeGenerated >= ago(7d) | project TimeGenerated, Computer, Account, CommandLine',
                complexity: 'simple',
                category: 'execution'
            },
            {
                natural: 'Show top 10 users with most failed logins',
                kql: 'SigninLogs | where TimeGenerated >= ago(7d) | where ResultType != "0" | summarize FailedAttempts=count() by UserPrincipalName | top 10 by FailedAttempts',
                complexity: 'moderate',
                category: 'authentication'
            },
            {
                natural: 'Find suspicious file creation events',
                kql: 'DeviceFileEvents | where TimeGenerated >= ago(24h) | where FileName has_any ("cmd.exe", "powershell.exe", "wscript.exe") | where FolderPath !startswith "C:\\Windows" | project TimeGenerated, DeviceName, FileName, FolderPath, InitiatingProcessAccountName',
                complexity: 'moderate',
                category: 'file-activity'
            },
            {
                natural: 'Correlate network connections with process execution',
                kql: 'DeviceNetworkEvents | where TimeGenerated >= ago(1h) | join kind=inner (DeviceProcessEvents | where TimeGenerated >= ago(1h)) on DeviceName, InitiatingProcessCreationTime | project TimeGenerated, DeviceName, ProcessName, RemoteIP, RemotePort',
                complexity: 'complex',
                category: 'correlation'
            }
        ];
        // Group examples by category
        for (const example of examples) {
            if (!this.queryExamples.has(example.category)) {
                this.queryExamples.set(example.category, []);
            }
            this.queryExamples.get(example.category).push(example);
        }
    }
}
exports.QueryGenerationService = QueryGenerationService;
exports.default = QueryGenerationService;
//# sourceMappingURL=query-generation-service.js.map