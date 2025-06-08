export interface FieldExtractionOptions {
    delimiter?: string;
    kvDelimiter?: string;
    quotedValues?: boolean;
    trimValues?: boolean;
    caseSensitive?: boolean;
    allowDuplicateKeys?: boolean;
}
export interface ExtractedField {
    key: string;
    value: any;
    type: 'string' | 'number' | 'boolean' | 'date' | 'ip' | 'email' | 'url';
    confidence: number;
}
export declare class FieldExtractor {
    private defaultOptions;
    /**
     * Extract structured fields from a raw message string
     */
    extractFromMessage(message: string, options?: Partial<FieldExtractionOptions>): Record<string, any>;
    /**
     * Parse key-value pairs from a string
     */
    extractKeyValuePairs(input: string, options: FieldExtractionOptions): Record<string, any>;
    /**
     * Try to parse the entire message as JSON
     */
    private tryJsonParsing;
    /**
     * Parse key-value pairs with various formats
     */
    private parseKeyValueString;
    /**
     * Parse space-separated key-value pairs: key1=value1 key2=value2
     */
    private parseSpaceSeparatedKV;
    /**
     * Parse quoted key-value pairs: "key1"="value1" "key2"="value2"
     */
    private parseQuotedKV;
    /**
     * Parse comma-delimited key-value pairs: key1=value1, key2=value2
     */
    private parseCommaDelimitedKV;
    /**
     * Parse Logstash-style key-value pairs with complex quoting
     */
    private parseLogstashKV;
    /**
     * Extract common patterns like IPs, emails, URLs from text
     */
    private extractCommonPatterns;
    /**
     * Extract quoted strings from input
     */
    private extractQuotedStrings;
    /**
     * Infer the type of a value and convert it appropriately
     */
    private inferType;
    /**
     * Escape special regex characters
     */
    private escapeRegex;
    /**
     * Extract fields with confidence scoring
     */
    extractFieldsWithConfidence(message: string, options?: Partial<FieldExtractionOptions>): ExtractedField[];
    /**
     * Determine the semantic type of a field value
     */
    private determineFieldType;
    /**
     * Calculate confidence score for extracted field
     */
    private calculateConfidence;
}
export default FieldExtractor;
//# sourceMappingURL=field-extractor.d.ts.map