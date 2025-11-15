"use server"

import { getServerSession } from "next-auth"
import dbConnect from "@/lib/db"
import IncomeRecord from "@/models/IncomeRecord"
import ExpenseRecord from "@/models/ExpenseRecord"
import { authOptions } from "@/lib/auth"
import { getDateRange } from "@/lib/utils"
import type { DashboardStats, ChartData } from "@/types"

export async function getDashboardStats(dateFilter = "month"): Promise<DashboardStats> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

  await dbConnect()

  const { start, end } = getDateRange(dateFilter)

  const [incomeRecords, expenseRecords] = await Promise.all([
    IncomeRecord.find({
      date: { $gte: start, $lte: end },
      organization: session.user.organization,
    }),
    ExpenseRecord.find({
      date: { $gte: start, $lte: end },
      organization: session.user.organization,
    }),
  ])

  const totalIncome = incomeRecords.reduce((sum, record) => sum + record.totalAmount, 0)
  const totalExpenses = expenseRecords.reduce((sum, record) => sum + record.amount, 0)
  const pendingPaymentsCount = incomeRecords.filter((record) => record.paymentStatus === "pending").length

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
  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

  await dbConnect()

  const { start, end } = getDateRange(dateFilter)

  const [incomeRecords, expenseRecords] = await Promise.all([
    IncomeRecord.find({
      date: { $gte: start, $lte: end },
      organization: session.user.organization,
    }).sort({ date: 1 }),
    ExpenseRecord.find({
      date: { $gte: start, $lte: end },
      organization: session.user.organization,
    }).sort({ date: 1 }),
  ])

  // Group records by date
  const groupedData: Record<string, ChartData> = {}

  // Process income records
  incomeRecords.forEach((record) => {
    const dateKey = record.date.toISOString().split("T")[0]
    if (!groupedData[dateKey]) {
      groupedData[dateKey] = { date: dateKey, income: 0, expenses: 0, profit: 0, orders: 0 }
    }
    groupedData[dateKey].income += record.totalAmount
    groupedData[dateKey].orders += 1
  })

  // Process expense records
  expenseRecords.forEach((record) => {
    const dateKey = record.date.toISOString().split("T")[0]
    if (!groupedData[dateKey]) {
      groupedData[dateKey] = { date: dateKey, income: 0, expenses: 0, profit: 0, orders: 0 }
    }
    groupedData[dateKey].expenses += record.amount
  })

  // Calculate profit for each day
  Object.values(groupedData).forEach((data) => {
    data.profit = data.income - data.expenses
  })

  return Object.values(groupedData)
}
