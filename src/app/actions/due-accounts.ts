"use server"

import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import dbConnect from "@/lib/db"
import DueAccount from "@/models/DueAccount"
import IncomeRecord from "@/models/IncomeRecord"
import { dueAccountSchema, type DueAccountInput } from "@/lib/validations"
import { authOptions } from "@/lib/auth"

export async function createDueAccount(data: DueAccountInput) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

  const validatedData = dueAccountSchema.parse(data)

  await dbConnect()

  // Check if customer already exists
  const existingAccount = await DueAccount.findOne({
    customerName: { $regex: new RegExp(`^${validatedData.customerName}$`, "i") },
    isActive: true,
  })

  if (existingAccount) {
    throw new Error("Customer account already exists")
  }

  const account = await DueAccount.create({
    ...validatedData,
    totalDueAmount: 0,
    totalOrders: 0,
    pendingOrders: 0,
    lastOrderDate: new Date(),
    createdBy: session.user.id,
    isActive: true,
  })

  revalidatePath("/due-accounts")

  return { success: true, record: JSON.parse(JSON.stringify(account)) }
}

export async function updateDueAccount(id: string, data: DueAccountInput) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

  const validatedData = dueAccountSchema.parse(data)

  await dbConnect()

  const account = await DueAccount.findByIdAndUpdate(id, validatedData, { new: true })

  if (!account) {
    throw new Error("Account not found")
  }

  revalidatePath("/due-accounts")

  return { success: true, record: JSON.parse(JSON.stringify(account)) }
}

export async function deleteDueAccount(id: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

  await dbConnect()

  // Check if there are pending orders
  const pendingOrders = await IncomeRecord.countDocuments({
    dueAccountId: id,
    paymentStatus: "pending",
  })

  if (pendingOrders > 0) {
    throw new Error("Cannot delete account with pending orders. Please settle all dues first.")
  }

  const account = await DueAccount.findByIdAndUpdate(id, { isActive: false }, { new: true })

  if (!account) {
    throw new Error("Account not found")
  }

  revalidatePath("/due-accounts")

  return { success: true }
}

export async function getDueAccount(id: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

  await dbConnect()

  const account = await DueAccount.findById(id)
  if (!account) {
    throw new Error("Account not found")
  }

  const orders = await IncomeRecord.find({
    dueAccountId: id,
  })
    .sort({ date: -1 })

  const pendingOrders = orders.filter((order) => order.paymentStatus === "pending")
  const totalDueAmount = pendingOrders.reduce((sum, order) => sum + order.totalAmount, 0)

  return {
    ...account,
    _id: account._id.toString(),
    totalDueAmount,
    pendingOrdersCount: pendingOrders.length,
    orders: orders.map((order) => ({
      ...order,
      _id: order._id.toString(),
    })),
  }
}