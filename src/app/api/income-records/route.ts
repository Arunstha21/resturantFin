import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import dbConnect from "@/lib/db"
import IncomeRecord from "@/models/IncomeRecord"
import { authOptions } from "@/lib/auth"

/**
 * GET /api/income-records
 *
 * Fetch income records with role-based access control:
 * - Admin: All records
 * - Manager/Staff: Today's records + pending older records
 *
 * Query params: page, limit, forReport
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userRole = session.user.role

    if (!userRole || !["admin", "manager", "staff"].includes(userRole.toLowerCase())) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    await dbConnect()

    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "500")
    const forReport = searchParams.get("forReport") === "true"
    const skip = (page - 1) * limit

    let query: any = { organization: session.user.organization }
    let countQuery: any = {}

    // Role-based filtering: managers/staff only see today + pending older records
    if (forReport !== true && (userRole.toLowerCase() === "manager" || userRole.toLowerCase() === "staff")) {
      const today = new Date()
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)

      query = {
        organization: session.user.organization,
        $or: [
          { date: { $gte: startOfToday, $lt: endOfToday } }, // Today's records
          { date: { $lt: startOfToday }, paymentStatus: "pending" }, // Pending older records
        ],
      }
      countQuery = query
    }

    const records = await IncomeRecord.find(query)
      .sort({ paymentStatus: -1, date: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()

    const total = await IncomeRecord.countDocuments(countQuery)

    return NextResponse.json({
      records,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error("Error fetching income records:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
