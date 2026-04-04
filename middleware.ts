// middleware.ts
// Protects patient and doctor/admin routes.
// Uses 'jose' instead of 'jsonwebtoken' because middleware runs in Edge Runtime.

import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!)

// Routes that require doctor/admin auth
const PROTECTED_DOCTOR_ROUTES = ['/session', '/person-lookup', '/admin', '/domain-select']

// Routes that require patient auth
const PROTECTED_PATIENT_ROUTES = ['/patient/dashboard']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // ── Skip API routes — let them handle their own auth ─────────────────────
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // ── Patient routes ──────────────────────────────────────────────────────────
  if (PROTECTED_PATIENT_ROUTES.some(r => pathname.startsWith(r))) {
    const token = req.cookies.get('patient_token')?.value
    if (!token) {
      return NextResponse.redirect(new URL('/patient', req.url))
    }
    try {
      const { payload } = await jwtVerify(token, SECRET)
      if (payload.role !== 'PATIENT') throw new Error('Not patient')
      return NextResponse.next()
    } catch {
      const response = NextResponse.redirect(new URL('/patient', req.url))
      response.cookies.delete('patient_token')
      return response
    }
  }

  // ── Doctor / Admin routes ───────────────────────────────────────────────────
  if (PROTECTED_DOCTOR_ROUTES.some(r => pathname.startsWith(r))) {
    const token = req.cookies.get('auth_token')?.value
    if (!token) {
      return NextResponse.redirect(new URL('/login', req.url))
    }
    try {
      await jwtVerify(token, SECRET)
      return NextResponse.next()
    } catch {
      const response = NextResponse.redirect(new URL('/login', req.url))
      response.cookies.delete('auth_token')
      return response
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/session/:path*',
    '/person-lookup/:path*',
    '/admin/:path*',
    '/domain-select',
    '/domain-select/:path*',
    '/patient/dashboard',
    '/patient/dashboard/:path*',
  ]
}