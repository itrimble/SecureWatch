import { Strategy as OAuth2Strategy } from 'passport-oauth2';
import { authConfig } from '../../config/auth.config';
import { UserService } from '../user.service';
import { AuditService } from '../audit.service';
import { OAuthProfile } from '../../types/oauth.types';

export const createOktaStrategy = () => {
  return new OAuth2Strategy(
    {
      authorizationURL: `https://${authConfig.oauth.okta.domain}/oauth2/default/v1/authorize`,
      tokenURL: `https://${authConfig.oauth.okta.domain}/oauth2/default/v1/token`,
      clientID: authConfig.oauth.okta.clientId,
      clientSecret: authConfig.oauth.okta.clientSecret,
      callbackURL: authConfig.oauth.okta.callbackUrl,
      scope: 'openid profile email',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Fetch user profile from Okta
        const userInfoResponse = await fetch(`https://${authConfig.oauth.okta.domain}/oauth2/default/v1/userinfo`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json',
          },
        });

        if (!userInfoResponse.ok) {
          throw new Error(`Failed to fetch user info: ${userInfoResponse.statusText}`);
        }

        const userInfo = await userInfoResponse.json();

        const oauthProfile: OAuthProfile = {
          provider: 'okta',
          providerId: userInfo.sub,
          email: userInfo.email || '',
          emailVerified: userInfo.email_verified || false,
          firstName: userInfo.given_name,
          lastName: userInfo.family_name,
          displayName: userInfo.name || userInfo.preferred_username,
          avatarUrl: userInfo.picture,
          rawProfile: userInfo,
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
        await UserService.updateOAuthTokens(user.id, 'okta', {
          accessToken,
          refreshToken,
        });

        // Check for Okta groups/roles if available
        const groups = userInfo.groups || [];
        if (groups.length > 0) {
          await UserService.syncOktaGroups(user.id, groups);
        }

        // Log successful OAuth login
        await AuditService.logAuthEvent({
          userId: user.id,
          organizationId: user.organizationId,
          eventType: 'oauth_login',
          eventStatus: 'success',
          metadata: {
            provider: 'okta',
            email: user.email,
            domain: authConfig.oauth.okta.domain,
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
            provider: 'okta',
            domain: authConfig.oauth.okta.domain,
          },
        });

        done(error as Error);
      }
    }
  );
};