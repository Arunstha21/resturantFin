"use server"

import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import bcrypt from "bcryptjs"
import dbConnect from "@/lib/db"
import User from "@/models/User"
import { userSchema, type UserInput } from "@/lib/validations"
import { authOptions } from "@/lib/auth"

export async function createUser(data: UserInput) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id || session.user.role !== "admin") {
    throw new Error("Unauthorized - Admin access required")
  }

  const validatedData = userSchema.parse(data)
  
  await dbConnect()

  // Check if user already exists
  const existingUser = await User.findOne({ email: validatedData.email })
  if (existingUser) {
    throw new Error("User with this email already exists")
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(validatedData.password!, 12)

  const user = await User.create({
    ...validatedData,
    password: hashedPassword,
  })

  revalidatePath("/users")

  return { success: true, user: JSON.parse(JSON.stringify({ ...user, password: undefined })) }
}

export async function updateUser(id: string, data: UserInput) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id || session.user.role !== "admin") {
    throw new Error("Unauthorized - Admin access required")
  }

  const validatedData = userSchema.parse(data)

  await dbConnect()

  const updateData: {name: string; email: string; role: "admin" | "manager" | "staff"; password?: string} = {
    name: validatedData.name,
    email: validatedData.email,
    role: validatedData.role,
  }

  // Only update password if provided
  if (validatedData.password && validatedData.password.length > 0) {
    updateData.password = await bcrypt.hash(validatedData.password, 12)
  }

  const user = await User.findByIdAndUpdate(id, updateData, { new: true })

  if (!user) {
    throw new Error("User not found")
  }

  revalidatePath("/users")

  return { success: true, user: JSON.parse(JSON.stringify({ ...user, password: undefined })) }
}

export async function deleteUser(id: string) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id || session.user.role !== "admin") {
    throw new Error("Unauthorized - Admin access required")
  }

  await dbConnect()

  // Prevent deleting yourself
  if (session.user.id === id) {
    throw new Error("Cannot delete your own account")
  }

  const user = await User.findByIdAndDelete(id)

  if (!user) {
    throw new Error("User not found")
  }

  revalidatePath("/users")

  return { success: true }
}
