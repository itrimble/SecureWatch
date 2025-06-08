import { Pool } from 'pg';
export interface User {
    id: string;
    email: string;
    passwordHash?: string;
    isActive: boolean;
    isEmailVerified: boolean;
    mfaEnabled: boolean;
    mfaSecret?: string;
    failedLoginAttempts: number;
    lockedUntil?: Date;
    lastLoginAt?: Date;
    createdAt: Date;
    updatedAt: Date;
    roles: string[];
    metadata?: Record<string, any>;
}
export interface CreateUserData {
    email: string;
    password?: string;
    isActive?: boolean;
    isEmailVerified?: boolean;
    roles?: string[];
    metadata?: Record<string, any>;
}
export declare class UserService {
    private db;
    constructor(database: Pool);
    createUser(userData: CreateUserData): Promise<User>;
    findUserByEmail(email: string): Promise<User | null>;
    findUserById(id: string): Promise<User | null>;
    updateUser(id: string, updates: Partial<User>): Promise<User>;
    verifyPassword(email: string, password: string): Promise<User | null>;
    isUserLocked(userId: string): Promise<boolean>;
    private incrementFailedLoginAttempts;
    private resetFailedLoginAttempts;
    private updateLastLogin;
    private mapDbUserToUser;
    private camelToSnake;
}
//# sourceMappingURL=user.service.d.ts.map