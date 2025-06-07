/**
 * KQL Parser Implementation using ANTLR4
 * Converts KQL queries into Abstract Syntax Trees for optimization and execution
 */
import { KQLNode, KQLError } from '../types/kql.types';
export declare class KQLParser {
    private errors;
    /**
     * Parse KQL query string into AST
     */
    parse(query: string): {
        ast: KQLNode | null;
        errors: KQLError[];
    };
    /**
     * Normalize KQL query string
     */
    private normalizeQuery;
    /**
     * Parse KQL query into AST nodes
     */
    private parseQuery;
    /**
     * Tokenize KQL query
     */
    private tokenize;
    /**
     * Parse string literal
     */
    private parseStringLiteral;
    /**
     * Parse number
     */
    private parseNumber;
    /**
     * Parse identifier or keyword
     */
    private parseIdentifier;
    /**
     * Parse operator
     */
    private parseOperator;
    /**
     * Build AST from tokens
     */
    private buildAST;
    /**
     * Add parser error
     */
    private addError;
    /**
     * Validate semantic correctness of AST
     */
    validateSemantics(ast: KQLNode, schema: any): KQLError[];
}
export { KQLParser };
//# sourceMappingURL=kql-parser.d.ts.map