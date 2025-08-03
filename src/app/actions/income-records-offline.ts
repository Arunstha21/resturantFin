"use server"

import { revalidatePath } from "next/cache"
import type { IncomeRecordInput } from "@/lib/validations"
import { OfflineAPI } from "@/lib/offline/offline-api"

// Updated server actions that work with offline mode
export async function createIncomeRecordOffline(data: IncomeRecordInput) {
  try {
    // Try the offline-aware API first
    const result = await OfflineAPI.createIncomeRecord(data)

    if (result.success) {
      revalidatePath("/dashboard")
      revalidatePath("/dashboard/records")
    }

    return result
  } catch (error) {
    console.error("Error in createIncomeRecordOffline:", error)
    throw error
  }
}

export async function updateIncomeRecordOffline(id: string, data: IncomeRecordInput) {
  try {
    const result = await OfflineAPI.updateIncomeRecord(id, data)

    if (result.success) {
      revalidatePath("/dashboard")
      revalidatePath("/dashboard/records")
    }

    return result
  } catch (error) {
    console.error("Error in updateIncomeRecordOffline:", error)
    throw error
  }
}

export async function deleteIncomeRecordOffline(id: string) {
  try {
    const result = await OfflineAPI.deleteIncomeRecord(id)

    if (result.success) {
      revalidatePath("/dashboard")
      revalidatePath("/dashboard/records")
    }

    return result
  } catch (error) {
    console.error("Error in deleteIncomeRecordOffline:", error)
    throw error
  }
}
