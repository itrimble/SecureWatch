import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';

// Example: Protected API route that requires authentication
export async function GET(request: NextRequest) {
  return withAuth(request, async (req, context) => {
    // Access user info from context
    const { user } = context;
    
    return NextResponse.json({
      message: 'Successfully accessed protected route',
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      },
      timestamp: new Date().toISOString()
    });
  });
}

export async function POST(request: NextRequest) {
  return withAuth(request, async (req, context) => {
    const { user } = context;
    const body = await req.json();
    
    // Example: Log event with user context
    console.log(`User ${user.email} is creating an event log`);
    
    // Your event logging logic here
    return NextResponse.json({
      success: true,
      message: 'Event logged successfully',
      userId: user.id,
      data: body
    });
  });
}