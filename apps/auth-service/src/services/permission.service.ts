import { DatabaseService } from './database.service';
import logger from '../utils/logger';

export interface Permission {
  id: string;
  resource: string;
  action: string;
  description?: string;
  isSystem: boolean;
}

export interface Role {
  id: string;
  organizationId?: string;
  name: string;
  displayName?: string;
  description?: string;
  isSystem: boolean;
  isDefault: boolean;
  priority: number;
  permissions: Permission[];
}

export interface RoleAssignment {
  userId: string;
  roleId: string;
  assignedAt: Date;
  assignedBy?: string;
  expiresAt?: Date;
}

export class PermissionService {
  /**
   * Check if a user has specific permissions
   */
  static async checkPermissions(
    userId: string,
    organizationId: string,
    requiredPermissions: string[]
  ): Promise<boolean> {
    try {
      const userPermissions = await this.getUserPermissions(userId, organizationId);
      
      // Check if user has all required permissions
      return requiredPermissions.every(permission => 
        userPermissions.some(userPerm => 
          `${userPerm.resource}.${userPerm.action}` === permission ||
          `${userPerm.resource}.*` === permission ||
          permission === '*'
        )
      );
    } catch (error) {
      logger.error('Error checking permissions:', error);
      return false;
    }
  }

  /**
   * Get all permissions for a user
   */
  static async getUserPermissions(userId: string, organizationId: string): Promise<Permission[]> {
    try {
      const result = await DatabaseService.query(
        `SELECT DISTINCT p.id, p.resource, p.action, p.description, p.is_system
         FROM permissions p
         JOIN role_permissions rp ON p.id = rp.permission_id
         JOIN user_roles ur ON rp.role_id = ur.role_id
         JOIN roles r ON ur.role_id = r.id
         WHERE ur.user_id = $1 
           AND (r.organization_id = $2 OR r.organization_id IS NULL)
           AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
         ORDER BY p.resource, p.action`,
        [userId, organizationId]
      );

      return result.rows.map(row => ({
        id: row.id,
        resource: row.resource,
        action: row.action,
        description: row.description,
        isSystem: row.is_system,
      }));
    } catch (error) {
      logger.error('Error getting user permissions:', error);
      return [];
    }
  }

  /**
   * Get all roles for a user
   */
  static async getUserRoles(userId: string, organizationId: string): Promise<Role[]> {
    try {
      const result = await DatabaseService.query(
        `SELECT r.id, r.organization_id, r.name, r.display_name, r.description,
                r.is_system, r.is_default, r.priority
         FROM roles r
         JOIN user_roles ur ON r.id = ur.role_id
         WHERE ur.user_id = $1 
           AND (r.organization_id = $2 OR r.organization_id IS NULL)
           AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
         ORDER BY r.priority DESC`,
        [userId, organizationId]
      );

      const roles: Role[] = [];
      
      for (const row of result.rows) {
        const permissions = await this.getRolePermissions(row.id);
        
        roles.push({
          id: row.id,
          organizationId: row.organization_id,
          name: row.name,
          displayName: row.display_name,
          description: row.description,
          isSystem: row.is_system,
          isDefault: row.is_default,
          priority: row.priority,
          permissions,
        });
      }

      return roles;
    } catch (error) {
      logger.error('Error getting user roles:', error);
      return [];
    }
  }

  /**
   * Get permissions for a specific role
   */
  static async getRolePermissions(roleId: string): Promise<Permission[]> {
    try {
      const result = await DatabaseService.query(
        `SELECT p.id, p.resource, p.action, p.description, p.is_system
         FROM permissions p
         JOIN role_permissions rp ON p.id = rp.permission_id
         WHERE rp.role_id = $1
         ORDER BY p.resource, p.action`,
        [roleId]
      );

      return result.rows.map(row => ({
        id: row.id,
        resource: row.resource,
        action: row.action,
        description: row.description,
        isSystem: row.is_system,
      }));
    } catch (error) {
      logger.error('Error getting role permissions:', error);
      return [];
    }
  }

  /**
   * Create a new role
   */
  static async createRole(
    organizationId: string,
    roleData: {
      name: string;
      displayName?: string;
      description?: string;
      isDefault?: boolean;
      priority?: number;
    },
    createdBy: string
  ): Promise<Role> {
    try {
      const result = await DatabaseService.query(
        `INSERT INTO roles (
          organization_id, name, display_name, description, 
          is_default, priority, is_system
        ) VALUES ($1, $2, $3, $4, $5, $6, false)
        RETURNING *`,
        [
          organizationId,
          roleData.name,
          roleData.displayName || roleData.name,
          roleData.description,
          roleData.isDefault || false,
          roleData.priority || 0,
        ]
      );

      const role = result.rows[0];
      
      logger.info('Role created successfully', { 
        roleId: role.id, 
        name: role.name,
        createdBy 
      });

      return {
        id: role.id,
        organizationId: role.organization_id,
        name: role.name,
        displayName: role.display_name,
        description: role.description,
        isSystem: role.is_system,
        isDefault: role.is_default,
        priority: role.priority,
        permissions: [],
      };
    } catch (error) {
      logger.error('Error creating role:', error);
      throw new Error('Failed to create role');
    }
  }

  /**
   * Update a role
   */
  static async updateRole(
    roleId: string,
    updates: {
      displayName?: string;
      description?: string;
      isDefault?: boolean;
      priority?: number;
    },
    updatedBy: string
  ): Promise<void> {
    try {
      const setParts: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (updates.displayName !== undefined) {
        setParts.push(`display_name = $${paramCount++}`);
        values.push(updates.displayName);
      }
      if (updates.description !== undefined) {
        setParts.push(`description = $${paramCount++}`);
        values.push(updates.description);
      }
      if (updates.isDefault !== undefined) {
        setParts.push(`is_default = $${paramCount++}`);
        values.push(updates.isDefault);
      }
      if (updates.priority !== undefined) {
        setParts.push(`priority = $${paramCount++}`);
        values.push(updates.priority);
      }

      if (setParts.length === 0) {
        return;
      }

      values.push(roleId);

      await DatabaseService.query(
        `UPDATE roles SET ${setParts.join(', ')}, updated_at = NOW() 
         WHERE id = $${paramCount} AND is_system = false`,
        values
      );

      logger.info('Role updated successfully', { roleId, updatedBy });
    } catch (error) {
      logger.error('Error updating role:', error);
      throw new Error('Failed to update role');
    }
  }

  /**
   * Delete a role
   */
  static async deleteRole(roleId: string, deletedBy: string): Promise<void> {
    try {
      const result = await DatabaseService.query(
        'DELETE FROM roles WHERE id = $1 AND is_system = false RETURNING name',
        [roleId]
      );

      if (result.rows.length === 0) {
        throw new Error('Role not found or is a system role');
      }

      logger.info('Role deleted successfully', { 
        roleId, 
        roleName: result.rows[0].name,
        deletedBy 
      });
    } catch (error) {
      logger.error('Error deleting role:', error);
      throw new Error('Failed to delete role');
    }
  }

  /**
   * Assign permissions to a role
   */
  static async assignPermissionsToRole(
    roleId: string,
    permissionIds: string[],
    assignedBy: string
  ): Promise<void> {
    try {
      // Remove existing permissions
      await DatabaseService.query(
        'DELETE FROM role_permissions WHERE role_id = $1',
        [roleId]
      );

      // Add new permissions
      if (permissionIds.length > 0) {
        const values = permissionIds.map((permId, index) => 
          `('${roleId}', '${permId}', NOW(), '${assignedBy}')`
        ).join(', ');

        await DatabaseService.query(
          `INSERT INTO role_permissions (role_id, permission_id, granted_at, granted_by) 
           VALUES ${values}`
        );
      }

      logger.info('Permissions assigned to role', { 
        roleId, 
        permissionCount: permissionIds.length,
        assignedBy 
      });
    } catch (error) {
      logger.error('Error assigning permissions to role:', error);
      throw new Error('Failed to assign permissions to role');
    }
  }

  /**
   * Assign role to user
   */
  static async assignRoleToUser(
    userId: string,
    roleId: string,
    assignedBy: string,
    expiresAt?: Date
  ): Promise<void> {
    try {
      await DatabaseService.query(
        `INSERT INTO user_roles (user_id, role_id, assigned_by, expires_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, role_id) DO UPDATE SET
           assigned_by = $3,
           expires_at = $4,
           assigned_at = NOW()`,
        [userId, roleId, assignedBy, expiresAt]
      );

      logger.info('Role assigned to user', { userId, roleId, assignedBy });
    } catch (error) {
      logger.error('Error assigning role to user:', error);
      throw new Error('Failed to assign role to user');
    }
  }

  /**
   * Remove role from user
   */
  static async removeRoleFromUser(
    userId: string,
    roleId: string,
    removedBy: string
  ): Promise<void> {
    try {
      await DatabaseService.query(
        'DELETE FROM user_roles WHERE user_id = $1 AND role_id = $2',
        [userId, roleId]
      );

      logger.info('Role removed from user', { userId, roleId, removedBy });
    } catch (error) {
      logger.error('Error removing role from user:', error);
      throw new Error('Failed to remove role from user');
    }
  }

  /**
   * Get all available permissions
   */
  static async getAllPermissions(): Promise<Permission[]> {
    try {
      const result = await DatabaseService.query(
        'SELECT id, resource, action, description, is_system FROM permissions ORDER BY resource, action'
      );

      return result.rows.map(row => ({
        id: row.id,
        resource: row.resource,
        action: row.action,
        description: row.description,
        isSystem: row.is_system,
      }));
    } catch (error) {
      logger.error('Error getting all permissions:', error);
      return [];
    }
  }

  /**
   * Get all roles for an organization
   */
  static async getOrganizationRoles(organizationId: string): Promise<Role[]> {
    try {
      const result = await DatabaseService.query(
        `SELECT id, organization_id, name, display_name, description,
                is_system, is_default, priority
         FROM roles 
         WHERE organization_id = $1 OR organization_id IS NULL
         ORDER BY priority DESC, name`,
        [organizationId]
      );

      const roles: Role[] = [];
      
      for (const row of result.rows) {
        const permissions = await this.getRolePermissions(row.id);
        
        roles.push({
          id: row.id,
          organizationId: row.organization_id,
          name: row.name,
          displayName: row.display_name,
          description: row.description,
          isSystem: row.is_system,
          isDefault: row.is_default,
          priority: row.priority,
          permissions,
        });
      }

      return roles;
    } catch (error) {
      logger.error('Error getting organization roles:', error);
      return [];
    }
  }

  /**
   * Check if user has specific role
   */
  static async userHasRole(
    userId: string,
    roleName: string,
    organizationId: string
  ): Promise<boolean> {
    try {
      const result = await DatabaseService.query(
        `SELECT 1 FROM user_roles ur
         JOIN roles r ON ur.role_id = r.id
         WHERE ur.user_id = $1 
           AND r.name = $2
           AND (r.organization_id = $3 OR r.organization_id IS NULL)
           AND (ur.expires_at IS NULL OR ur.expires_at > NOW())`,
        [userId, roleName, organizationId]
      );

      return result.rows.length > 0;
    } catch (error) {
      logger.error('Error checking user role:', error);
      return false;
    }
  }

  /**
   * Get effective permissions for a user (includes role hierarchy)
   */
  static async getEffectivePermissions(
    userId: string,
    organizationId: string
  ): Promise<string[]> {
    try {
      const permissions = await this.getUserPermissions(userId, organizationId);
      
      // Convert to permission strings
      const permissionStrings = permissions.map(p => `${p.resource}.${p.action}`);
      
      // Add wildcard permissions for high-priority roles
      const roles = await this.getUserRoles(userId, organizationId);
      const highPriorityRoles = roles.filter(r => r.priority >= 900); // Admin roles
      
      if (highPriorityRoles.length > 0) {
        permissionStrings.push('*'); // Full access for super admins
      }

      return Array.from(new Set(permissionStrings)); // Remove duplicates
    } catch (error) {
      logger.error('Error getting effective permissions:', error);
      return [];
    }
  }
}