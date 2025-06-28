import { withAuth } from "next-auth/middleware"

export default withAuth(
  function middleware(req) {
    // Check if user is trying to access admin-only routes
    if (req.nextUrl.pathname.startsWith("/users")) {
      const token = req.nextauth.token
      if (!token || token.role !== "admin") {
        return new Response("Unauthorized", { status: 401 })
      }
    }
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  },
)

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/records/:path*",
    "/reports/:path*",
    "/users/:path*",
    "/api/records/:path*",
    "/api/dashboard/:path*",
    "/api/users/:path*",
  ],
}
