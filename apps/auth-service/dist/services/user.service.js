import bcrypt from 'bcrypt';
import { authConfig } from '../config/auth.config';
export class UserService {
    db;
    constructor(database) {
        this.db = database;
    }
    async createUser(userData) {
        const { email, password, isActive = false, isEmailVerified = false, roles = ['user'], metadata = {} } = userData;
        let passwordHash = null;
        if (password) {
            passwordHash = await bcrypt.hash(password, authConfig.bcrypt.saltRounds);
        }
        const query = `
      INSERT INTO users (
        email, password_hash, is_active, is_email_verified, 
        mfa_enabled, failed_login_attempts, roles, metadata,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      RETURNING *
    `;
        const values = [
            email,
            passwordHash,
            isActive,
            isEmailVerified,
            false, // mfa_enabled
            0, // failed_login_attempts
            JSON.stringify(roles),
            JSON.stringify(metadata)
        ];
        const result = await this.db.query(query, values);
        return this.mapDbUserToUser(result.rows[0]);
    }
    async findUserByEmail(email) {
        const query = 'SELECT * FROM users WHERE email = $1';
        const result = await this.db.query(query, [email]);
        if (result.rows.length === 0) {
            return null;
        }
        return this.mapDbUserToUser(result.rows[0]);
    }
    async findUserById(id) {
        const query = 'SELECT * FROM users WHERE id = $1';
        const result = await this.db.query(query, [id]);
        if (result.rows.length === 0) {
            return null;
        }
        return this.mapDbUserToUser(result.rows[0]);
    }
    async updateUser(id, updates) {
        const setClause = [];
        const values = [];
        let paramCount = 1;
        for (const [key, value] of Object.entries(updates)) {
            if (value !== undefined) {
                const dbKey = this.camelToSnake(key);
                if (key === 'roles' || key === 'metadata') {
                    setClause.push(`${dbKey} = $${paramCount}`);
                    values.push(JSON.stringify(value));
                }
                else {
                    setClause.push(`${dbKey} = $${paramCount}`);
                    values.push(value);
                }
                paramCount++;
            }
        }
        setClause.push(`updated_at = NOW()`);
        values.push(id);
        const query = `
      UPDATE users 
      SET ${setClause.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
        const result = await this.db.query(query, values);
        return this.mapDbUserToUser(result.rows[0]);
    }
    async verifyPassword(email, password) {
        const user = await this.findUserByEmail(email);
        if (!user || !user.passwordHash) {
            return null;
        }
        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
            // Increment failed login attempts
            await this.incrementFailedLoginAttempts(user.id);
            return null;
        }
        // Reset failed login attempts on successful login
        await this.resetFailedLoginAttempts(user.id);
        await this.updateLastLogin(user.id);
        return user;
    }
    async isUserLocked(userId) {
        const user = await this.findUserById(userId);
        if (!user)
            return false;
        if (user.lockedUntil && user.lockedUntil > new Date()) {
            return true;
        }
        if (user.failedLoginAttempts >= authConfig.security.maxLoginAttempts) {
            // Lock the user
            const lockUntil = new Date();
            lockUntil.setMinutes(lockUntil.getMinutes() + 30); // 30 minutes lock
            await this.updateUser(userId, { lockedUntil: lockUntil });
            return true;
        }
        return false;
    }
    async incrementFailedLoginAttempts(userId) {
        const query = `
      UPDATE users 
      SET failed_login_attempts = failed_login_attempts + 1, updated_at = NOW()
      WHERE id = $1
    `;
        await this.db.query(query, [userId]);
    }
    async resetFailedLoginAttempts(userId) {
        const query = `
      UPDATE users 
      SET failed_login_attempts = 0, locked_until = NULL, updated_at = NOW()
      WHERE id = $1
    `;
        await this.db.query(query, [userId]);
    }
    async updateLastLogin(userId) {
        const query = `
      UPDATE users 
      SET last_login_at = NOW(), updated_at = NOW()
      WHERE id = $1
    `;
        await this.db.query(query, [userId]);
    }
    mapDbUserToUser(dbUser) {
        return {
            id: dbUser.id,
            email: dbUser.email,
            passwordHash: dbUser.password_hash,
            isActive: dbUser.is_active,
            isEmailVerified: dbUser.is_email_verified,
            mfaEnabled: dbUser.mfa_enabled,
            mfaSecret: dbUser.mfa_secret,
            failedLoginAttempts: dbUser.failed_login_attempts,
            lockedUntil: dbUser.locked_until,
            lastLoginAt: dbUser.last_login_at,
            createdAt: dbUser.created_at,
            updatedAt: dbUser.updated_at,
            roles: dbUser.roles ? JSON.parse(dbUser.roles) : ['user'],
            metadata: dbUser.metadata ? JSON.parse(dbUser.metadata) : {}
        };
    }
    camelToSnake(str) {
        return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    }
}
//# sourceMappingURL=user.service.js.map