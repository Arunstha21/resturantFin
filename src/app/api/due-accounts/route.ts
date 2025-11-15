import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import dbConnect from "@/lib/db"
import DueAccount from "@/models/DueAccount"
import IncomeRecord from "@/models/IncomeRecord"
import { authOptions } from "@/lib/auth"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await dbConnect()

    // Get all active due accounts
    const dueAccounts = await DueAccount.find({ isActive: true, organization: session.user.organization })

    const accountsWithOrders = await Promise.all(
      dueAccounts.map(async (accountDoc) => {
        const account = accountDoc.toObject()

        const pendingOrdersDocs = await IncomeRecord.find({
          dueAccountId: account._id,
          paymentStatus: "pending",
          organization: session.user.organization,
        }).sort({ date: -1 })

        const pendingOrders = pendingOrdersDocs.map((orderDoc) => {
          const order = orderDoc.toObject()
          return {
            ...order,
            _id: order._id.toString(),
            totalAmount: order.paymentMethod === "split" ? order.totalAmount - (order.cashAmount + order.digitalAmount) : order.totalAmount,
          }
        })

        const totalDueAmount = pendingOrders.reduce((sum, order) => sum + order.totalAmount, 0);

        return {
          ...account,
          _id: account._id.toString(),
          totalDueAmount,
          pendingOrdersCount: pendingOrders.length,
          orders: pendingOrders,
        }
      })
    )

    return NextResponse.json({
      success: true,
      accounts: accountsWithOrders,
    })
  } catch (error) {
    console.error("Error fetching due accounts:", error)
    return NextResponse.json({ error: "Failed to fetch due accounts" }, { status: 500 })
  }
}