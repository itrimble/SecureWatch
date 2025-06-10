# Single Sign-On (SSO) Setup Guide

This guide provides step-by-step instructions for setting up SSO with Google, Microsoft, and Okta for the SecureWatch SIEM platform.

## Overview

The SecureWatch platform supports SSO integration with three major identity providers:
- **Google OAuth 2.0**
- **Microsoft Azure AD/Entra ID**
- **Okta**

## Prerequisites

1. Admin access to your identity provider (Google Workspace, Microsoft Azure AD, or Okta)
2. SecureWatch auth service deployed and accessible
3. Environment variables configured

## Environment Variables

Add the following environment variables to your auth service:

### Google OAuth
```bash
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=https://yourdomain.com/api/auth/oauth/google/callback
```

### Microsoft Azure AD
```bash
MICROSOFT_CLIENT_ID=your_microsoft_client_id
MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret
MICROSOFT_CALLBACK_URL=https://yourdomain.com/api/auth/oauth/microsoft/callback
MICROSOFT_TENANT=your_tenant_id_or_common
```

### Okta
```bash
OKTA_DOMAIN=your_okta_domain.okta.com
OKTA_CLIENT_ID=your_okta_client_id
OKTA_CLIENT_SECRET=your_okta_client_secret
OKTA_CALLBACK_URL=https://yourdomain.com/api/auth/oauth/okta/callback
```

### JWT Configuration
```bash
JWT_ACCESS_SECRET=your_jwt_access_secret
JWT_REFRESH_SECRET=your_jwt_refresh_secret
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
```

### Frontend Configuration
```bash
NEXT_PUBLIC_AUTH_SERVICE_URL=https://auth.yourdomain.com
FRONTEND_URL=https://yourdomain.com
```

## Provider Setup

### 1. Google OAuth Setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Select or create a project
3. Enable the Google+ API
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client IDs**
5. Configure the OAuth consent screen
6. Set up the OAuth 2.0 client:
   - **Application type**: Web application
   - **Authorized redirect URIs**: `https://yourdomain.com/api/auth/oauth/google/callback`
7. Copy the Client ID and Client Secret

### 2. Microsoft Azure AD Setup

1. Go to the [Azure Portal](https://portal.azure.com/)
2. Navigate to **Azure Active Directory** → **App registrations**
3. Click **New registration**
4. Configure the application:
   - **Name**: SecureWatch SIEM
   - **Supported account types**: Choose appropriate option
   - **Redirect URI**: `https://yourdomain.com/api/auth/oauth/microsoft/callback`
5. In the app registration:
   - Go to **Certificates & secrets** → Create a new client secret
   - Go to **API permissions** → Add Microsoft Graph permissions:
     - `User.Read`
     - `email`
     - `profile`
6. Copy the Application (client) ID, Directory (tenant) ID, and client secret

### 3. Okta Setup

1. Log in to your Okta Admin Console
2. Go to **Applications** → **Applications**
3. Click **Create App Integration**
4. Choose **OIDC - OpenID Connect** and **Web Application**
5. Configure the application:
   - **App integration name**: SecureWatch SIEM
   - **Grant type**: Authorization Code
   - **Sign-in redirect URIs**: `https://yourdomain.com/api/auth/oauth/okta/callback`
   - **Sign-out redirect URIs**: `https://yourdomain.com/auth`
6. In **Assignments**, assign the app to appropriate users/groups
7. Copy the Client ID and Client Secret

## Database Schema

Ensure your database has the required tables for OAuth accounts:

```sql
-- OAuth accounts table
CREATE TABLE oauth_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    provider_id VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    profile_data JSONB,
    access_token TEXT,
    refresh_token TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(provider, provider_id)
);

-- Index for faster lookups
CREATE INDEX idx_oauth_accounts_user_id ON oauth_accounts(user_id);
CREATE INDEX idx_oauth_accounts_provider ON oauth_accounts(provider, provider_id);
```

## Testing SSO Integration

1. **Install Dependencies**:
   ```bash
   cd apps/auth-service
   npm install
   ```

2. **Start the Auth Service**:
   ```bash
   npm run dev
   ```

3. **Test OAuth Endpoints**:
   - Google: `GET /api/auth/oauth/google`
   - Microsoft: `GET /api/auth/oauth/microsoft`
   - Okta: `GET /api/auth/oauth/okta`

4. **Frontend Testing**:
   Navigate to `/auth` and test the SSO buttons

## Security Considerations

1. **HTTPS Required**: Always use HTTPS in production
2. **Secure Cookies**: Configure secure, HTTP-only cookies for tokens
3. **CORS Configuration**: Properly configure CORS for your domains
4. **Token Validation**: Implement proper JWT validation
5. **Rate Limiting**: Enable rate limiting for auth endpoints
6. **Audit Logging**: All authentication events are logged for security

## Troubleshooting

### Common Issues

1. **Redirect URI Mismatch**: 
   - Ensure callback URLs match exactly in provider configuration
   - Check for trailing slashes and protocol (http vs https)

2. **CORS Errors**:
   - Configure CORS to allow your frontend domain
   - Ensure credentials are included in requests

3. **Token Issues**:
   - Verify JWT secrets are properly configured
   - Check token expiration times

4. **Provider-Specific Issues**:
   - **Google**: Ensure Google+ API is enabled
   - **Microsoft**: Check tenant configuration and API permissions
   - **Okta**: Verify user assignments and app configuration

### Debug Mode

Enable debug logging by setting:
```bash
NODE_ENV=development
LOG_LEVEL=debug
```

## Group/Role Mapping

The SSO implementation includes hooks for syncing groups/roles from identity providers:

- **Microsoft**: `syncAzureADGroups()` - Maps Azure AD groups to internal roles
- **Okta**: `syncOktaGroups()` - Maps Okta groups to internal roles

Implement these methods in `UserService` based on your organizational requirements.

## Support

For additional help with SSO setup:
1. Check the application logs for detailed error messages
2. Verify all environment variables are correctly set
3. Ensure database schema is up to date
4. Test with a simple OAuth flow first before adding complexity

## Next Steps

After SSO is working:
1. Implement role-based access control (RBAC)
2. Set up group synchronization
3. Configure MFA requirements
4. Implement session management
5. Set up audit logging and monitoring