import { type NextRequest, NextResponse } from "next/server"
import MenuItem from "@/models/MenuItem"
import dbConnect from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    await dbConnect()

    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category")
    const available = searchParams.get("available")

    const query: any = {}

    if (category) {
      query.category = category
    }

    if (available === "true") {
      query.isAvailable = true
    }

    const menuItems = await MenuItem.find(query).sort({ category: 1, name: 1 }).lean()

    return NextResponse.json({ menuItems })
  } catch (error) {
    console.error("Error fetching menu items:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
