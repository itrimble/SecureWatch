// src/validation.ts
import { z } from "zod";
var emailSchema = z.string().email();
var uuidSchema = z.string().uuid();
var ipv4Schema = z.string().regex(/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/);
var validateEmail = (email) => {
  return emailSchema.safeParse(email).success;
};
var validateUUID = (uuid) => {
  return uuidSchema.safeParse(uuid).success;
};
var validateIPv4 = (ip) => {
  return ipv4Schema.safeParse(ip).success;
};

// src/formatting.ts
import { format } from "date-fns";
var formatTimestamp = (date) => {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return format(dateObj, "yyyy-MM-dd HH:mm:ss");
};
var formatShortDate = (date) => {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return format(dateObj, "MMM dd, yyyy");
};
var formatBytes = (bytes) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};
var formatNumber = (num) => {
  return new Intl.NumberFormat().format(num);
};

// src/constants.ts
var LOG_LEVELS = {
  ERROR: "error",
  WARN: "warn",
  INFO: "info",
  DEBUG: "debug"
};
var HTTP_STATUS_CODES = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500
};
var TIME_RANGES = {
  LAST_HOUR: "1h",
  LAST_24_HOURS: "24h",
  LAST_7_DAYS: "7d",
  LAST_30_DAYS: "30d"
};
var ALERT_SEVERITY = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  CRITICAL: "critical"
};
export {
  ALERT_SEVERITY,
  HTTP_STATUS_CODES,
  LOG_LEVELS,
  TIME_RANGES,
  emailSchema,
  formatBytes,
  formatNumber,
  formatShortDate,
  formatTimestamp,
  ipv4Schema,
  uuidSchema,
  validateEmail,
  validateIPv4,
  validateUUID
};
//# sourceMappingURL=index.mjs.map