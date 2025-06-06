- I moved all the docs to the docs folder

# Project Context - SecureWatch SIEM Platform

## Recent Updates (June 6, 2025)

### 🛡️ Security Update v1.13.0 - CRITICAL FIXES COMPLETED
**ALL P0 SECURITY VULNERABILITIES RESOLVED**

#### ✅ Authentication Security Hardened
- **JWT Security**: Fixed hardcoded secrets, added environment variable validation
- **MFA Security**: Implemented Redis storage, fixed encryption key management  
- **API Key Authentication**: Complete validation system with database lookup
- **Token Refresh**: Fixed permission fetching vulnerability

#### ✅ Multi-tenant Security  
- **Organization ID Validation**: Prevents cross-tenant data access
- **Audit Logging**: Enhanced security event tracking
- **Production Ready**: Removed all development security bypasses

#### 📋 Required Environment Variables
```bash
JWT_ACCESS_SECRET="[secure-random-secret]"
JWT_REFRESH_SECRET="[secure-random-secret]" 
MFA_ENCRYPTION_KEY="[32-byte-base64-key]"
REDIS_URL="redis://localhost:6379"
```

#### 📖 Security Documentation
- `docs/SECUREWATCH_BUG_ANALYSIS.md` - Complete vulnerability analysis
- `docs/SECURITY_CONFIGURATION_GUIDE.md` - Environment setup guide
- `docs/CHANGELOG.md` - Security update details

### Build System Fixes
- Fixed TypeScript build errors across multiple packages:
  - analytics-api: Router type annotations and unused parameters
  - hec-service: Strict optional property types
  - rule-ingestor: Removed invalid dependency
- All packages now build successfully with `pnpm run build`

### Developer Tooling
- Added comprehensive Makefile with 30+ commands
- Enhanced docker-compose.dev.yml with resource limits
- Key commands:
  - `make up` - Start all services
  - `make status` - Check service health
  - `make dashboard` - Live monitoring
  - `make restart s=service-name` - Restart specific service

### Performance Features (Implemented)
- EventsTable virtualization with TanStack Virtual
- TimescaleDB continuous aggregates
- Query Processor async job handling
- Analytics API with specialized endpoints
- WebSocket real-time notifications