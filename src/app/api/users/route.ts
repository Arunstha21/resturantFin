import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import dbConnect from "@/lib/db"
import User from "@/models/User"
import { authOptions } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 401 })
    }

    await dbConnect()

    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const skip = (page - 1) * limit

    const users = await User.find({ organization: session.user.organization }, { password: 0 }) // Exclude password field
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()

    const total = await User.countDocuments()

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
