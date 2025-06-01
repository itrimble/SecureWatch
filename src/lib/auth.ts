import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { jwtVerify, importSPKI } from 'jose';

// Initialize Supabase Admin client for JWT verification
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Cache for the Supabase JWT public key
let cachedPublicKey: any = null;
let cacheExpiry = 0;

async function getSupabasePublicKey() {
  const now = Date.now();
  
  // Return cached key if still valid (cache for 1 hour)
  if (cachedPublicKey && now < cacheExpiry) {
    return cachedPublicKey;
  }

  try {
    // Fetch the JWT public key from Supabase
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/jwks`
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch JWKS');
    }

    const jwks = await response.json();
    const key = jwks.keys[0];
    
    // Convert JWKS to public key
    cachedPublicKey = await importSPKI(
      `-----BEGIN PUBLIC KEY-----
${key.x5c[0]}
-----END PUBLIC KEY-----`,
      'RS256'
    );
    
    cacheExpiry = now + 3600000; // Cache for 1 hour
    return cachedPublicKey;  } catch (error) {
    console.error('Error fetching Supabase public key:', error);
    throw error;
  }
}

export async function verifySupabaseJWT(token: string) {
  try {
    const publicKey = await getSupabasePublicKey();
    
    // Verify the JWT
    const { payload } = await jwtVerify(token, publicKey, {
      issuer: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1`,
      audience: 'authenticated',
    });
    
    return {
      valid: true,
      payload,
      userId: payload.sub as string,
      email: payload.email as string,
      role: payload.role as string,
    };
  } catch (error) {
    console.error('JWT verification failed:', error);
    return { valid: false, error };
  }
}

// Middleware function for API routes
export async function withAuth(
  request: NextRequest,
  handler: (req: NextRequest, context: any) => Promise<NextResponse>
) {
  // Extract the token from Authorization header
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Missing or invalid authorization header' },
      { status: 401 }
    );
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  
  // Verify the JWT
  const verification = await verifySupabaseJWT(token);  
  if (!verification.valid) {
    return NextResponse.json(
      { error: 'Invalid or expired token' },
      { status: 401 }
    );
  }

  // Add user info to request context
  const context = {
    user: {
      id: verification.userId,
      email: verification.email,
      role: verification.role,
    }
  };

  // Call the actual handler with user context
  return handler(request, context);
}