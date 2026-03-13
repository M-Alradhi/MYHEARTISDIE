import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { verifySessionCookie } from "@/lib/utils/session"

const PUBLIC_PATHS = ["/", "/auth/login", "/auth/register", "/auth/forgot-password"]
const STATIC_PREFIXES = ["/api", "/_next", "/favicon.ico"]

const ROLE_PATH_MAP: Record<string, string> = {
  student: "/student",
  supervisor: "/supervisor",
  coordinator: "/coordinator",
}

function applySecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("X-XSS-Protection", "1; mode=block")
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()")
  response.headers.set("Content-Security-Policy", [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://*.firebaseapp.com https://*.googleapis.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://*.imgbb.com https://i.ibb.co https://*.googleapis.com https://*.googleusercontent.com",
    "connect-src 'self' https://*.firebaseio.com https://*.googleapis.com https://*.firebaseapp.com wss://*.firebaseio.com https://api.deepseek.com https://api.imgbb.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com",
    "frame-src 'self' https://*.firebaseapp.com https://accounts.google.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; "))
  response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
  return response
}

const pageRequestCounts = new Map<string, { count: number; resetAt: number }>()
const PAGE_RATE_LIMIT = 60
const PAGE_RATE_WINDOW = 60 * 1000

function isPageRateLimited(ip: string): boolean {
  const now = Date.now()
  const record = pageRequestCounts.get(ip)
  if (!record || now > record.resetAt) {
    pageRequestCounts.set(ip, { count: 1, resetAt: now + PAGE_RATE_WINDOW })
    return false
  }
  record.count++
  return record.count > PAGE_RATE_LIMIT
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (STATIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return applySecurityHeaders(NextResponse.next())
  }

  const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
  if (isPageRateLimited(clientIp)) {
    return new NextResponse("طلبات كثيرة جدا. حاول مرة اخرى بعد قليل.", {
      status: 429,
      headers: { "Retry-After": "60" },
    })
  }

  if (PUBLIC_PATHS.includes(pathname)) {
    return applySecurityHeaders(NextResponse.next())
  }

  const rawCookie = request.cookies.get("session_role")?.value
  const verifiedRole = rawCookie ? await verifySessionCookie(rawCookie) : null
  const isProtectedRoute = Object.values(ROLE_PATH_MAP).some((p) => pathname.startsWith(p))

  if (isProtectedRoute && !verifiedRole) {
    const loginUrl = new URL("/auth/login", request.url)
    loginUrl.searchParams.set("redirect", pathname)
    return applySecurityHeaders(NextResponse.redirect(loginUrl))
  }

  if (verifiedRole && isProtectedRoute) {
    const allowedPath = ROLE_PATH_MAP[verifiedRole]
    if (allowedPath && !pathname.startsWith(allowedPath)) {
      return applySecurityHeaders(NextResponse.redirect(new URL(`${allowedPath}/dashboard`, request.url)))
    }
  }

  return applySecurityHeaders(NextResponse.next())
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
