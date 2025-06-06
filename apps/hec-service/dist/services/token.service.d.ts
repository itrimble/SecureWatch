import { HECToken, TokenUsageStats } from '../types/hec.types';
export declare class TokenService {
    private tokens;
    private usageStats;
    private tokenCache;
    private cacheTimeoutMs;
    constructor(cacheTimeoutMs?: number);
    private initializeDefaultTokens;
    private generateSecureToken;
    validateToken(tokenString: string): Promise<HECToken | null>;
    checkRateLimit(token: HECToken, requestedEvents: number): Promise<boolean>;
    updateUsageStats(tokenId: string, eventsCount: number, bytesCount: number, sources: string[], sourceTypes: string[], isSuccess?: boolean): Promise<void>;
    private updateTopSources;
    private updateTopSourceTypes;
    createToken(tokenData: Omit<HECToken, 'id' | 'token' | 'createdAt' | 'updatedAt' | 'usageCount'>): Promise<HECToken>;
    getAllTokens(): Promise<Omit<HECToken, 'token'>[]>;
    getAllUsageStats(): Promise<TokenUsageStats[]>;
    getTokenUsageStats(tokenId: string): Promise<TokenUsageStats | null>;
    deactivateToken(tokenId: string): Promise<boolean>;
    clearCache(): void;
}
//# sourceMappingURL=token.service.d.ts.map