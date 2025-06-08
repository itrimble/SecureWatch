export class FieldMapper {
    profiles = new Map();
    transformationHandlers = new Map();
    constructor() {
        this.registerDefaultTransformations();
    }
    /**
     * Register a field mapping profile
     */
    registerProfile(profile) {
        this.profiles.set(profile.id, profile);
    }
    /**
     * Get a field mapping profile by ID
     */
    getProfile(id) {
        return this.profiles.get(id);
    }
    /**
     * Map raw data to normalized LogEvent using a profile
     */
    async mapToLogEvent(rawData, profileId, sourceInfo) {
        const profile = this.profiles.get(profileId);
        if (!profile) {
            throw new Error(`Field mapping profile not found: ${profileId}`);
        }
        const mappedData = this.applyMappings(rawData, profile.mappings);
        const transformedData = await this.applyTransformations(mappedData, profile.transformations);
        const validatedData = this.validateData(transformedData, profile.validations);
        return this.createLogEvent(validatedData, sourceInfo);
    }
    /**
     * Apply field mappings to raw data
     */
    applyMappings(rawData, mappings) {
        const result = {};
        for (const mapping of mappings) {
            let value = this.getNestedValue(rawData, mapping.sourceField);
            // Apply condition if specified
            if (mapping.condition && !this.evaluateCondition(rawData, mapping.condition)) {
                continue;
            }
            // Use default value if source value is missing and default is provided
            if (value === undefined && mapping.defaultValue !== undefined) {
                value = mapping.defaultValue;
            }
            // Skip if required field is missing
            if (mapping.required && value === undefined) {
                throw new Error(`Required field missing: ${mapping.sourceField}`);
            }
            if (value !== undefined) {
                this.setNestedValue(result, mapping.targetField, value);
            }
        }
        return result;
    }
    /**
     * Apply transformations to mapped data
     */
    async applyTransformations(data, transformations) {
        const result = { ...data };
        for (const [field, config] of Object.entries(transformations)) {
            const value = this.getNestedValue(result, field);
            if (value !== undefined) {
                const handler = this.transformationHandlers.get(config.type);
                if (handler) {
                    const transformedValue = await handler(value, config.parameters);
                    this.setNestedValue(result, field, transformedValue);
                }
            }
        }
        return result;
    }
    /**
     * Validate mapped and transformed data
     */
    validateData(data, validations) {
        for (const validation of validations) {
            const value = this.getNestedValue(data, validation.field);
            if (!this.validateField(value, validation)) {
                throw new Error(`Validation failed for field ${validation.field}: ${validation.message}`);
            }
        }
        return data;
    }
    /**
     * Create a normalized LogEvent from mapped data
     */
    createLogEvent(data, sourceInfo) {
        return {
            id: data.id || `${sourceInfo.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: data.timestamp || new Date(),
            source: {
                type: sourceInfo.type,
                name: sourceInfo.name,
                version: sourceInfo.version || '1.0'
            },
            event: {
                id: data.event?.id || 'unknown',
                category: data.event?.category || 'system',
                type: data.event?.type || 'info',
                severity: data.event?.severity || 4,
                action: data.event?.action || 'unknown',
                outcome: data.event?.outcome || 'unknown'
            },
            host: data.host ? {
                name: data.host.name,
                hostname: data.host.hostname || data.host.name,
                ip: data.host.ip,
                os: data.host.os
            } : undefined,
            user: data.user ? {
                name: data.user.name,
                id: data.user.id,
                domain: data.user.domain
            } : undefined,
            process: data.process ? {
                pid: data.process.pid,
                name: data.process.name,
                command_line: data.process.command_line,
                executable: data.process.executable
            } : undefined,
            file: data.file ? {
                path: data.file.path,
                name: data.file.name,
                size: data.file.size,
                hash: data.file.hash
            } : undefined,
            network: data.network ? {
                protocol: data.network.protocol,
                bytes: data.network.bytes,
                packets: data.network.packets,
                duration: data.network.duration
            } : undefined,
            source_ip: data.source_ip,
            destination: data.destination ? {
                ip: data.destination.ip,
                port: data.destination.port
            } : undefined,
            user_agent: data.user_agent,
            threat: data.threat,
            message: data.message || 'No message provided',
            labels: data.labels || {},
            metadata: {
                raw: data.metadata?.raw,
                parsed: data.metadata?.parsed || data,
                enriched: data.metadata?.enriched || {}
            }
        };
    }
    /**
     * Get nested object value using dot notation
     */
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }
    /**
     * Set nested object value using dot notation
     */
    setNestedValue(obj, path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        if (!lastKey)
            return;
        const target = keys.reduce((current, key) => {
            if (!current[key] || typeof current[key] !== 'object') {
                current[key] = {};
            }
            return current[key];
        }, obj);
        target[lastKey] = value;
    }
    /**
     * Evaluate a simple condition string
     */
    evaluateCondition(data, condition) {
        // Simple condition evaluation - in production, use a proper expression parser
        try {
            // Replace field references with actual values
            const processedCondition = condition.replace(/\$\{([^}]+)\}/g, (match, field) => {
                const value = this.getNestedValue(data, field);
                return JSON.stringify(value);
            });
            // Evaluate the condition (THIS IS UNSAFE - use a proper parser in production)
            return Function(`"use strict"; return (${processedCondition})`)();
        }
        catch {
            return false;
        }
    }
    /**
     * Validate a field value against a validation rule
     */
    validateField(value, rule) {
        switch (rule.type) {
            case 'required':
                return value !== undefined && value !== null && value !== '';
            case 'format':
                if (typeof value !== 'string')
                    return false;
                const regex = new RegExp(rule.condition);
                return regex.test(value);
            case 'range':
                if (typeof value !== 'number')
                    return false;
                const { min, max } = rule.condition;
                return value >= min && value <= max;
            case 'enum':
                return Array.isArray(rule.condition) && rule.condition.includes(value);
            case 'custom':
                if (typeof rule.condition === 'function') {
                    return rule.condition(value);
                }
                return true;
            default:
                return true;
        }
    }
    /**
     * Register default transformation handlers
     */
    registerDefaultTransformations() {
        this.transformationHandlers.set('uppercase', (value) => typeof value === 'string' ? value.toUpperCase() : value);
        this.transformationHandlers.set('lowercase', (value) => typeof value === 'string' ? value.toLowerCase() : value);
        this.transformationHandlers.set('trim', (value) => typeof value === 'string' ? value.trim() : value);
        this.transformationHandlers.set('parseJson', (value) => {
            if (typeof value === 'string') {
                try {
                    return JSON.parse(value);
                }
                catch {
                    return value;
                }
            }
            return value;
        });
        this.transformationHandlers.set('parseDate', (value, params) => {
            if (typeof value === 'string') {
                const date = params?.format ? this.parseCustomDate(value, params.format) : new Date(value);
                return isNaN(date.getTime()) ? value : date;
            }
            return value;
        });
        this.transformationHandlers.set('parseInt', (value) => {
            const parsed = parseInt(value, 10);
            return isNaN(parsed) ? value : parsed;
        });
        this.transformationHandlers.set('parseFloat', (value) => {
            const parsed = parseFloat(value);
            return isNaN(parsed) ? value : parsed;
        });
        this.transformationHandlers.set('splitArray', (value, params) => {
            if (typeof value === 'string') {
                const delimiter = params?.delimiter || ',';
                return value.split(delimiter).map(item => item.trim());
            }
            return value;
        });
        this.transformationHandlers.set('joinArray', (value, params) => {
            if (Array.isArray(value)) {
                const delimiter = params?.delimiter || ',';
                return value.join(delimiter);
            }
            return value;
        });
        this.transformationHandlers.set('regex', (value, params) => {
            if (typeof value === 'string' && params?.pattern) {
                const regex = new RegExp(params.pattern, params.flags || '');
                const match = value.match(regex);
                return match ? (params.group ? match[params.group] : match[0]) : value;
            }
            return value;
        });
        this.transformationHandlers.set('lookup', (value, params) => {
            if (params?.map && typeof params.map === 'object') {
                return params.map[value] || params.default || value;
            }
            return value;
        });
    }
    /**
     * Parse custom date format
     */
    parseCustomDate(dateString, format) {
        // Simple date parsing - in production, use a proper date parsing library
        // This is a simplified implementation for common formats
        const formatMap = {
            'YYYY-MM-DD HH:mm:ss': /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/,
            'MM/DD/YYYY HH:mm:ss': /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})$/,
            'DD-MM-YYYY HH:mm:ss': /^(\d{2})-(\d{2})-(\d{4}) (\d{2}):(\d{2}):(\d{2})$/
        };
        const pattern = formatMap[format];
        if (!pattern) {
            return new Date(dateString);
        }
        const match = dateString.match(pattern);
        if (!match) {
            return new Date(dateString);
        }
        // Extract date components based on format
        let year, month, day, hour, minute, second;
        if (format === 'YYYY-MM-DD HH:mm:ss') {
            [, year, month, day, hour, minute, second] = match;
        }
        else if (format === 'MM/DD/YYYY HH:mm:ss') {
            [, month, day, year, hour, minute, second] = match;
        }
        else if (format === 'DD-MM-YYYY HH:mm:ss') {
            [, day, month, year, hour, minute, second] = match;
        }
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute), parseInt(second));
    }
    /**
     * Register a custom transformation handler
     */
    registerTransformation(type, handler) {
        this.transformationHandlers.set(type, handler);
    }
    /**
     * Create a mapping profile from field mappings array
     */
    createProfile(id, name, sourceType, mappings) {
        const profile = {
            id,
            name,
            sourceType,
            mappings: mappings.map(mapping => ({
                sourceField: mapping.source,
                targetField: mapping.destination,
                transformation: mapping.transformation,
                defaultValue: mapping.defaultValue,
                required: mapping.required
            })),
            transformations: {},
            validations: []
        };
        this.registerProfile(profile);
        return profile;
    }
}
export default FieldMapper;
//# sourceMappingURL=field-mapper.js.map