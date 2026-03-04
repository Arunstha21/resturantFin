"use server"

/**
 * Income Records - Server actions for CRUD operations on income records
 */

import { revalidatePath } from "next/cache"
import dbConnect from "@/lib/db"
import IncomeRecord from "@/models/IncomeRecord"
import { incomeRecordSchema, type IncomeRecordInput } from "@/lib/validations"
import { requireAuth } from "@/lib/auth"
import { REVALIDATE_PATHS, ERROR_MESSAGES } from "@/lib/constants"

export async function createIncomeRecord(data: IncomeRecordInput) {
  const { user } = await requireAuth()

  const cleanedData = {
    ...data,
    dueAccountId: data.dueAccountId && data.dueAccountId.trim() !== "" ? data.dueAccountId : undefined,
    isDueAccount: data.isDueAccount && data.dueAccountId && data.dueAccountId.trim() !== "",
  }

  const validatedData = incomeRecordSchema.parse(cleanedData)
  await dbConnect()

  const record = await IncomeRecord.create({
    ...validatedData,
    createdBy: user.id,
    organization: user.organization,
  })

  REVALIDATE_PATHS.DASHBOARD.forEach(path => revalidatePath(path))

  return { success: true, record: JSON.parse(JSON.stringify(record)) }
}

export async function updateIncomeRecord(id: string, data: IncomeRecordInput) {
  await requireAuth()

  const cleanedData = {
    ...data,
    dueAccountId: data.dueAccountId && data.dueAccountId.trim() !== "" ? data.dueAccountId : undefined,
    isDueAccount: data.isDueAccount && data.dueAccountId && data.dueAccountId.trim() !== "",
  }

  const validatedData = incomeRecordSchema.parse(cleanedData)
  await dbConnect()

  const record = await IncomeRecord.findByIdAndUpdate(id, validatedData, { new: true })

  if (!record) {
    throw new Error(ERROR_MESSAGES.NOT_FOUND)
  }

  REVALIDATE_PATHS.DASHBOARD.forEach(path => revalidatePath(path))

  return { success: true, record: JSON.parse(JSON.stringify(record)) }
}

export async function deleteIncomeRecord(id: string) {
  await requireAuth()

  await dbConnect()
  const record = await IncomeRecord.findByIdAndDelete(id)

  if (!record) {
    throw new Error(ERROR_MESSAGES.NOT_FOUND)
  }

  REVALIDATE_PATHS.DASHBOARD.forEach(path => revalidatePath(path))

  return { success: true }
}
