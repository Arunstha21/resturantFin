import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import dbConnect from "@/lib/db"
import IncomeRecord from "@/models/IncomeRecord"
import { authOptions } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Assuming the session contains role information
    const userRole = session.user.role // You might need to adjust this based on your session structure

    if (!userRole || !["admin", "manager", "staff"].includes(userRole.toLowerCase())) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    await dbConnect()

    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "150")
    const skip = (page - 1) * limit

    let query = {}
    let countQuery = {}

    // Apply role-based filtering
    if (userRole.toLowerCase() === "manager") {
      // Get today's date range (start and end of today)
      const today = new Date()
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)

      // Manager can see:
      // 1. All records from today
      // 2. All old records with pending payment status
      query = {
        $or: [
          {
            // Today's records (all payment statuses)
            date: {
              $gte: startOfToday,
              $lt: endOfToday,
            },
          },
          {
            // Old records with pending status
            date: { $lt: startOfToday },
            paymentStatus: "pending",
          },
        ],
      }
      countQuery = query
    }
    // Admin has access to all records (no additional filtering needed)

    const records = await IncomeRecord.find(query)
      .sort({ paymentStatus: -1, date: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()

    const total = await IncomeRecord.countDocuments(countQuery)

    return NextResponse.json({
      records,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching income records:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
