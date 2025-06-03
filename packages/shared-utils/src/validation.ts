import { z } from 'zod';

// Common validation schemas
export const emailSchema = z.string().email();
export const uuidSchema = z.string().uuid();

// IP address validation
export const ipv4Schema = z.string().regex(/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/);

// Validation utility functions
export const validateEmail = (email: string): boolean => {
  return emailSchema.safeParse(email).success;
};

export const validateUUID = (uuid: string): boolean => {
  return uuidSchema.safeParse(uuid).success;
};

export const validateIPv4 = (ip: string): boolean => {
  return ipv4Schema.safeParse(ip).success;
};