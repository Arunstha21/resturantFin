"use server"

import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import dbConnect from "@/lib/db"
import ExpenseRecord from "@/models/ExpenseRecord"
import { expenseRecordSchema, type ExpenseRecordInput } from "@/lib/validations"
import { authOptions } from "@/lib/auth"

export async function createExpenseRecord(data: ExpenseRecordInput) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

  const validatedData = expenseRecordSchema.parse(data)

  await dbConnect()

  const record = await ExpenseRecord.create({
    ...validatedData,
    createdBy: session.user.id,
  })

  revalidatePath("/dashboard")
  revalidatePath("/records")

  return { success: true, record: JSON.parse(JSON.stringify(record)) }
}

export async function updateExpenseRecord(id: string, data: ExpenseRecordInput) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

  const validatedData = expenseRecordSchema.parse(data)

  await dbConnect()

  const record = await ExpenseRecord.findByIdAndUpdate(id, validatedData, { new: true })

  if (!record) {
    throw new Error("Record not found")
  }

  revalidatePath("/dashboard")
  revalidatePath("/records")

  return { success: true, record: JSON.parse(JSON.stringify(record)) }
}

export async function deleteExpenseRecord(id: string) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

  await dbConnect()

  const record = await ExpenseRecord.findByIdAndDelete(id)

  if (!record) {
    throw new Error("Record not found")
  }

  revalidatePath("/dashboard")
  revalidatePath("/records")

  return { success: true }
}
