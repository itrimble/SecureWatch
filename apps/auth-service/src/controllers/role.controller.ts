import { Request, Response } from 'express';
import { PermissionService } from '../services/permission.service';
import { AuditService } from '../services/audit.service';
import logger from '../utils/logger';

interface AuthRequest extends Request {
  user?: {
    userId: string;
    organizationId: string;
    permissions: string[];
    roles: string[];
  };
}

export class RoleController {
  /**
   * Get all roles for the organization
   */
  static async getRoles(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const roles = await PermissionService.getOrganizationRoles(req.user.organizationId);
      
      res.json({
        success: true,
        data: roles,
      });
    } catch (error) {
      logger.error('Error getting roles:', error);
      res.status(500).json({ 
        error: 'Internal Server Error',
        message: 'Failed to retrieve roles'
      });
    }
  }

  /**
   * Create a new role
   */
  static async createRole(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const { name, displayName, description, isDefault, priority, permissions } = req.body;

      if (!name) {
        res.status(400).json({ 
          error: 'Bad Request',
          message: 'Role name is required'
        });
        return;
      }

      // Create the role
      const role = await PermissionService.createRole(
        req.user.organizationId,
        {
          name,
          displayName,
          description,
          isDefault,
          priority,
        },
        req.user.userId
      );

      // Assign permissions if provided
      if (permissions && Array.isArray(permissions) && permissions.length > 0) {
        await PermissionService.assignPermissionsToRole(
          role.id,
          permissions,
          req.user.userId
        );
      }

      // Log the creation
      await AuditService.logEvent({
        userId: req.user.userId,
        organizationId: req.user.organizationId,
        eventType: 'role_created',
        eventStatus: 'success',
        resourceType: 'role',
        resourceId: role.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        metadata: {
          roleName: name,
          permissionsCount: permissions?.length || 0,
        },
      });

      res.status(201).json({
        success: true,
        data: role,
        message: 'Role created successfully',
      });
    } catch (error) {
      logger.error('Error creating role:', error);
      
      // Log the failure
      if (req.user) {
        await AuditService.logEvent({
          userId: req.user.userId,
          organizationId: req.user.organizationId,
          eventType: 'role_creation_failed',
          eventStatus: 'failure',
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      res.status(500).json({ 
        error: 'Internal Server Error',
        message: 'Failed to create role'
      });
    }
  }

  /**
   * Update a role
   */
  static async updateRole(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const { roleId } = req.params;
      const { displayName, description, isDefault, priority, permissions } = req.body;

      if (!roleId) {
        res.status(400).json({ 
          error: 'Bad Request',
          message: 'Role ID is required'
        });
        return;
      }

      // Update role metadata
      await PermissionService.updateRole(
        roleId,
        {
          displayName,
          description,
          isDefault,
          priority,
        },
        req.user.userId
      );

      // Update permissions if provided
      if (permissions && Array.isArray(permissions)) {
        await PermissionService.assignPermissionsToRole(
          roleId,
          permissions,
          req.user.userId
        );
      }

      // Log the update
      await AuditService.logEvent({
        userId: req.user.userId,
        organizationId: req.user.organizationId,
        eventType: 'role_updated',
        eventStatus: 'success',
        resourceType: 'role',
        resourceId: roleId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        metadata: {
          updatedFields: Object.keys(req.body),
          permissionsCount: permissions?.length,
        },
      });

      res.json({
        success: true,
        message: 'Role updated successfully',
      });
    } catch (error) {
      logger.error('Error updating role:', error);
      
      // Log the failure
      if (req.user) {
        await AuditService.logEvent({
          userId: req.user.userId,
          organizationId: req.user.organizationId,
          eventType: 'role_update_failed',
          eventStatus: 'failure',
          resourceType: 'role',
          resourceId: req.params.roleId,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      res.status(500).json({ 
        error: 'Internal Server Error',
        message: 'Failed to update role'
      });
    }
  }

  /**
   * Delete a role
   */
  static async deleteRole(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const { roleId } = req.params;

      if (!roleId) {
        res.status(400).json({ 
          error: 'Bad Request',
          message: 'Role ID is required'
        });
        return;
      }

      await PermissionService.deleteRole(roleId, req.user.userId);

      // Log the deletion
      await AuditService.logEvent({
        userId: req.user.userId,
        organizationId: req.user.organizationId,
        eventType: 'role_deleted',
        eventStatus: 'success',
        resourceType: 'role',
        resourceId: roleId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.json({
        success: true,
        message: 'Role deleted successfully',
      });
    } catch (error) {
      logger.error('Error deleting role:', error);
      
      // Log the failure
      if (req.user) {
        await AuditService.logEvent({
          userId: req.user.userId,
          organizationId: req.user.organizationId,
          eventType: 'role_deletion_failed',
          eventStatus: 'failure',
          resourceType: 'role',
          resourceId: req.params.roleId,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      res.status(500).json({ 
        error: 'Internal Server Error',
        message: 'Failed to delete role'
      });
    }
  }

  /**
   * Get all available permissions
   */
  static async getPermissions(req: AuthRequest, res: Response): Promise<void> {
    try {
      const permissions = await PermissionService.getAllPermissions();
      
      // Group permissions by resource for easier UI consumption
      const groupedPermissions: Record<string, any[]> = {};
      
      permissions.forEach(permission => {
        if (!groupedPermissions[permission.resource]) {
          groupedPermissions[permission.resource] = [];
        }
        groupedPermissions[permission.resource].push({
          id: permission.id,
          action: permission.action,
          description: permission.description,
          isSystem: permission.isSystem,
        });
      });

      res.json({
        success: true,
        data: {
          permissions: groupedPermissions,
          total: permissions.length,
        },
      });
    } catch (error) {
      logger.error('Error getting permissions:', error);
      res.status(500).json({ 
        error: 'Internal Server Error',
        message: 'Failed to retrieve permissions'
      });
    }
  }

  /**
   * Assign role to user
   */
  static async assignRoleToUser(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const { userId, roleId } = req.params;
      const { expiresAt } = req.body;

      if (!userId || !roleId) {
        res.status(400).json({ 
          error: 'Bad Request',
          message: 'User ID and Role ID are required'
        });
        return;
      }

      const expiration = expiresAt ? new Date(expiresAt) : undefined;

      await PermissionService.assignRoleToUser(
        userId,
        roleId,
        req.user.userId,
        expiration
      );

      // Log the assignment
      await AuditService.logEvent({
        userId: req.user.userId,
        organizationId: req.user.organizationId,
        eventType: 'role_assigned',
        eventStatus: 'success',
        resourceType: 'user_role',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        metadata: {
          targetUserId: userId,
          roleId,
          expiresAt: expiration?.toISOString(),
        },
      });

      res.json({
        success: true,
        message: 'Role assigned to user successfully',
      });
    } catch (error) {
      logger.error('Error assigning role to user:', error);
      
      // Log the failure
      if (req.user) {
        await AuditService.logEvent({
          userId: req.user.userId,
          organizationId: req.user.organizationId,
          eventType: 'role_assignment_failed',
          eventStatus: 'failure',
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          metadata: {
            targetUserId: req.params.userId,
            roleId: req.params.roleId,
          },
        });
      }

      res.status(500).json({ 
        error: 'Internal Server Error',
        message: 'Failed to assign role to user'
      });
    }
  }

  /**
   * Remove role from user
   */
  static async removeRoleFromUser(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const { userId, roleId } = req.params;

      if (!userId || !roleId) {
        res.status(400).json({ 
          error: 'Bad Request',
          message: 'User ID and Role ID are required'
        });
        return;
      }

      await PermissionService.removeRoleFromUser(
        userId,
        roleId,
        req.user.userId
      );

      // Log the removal
      await AuditService.logEvent({
        userId: req.user.userId,
        organizationId: req.user.organizationId,
        eventType: 'role_removed',
        eventStatus: 'success',
        resourceType: 'user_role',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        metadata: {
          targetUserId: userId,
          roleId,
        },
      });

      res.json({
        success: true,
        message: 'Role removed from user successfully',
      });
    } catch (error) {
      logger.error('Error removing role from user:', error);
      
      // Log the failure
      if (req.user) {
        await AuditService.logEvent({
          userId: req.user.userId,
          organizationId: req.user.organizationId,
          eventType: 'role_removal_failed',
          eventStatus: 'failure',
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          metadata: {
            targetUserId: req.params.userId,
            roleId: req.params.roleId,
          },
        });
      }

      res.status(500).json({ 
        error: 'Internal Server Error',
        message: 'Failed to remove role from user'
      });
    }
  }

  /**
   * Get user roles and permissions
   */
  static async getUserRoles(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const { userId } = req.params;

      if (!userId) {
        res.status(400).json({ 
          error: 'Bad Request',
          message: 'User ID is required'
        });
        return;
      }

      const roles = await PermissionService.getUserRoles(userId, req.user.organizationId);
      const permissions = await PermissionService.getUserPermissions(userId, req.user.organizationId);

      res.json({
        success: true,
        data: {
          roles,
          permissions,
          effectivePermissions: await PermissionService.getEffectivePermissions(
            userId, 
            req.user.organizationId
          ),
        },
      });
    } catch (error) {
      logger.error('Error getting user roles:', error);
      res.status(500).json({ 
        error: 'Internal Server Error',
        message: 'Failed to retrieve user roles'
      });
    }
  }
}