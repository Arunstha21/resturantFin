import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

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
};

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    if (!token) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    const role = token.role as "admin" | "manager" | "staff";
    const allowedPaths = accessMap[role] || [];

    // Find if any allowed path is a prefix of current route
    const isAllowed = allowedPaths.some((path) =>
      pathname === path || pathname.startsWith(`${path}/`)
    );

    if (!isAllowed) {
      return NextResponse.redirect(new URL("/dashboard/records", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/dashboard/:path*",
  ],
};
