"use server"

/**
 * Expense Records - Server actions for CRUD operations on expense records
 */

import { revalidatePath } from "next/cache"
import dbConnect from "@/lib/db"
import ExpenseRecord from "@/models/ExpenseRecord"
import { expenseRecordSchema, type ExpenseRecordInput } from "@/lib/validations"
import { requireAuth } from "@/lib/auth"
import { REVALIDATE_PATHS, ERROR_MESSAGES } from "@/lib/constants"

export async function createExpenseRecord(data: ExpenseRecordInput) {
  const { user } = await requireAuth()

  const validatedData = expenseRecordSchema.parse(data)
  await dbConnect()

  const record = await ExpenseRecord.create({
    ...validatedData,
    createdBy: user.id,
    organization: user.organization,
  })

  REVALIDATE_PATHS.DASHBOARD.forEach(path => revalidatePath(path))

  return { success: true, record: JSON.parse(JSON.stringify(record)) }
}

export async function updateExpenseRecord(id: string, data: ExpenseRecordInput) {
  await requireAuth()

  const validatedData = expenseRecordSchema.parse(data)
  await dbConnect()

  const record = await ExpenseRecord.findByIdAndUpdate(id, validatedData, { new: true })

  if (!record) {
    throw new Error(ERROR_MESSAGES.NOT_FOUND)
  }

  REVALIDATE_PATHS.DASHBOARD.forEach(path => revalidatePath(path))

  return { success: true, record: JSON.parse(JSON.stringify(record)) }
}

export async function deleteExpenseRecord(id: string) {
  await requireAuth()

  await dbConnect()
  const record = await ExpenseRecord.findByIdAndDelete(id)

  if (!record) {
    throw new Error(ERROR_MESSAGES.NOT_FOUND)
  }

  REVALIDATE_PATHS.DASHBOARD.forEach(path => revalidatePath(path))

  return { success: true }
}
