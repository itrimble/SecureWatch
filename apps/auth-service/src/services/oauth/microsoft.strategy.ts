import { Strategy as MicrosoftStrategy } from 'passport-microsoft';
import { authConfig } from '../../config/auth.config';
import { UserService } from '../user.service';
import { AuditService } from '../audit.service';
import { OAuthProfile } from '../../types/oauth.types';

export const createMicrosoftStrategy = () => {
  return new MicrosoftStrategy(
    {
      clientID: authConfig.oauth.microsoft.clientId,
      clientSecret: authConfig.oauth.microsoft.clientSecret,
      callbackURL: authConfig.oauth.microsoft.callbackUrl,
      tenant: authConfig.oauth.microsoft.tenant,
      scope: ['user.read', 'email', 'profile'],
      authorizationURL: `https://login.microsoftonline.com/${authConfig.oauth.microsoft.tenant}/oauth2/v2.0/authorize`,
      tokenURL: `https://login.microsoftonline.com/${authConfig.oauth.microsoft.tenant}/oauth2/v2.0/token`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const oauthProfile: OAuthProfile = {
          provider: 'microsoft',
          providerId: profile.id,
          email: profile.emails?.[0]?.value || profile._json.mail || profile._json.userPrincipalName || '',
          emailVerified: true, // Microsoft accounts are verified
          firstName: profile.name?.givenName || profile._json.givenName,
          lastName: profile.name?.familyName || profile._json.surname,
          displayName: profile.displayName || profile._json.displayName,
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
          } else {
            // Create new user
            user = await UserService.createFromOAuth(oauthProfile);
          }
        }

        // Update OAuth tokens
        await UserService.updateOAuthTokens(user.id, 'microsoft', {
          accessToken,
          refreshToken,
        });

        // Check for Azure AD groups/roles if available
        const groups = profile._json.groups || [];
        if (groups.length > 0) {
          await UserService.syncAzureADGroups(user.id, groups);
        }

        // Log successful OAuth login
        await AuditService.logAuthEvent({
          userId: user.id,
          organizationId: user.organizationId,
          eventType: 'oauth_login',
          eventStatus: 'success',
          metadata: {
            provider: 'microsoft',
            email: user.email,
            tenant: authConfig.oauth.microsoft.tenant,
          },
        });

        done(null, user);
      } catch (error) {
        // Log failed OAuth attempt
        await AuditService.logAuthEvent({
          eventType: 'oauth_login',
          eventStatus: 'failure',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          metadata: {
            provider: 'microsoft',
            profileId: profile.id,
          },
        });

        done(error as Error);
      }
    }
  );
};