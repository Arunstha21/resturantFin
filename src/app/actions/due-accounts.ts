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
    organization: session.user.organization,
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

export async function duePaymentTransaction(id: string, paymentAmount: number, paymentMethod: "cash" | "digital") {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }
  if (paymentAmount <= 0) throw new Error("Payment amount must be greater than 0")
  await dbConnect()
  
  const pendingOrdersDocs = await IncomeRecord.find({
    dueAccountId: id,
    paymentStatus: "pending",
  }).sort({ date: 1 })

  let remainingPayment = paymentAmount

  for (const order of pendingOrdersDocs) {
    if (remainingPayment <= 0) break

    const paidAmount = (order.cashAmount || 0) + (order.digitalAmount || 0)
    const unpaidAmount = order.totalAmount - paidAmount
    if (unpaidAmount <= 0) continue

    const paymentForThisOrder = Math.min(unpaidAmount, remainingPayment)

    if (paymentForThisOrder < unpaidAmount || ((order.cashAmount || 0) > 0 || (order.digitalAmount || 0) > 0)) {
      order.paymentMethod = "split"
    } else if ((order.cashAmount || 0) === 0 && (order.digitalAmount || 0) === 0) {
      order.paymentMethod = paymentMethod
    } else {
      order.paymentMethod = paymentMethod
    }

    if (paymentMethod === "cash") {
      order.cashAmount = (order.cashAmount || 0) + paymentForThisOrder
    } else if (paymentMethod === "digital") {
      order.digitalAmount = (order.digitalAmount || 0) + paymentForThisOrder
    } else {
      throw new Error("Invalid payment method")
    }

    if (((order.cashAmount || 0) + (order.digitalAmount || 0)) >= order.totalAmount) {
      order.paymentStatus = "completed"
    }
  
    await order.save()
    remainingPayment -= paymentForThisOrder
  }

  revalidatePath("/due-accounts")

  return { 
    success: true, 
    paidAmount: paymentAmount - remainingPayment, 
    remainingPayment 
  }
}