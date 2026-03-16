// Middleware - Role-based access control and route protection
import { getToken } from "next-auth/jwt"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

/**
 * Role-based access control mapping
 * Defines which paths each role can access
 */
const accessMap: Record<string, string[]> = {
  admin: [
    "/dashboard",
    "/dashboard/records",
    "/dashboard/reports",
    "/dashboard/menu-management",
    "/dashboard/due-accounts",
    "/dashboard/users",
    "/dashboard/sales-analytics",
  ],
  manager: [
    "/dashboard",
    "/dashboard/records",
    "/dashboard/reports",
    "/dashboard/due-accounts",
  ],
  staff: [
    "/dashboard/records",
    "/dashboard/due-accounts",
  ],
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Get the JWT token - works with Turbopack
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

  if (!token) {
    return NextResponse.redirect(new URL("/", req.url))
  }

  const role = token.role as "admin" | "manager" | "staff"
  const allowedPaths = accessMap[role] || []

  // Check if current path is allowed for this role
  const isAllowed = allowedPaths.some((path) =>
    pathname === path || pathname.startsWith(`${path}/`)
  )

  if (!isAllowed) {
    return NextResponse.redirect(new URL("/dashboard/records", req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/dashboard/:path*",
  ],
}
