import { type NextRequest, NextResponse } from "next/server"
import dbConnect from "@/lib/db"
import DueAccount from "@/models/DueAccount"
import IncomeRecord from "@/models/IncomeRecord"

export async function GET(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await dbConnect()

    const account = await DueAccount.findById(id).populate('organization', 'name')
    if (!account || !account.isActive) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 })
    }

    const pendingOrders = await IncomeRecord.find({
      dueAccountId: id,
      paymentStatus: "pending",
    })
      .sort({ date: -1 })

    const totalDueAmount = pendingOrders.reduce((sum, order) => {
      if (order.paymentMethod === "split") {
        const cash = order.cashAmount ?? 0;
        const digital = order.digitalAmount ?? 0;
        const remainingAmount = order.totalAmount - (cash + digital);
        return sum + remainingAmount;
      } else {
        return sum + order.totalAmount;
      }
    }, 0);

    // Return only necessary information for public view
    return NextResponse.json({
      success: true,
      account: {
        customerName: account.customerName,
        organization: (account.organization as any)?.name || "N/A",
        totalDueAmount,
        pendingOrdersCount: pendingOrders.length,
        lastOrderDate: account.lastOrderDate,
        orders: pendingOrders.map((order) => ({
          _id: order._id.toString(),
          date: order.date,
          totalAmount: order.paymentMethod === "split" ? order.totalAmount - (order.cashAmount + order.digitalAmount) : order.totalAmount,
          items: order.items,
          tableNumber: order.tableNumber,
          notes: order.notes,
        })),
      },
    })
  } catch (error) {
    console.error("Error fetching public due account:", error)
    return NextResponse.json({ error: "Failed to fetch account" }, { status: 500 })
  }
}
