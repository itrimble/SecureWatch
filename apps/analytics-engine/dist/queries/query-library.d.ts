/**
 * KQL Query Library - 50+ Pre-Built Security Analytics Templates
 * Comprehensive collection of security use cases with KQL implementations
 */
import { SavedQuery, QueryCategory, SeverityLevel } from '../types/kql.types';
export declare class QueryLibrary {
    private queries;
    constructor();
    /**
     * Get all queries from the library
     */
    getAllQueries(): SavedQuery[];
    /**
     * Get queries by category
     */
    getQueriesByCategory(category: QueryCategory): SavedQuery[];
    /**
     * Get queries by severity
     */
    getQueriesBySeverity(severity: SeverityLevel): SavedQuery[];
    /**
     * Search queries by tags or description
     */
    searchQueries(searchTerm: string): SavedQuery[];
    /**
     * Get query by ID
     */
    getQueryById(id: string): SavedQuery | undefined;
    /**
     * Initialize the query library with pre-built templates
     */
    private initializeQueries;
    /**
     * Add threat hunting queries
     */
    private addThreatHuntingQueries;
    /**
     * Add incident response queries
     */
    private addIncidentResponseQueries;
    /**
     * Add vulnerability management queries
     */
    private addVulnerabilityQueries;
    /**
     * Add digital forensics queries
     */
    private addForensicsQueries;
    /**
     * Add performance monitoring queries
     */
    private addPerformanceQueries;
    /**
     * Helper method to add a query to the library
     */
    private addQuery;
    /**
     * Extract required fields from KQL query
     */
    private extractRequiredFields;
    /**
     * Get query statistics
     */
    getLibraryStats(): {
        totalQueries: number;
        queriesByCategory: Record<string, number>;
        queriesBySeverity: Record<string, number>;
        totalTags: number;
        mostUsedTags: string[];
    };
}
export { QueryLibrary };
//# sourceMappingURL=query-library.d.ts.map