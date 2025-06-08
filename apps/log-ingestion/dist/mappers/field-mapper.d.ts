import { FieldMapping } from '../types/data-source.types';
import { LogEvent } from '../types/log-event.types';
export interface MappingRule {
    sourceField: string;
    targetField: string;
    transformation?: TransformationType;
    defaultValue?: any;
    required?: boolean;
    condition?: string;
}
export type TransformationType = 'uppercase' | 'lowercase' | 'trim' | 'parseJson' | 'parseDate' | 'parseInt' | 'parseFloat' | 'splitArray' | 'joinArray' | 'regex' | 'lookup' | 'custom';
export interface TransformationConfig {
    type: TransformationType;
    parameters?: Record<string, any>;
}
export interface FieldMappingProfile {
    id: string;
    name: string;
    description?: string;
    sourceType: string;
    mappings: MappingRule[];
    transformations: Record<string, TransformationConfig>;
    validations: ValidationRule[];
}
export interface ValidationRule {
    field: string;
    type: 'required' | 'format' | 'range' | 'enum' | 'custom';
    condition: any;
    message: string;
}
export declare class FieldMapper {
    private profiles;
    private transformationHandlers;
    constructor();
    /**
     * Register a field mapping profile
     */
    registerProfile(profile: FieldMappingProfile): void;
    /**
     * Get a field mapping profile by ID
     */
    getProfile(id: string): FieldMappingProfile | undefined;
    /**
     * Map raw data to normalized LogEvent using a profile
     */
    mapToLogEvent(rawData: Record<string, any>, profileId: string, sourceInfo: any): Promise<LogEvent>;
    /**
     * Apply field mappings to raw data
     */
    private applyMappings;
    /**
     * Apply transformations to mapped data
     */
    private applyTransformations;
    /**
     * Validate mapped and transformed data
     */
    private validateData;
    /**
     * Create a normalized LogEvent from mapped data
     */
    private createLogEvent;
    /**
     * Get nested object value using dot notation
     */
    private getNestedValue;
    /**
     * Set nested object value using dot notation
     */
    private setNestedValue;
    /**
     * Evaluate a simple condition string
     */
    private evaluateCondition;
    /**
     * Validate a field value against a validation rule
     */
    private validateField;
    /**
     * Register default transformation handlers
     */
    private registerDefaultTransformations;
    /**
     * Parse custom date format
     */
    private parseCustomDate;
    /**
     * Register a custom transformation handler
     */
    registerTransformation(type: TransformationType, handler: (value: any, params?: any) => any): void;
    /**
     * Create a mapping profile from field mappings array
     */
    createProfile(id: string, name: string, sourceType: string, mappings: FieldMapping[]): FieldMappingProfile;
}
export default FieldMapper;
//# sourceMappingURL=field-mapper.d.ts.map