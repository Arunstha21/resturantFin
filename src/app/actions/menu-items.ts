"use server"

import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { z } from "zod"
import dbConnect from "@/lib/db"
import MenuItem from "@/models/MenuItem"

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
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      throw new Error("Unauthorized")
    }

    const userRole = session.user.role?.toLowerCase()
    if (!userRole || !["admin", "manager"].includes(userRole)) {
      throw new Error("Insufficient permissions")
    }

    const validatedData = menuItemSchema.parse(data)

    await dbConnect()

    const menuItem = new MenuItem({
      ...validatedData,
      createdBy: session.user.id,
    })

    await menuItem.save()

    revalidatePath("/menu-management")
    revalidatePath("/menu")
    revalidatePath("/records")

    return { success: true, record: JSON.parse(JSON.stringify(menuItem)) }
  } catch (error) {
    console.error("Error creating menu item:", error)
    throw error
  }
}

export async function updateMenuItem(id: string, data: MenuItemInput) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      throw new Error("Unauthorized")
    }

    const userRole = session.user.role?.toLowerCase()
    if (!userRole || !["admin", "manager"].includes(userRole)) {
      throw new Error("Insufficient permissions")
    }

    const validatedData = menuItemSchema.parse(data)

    await dbConnect()

    const menuItem = await MenuItem.findByIdAndUpdate(id, validatedData, { new: true })

    if (!menuItem) {
      throw new Error("Menu item not found")
    }

    revalidatePath("/menu-management")
    revalidatePath("/menu")
    revalidatePath("/records")

    return { success: true, record: JSON.parse(JSON.stringify(menuItem)) }
  } catch (error) {
    console.error("Error updating menu item:", error)
    throw error
  }
}

export async function deleteMenuItem(id: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      throw new Error("Unauthorized")
    }

    const userRole = session.user.role?.toLowerCase()
    if (!userRole || !["admin", "manager"].includes(userRole)) {
      throw new Error("Insufficient permissions")
    }

    await dbConnect()

    const menuItem = await MenuItem.findByIdAndDelete(id)

    if (!menuItem) {
      throw new Error("Menu item not found")
    }

    revalidatePath("/menu-management")
    revalidatePath("/menu")
    revalidatePath("/records")

    return { success: true }
  } catch (error) {
    console.error("Error deleting menu item:", error)
    throw error
  }
}

export async function toggleMenuItemAvailability(id: string, isAvailable: boolean) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      throw new Error("Unauthorized")
    }

    const userRole = session.user.role?.toLowerCase()
    if (!userRole || !["admin", "manager"].includes(userRole)) {
      throw new Error("Insufficient permissions")
    }

    await dbConnect()

    const menuItem = await MenuItem.findByIdAndUpdate(id, { isAvailable }, { new: true })

    if (!menuItem) {
      throw new Error("Menu item not found")
    }

    revalidatePath("/menu-management")
    revalidatePath("/menu")
    revalidatePath("/records")

    return { success: true, record: JSON.parse(JSON.stringify(menuItem)) }
  } catch (error) {
    console.error("Error toggling menu item availability:", error)
    throw error
  }
}
