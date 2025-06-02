import { DashboardConfig, DashboardShare, DashboardPermissions } from '../types/dashboard.types';

export interface SharingOptions {
  allowPublicSharing: boolean;
  maxSharedUsers: number;
  defaultExpirationDays: number;
  allowedRoles: string[];
  restrictedFields: string[];
}

export interface ShareRequest {
  dashboardId: string;
  shareWith: {
    type: 'user' | 'role' | 'team' | 'organization';
    id: string;
    name?: string;
  };
  permission: 'view' | 'edit' | 'admin';
  expiresAt?: string;
  message?: string;
}

export interface ShareLink {
  id: string;
  dashboardId: string;
  token: string;
  permission: 'view' | 'edit';
  expiresAt: string;
  createdBy: string;
  createdAt: string;
  lastAccessed?: string;
  accessCount: number;
  maxAccesses?: number;
}

export class DashboardSharingService {
  private shareLinks: Map<string, ShareLink> = new Map();
  private userPermissions: Map<string, string[]> = new Map(); // userId -> roleIds
  private options: SharingOptions;

  constructor(options: Partial<SharingOptions> = {}) {
    this.options = {
      allowPublicSharing: true,
      maxSharedUsers: 100,
      defaultExpirationDays: 30,
      allowedRoles: ['admin', 'editor', 'viewer'],
      restrictedFields: ['permissions.owner'],
      ...options
    };
  }

  // Share dashboard with specific users/roles
  async shareDashboard(
    dashboard: DashboardConfig,
    shareRequest: ShareRequest,
    requesterId: string
  ): Promise<DashboardConfig> {
    // Check if requester has permission to share
    if (!this.canShare(dashboard, requesterId)) {
      throw new Error('Insufficient permissions to share dashboard');
    }

    // Validate share request
    this.validateShareRequest(shareRequest, dashboard);

    // Check sharing limits
    if (dashboard.permissions.sharedWith.length >= this.options.maxSharedUsers) {
      throw new Error(`Cannot share with more than ${this.options.maxSharedUsers} users`);
    }

    // Check if already shared with this entity
    const existingShare = dashboard.permissions.sharedWith.find(
      share => share.type === shareRequest.shareWith.type && share.id === shareRequest.shareWith.id
    );

    let updatedShares: DashboardShare[];

    if (existingShare) {
      // Update existing share
      updatedShares = dashboard.permissions.sharedWith.map(share =>
        share.type === shareRequest.shareWith.type && share.id === shareRequest.shareWith.id
          ? { ...share, permission: shareRequest.permission, expiresAt: shareRequest.expiresAt }
          : share
      );
    } else {
      // Add new share
      const newShare: DashboardShare = {
        type: shareRequest.shareWith.type,
        id: shareRequest.shareWith.id,
        permission: shareRequest.permission,
        expiresAt: shareRequest.expiresAt
      };
      updatedShares = [...dashboard.permissions.sharedWith, newShare];
    }

    const updatedDashboard: DashboardConfig = {
      ...dashboard,
      permissions: {
        ...dashboard.permissions,
        sharedWith: updatedShares
      },
      updatedAt: new Date().toISOString(),
      version: dashboard.version + 1
    };

    return updatedDashboard;
  }

  // Remove sharing for a specific user/role
  async unshareDashboard(
    dashboard: DashboardConfig,
    shareTarget: { type: string; id: string },
    requesterId: string
  ): Promise<DashboardConfig> {
    if (!this.canShare(dashboard, requesterId)) {
      throw new Error('Insufficient permissions to modify sharing');
    }

    const updatedShares = dashboard.permissions.sharedWith.filter(
      share => !(share.type === shareTarget.type && share.id === shareTarget.id)
    );

    return {
      ...dashboard,
      permissions: {
        ...dashboard.permissions,
        sharedWith: updatedShares
      },
      updatedAt: new Date().toISOString(),
      version: dashboard.version + 1
    };
  }

  // Create shareable link
  async createShareLink(
    dashboard: DashboardConfig,
    requesterId: string,
    options: {
      permission: 'view' | 'edit';
      expiresInDays?: number;
      maxAccesses?: number;
    }
  ): Promise<ShareLink> {
    if (!this.canShare(dashboard, requesterId)) {
      throw new Error('Insufficient permissions to create share link');
    }

    if (!this.options.allowPublicSharing) {
      throw new Error('Public sharing is not enabled');
    }

    const linkId = this.generateId();
    const token = this.generateSecureToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (options.expiresInDays || this.options.defaultExpirationDays));

    const shareLink: ShareLink = {
      id: linkId,
      dashboardId: dashboard.id,
      token,
      permission: options.permission,
      expiresAt: expiresAt.toISOString(),
      createdBy: requesterId,
      createdAt: new Date().toISOString(),
      accessCount: 0,
      maxAccesses: options.maxAccesses
    };

    this.shareLinks.set(linkId, shareLink);
    return shareLink;
  }

  // Revoke share link
  async revokeShareLink(linkId: string, requesterId: string): Promise<void> {
    const shareLink = this.shareLinks.get(linkId);
    if (!shareLink) {
      throw new Error('Share link not found');
    }

    if (shareLink.createdBy !== requesterId) {
      throw new Error('Only the creator can revoke this share link');
    }

    this.shareLinks.delete(linkId);
  }

  // Access dashboard via share link
  async accessViaShareLink(token: string): Promise<{ dashboard: DashboardConfig; permission: string } | null> {
    const shareLink = Array.from(this.shareLinks.values()).find(link => link.token === token);
    
    if (!shareLink) {
      return null;
    }

    // Check if link has expired
    if (new Date() > new Date(shareLink.expiresAt)) {
      this.shareLinks.delete(shareLink.id);
      return null;
    }

    // Check access limits
    if (shareLink.maxAccesses && shareLink.accessCount >= shareLink.maxAccesses) {
      return null;
    }

    // Update access statistics
    shareLink.accessCount++;
    shareLink.lastAccessed = new Date().toISOString();

    // For this implementation, we'd need to fetch the dashboard
    // In a real implementation, this would query the database
    return {
      dashboard: {} as DashboardConfig, // Placeholder
      permission: shareLink.permission
    };
  }

  // Check user permissions
  canView(dashboard: DashboardConfig, userId: string): boolean {
    return this.hasPermission(dashboard, userId, 'view');
  }

  canEdit(dashboard: DashboardConfig, userId: string): boolean {
    return this.hasPermission(dashboard, userId, 'edit');
  }

  canShare(dashboard: DashboardConfig, userId: string): boolean {
    return this.hasPermission(dashboard, userId, 'admin') || dashboard.permissions.owner === userId;
  }

  // Get effective permissions for a user
  getUserPermissions(dashboard: DashboardConfig, userId: string): string[] {
    const permissions: string[] = [];

    // Owner has all permissions
    if (dashboard.permissions.owner === userId) {
      return ['view', 'edit', 'admin', 'delete'];
    }

    // Check direct user sharing
    const userShare = dashboard.permissions.sharedWith.find(
      share => share.type === 'user' && share.id === userId
    );

    if (userShare && this.isShareValid(userShare)) {
      permissions.push(userShare.permission);
      
      // Add implicit permissions
      if (userShare.permission === 'edit') {
        permissions.push('view');
      } else if (userShare.permission === 'admin') {
        permissions.push('view', 'edit');
      }
    }

    // Check role-based sharing
    const userRoles = this.userPermissions.get(userId) || [];
    for (const role of userRoles) {
      const roleShare = dashboard.permissions.sharedWith.find(
        share => share.type === 'role' && share.id === role
      );

      if (roleShare && this.isShareValid(roleShare)) {
        if (!permissions.includes(roleShare.permission)) {
          permissions.push(roleShare.permission);
          
          // Add implicit permissions
          if (roleShare.permission === 'edit' && !permissions.includes('view')) {
            permissions.push('view');
          } else if (roleShare.permission === 'admin') {
            if (!permissions.includes('view')) permissions.push('view');
            if (!permissions.includes('edit')) permissions.push('edit');
          }
        }
      }
    }

    // Check public access
    if (dashboard.permissions.isPublic) {
      if (!permissions.includes('view')) {
        permissions.push('view');
      }
    }

    return permissions;
  }

  // Get all shared dashboards for a user
  getSharedDashboards(userId: string, dashboards: DashboardConfig[]): DashboardConfig[] {
    return dashboards.filter(dashboard => this.canView(dashboard, userId));
  }

  // Set user roles (for role-based permissions)
  setUserRoles(userId: string, roleIds: string[]): void {
    this.userPermissions.set(userId, roleIds);
  }

  // Get share statistics
  getShareStatistics(dashboard: DashboardConfig): {
    totalShares: number;
    sharesByType: Record<string, number>;
    sharesByPermission: Record<string, number>;
    activeShares: number;
    expiredShares: number;
  } {
    const now = new Date();
    let activeShares = 0;
    let expiredShares = 0;
    const sharesByType: Record<string, number> = {};
    const sharesByPermission: Record<string, number> = {};

    dashboard.permissions.sharedWith.forEach(share => {
      // Count by type
      sharesByType[share.type] = (sharesByType[share.type] || 0) + 1;
      
      // Count by permission
      sharesByPermission[share.permission] = (sharesByPermission[share.permission] || 0) + 1;
      
      // Count active/expired
      if (share.expiresAt && new Date(share.expiresAt) < now) {
        expiredShares++;
      } else {
        activeShares++;
      }
    });

    return {
      totalShares: dashboard.permissions.sharedWith.length,
      sharesByType,
      sharesByPermission,
      activeShares,
      expiredShares
    };
  }

  // Clean up expired shares
  async cleanupExpiredShares(dashboard: DashboardConfig): Promise<DashboardConfig> {
    const now = new Date();
    const activeShares = dashboard.permissions.sharedWith.filter(
      share => !share.expiresAt || new Date(share.expiresAt) >= now
    );

    if (activeShares.length === dashboard.permissions.sharedWith.length) {
      return dashboard; // No changes needed
    }

    return {
      ...dashboard,
      permissions: {
        ...dashboard.permissions,
        sharedWith: activeShares
      },
      updatedAt: new Date().toISOString(),
      version: dashboard.version + 1
    };
  }

  // Private helper methods
  private hasPermission(dashboard: DashboardConfig, userId: string, requiredPermission: string): boolean {
    const userPermissions = this.getUserPermissions(dashboard, userId);
    return userPermissions.includes(requiredPermission);
  }

  private isShareValid(share: DashboardShare): boolean {
    if (share.expiresAt && new Date(share.expiresAt) < new Date()) {
      return false;
    }
    return true;
  }

  private validateShareRequest(shareRequest: ShareRequest, dashboard: DashboardConfig): void {
    if (!['view', 'edit', 'admin'].includes(shareRequest.permission)) {
      throw new Error('Invalid permission level');
    }

    if (!['user', 'role', 'team', 'organization'].includes(shareRequest.shareWith.type)) {
      throw new Error('Invalid share target type');
    }

    if (shareRequest.shareWith.type === 'role' && !this.options.allowedRoles.includes(shareRequest.shareWith.id)) {
      throw new Error(`Role '${shareRequest.shareWith.id}' is not allowed`);
    }

    if (shareRequest.expiresAt) {
      const expirationDate = new Date(shareRequest.expiresAt);
      if (expirationDate <= new Date()) {
        throw new Error('Expiration date must be in the future');
      }
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private generateSecureToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 32; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  }
}