import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import dbConnect from "@/lib/db"
import ExpenseRecord from "@/models/ExpenseRecord"
import { authOptions } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await dbConnect()

    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const skip = (page - 1) * limit

    const records = (await ExpenseRecord.find().sort({ date: -1, createdAt: -1 }).skip(skip).limit(limit).lean())
        .map((record) => {
            const { _id, ...rest } = record
            return {
                ...rest,
                _id: (_id as { toString: () => string }).toString(),
            }
        })

    const total = await ExpenseRecord.countDocuments()

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
    console.error("Error fetching expense records:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
