import { NextResponse } from "next/server"
import dbConnect from "@/lib/db"
import Organization from "@/models/Organization"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id && !session?.user?.superAdmin) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }
    await dbConnect()

    const organizations = await Organization.find({})
      .populate("users", "name email role createdAt")
      .sort({ createdAt: -1 })
      .lean()

    return NextResponse.json({
      success: true,
      organizations: JSON.parse(JSON.stringify(organizations)),
    })
  } catch (error) {
    console.error("Error fetching organizations:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch organizations" }, { status: 500 })
  }
}
