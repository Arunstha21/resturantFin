"use server"

/**
 * Dashboard - Server actions for fetching dashboard statistics and chart data
 */

import { getServerSession } from "next-auth"
import dbConnect from "@/lib/db"
import IncomeRecord from "@/models/IncomeRecord"
import ExpenseRecord from "@/models/ExpenseRecord"
import { authOptions } from "@/lib/auth"
import { getDateRange } from "@/lib/utils"
import type { DashboardStats, ChartData } from "@/types"

/**
 * Dashboard data aggregation
 */

export async function getDashboardStats(dateFilter = "month"): Promise<DashboardStats> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")

  await dbConnect()
  const { start, end } = getDateRange(dateFilter)

  const [incomeRecords, expenseRecords] = await Promise.all([
    IncomeRecord.find({ date: { $gte: start, $lte: end }, organization: session.user.organization }),
    ExpenseRecord.find({ date: { $gte: start, $lte: end }, organization: session.user.organization }),
  ])

  const totalIncome = incomeRecords.reduce((sum, r) => sum + r.totalAmount, 0)
  const totalExpenses = expenseRecords.reduce((sum, r) => sum + r.amount, 0)
  const pendingPaymentsCount = incomeRecords.filter((r) => r.paymentStatus === "pending").length
  const averageOrderValue = incomeRecords.length > 0 ? totalIncome / incomeRecords.length : 0

  return {
    totalIncome,
    totalExpenses,
    netProfit: totalIncome - totalExpenses,
    ordersCount: incomeRecords.length,
    expensesCount: expenseRecords.length,
    averageOrderValue,
    pendingPaymentsCount,
  }
}

export async function getChartData(dateFilter = "month"): Promise<ChartData[]> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")

  await dbConnect()
  const { start, end } = getDateRange(dateFilter)

  const [incomeRecords, expenseRecords] = await Promise.all([
    IncomeRecord.find({ date: { $gte: start, $lte: end }, organization: session.user.organization }).sort({ date: 1 }),
    ExpenseRecord.find({ date: { $gte: start, $lte: end }, organization: session.user.organization }).sort({ date: 1 }),
  ])

  // Group by date
  const groupedData: Record<string, ChartData> = {}

  incomeRecords.forEach((record) => {
    const dateKey = record.date.toISOString().split("T")[0]
    if (!groupedData[dateKey]) {
      groupedData[dateKey] = { date: dateKey, income: 0, expenses: 0, profit: 0, orders: 0 }
    }
    groupedData[dateKey].income += record.totalAmount
    groupedData[dateKey].orders += 1
  })

  expenseRecords.forEach((record) => {
    const dateKey = record.date.toISOString().split("T")[0]
    if (!groupedData[dateKey]) {
      groupedData[dateKey] = { date: dateKey, income: 0, expenses: 0, profit: 0, orders: 0 }
    }
    groupedData[dateKey].expenses += record.amount
  })

  Object.values(groupedData).forEach((data) => {
    data.profit = data.income - data.expenses
  })

  return Object.values(groupedData)
}
