import { LoginRequest, RegisterRequest } from '../types/auth.types';
import { authConfig } from '../config/auth.config';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength
 */
export const isValidPassword = (password: string): ValidationResult => {
  const errors: string[] = [];
  
  if (password.length < authConfig.password.minLength) {
    errors.push(`Password must be at least ${authConfig.password.minLength} characters long`);
  }
  
  if (authConfig.password.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (authConfig.password.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (authConfig.password.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (authConfig.password.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  // Check for common weak passwords
  const commonPasswords = [
    'password', '123456', '123456789', 'qwerty', 'abc123',
    'password123', 'admin', 'letmein', 'welcome', 'monkey'
  ];
  
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('Password is too common and easily guessable');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Validate name (first name, last name, display name)
 */
export const isValidName = (name: string): boolean => {
  if (!name || name.trim().length === 0) {
    return false;
  }
  
  // Allow letters, spaces, hyphens, apostrophes, and periods
  const nameRegex = /^[a-zA-Z\s\-'.]+$/;
  return nameRegex.test(name.trim()) && name.trim().length <= 50;
};

/**
 * Validate login request
 */
export const validateLoginRequest = (data: LoginRequest): ValidationResult => {
  const errors: string[] = [];
  
  if (!data.email) {
    errors.push('Email is required');
  } else if (!isValidEmail(data.email)) {
    errors.push('Invalid email format');
  }
  
  if (!data.password) {
    errors.push('Password is required');
  } else if (data.password.length < 1) {
    errors.push('Password cannot be empty');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Validate registration request
 */
export const validateRegisterRequest = (data: RegisterRequest): ValidationResult => {
  const errors: string[] = [];
  
  if (!data.email) {
    errors.push('Email is required');
  } else if (!isValidEmail(data.email)) {
    errors.push('Invalid email format');
  }
  
  if (!data.password) {
    errors.push('Password is required');
  } else {
    const passwordValidation = isValidPassword(data.password);
    if (!passwordValidation.valid) {
      errors.push(...passwordValidation.errors);
    }
  }
  
  if (!data.firstName) {
    errors.push('First name is required');
  } else if (!isValidName(data.firstName)) {
    errors.push('Invalid first name format');
  }
  
  if (!data.lastName) {
    errors.push('Last name is required');
  } else if (!isValidName(data.lastName)) {
    errors.push('Invalid last name format');
  }
  
  if (data.displayName && !isValidName(data.displayName)) {
    errors.push('Invalid display name format');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Validate MFA code
 */
export const isValidMFACode = (code: string, method: string = 'totp'): boolean => {
  if (!code) return false;
  
  switch (method) {
    case 'totp':
      // TOTP codes are typically 6 digits
      return /^\d{6}$/.test(code);
    case 'backup':
      // Backup codes are typically 8-12 alphanumeric characters
      return /^[A-Za-z0-9]{8,12}$/.test(code);
    default:
      return false;
  }
};

/**
 * Validate JWT token format
 */
export const isValidJWTFormat = (token: string): boolean => {
  if (!token) return false;
  
  // JWT tokens have 3 parts separated by dots
  const parts = token.split('.');
  return parts.length === 3 && parts.every(part => part.length > 0);
};

/**
 * Validate UUID format
 */
export const isValidUUID = (uuid: string): boolean => {
  if (!uuid) return false;
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

/**
 * Validate phone number (international format)
 */
export const isValidPhoneNumber = (phone: string): boolean => {
  if (!phone) return false;
  
  // Basic international phone number validation
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
};

/**
 * Validate URL format
 */
export const isValidURL = (url: string): boolean => {
  if (!url) return false;
  
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Sanitize string input
 */
export const sanitizeString = (input: string): string => {
  if (!input) return '';
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/[^\w\s\-_.@]/g, ''); // Keep only alphanumeric, spaces, and safe special chars
};

/**
 * Validate and sanitize email
 */
export const sanitizeEmail = (email: string): string => {
  if (!email) return '';
  
  return email.toLowerCase().trim();
};

/**
 * Check if string contains SQL injection patterns
 */
export const hasSQLInjection = (input: string): boolean => {
  if (!input) return false;
  
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
    /(UNION|OR|AND)\s+\d+\s*=\s*\d+/i,
    /['"]\s*OR\s+['"]/i,
    /['"]\s*;\s*(DROP|DELETE|INSERT|UPDATE)/i,
    /--\s/,
    /\/\*.*\*\//,
  ];
  
  return sqlPatterns.some(pattern => pattern.test(input));
};

/**
 * Check if string contains XSS patterns
 */
export const hasXSS = (input: string): boolean => {
  if (!input) return false;
  
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<img[^>]+src[^>]*>/gi,
  ];
  
  return xssPatterns.some(pattern => pattern.test(input));
};

/**
 * Comprehensive input validation
 */
export const validateInput = (input: string, type: 'email' | 'name' | 'password' | 'general' = 'general'): ValidationResult => {
  const errors: string[] = [];
  
  if (!input) {
    errors.push('Input is required');
    return { valid: false, errors };
  }
  
  if (hasSQLInjection(input)) {
    errors.push('Input contains potentially malicious content');
  }
  
  if (hasXSS(input)) {
    errors.push('Input contains potentially malicious content');
  }
  
  switch (type) {
    case 'email':
      if (!isValidEmail(input)) {
        errors.push('Invalid email format');
      }
      break;
    case 'name':
      if (!isValidName(input)) {
        errors.push('Invalid name format');
      }
      break;
    case 'password':
      const passwordValidation = isValidPassword(input);
      if (!passwordValidation.valid) {
        errors.push(...passwordValidation.errors);
      }
      break;
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
};