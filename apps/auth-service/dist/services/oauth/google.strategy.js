import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { authConfig } from '../../config/auth.config';
import { UserService } from '../user.service';
import { AuditService } from '../audit.service';
export const createGoogleStrategy = () => {
    return new GoogleStrategy({
        clientID: authConfig.oauth.google.clientId,
        clientSecret: authConfig.oauth.google.clientSecret,
        callbackURL: authConfig.oauth.google.callbackUrl,
        scope: ['profile', 'email'],
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            const oauthProfile = {
                provider: 'google',
                providerId: profile.id,
                email: profile.emails?.[0]?.value || '',
                emailVerified: profile.emails?.[0]?.verified || false,
                firstName: profile.name?.givenName,
                lastName: profile.name?.familyName,
                displayName: profile.displayName,
                avatarUrl: profile.photos?.[0]?.value,
                rawProfile: profile._json,
            };
            // Find or create user
            let user = await UserService.findByOAuthProfile(oauthProfile);
            if (!user) {
                // Check if user with this email exists
                const existingUser = await UserService.findByEmail(oauthProfile.email);
                if (existingUser) {
                    // Link OAuth profile to existing user
                    await UserService.linkOAuthProfile(existingUser.id, oauthProfile);
                    user = existingUser;
                }
                else {
                    // Create new user
                    user = await UserService.createFromOAuth(oauthProfile);
                }
            }
            // Update OAuth tokens
            await UserService.updateOAuthTokens(user.id, 'google', {
                accessToken,
                refreshToken,
            });
            // Log successful OAuth login
            await AuditService.logAuthEvent({
                userId: user.id,
                organizationId: user.organizationId,
                eventType: 'oauth_login',
                eventStatus: 'success',
                metadata: {
                    provider: 'google',
                    email: user.email,
                },
            });
            done(null, user);
        }
        catch (error) {
            // Log failed OAuth attempt
            await AuditService.logAuthEvent({
                eventType: 'oauth_login',
                eventStatus: 'failure',
                errorMessage: error instanceof Error ? error.message : 'Unknown error',
                metadata: {
                    provider: 'google',
                    profileId: profile.id,
                },
            });
            done(error);
        }
    });
};
//# sourceMappingURL=google.strategy.js.map