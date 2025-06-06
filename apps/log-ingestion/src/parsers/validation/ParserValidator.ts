// Parser Validator
// Validates parser implementations and test cases

import {
  LogParser,
  ParserValidationResult,
  ParserTestResult,
  ParserTestCase,
  ParserError,
  ParserValidationError
} from '../types';
import { logger } from '../../utils/logger';

export class ParserValidator {
  
  // Validate a parser implementation
  async validateParser(parser: LogParser): Promise<ParserValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const startTime = Date.now();
    let memoryUsage = 0;

    try {
      // Validate required fields
      this.validateRequiredFields(parser, errors);
      
      // Validate parser methods
      await this.validateParserMethods(parser, errors, warnings);
      
      // Validate parser configuration
      this.validateParserConfig(parser, warnings);
      
      // Test parser with sample data
      const testResults = await this.runBasicTests(parser, errors, warnings);
      
      const parseTime = Date.now() - startTime;
      memoryUsage = this.getMemoryUsage();

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        performance: {
          parseTime,
          memoryUsage
        },
        coverage: {
          fieldsExtracted: testResults.fieldsExtracted,
          totalFields: testResults.totalFields,
          percentage: testResults.totalFields > 0 ? (testResults.fieldsExtracted / testResults.totalFields) * 100 : 0
        }
      };

    } catch (error) {
      errors.push(`Validation failed with error: ${error.message}`);
      
      return {
        isValid: false,
        errors,
        warnings,
        performance: {
          parseTime: Date.now() - startTime,
          memoryUsage: this.getMemoryUsage()
        },
        coverage: {
          fieldsExtracted: 0,
          totalFields: 0,
          percentage: 0
        }
      };
    }
  }

  // Test parser with provided test cases
  async testParser(parser: LogParser, testCases: ParserTestCase[]): Promise<ParserTestResult> {
    const results: ParserTestResult['testCases'] = [];
    
    for (const testCase of testCases) {
      try {
        const startTime = Date.now();
        
        // Validate the log
        const isValid = parser.validate(testCase.input);
        if (!isValid && testCase.shouldPass) {
          results.push({
            name: testCase.name,
            passed: false,
            error: 'Parser validation failed for input that should pass'
          });
          continue;
        }
        
        if (isValid && !testCase.shouldPass) {
          results.push({
            name: testCase.name,
            passed: false,
            error: 'Parser validation passed for input that should fail'
          });
          continue;
        }

        // Parse the log
        const parsed = parser.parse(testCase.input);
        if (!parsed && testCase.shouldPass) {
          results.push({
            name: testCase.name,
            passed: false,
            error: 'Parser returned null for input that should parse'
          });
          continue;
        }

        // Normalize the result
        let normalized = null;
        if (parsed) {
          normalized = parser.normalize(parsed);
        }

        // Check expected output if provided
        if (testCase.expectedOutput && normalized) {
          const matches = this.compareOutputs(normalized, testCase.expectedOutput);
          if (!matches) {
            results.push({
              name: testCase.name,
              passed: false,
              error: 'Output does not match expected result',
              actualOutput: normalized,
              expectedOutput: testCase.expectedOutput
            });
            continue;
          }
        }

        results.push({
          name: testCase.name,
          passed: true,
          actualOutput: normalized || undefined
        });

      } catch (error) {
        results.push({
          name: testCase.name,
          passed: false,
          error: `Test failed with error: ${error.message}`
        });
      }
    }

    const passed = results.filter(r => r.passed).length;
    const failed = results.length - passed;

    return {
      parserId: parser.id,
      testCases: results,
      summary: {
        total: results.length,
        passed,
        failed,
        successRate: results.length > 0 ? (passed / results.length) * 100 : 0
      }
    };
  }

  // Generate test cases for a parser
  generateTestCases(parser: LogParser): ParserTestCase[] {
    const testCases: ParserTestCase[] = [];

    // Generate basic test cases based on parser type
    switch (parser.format) {
      case 'syslog':
        testCases.push(...this.generateSyslogTestCases());
        break;
      case 'json':
        testCases.push(...this.generateJsonTestCases());
        break;
      case 'csv':
        testCases.push(...this.generateCsvTestCases());
        break;
      case 'xml':
        testCases.push(...this.generateXmlTestCases());
        break;
      default:
        testCases.push(...this.generateGenericTestCases());
    }

    return testCases;
  }

  // Private validation methods

  private validateRequiredFields(parser: LogParser, errors: string[]): void {
    const requiredFields = ['id', 'name', 'vendor', 'logSource', 'version', 'format', 'category'];
    
    for (const field of requiredFields) {
      if (!parser[field as keyof LogParser]) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // Validate field types
    if (parser.id && typeof parser.id !== 'string') {
      errors.push('Parser ID must be a string');
    }

    if (parser.priority !== undefined && (typeof parser.priority !== 'number' || parser.priority < 0 || parser.priority > 100)) {
      errors.push('Parser priority must be a number between 0 and 100');
    }

    if (parser.enabled !== undefined && typeof parser.enabled !== 'boolean') {
      errors.push('Parser enabled flag must be a boolean');
    }

    // Validate enum values
    const validFormats = ['syslog', 'json', 'csv', 'xml', 'evtx', 'custom'];
    if (parser.format && !validFormats.includes(parser.format)) {
      errors.push(`Invalid format: ${parser.format}. Must be one of: ${validFormats.join(', ')}`);
    }

    const validCategories = ['network', 'endpoint', 'cloud', 'application', 'identity', 'database', 'web'];
    if (parser.category && !validCategories.includes(parser.category)) {
      errors.push(`Invalid category: ${parser.category}. Must be one of: ${validCategories.join(', ')}`);
    }
  }

  private async validateParserMethods(parser: LogParser, errors: string[], warnings: string[]): Promise<void> {
    // Check if required methods exist and are functions
    const requiredMethods = ['validate', 'parse', 'normalize'];
    
    for (const method of requiredMethods) {
      if (typeof parser[method as keyof LogParser] !== 'function') {
        errors.push(`Missing or invalid method: ${method}`);
      }
    }

    // Test method signatures with sample data
    try {
      const sampleLog = this.getSampleLogForFormat(parser.format);
      
      // Test validate method
      if (typeof parser.validate === 'function') {
        const validateResult = parser.validate(sampleLog);
        if (typeof validateResult !== 'boolean') {
          errors.push('validate() method must return a boolean');
        }
      }

      // Test parse method
      if (typeof parser.parse === 'function') {
        try {
          const parseResult = parser.parse(sampleLog);
          if (parseResult !== null && typeof parseResult !== 'object') {
            errors.push('parse() method must return an object or null');
          }
        } catch (error) {
          warnings.push(`parse() method threw an error with sample data: ${error.message}`);
        }
      }

      // Test normalize method
      if (typeof parser.normalize === 'function' && typeof parser.parse === 'function') {
        try {
          const parseResult = parser.parse(sampleLog);
          if (parseResult) {
            const normalizeResult = parser.normalize(parseResult);
            if (typeof normalizeResult !== 'object' || !normalizeResult['@timestamp']) {
              errors.push('normalize() method must return a valid ECS-compliant object with @timestamp');
            }
          }
        } catch (error) {
          warnings.push(`normalize() method threw an error: ${error.message}`);
        }
      }

    } catch (error) {
      warnings.push(`Failed to test parser methods: ${error.message}`);
    }
  }

  private validateParserConfig(parser: LogParser, warnings: string[]): void {
    if (parser.config) {
      const config = parser.config;
      
      // Validate timeout
      if (config.timeout !== undefined && (config.timeout < 0 || config.timeout > 60000)) {
        warnings.push('Parser timeout should be between 0 and 60000ms');
      }

      // Validate max size
      if (config.maxSize !== undefined && (config.maxSize < 0 || config.maxSize > 100 * 1024 * 1024)) {
        warnings.push('Parser max size should be between 0 and 100MB');
      }

      // Validate field mappings
      if (config.fieldMappings && typeof config.fieldMappings !== 'object') {
        warnings.push('Field mappings must be an object');
      }
    }

    if (parser.metadata) {
      const metadata = parser.metadata;
      
      // Validate test cases
      if (metadata.testCases) {
        for (const testCase of metadata.testCases) {
          if (!testCase.name || !testCase.input) {
            warnings.push('Test cases must have name and input fields');
          }
        }
      }
    }
  }

  private async runBasicTests(parser: LogParser, errors: string[], warnings: string[]): Promise<{ fieldsExtracted: number; totalFields: number }> {
    let fieldsExtracted = 0;
    let totalFields = 20; // Expected number of common fields

    try {
      const sampleLog = this.getSampleLogForFormat(parser.format);
      
      if (parser.validate(sampleLog)) {
        const parsed = parser.parse(sampleLog);
        if (parsed) {
          const normalized = parser.normalize(parsed);
          
          // Count extracted fields
          const commonFields = [
            '@timestamp', 'event.kind', 'event.category', 'event.type', 'event.outcome',
            'host.name', 'source.ip', 'destination.ip', 'user.name', 'process.name',
            'file.name', 'url.full', 'http.request.method', 'network.protocol',
            'registry.key', 'dns.question.name', 'securewatch.parser.id',
            'securewatch.confidence', 'securewatch.severity', 'labels'
          ];
          
          for (const field of commonFields) {
            if (this.hasNestedField(normalized, field)) {
              fieldsExtracted++;
            }
          }
        }
      }
    } catch (error) {
      warnings.push(`Basic test failed: ${error.message}`);
    }

    return { fieldsExtracted, totalFields };
  }

  private compareOutputs(actual: any, expected: any): boolean {
    for (const key in expected) {
      if (expected[key] !== undefined) {
        const actualValue = this.getNestedField(actual, key);
        const expectedValue = expected[key];
        
        if (Array.isArray(expectedValue)) {
          if (!Array.isArray(actualValue) || actualValue.length !== expectedValue.length) {
            return false;
          }
          for (let i = 0; i < expectedValue.length; i++) {
            if (actualValue[i] !== expectedValue[i]) {
              return false;
            }
          }
        } else if (actualValue !== expectedValue) {
          return false;
        }
      }
    }
    return true;
  }

  private hasNestedField(obj: any, field: string): boolean {
    return this.getNestedField(obj, field) !== undefined;
  }

  private getNestedField(obj: any, field: string): any {
    const parts = field.split('.');
    let current = obj;
    
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return undefined;
      }
    }
    
    return current;
  }

  private getSampleLogForFormat(format: string): string {
    const samples: Record<string, string> = {
      syslog: '<134>Oct 11 22:14:15 mymachine su: user changed to root',
      json: '{"timestamp":"2023-10-11T22:14:15Z","level":"info","message":"User login","user":"john"}',
      csv: 'timestamp,level,message,user\n2023-10-11T22:14:15Z,info,User login,john',
      xml: '<Event><TimeCreated SystemTime="2023-10-11T22:14:15Z"/><EventID>4624</EventID><Computer>DESKTOP-123</Computer></Event>',
      evtx: '<Event xmlns="http://schemas.microsoft.com/win/2004/08/events/event"><System><EventID>4624</EventID></System></Event>',
      custom: 'Oct 11 22:14:15 server1 app[1234]: User login successful'
    };

    return samples[format] || samples.custom;
  }

  private generateSyslogTestCases(): ParserTestCase[] {
    return [
      {
        name: 'Valid RFC 3164 syslog',
        input: '<134>Oct 11 22:14:15 mymachine su: user changed to root',
        expectedOutput: {
          'event.category': ['authentication'],
          'syslog.facility.code': 16,
          'syslog.severity.code': 6
        },
        shouldPass: true
      },
      {
        name: 'Valid RFC 5424 syslog',
        input: '<165>1 2023-10-11T22:14:15.003Z mymachine.example.com evntslog - ID47 [exampleSDID@32473 iut="3"] BOMAn application event log entry',
        expectedOutput: {
          'event.category': ['host']
        },
        shouldPass: true
      },
      {
        name: 'Invalid syslog format',
        input: 'This is not a syslog message',
        expectedOutput: {},
        shouldPass: false
      }
    ];
  }

  private generateJsonTestCases(): ParserTestCase[] {
    return [
      {
        name: 'Valid JSON log',
        input: '{"timestamp":"2023-10-11T22:14:15Z","level":"info","message":"User login","user":"john"}',
        expectedOutput: {
          'user.name': 'john',
          'event.outcome': 'success'
        },
        shouldPass: true
      },
      {
        name: 'Invalid JSON',
        input: '{"timestamp":"2023-10-11T22:14:15Z","level":"info"',
        expectedOutput: {},
        shouldPass: false
      }
    ];
  }

  private generateCsvTestCases(): ParserTestCase[] {
    return [
      {
        name: 'Valid CSV with headers',
        input: 'timestamp,level,message,user\n2023-10-11T22:14:15Z,info,User login,john',
        expectedOutput: {
          'user.name': 'john'
        },
        shouldPass: true
      }
    ];
  }

  private generateXmlTestCases(): ParserTestCase[] {
    return [
      {
        name: 'Valid Windows Event XML',
        input: '<Event xmlns="http://schemas.microsoft.com/win/2004/08/events/event"><System><EventID>4624</EventID><Computer>DESKTOP-123</Computer></System></Event>',
        expectedOutput: {
          'event.category': ['authentication'],
          'windows.event.id': 4624
        },
        shouldPass: true
      }
    ];
  }

  private generateGenericTestCases(): ParserTestCase[] {
    return [
      {
        name: 'Basic log entry',
        input: 'Oct 11 22:14:15 server1 app[1234]: User login successful',
        expectedOutput: {
          'event.outcome': 'success'
        },
        shouldPass: true
      }
    ];
  }

  private getMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed;
    }
    return 0;
  }
}