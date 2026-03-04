import { type NextRequest, NextResponse } from "next/server"
import MenuItem from "@/models/MenuItem"
import dbConnect from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import IncomeRecord from "@/models/IncomeRecord"
import type { MenuItemWithSales } from "@/types"
import { QUERY_PARAMS, ERROR_MESSAGES } from "@/lib/constants"

interface MenuItemQuery {
  organization: string
  category?: string
  isAvailable?: boolean
}

interface NormalizedMenuItem {
  item: any
  normalized: string
}

/**
 * GET /api/menu-items
 * Fetches menu items with popularity data based on sales history
 * Query params:
 * - category: Filter by category
 * - available: "true" to show only available items
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: ERROR_MESSAGES.UNAUTHORIZED }, { status: 401 })
    }

    await dbConnect()

    const { searchParams } = new URL(request.url)
    const category = searchParams.get(QUERY_PARAMS.CATEGORY)
    const available = searchParams.get(QUERY_PARAMS.AVAILABLE_ONLY)

    const query: MenuItemQuery = { organization: session.user.organization }

    if (category) query.category = category
    if (available === QUERY_PARAMS.AVAILABLE) query.isAvailable = true

    // Fetch menu items
    const menuItems = await MenuItem.find(query)
      .sort({ category: 1, name: 1 })
      .lean()

    // Normalize function for string matching
    const normalize = (str: string): string =>
      str
        .normalize("NFKC")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ")
        .replace(/[^a-z0-9\s]/g, "")
        .trim()

    // Build normalized menu map with caching (EFFICIENCY FIX)
    const normalizedMenuMap = new Map<string, NormalizedMenuItem>()
    menuItems.forEach((item) => {
      const key = normalize(String(item.name))
      normalizedMenuMap.set(key, { item, normalized: key })
    })

    // Fetch IncomeRecords for popularity calculation
    const allIncomeRecords = await IncomeRecord.find({
      organization: session.user.organization,
      paymentStatus: { $in: ["completed", "paid", "pending"] },
    }).lean()

    // Count total sold quantity per normalized name (single pass)
    const salesMap = new Map<string, number>()

    for (const record of allIncomeRecords) {
      if (!record.items || !Array.isArray(record.items)) continue

      for (const item of record.items) {
        const rawName = String(item.name || "").trim()
        if (!rawName) continue

        const key = normalize(rawName)
        const qty = Number(item.quantity) || 1
        salesMap.set(key, (salesMap.get(key) || 0) + qty)
      }
    }

    // Attach sales data to menu items with proper typing
    const menuWithSales: MenuItemWithSales[] = menuItems.map((item) => {
      const normalizedItem = normalizedMenuMap.get(normalize(String(item.name)))
      return {
        _id: String(item._id),
        name: String(item.name || ""),
        category: String(item.category || ""),
        incomeCategory: String(item.category || ""),
        totalSold: salesMap.get(normalizedItem?.normalized || "") || 0,
        price: Number(item.price) || 0,
        image: String(item.image || ""),
        isAvailable: Boolean(item.isAvailable),
      }
    })

    // Compute top 8 popular items
    const popularItems = menuWithSales
      .filter((item) => item.totalSold > 0)
      .sort((a, b) => b.totalSold - a.totalSold)
      .slice(0, 8)

    // Create set of popular item names for efficient lookup
    const popularKeys = new Set(
      popularItems.map((i) => normalize(i.name))
    )

    // Filter out popular items from regular categories
    const filteredMenuItems = menuWithSales.filter(
      (item) => !popularKeys.has(normalize(item.name))
    )

    // Final result with Popular category
    const finalMenu: MenuItemWithSales[] = [
      ...popularItems.map((i) => ({
        ...i,
        incomeCategory: "Popular",
      })),
      ...filteredMenuItems,
    ]

    return NextResponse.json({ menuItems: finalMenu }, { status: 200 })
  } catch (error) {
    console.error("Error fetching menu items with popularity:", error)
    return NextResponse.json(
      { error: ERROR_MESSAGES.INTERNAL_SERVER_ERROR },
      { status: 500 }
    )
  }
}
