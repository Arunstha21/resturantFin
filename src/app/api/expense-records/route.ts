import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import dbConnect from "@/lib/db"
import ExpenseRecord from "@/models/ExpenseRecord"
import { authOptions } from "@/lib/auth"

/**
 * GET /api/expense-records
 *
 * Fetch expense records with role-based access control
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
          { date: { $gte: startOfToday, $lt: endOfToday } },
          { date: { $lt: startOfToday }, paymentStatus: "pending" },
        ],
      }
      countQuery = query
    }

    const records = (await ExpenseRecord.find(query)
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
    ).map((record) => {
      const { _id, ...rest } = record
      return { ...rest, _id: (_id as { toString: () => string }).toString() }
    })

    const total = await ExpenseRecord.countDocuments(countQuery)

    return NextResponse.json({
      records,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      userRole,
    })
  } catch (error) {
    console.error("Error fetching expense records:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
