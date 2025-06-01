import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// This function runs before every request
export async function middleware(request: NextRequest) {
  // Skip auth for public routes and static files
  const publicPaths = [
    '/api/health',
    '/api/status',
    '/_next',
    '/static',
    '/favicon.ico',
    '/',
    '/login',
    '/auth'
  ];
  
  const path = request.nextUrl.pathname;
  
  // Allow public paths
  if (publicPaths.some(p => path.startsWith(p))) {
    return NextResponse.next();
  }

  // For API routes, check authentication
  if (path.startsWith('/api')) {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // JWT verification happens in individual API routes
    // This is just a basic check for presence of auth header
  }

  return NextResponse.next();
}

// Configure which routes use this middleware
export const config = {
  matcher: [
    // Match all paths except static files
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ]
};