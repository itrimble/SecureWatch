import { EventEmitter } from 'events';
import { NaturalLanguageQuery, GeneratedQuery, SecurityContext } from '../types/ai.types';
import { LocalLLMProvider } from '../providers/local-llm-provider';
import { CloudAIProvider } from '../providers/cloud-ai-provider';
/**
 * AI-Assisted KQL Generation Service
 * Converts natural language questions into KQL queries using AI models
 */
export declare class QueryGenerationService extends EventEmitter {
    private localProvider;
    private cloudProvider;
    private queryExamples;
    private queryCache;
    constructor(localProvider: LocalLLMProvider, cloudProvider: CloudAIProvider);
    /**
     * Generate KQL query from natural language
     */
    generateKQLFromNaturalLanguage(request: NaturalLanguageQuery): Promise<GeneratedQuery>;
    /**
     * Improve query based on feedback
     */
    improveQuery(originalQuery: string, feedback: string, context: SecurityContext): Promise<GeneratedQuery>;
    /**
     * Explain an existing KQL query in natural language
     */
    explainQuery(query: string, context: SecurityContext): Promise<string>;
    /**
     * Suggest query optimizations
     */
    suggestOptimizations(query: string): Promise<string[]>;
    private selectAppropriateModel;
    private buildPromptWithContext;
    private getSystemPrompt;
    private getRelevantExamples;
    private getDataSourceInfo;
    private extractKQLFromResponse;
    private validateKQLSyntax;
    private determineQueryComplexity;
    private generateExplanation;
    private estimateResultSize;
    private createCacheKey;
    private logQueryGeneration;
    private initializeQueryExamples;
}
export default QueryGenerationService;
//# sourceMappingURL=query-generation-service.d.ts.map