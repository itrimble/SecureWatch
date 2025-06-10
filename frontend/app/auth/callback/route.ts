import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const token = searchParams.get('token')
  const error = searchParams.get('error')
  const next = searchParams.get('next') ?? '/dashboard'

  // Handle OAuth error
  if (error) {
    return NextResponse.redirect(`${origin}/auth?error=${encodeURIComponent(error)}`)
  }

  // Handle successful OAuth login
  if (token) {
    try {
      // Set the token as an HTTP-only cookie
      const response = NextResponse.redirect(`${origin}${next}`)
      
      // Set secure HTTP-only cookie
      response.cookies.set('auth-token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
      })

      // Also set user info if available
      const userInfo = searchParams.get('user')
      if (userInfo) {
        response.cookies.set('user-info', userInfo, {
          httpOnly: false, // Allow client-side access for user info
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7, // 7 days
          path: '/',
        })
      }

      return response
    } catch (error) {
      console.error('OAuth callback error:', error)
      return NextResponse.redirect(`${origin}/auth?error=callback_failed`)
    }
  }

  // No token provided - redirect to login
  return NextResponse.redirect(`${origin}/auth?error=no_token`)
}