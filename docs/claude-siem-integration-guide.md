# Claude.md - SIEM Integration Project Guide

## Project Overview & Claude's Role

### Purpose
Integrating a modern v0-based frontend with Supabase authentication into an existing event logger (SIEM) backend to create a unified, secure, and user-friendly event logging platform.

### Claude Capabilities in This Project
- **Code Integration Analysis**: Review and merge frontend/backend codebases
- **Authentication Flow Design**: Supabase JWT verification with backend authorization
- **API Design**: Define clear communication patterns between components
- **Repository Management**: Git workflow recommendations and branch strategies
- **Security Assessment**: Ensure authentication remains secure during integration
- **Documentation**: Maintain comprehensive integration documentation

## Project Components

### Backend Repository
- **Name**: EventLogTutorialThriveDX
- **URL**: https://github.com/itrimble/EventLogTutorialThriveDX
- **Role**: Core event logging, storage, and SIEM functionality
- **Technology**: [To be documented - check with filesystem MCP]

### Frontend Repository  
- **Name**: v0-splunk-clone
- **URL**: https://github.com/itrimble/v0-splunk-clone
- **Role**: Modern UI with Supabase authentication
- **Technology**: v0-generated React/Next.js with Supabase integration
- **Auth**: GitHub OAuth via Supabase

### External Services
- **Supabase**: Authentication provider and potential backend services
- **Vercel**: Frontend deployment platform
- **Integration URL**: https://vercel.com/ian-trimbles-projects/v0-splunk-clone/stores/integration/supabase/store_2VEoeUjml0gJtGWd/settings

## Available MCP Tools & Usage Patterns

### Primary Tools for This Project
```markdown
- `filesystem`: Read/analyze both repositories, manage file operations
- `github`: Repository management, branch creation, PR workflows  
- `taskmaster-ai`: Break down integration tasks and track progress
- `openmemory`: Store integration decisions and project context
- `browser_*`: Test integrated application functionality
- `desktop-commander`: Manage development workspace
```

### Tool Usage Guidelines
1. **Always start with context**: Check `openmemory` for previous integration decisions
2. **Repository analysis**: Use `filesystem` and `github` tools to understand current state
3. **Task breakdown**: Use `taskmaster-ai` for complex integration planning
4. **Testing validation**: Use browser tools to verify authentication flows
5. **Progress tracking**: Update `openmemory` with integration milestones

## Integration Requirements & Constraints

### Non-Negotiable Requirements
- ✅ **Feature Parity**: No loss of existing functionality
- ✅ **Authentication Preservation**: Supabase + GitHub OAuth must remain intact
- ✅ **Security Maintenance**: JWT verification and secure API communication
- ✅ **Seamless UX**: No disruption to user authentication flow

### Integration Goals
- 🎯 Unified application combining frontend + backend
- 🎯 Clear API separation (Supabase for auth, backend for events)
- 🎯 Maintainable code organization
- 🎯 Scalable architecture for future development

## Code Standards & Integration Patterns

### Repository Management
```markdown
## Recommended Integration Strategy
1. Create `integration` or `blended` branch in backend repo
2. Add frontend as git subtree or submodule
3. Establish clear API boundaries
4. Implement Supabase JWT verification in backend
5. Test authentication flow end-to-end
```

### Authentication Flow Architecture
```markdown
## Proposed Flow
1. User authenticates via Supabase (GitHub OAuth)
2. Frontend receives Supabase JWT
3. Frontend sends JWT with API requests to backend
4. Backend verifies JWT with Supabase public key
5. Backend authorizes user for event logging operations
```

### API Design Principles
- **Authentication**: All requests to backend include Supabase JWT
- **Authorization**: Backend validates JWT and user permissions
- **Error Handling**: Consistent error responses across all endpoints
- **Rate Limiting**: Implement appropriate limits for event logging APIs

## Common Workflows

### Integration Analysis Workflow
```markdown
1. Repository Assessment:
   - `github get_file_contents` for both repos
   - `filesystem read_file` for key configuration files
   - Document current architecture in `openmemory`

2. Authentication Review:
   - Analyze Supabase integration in frontend
   - Identify backend authentication requirements
   - Design JWT verification strategy

3. API Planning:
   - Map frontend data needs to backend capabilities
   - Define new API endpoints if needed
   - Plan migration strategy for existing features
```

### Integration Implementation Workflow
```markdown
1. Preparation:
   - `taskmaster-ai add_task` for integration milestones
   - Create integration branch via `github create_branch`
   - Backup current configurations

2. Code Integration:
   - Merge frontend components using `filesystem` operations
   - Implement JWT verification in backend
   - Update API endpoints for frontend compatibility

3. Testing & Validation:
   - `browser_*` tools for authentication flow testing
   - Verify all existing features work correctly
   - Test new integrated functionality
```

### Troubleshooting Workflow
```markdown
1. Issue Identification:
   - Check `openmemory` for similar previous issues
   - Use `browser_console_messages` for frontend errors
   - Review backend logs for authentication failures

2. Root Cause Analysis:
   - If issue recurs >2 times, investigate underlying cause
   - Document solution in `openmemory` for future reference

3. Solution Implementation:
   - Apply fix with clear rationale
   - Update integration documentation
   - Add test cases to prevent regression
```

## Communication Style & Response Patterns

### For Integration Questions
- **Be Specific**: Provide step-by-step integration instructions
- **Cite Sources**: Reference Supabase docs, v0 documentation, and security best practices
- **Explain Rationale**: Justify architectural decisions, especially for authentication
- **Verify Understanding**: Confirm integration approach before implementation

### For Code Review
- **Check Duplicates**: Before adding functionality, verify it doesn't exist
- **Security Focus**: Pay special attention to authentication and authorization code
- **Integration Impact**: Consider how changes affect both frontend and backend
- **Performance**: Ensure integration doesn't degrade existing performance

### For Problem Solving
- **Progressive Approach**: Start with smallest viable integration steps
- **Fallback Plans**: Always have rollback strategy for critical changes
- **Documentation**: Update integration guide as solutions are implemented

## Context Management

### Memory Storage Priorities
```markdown
## High Priority (Always Store)
- Integration architecture decisions
- Authentication flow configurations  
- API endpoint mappings
- Security implementation details
- Testing results and validation steps

## Medium Priority (Store When Relevant)
- Performance optimization discoveries
- Deployment configuration changes
- Third-party service integration notes

## Low Priority (Store If Recurring)
- Routine troubleshooting steps
- Standard development workflow notes
```

### Context Review Triggers
- Before starting any integration work
- When authentication issues arise  
- Before making architectural changes
- When planning new feature additions

## Success Metrics

### Integration Completion Criteria
- [ ] All existing frontend features functional
- [ ] All existing backend features preserved
- [ ] Supabase authentication working seamlessly  
- [ ] JWT verification implemented in backend
- [ ] API communication established between components
- [ ] Documentation updated for integrated system
- [ ] Testing suite validates end-to-end functionality

### Ongoing Maintenance
- Regular security reviews of authentication flow
- Performance monitoring of integrated system
- Documentation updates as system evolves
- User feedback integration for UX improvements