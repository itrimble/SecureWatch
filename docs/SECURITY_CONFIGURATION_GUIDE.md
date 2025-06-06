# Security Configuration Guide

## Overview

This guide provides essential security configuration for SecureWatch SIEM platform. All critical security vulnerabilities have been resolved as of v1.13.0, but proper environment configuration is required for secure operation.

## 🚨 Required Environment Variables

The following environment variables are **REQUIRED** for secure operation. The application will fail to start if these are missing:

### JWT Authentication
```bash
# Generate secure random secrets (32+ characters recommended)
JWT_ACCESS_SECRET="your-secure-256-bit-random-secret-here"
JWT_REFRESH_SECRET="your-different-secure-256-bit-random-secret-here"
```

### MFA Encryption
```bash
# Generate secure 32-byte encryption key for MFA secrets
MFA_ENCRYPTION_KEY="your-32-byte-base64-encoded-encryption-key-here"
```

### Redis Configuration
```bash
# Redis connection for session and MFA storage
REDIS_URL="redis://localhost:6379"
# OR individual settings:
REDIS_HOST="localhost"
REDIS_PORT="6379"
REDIS_PASSWORD="your-redis-password"
REDIS_DB="0"
```

## 🔐 Generating Secure Secrets

### JWT Secrets
```bash
# Generate secure random JWT secrets
openssl rand -base64 32
# Or using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### MFA Encryption Key
```bash
# Generate 32-byte encryption key
openssl rand -base64 32
```

## 📋 Environment Setup

### Development (.env.local)
```bash
# Copy this template and fill with secure values
JWT_ACCESS_SECRET="[GENERATED_SECRET_1]"
JWT_REFRESH_SECRET="[GENERATED_SECRET_2]"
MFA_ENCRYPTION_KEY="[GENERATED_32_BYTE_KEY]"
REDIS_URL="redis://localhost:6379"

# Optional JWT configuration
JWT_ACCESS_EXPIRY="15m"
JWT_REFRESH_EXPIRY="7d"
JWT_ISSUER="securewatch"
JWT_AUDIENCE="securewatch-api"

# Optional OAuth (if using external auth)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GOOGLE_CALLBACK_URL="/auth/google/callback"
MICROSOFT_CLIENT_ID=""
MICROSOFT_CLIENT_SECRET=""
MICROSOFT_CALLBACK_URL="/auth/microsoft/callback"
```

### Production
```bash
# Use secure secret management (AWS Secrets Manager, Azure Key Vault, etc.)
# Never store production secrets in plain text files
```

## 🛡️ Security Best Practices

### 1. Secret Management
- **Never commit secrets to version control**
- Use environment-specific secret management systems
- Rotate secrets regularly (recommended: every 90 days)
- Use different secrets for each environment

### 2. MFA Configuration
- MFA encryption keys must be unique per environment
- Store MFA secrets encrypted at rest
- Use Redis with persistence enabled for MFA storage

### 3. Redis Security
- Use Redis AUTH password in production
- Enable Redis persistence for session data
- Consider Redis Sentinel/Cluster for high availability

### 4. API Key Management
- API keys are validated against the database
- Implement proper expiration policies
- Log all API key usage for audit trails

### 5. Organization Isolation
- Organization ID validation prevents data leakage
- Super admin role can access multiple organizations
- All queries are scoped to authenticated user's organization

## 🔍 Security Validation

### Startup Validation
The application will validate security configuration at startup:

```bash
# These errors indicate missing required configuration:
Error: JWT_ACCESS_SECRET environment variable is required
Error: JWT_REFRESH_SECRET environment variable is required
Error: MFA_ENCRYPTION_KEY environment variable is required
Error: REDIS_URL or REDIS_HOST environment variable is required
```

### Runtime Security Checks
- JWT token validation with blacklisting
- MFA setup requires valid encrypted storage
- API key validation with database lookup
- Organization ID validation on all requests

## 🚨 Security Incident Response

### If Secrets Are Compromised
1. **Immediately rotate all affected secrets**
2. **Revoke all active sessions** using JWT blacklist
3. **Audit logs** for unauthorized access
4. **Reset MFA** for affected users
5. **Update environment variables** across all instances

### Monitoring & Alerting
- Monitor authentication failure rates
- Alert on API key validation failures
- Track organization ID validation violations
- Log all security events for audit

## 📖 Related Documentation

- [SECUREWATCH_BUG_ANALYSIS.md](SECUREWATCH_BUG_ANALYSIS.md) - Complete security analysis
- [CHANGELOG.md](CHANGELOG.md) - Security update details
- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) - Production deployment

## 🔗 Quick Links

- **Redis Setup**: [Redis Configuration Guide](https://redis.io/docs/getting-started/)
- **JWT Best Practices**: [JWT Security Guidelines](https://tools.ietf.org/html/rfc8725)
- **Environment Variables**: [Node.js Environment Guide](https://nodejs.org/en/learn/command-line/how-to-read-environment-variables-from-nodejs)

---

*Security Guide Updated: June 6, 2025*  
*SecureWatch SIEM v1.13.0*