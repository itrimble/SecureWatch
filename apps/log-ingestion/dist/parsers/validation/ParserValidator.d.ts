import { LogParser, ParserValidationResult, ParserTestResult, ParserTestCase } from '../types';
export declare class ParserValidator {
    validateParser(parser: LogParser): Promise<ParserValidationResult>;
    testParser(parser: LogParser, testCases: ParserTestCase[]): Promise<ParserTestResult>;
    generateTestCases(parser: LogParser): ParserTestCase[];
    private validateRequiredFields;
    private validateParserMethods;
    private validateParserConfig;
    private runBasicTests;
    private compareOutputs;
    private hasNestedField;
    private getNestedField;
    private getSampleLogForFormat;
    private generateSyslogTestCases;
    private generateJsonTestCases;
    private generateCsvTestCases;
    private generateXmlTestCases;
    private generateGenericTestCases;
    private getMemoryUsage;
}
//# sourceMappingURL=ParserValidator.d.ts.map