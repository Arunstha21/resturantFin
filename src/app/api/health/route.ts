import { NextResponse } from "next/server"

/**
 * GET /api/health
 *
 * Simple health check endpoint for uptime monitoring and connectivity testing
 */

export async function GET() {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    server: "online",
  })
}

export async function HEAD() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  })
}
