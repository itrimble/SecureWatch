"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  ALERT_SEVERITY: () => ALERT_SEVERITY,
  CircuitBreaker: () => CircuitBreaker,
  HTTP_STATUS_CODES: () => HTTP_STATUS_CODES,
  LOG_LEVELS: () => LOG_LEVELS,
  TIME_RANGES: () => TIME_RANGES,
  emailSchema: () => emailSchema,
  formatBytes: () => formatBytes,
  formatNumber: () => formatNumber,
  formatShortDate: () => formatShortDate,
  formatTimestamp: () => formatTimestamp,
  ipv4Schema: () => ipv4Schema,
  uuidSchema: () => uuidSchema,
  validateEmail: () => validateEmail,
  validateIPv4: () => validateIPv4,
  validateUUID: () => validateUUID
});
module.exports = __toCommonJS(index_exports);

// src/validation.ts
var import_zod = require("zod");
var emailSchema = import_zod.z.string().email();
var uuidSchema = import_zod.z.string().uuid();
var ipv4Schema = import_zod.z.string().regex(/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/);
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
var import_date_fns = require("date-fns");
var formatTimestamp = (date) => {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return (0, import_date_fns.format)(dateObj, "yyyy-MM-dd HH:mm:ss");
};
var formatShortDate = (date) => {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return (0, import_date_fns.format)(dateObj, "MMM dd, yyyy");
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

// src/circuit-breaker.ts
var CircuitBreaker = class {
  constructor(threshold = 5, timeout = 6e4) {
    this.threshold = threshold;
    this.timeout = timeout;
  }
  failureCount = 0;
  lastFailureTime = 0;
  state = "CLOSED";
  async execute(fn) {
    if (this.state === "OPEN") {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = "HALF_OPEN";
      } else {
        throw new Error("Circuit breaker is OPEN");
      }
    }
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  onSuccess() {
    this.failureCount = 0;
    this.state = "CLOSED";
  }
  onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (this.failureCount >= this.threshold) {
      this.state = "OPEN";
    }
  }
  getState() {
    return this.state;
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ALERT_SEVERITY,
  CircuitBreaker,
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
});
//# sourceMappingURL=index.js.map