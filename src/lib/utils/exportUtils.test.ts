// src/lib/utils/exportUtils.test.ts
import { generateFilename, escapeCsvValue } from './exportUtils';

describe('exportUtils', () => {
  describe('generateFilename', () => {
    let dateNowSpy: jest.SpyInstance;

    beforeEach(() => {
      // Mock Date to ensure deterministic filenames for tests
      const mockDate = new Date(2023, 9, 28, 10, 30, 15); // 2023-10-28 10:30:15
      dateNowSpy = jest.spyOn(Date, 'now').mockImplementation(() => mockDate.getTime());
      // Also mock the constructor if new Date() is used directly without arguments
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);
    });

    afterEach(() => {
      // Restore original Date object
      dateNowSpy.mockRestore();
      (global.Date as any).mockRestore();
    });

    it('should return a string', () => {
      expect(typeof generateFilename('csv')).toBe('string');
    });

    it('should include the correct extension', () => {
      expect(generateFilename('csv')).toMatch(/\.csv$/);
      expect(generateFilename('json')).toMatch(/\.json$/);
    });

    it('should include "siem_logs_" prefix', () => {
      expect(generateFilename('txt')).toMatch(/^siem_logs_/);
    });

    it('should include a formatted timestamp', () => {
      // Based on the mocked date: 2023-10-28_10-30-15
      const expectedTimestamp = '2023-10-28_10-30-15';
      expect(generateFilename('log')).toContain(expectedTimestamp);
    });

     it('should generate the correct full filename', () => {
      const expectedFilename = 'siem_logs_2023-10-28_10-30-15.csv';
      expect(generateFilename('csv')).toBe(expectedFilename);
    });
  });

  describe('escapeCsvValue', () => {
    it('should return an empty string for null or undefined', () => {
      expect(escapeCsvValue(null)).toBe('');
      expect(escapeCsvValue(undefined)).toBe('');
    });

    it('should return the string representation for numbers', () => {
      expect(escapeCsvValue(123)).toBe('123');
      expect(escapeCsvValue(0)).toBe('0');
      expect(escapeCsvValue(-45.67)).toBe('-45.67');
    });

    it('should not change strings without special characters', () => {
      expect(escapeCsvValue('simple')).toBe('simple');
      expect(escapeCsvValue('hello world')).toBe('hello world');
    });

    it('should enclose strings with commas in double quotes', () => {
      expect(escapeCsvValue('value1,value2')).toBe('"value1,value2"');
    });

    it('should enclose strings with newlines in double quotes', () => {
      expect(escapeCsvValue('line1\nline2')).toBe('"line1\nline2"');
    });

    it('should enclose strings with double quotes in double quotes and escape existing quotes', () => {
      expect(escapeCsvValue('this "is" a quote')).toBe('"this ""is"" a quote"');
    });

    it('should correctly handle strings with all special characters', () => {
      expect(escapeCsvValue('comma, "quote",\nnewline'))
        .toBe('"comma, ""quote"",\nnewline"');
    });
    
    it('should handle strings that are just a double quote', () => {
      expect(escapeCsvValue('"')).toBe('""""');
    });

    it('should handle strings starting or ending with special characters', () => {
        expect(escapeCsvValue(',value')).toBe('",value"');
        expect(escapeCsvValue('value,')).toBe('"value,"');
        expect(escapeCsvValue('"value')).toBe('"""value"');
        expect(escapeCsvValue('value"')).toBe('"value"""');
        expect(escapeCsvValue('\nvalue')).toBe('"\nvalue"');
        expect(escapeCsvValue('value\n')).toBe('"value\n"');
    });
  });
});
