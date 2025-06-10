# Role-Based Access Control (RBAC) User Guide

This guide provides comprehensive documentation for the SecureWatch SIEM platform's Role-Based Access Control system.

## Overview

The SecureWatch RBAC system provides fine-grained access control through:
- **Roles**: Collections of permissions that can be assigned to users
- **Permissions**: Specific actions that can be performed on resources
- **Resources**: Different parts of the system (dashboards, logs, alerts, etc.)
- **Users**: Individual accounts that are assigned roles

## Key Concepts

### Permissions Structure
Permissions follow the format `resource.action`:
- `dashboard.view` - View dashboards
- `logs.search` - Search through log data
- `users.create` - Create new users
- `alerts.acknowledge` - Acknowledge security alerts

### Role Hierarchy
Roles have priority levels that determine precedence:
- **1000**: Super Administrator (full system access)
- **900**: Organization Administrator (full org access)
- **500**: Security Analyst (analyze security data)
- **400**: SOC Operator (monitor and respond)
- **300**: Auditor (read-only access)
- **100**: Viewer (basic read-only)

## Default Roles

### Super Administrator (`super_admin`)
- **Priority**: 1000
- **Scope**: System-wide access
- **Permissions**: All permissions (`*`)
- **Use Case**: Platform administrators and system maintainers

### Organization Administrator (`org_admin`)
- **Priority**: 900
- **Scope**: Organization-wide access
- **Key Permissions**:
  - All dashboard operations
  - User and role management
  - System configuration
  - All log and alert operations
- **Use Case**: Department heads and team leads

### Security Analyst (`security_analyst`)
- **Priority**: 500
- **Key Permissions**:
  - `dashboard.view`, `dashboard.create`, `dashboard.update`
  - `logs.view`, `logs.search`, `logs.export`
  - `alerts.view`, `alerts.create`, `alerts.update`, `alerts.acknowledge`
  - `system.view_audit`
- **Use Case**: Security professionals analyzing threats and incidents

### SOC Operator (`soc_operator`)
- **Priority**: 400
- **Key Permissions**:
  - `dashboard.view`
  - `logs.view`, `logs.search`
  - `alerts.view`, `alerts.acknowledge`
- **Use Case**: Security operations center staff monitoring alerts

### Auditor (`auditor`)
- **Priority**: 300
- **Key Permissions**:
  - `dashboard.view`
  - `logs.view`, `logs.search`, `logs.export`
  - `alerts.view`
  - `system.view_audit`
  - `users.view`
- **Use Case**: Compliance and audit personnel

### Viewer (`viewer`)
- **Priority**: 100
- **Key Permissions**:
  - `dashboard.view`
  - `logs.view`
  - `alerts.view`
- **Use Case**: Read-only access for stakeholders and executives

## Permission Categories

### Dashboard Permissions
- `dashboard.view` - View existing dashboards
- `dashboard.create` - Create new dashboards
- `dashboard.update` - Modify existing dashboards
- `dashboard.delete` - Delete dashboards

### Log Permissions
- `logs.view` - View log data
- `logs.search` - Search through logs
- `logs.export` - Export log data
- `logs.delete` - Delete log data (admin only)

### Alert Permissions
- `alerts.view` - View security alerts
- `alerts.create` - Create alert rules
- `alerts.update` - Modify alert rules
- `alerts.delete` - Delete alert rules
- `alerts.acknowledge` - Acknowledge and respond to alerts

### User Management Permissions
- `users.view` - View user information
- `users.create` - Create new user accounts
- `users.update` - Modify user accounts
- `users.delete` - Delete user accounts
- `users.manage_roles` - Assign and remove user roles

### Role Management Permissions
- `roles.view` - View roles and permissions
- `roles.create` - Create custom roles
- `roles.update` - Modify role definitions
- `roles.delete` - Delete custom roles

### System Permissions
- `system.view_config` - View system configuration
- `system.update_config` - Modify system settings
- `system.view_audit` - Access audit logs
- `system.manage_integrations` - Configure integrations

## Managing Roles

### Creating Custom Roles

1. Navigate to **Settings > RBAC**
2. Click **Create Role**
3. Fill in role details:
   - **Name**: Unique identifier (lowercase, underscores)
   - **Display Name**: Human-readable name
   - **Description**: Role purpose and scope
   - **Priority**: Numeric priority (higher = more privileged)
   - **Default Role**: Auto-assign to new users

4. Select permissions by resource category
5. Click **Create Role**

### Editing Roles

1. Go to **Settings > RBAC > Roles**
2. Click the **Edit** button for the desired role
3. Modify role properties and permissions
4. Click **Update Role**

**Note**: System roles cannot be edited or deleted.

### Deleting Roles

1. Go to **Settings > RBAC > Roles**
2. Click the **Delete** button for the custom role
3. Confirm deletion

**Warning**: Deleting a role will remove it from all assigned users.

## Assigning Roles to Users

### Through Role Management Interface

1. Go to **Settings > RBAC > User Assignment**
2. Select a user from the list
3. Choose roles to assign
4. Set optional expiration dates
5. Click **Assign Roles**

### Through User Management

1. Go to **Settings > Admin Users**
2. Select a user
3. Navigate to the **Roles** tab
4. Add or remove role assignments

### Programmatic Assignment

```typescript
// Using the API
await fetch('/api/auth/roles/users/:userId/roles/:roleId', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    expiresAt: '2024-12-31T23:59:59Z' // Optional
  })
})
```

## API Integration

### Authentication Methods

#### JWT Token Authentication
```bash
curl -H "Authorization: Bearer <jwt_token>" \
     https://api.securewatch.com/api/auth/roles
```

#### API Key Authentication
```bash
curl -H "X-API-Key: <api_key>" \
     https://api.securewatch.com/api/auth/roles
```

### Common API Endpoints

#### Get User Permissions
```bash
GET /api/auth/roles/users/:userId
```

#### Check User Permission
```typescript
const hasPermission = await PermissionService.checkPermissions(
  userId,
  organizationId,
  ['logs.search', 'alerts.view']
)
```

#### Create Role
```bash
POST /api/auth/roles
Content-Type: application/json

{
  "name": "custom_analyst",
  "displayName": "Custom Analyst",
  "description": "Custom role for specialized analysis",
  "priority": 450,
  "permissions": ["logs.view", "logs.search", "dashboard.view"]
}
```

## Middleware Usage

### Protecting Routes

```typescript
import { authenticate, authorize, requireRole } from '@/middleware/rbac.middleware'

// Require authentication
app.get('/protected', authenticate, handler)

// Require specific permissions
app.get('/logs', authenticate, authorize(['logs.view']), handler)

// Require specific roles
app.get('/admin', authenticate, requireRole(['org_admin', 'super_admin']), handler)

// Combined permission and role check
app.get('/sensitive', 
  authenticate, 
  authorizeWithRoles(['system.view_config'], ['org_admin']), 
  handler
)
```

### Organization Isolation

```typescript
// Ensure user belongs to the target organization
app.get('/org/:orgId/data', 
  authenticate, 
  requireOrgAccess(), 
  handler
)

// Custom organization extraction
app.post('/data', 
  authenticate, 
  requireOrgAccess((req) => req.body.organizationId), 
  handler
)
```

## Best Practices

### Role Design
1. **Principle of Least Privilege**: Grant only necessary permissions
2. **Role Composition**: Use multiple specific roles rather than one broad role
3. **Regular Review**: Periodically audit role assignments and permissions
4. **Clear Naming**: Use descriptive names for custom roles

### Permission Management
1. **Resource-Based**: Group permissions by logical resources
2. **Action Granularity**: Provide specific actions rather than broad access
3. **Documentation**: Document custom permissions and their use cases

### Security Considerations
1. **Role Expiration**: Set expiration dates for temporary access
2. **Audit Logging**: All role changes are automatically logged
3. **Session Management**: Permissions are checked on each request
4. **Organization Isolation**: Users can only access their organization's data

### Performance Optimization
1. **Permission Caching**: User permissions are cached in JWT tokens
2. **Database Indexing**: Role and permission lookups are optimized
3. **Efficient Queries**: Minimal database calls for permission checks

## Troubleshooting

### Common Issues

#### User Cannot Access Resource
1. Check user's role assignments
2. Verify role has required permissions
3. Confirm organization membership
4. Check role expiration dates

#### Permission Denied Errors
1. Review the specific permission required
2. Check user's effective permissions
3. Verify middleware configuration
4. Review audit logs for details

#### Role Assignment Issues
1. Confirm user exists in organization
2. Check role is not expired
3. Verify assigning user has `users.manage_roles` permission

### Debugging Tools

#### Check User Permissions
```bash
GET /api/auth/roles/users/:userId
```

#### Effective Permissions
```typescript
const permissions = await PermissionService.getEffectivePermissions(
  userId, 
  organizationId
)
console.log('User permissions:', permissions)
```

#### Audit Log Review
```bash
GET /api/auth/audit?eventType=role_assigned&userId=:userId
```

## Migration and Upgrades

### Adding New Permissions
1. Add permission to database schema
2. Update role definitions
3. Deploy backend changes
4. Update frontend permission checks

### Role Schema Changes
1. Create database migration
2. Update role assignment logic
3. Test with existing users
4. Deploy with backward compatibility

## Integration Examples

### Frontend Permission Checks
```typescript
// React component with permission check
import { usePermissions } from '@/hooks/usePermissions'

function LogExportButton() {
  const { hasPermission } = usePermissions()
  
  if (!hasPermission('logs.export')) {
    return null
  }
  
  return <Button onClick={exportLogs}>Export Logs</Button>
}
```

### Backend Route Protection
```typescript
// Express.js route with RBAC
app.get('/api/sensitive-data', 
  authenticate,
  authorize(['system.view_config']),
  async (req, res) => {
    // Only users with system.view_config permission can access
    const data = await getSensitiveData()
    res.json(data)
  }
)
```

## Support and Maintenance

### Regular Tasks
1. **Weekly**: Review new role assignments
2. **Monthly**: Audit user permissions and remove unused roles
3. **Quarterly**: Review and update role definitions
4. **Annually**: Comprehensive RBAC system audit

### Monitoring
- Track permission-denied events
- Monitor role assignment changes
- Review high-privilege role usage
- Alert on unusual access patterns

For additional support, refer to the audit logs or contact your system administrator.