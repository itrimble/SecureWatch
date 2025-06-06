- I moved all the docs to the docs folder

# Project Context - SecureWatch SIEM Platform

## Recent Updates (June 6, 2025)

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