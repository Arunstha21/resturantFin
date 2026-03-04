"use server"

/**
 * Menu Items - Server actions for CRUD operations on menu items
 */

import { revalidatePath } from "next/cache"
import { z } from "zod"
import dbConnect from "@/lib/db"
import MenuItem from "@/models/MenuItem"
import { requireAuth } from "@/lib/auth"
import { REVALIDATE_PATHS, ERROR_MESSAGES } from "@/lib/constants"

const menuItemSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  price: z.number().min(0, "Price must be non-negative"),
  category: z.string().min(1, "Category is required"),
  isAvailable: z.boolean().default(true),
  image: z.string().optional(),
})

type MenuItemInput = z.infer<typeof menuItemSchema>

export async function createMenuItem(data: MenuItemInput) {
  const { user } = await requireAuth(["admin", "manager"])

  const validatedData = menuItemSchema.parse(data)
  await dbConnect()

  const menuItem = new MenuItem({
    ...validatedData,
    createdBy: user.id,
    organization: user.organization,
  })

  await menuItem.save()
  REVALIDATE_PATHS.MENU.forEach(path => revalidatePath(path))

  return { success: true, record: JSON.parse(JSON.stringify(menuItem)) }
}

export async function updateMenuItem(id: string, data: MenuItemInput) {
  await requireAuth(["admin", "manager"])

  const validatedData = menuItemSchema.parse(data)
  await dbConnect()

  const menuItem = await MenuItem.findByIdAndUpdate(id, validatedData, { new: true })

  if (!menuItem) {
    throw new Error(ERROR_MESSAGES.NOT_FOUND)
  }

  REVALIDATE_PATHS.MENU.forEach(path => revalidatePath(path))

  return { success: true, record: JSON.parse(JSON.stringify(menuItem)) }
}

export async function deleteMenuItem(id: string) {
  await requireAuth(["admin", "manager"])

  await dbConnect()
  const menuItem = await MenuItem.findByIdAndDelete(id)

  if (!menuItem) {
    throw new Error(ERROR_MESSAGES.NOT_FOUND)
  }

  REVALIDATE_PATHS.MENU.forEach(path => revalidatePath(path))

  return { success: true }
}

export async function toggleMenuItemAvailability(id: string, isAvailable: boolean) {
  await requireAuth(["admin", "manager"])

  await dbConnect()
  const menuItem = await MenuItem.findByIdAndUpdate(id, { isAvailable }, { new: true })

  if (!menuItem) {
    throw new Error(ERROR_MESSAGES.NOT_FOUND)
  }

  REVALIDATE_PATHS.MENU.forEach(path => revalidatePath(path))

  return { success: true, record: JSON.parse(JSON.stringify(menuItem)) }
}
