import { type NextRequest, NextResponse } from "next/server"
import MenuItem from "@/models/MenuItem"
import dbConnect from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import IncomeRecord from "@/models/IncomeRecord"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await dbConnect()

    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category")
    const available = searchParams.get("available")

    const query: any = { organization: session.user.organization }

    if (category) query.category = category
    if (available === "true") query.isAvailable = true

    // Fetch menu items
    const menuItems = await MenuItem.find(query)
      .sort({ category: 1, name: 1 })
      .lean()

    // ---- STEP 1: Normalize function (KEY FIX) ----
    const normalize = (str: string) =>
      str
        .normalize("NFKC")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ") // remove duplicate spaces
        .replace(/[^a-z0-9\s]/g, "") // remove punctuation for matching
        .trim()

    // Map normalized name => actual menu item
    const normalizedMenuMap = new Map()
    menuItems.forEach((item) => {
      const key = normalize(String(item.name))
      normalizedMenuMap.set(key, item)
    })

    // Fetch IncomeRecords for popularity calc
    const allIncomeRecords = await IncomeRecord.find({
      organization: session.user.organization,
      paymentStatus: { $in: ["completed", "paid", "pending"] },
    }).lean()

    // ---- STEP 2: Count total sold quantity per normalized name ----
    const salesMap = new Map<string, number>()

    allIncomeRecords.forEach((record) => {
      if (!record.items || !Array.isArray(record.items)) return

      record.items.forEach((item: any) => {
        const rawName = String(item.name || "").trim()
        if (!rawName) return

        const key = normalize(rawName)
        const qty = Number(item.quantity) || 1

        salesMap.set(key, (salesMap.get(key) || 0) + qty)
      })
    })

    // ---- STEP 3: Attach sales to menu items ----
    const menuWithSales = menuItems.map((item): { _id: string; name: string; category: string; totalSold: number, price: number,  image: string, isAvailable: boolean, incomeCategory: string} => {
      const key = normalize(String(item.name))
      return {
        _id: String((item as any)._id),
        name: String((item as any).name || ""),
        category: String((item as any).category || ""),
        totalSold: salesMap.get(key) || 0,
        price: Number((item as any).price) || 0,
        image: String((item as any).image || ""),
        isAvailable: Boolean((item as any).isAvailable),
        incomeCategory: String((item as any).category || ""),
      }
    })

    // ---- STEP 4: Compute top 6 popular ----
    const popularItems = menuWithSales
      .filter((item) => item.totalSold > 0)
      .sort((a, b) => b.totalSold - a.totalSold) // DESCENDING
      .slice(0, 8)

    // ---- STEP 5: Remove popular from other categories ----
    const popularKeys = new Set(
      popularItems.map((i) => normalize(i.name))
    )

    const filteredMenuItems = menuWithSales.filter(
      (item) => !popularKeys.has(normalize(item.name))
    )

    // ---- STEP 6: Final result with Popular category ----
    const finalMenu = [
      ...popularItems.map((i) => ({
        ...i,
        incomeCategory: "Popular",
      })),
      ...filteredMenuItems,
    ]

    return NextResponse.json({ menuItems: finalMenu }, { status: 200 })
  } catch (error) {
    console.error("Error fetching menu items with popularity:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
