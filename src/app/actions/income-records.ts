"use server"

import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import dbConnect from "@/lib/db"
import IncomeRecord from "@/models/IncomeRecord"
import { incomeRecordSchema, type IncomeRecordInput } from "@/lib/validations"
import { authOptions } from "@/lib/auth"

export async function createIncomeRecord(data: IncomeRecordInput) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

  const cleanedData = {
    ...data,
    dueAccountId: data.dueAccountId && data.dueAccountId.trim() !== "" ? data.dueAccountId : undefined,
    isDueAccount: data.isDueAccount && data.dueAccountId && data.dueAccountId.trim() !== "",
  }

  const validatedData = incomeRecordSchema.parse(cleanedData)

  await dbConnect()

  const record = await IncomeRecord.create({
    ...validatedData,
    createdBy: session.user.id,
  })

  revalidatePath("/dashboard")
  revalidatePath("/records")

  return { success: true, record: JSON.parse(JSON.stringify(record)) }
}

export async function updateIncomeRecord(id: string, data: IncomeRecordInput) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

  const cleanedData = {
    ...data,
    dueAccountId: data.dueAccountId && data.dueAccountId.trim() !== "" ? data.dueAccountId : undefined,
    isDueAccount: data.isDueAccount && data.dueAccountId && data.dueAccountId.trim() !== "",
  }

  const validatedData = incomeRecordSchema.parse(cleanedData)

  await dbConnect()

  const record = await IncomeRecord.findByIdAndUpdate(id, validatedData, { new: true })

  if (!record) {
    throw new Error("Record not found")
  }

  revalidatePath("/dashboard")
  revalidatePath("/records")

  return { success: true, record: JSON.parse(JSON.stringify(record)) }
}

export async function deleteIncomeRecord(id: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

  await dbConnect()

  const record = await IncomeRecord.findByIdAndDelete(id)

  if (!record) {
    throw new Error("Record not found")
  }

  revalidatePath("/dashboard")
  revalidatePath("/records")

  return { success: true }
}
