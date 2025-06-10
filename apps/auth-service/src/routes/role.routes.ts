import { Router } from 'express';
import { RoleController } from '../controllers/role.controller';
import { authenticate, authorize, requireRole } from '../middleware/rbac.middleware';
import { rateLimiter } from '../middleware/rate-limiter.middleware';

const router = Router();

// All role routes require authentication
router.use(authenticate);

// Get all roles (requires roles.view permission)
router.get('/', 
  authorize('roles.view'),
  RoleController.getRoles
);

// Get all available permissions (requires roles.view permission)
router.get('/permissions', 
  authorize('roles.view'),
  RoleController.getPermissions
);

// Create a new role (requires roles.create permission)
router.post('/', 
  rateLimiter('api'),
  authorize('roles.create'),
  RoleController.createRole
);

// Update a role (requires roles.update permission)
router.put('/:roleId', 
  rateLimiter('api'),
  authorize('roles.update'),
  RoleController.updateRole
);

// Delete a role (requires roles.delete permission)
router.delete('/:roleId', 
  rateLimiter('api'),
  authorize('roles.delete'),
  RoleController.deleteRole
);

// User role assignment routes

// Get user roles and permissions (requires users.view permission)
router.get('/users/:userId', 
  authorize('users.view'),
  RoleController.getUserRoles
);

// Assign role to user (requires users.manage_roles permission)
router.post('/users/:userId/roles/:roleId', 
  rateLimiter('api'),
  authorize('users.manage_roles'),
  RoleController.assignRoleToUser
);

// Remove role from user (requires users.manage_roles permission)
router.delete('/users/:userId/roles/:roleId', 
  rateLimiter('api'),
  authorize('users.manage_roles'),
  RoleController.removeRoleFromUser
);

export default router;