"use server"

import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import bcrypt from "bcryptjs"
import dbConnect from "@/lib/db"
import User from "@/models/User"
import { userSchema, type UserInput } from "@/lib/validations"
import { authOptions } from "@/lib/auth"
import Organization from "@/models/Organization"

export async function createUser(data: UserInput) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id || session.user.role !== "admin") {
    throw new Error("Unauthorized - Admin access required")
  }
  const superAdmin = session.user.superAdmin
  const validatedData = userSchema.parse(data)
  
  await dbConnect()

  const organization = await Organization.findById(validatedData.organization)
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
    organization: superAdmin ? validatedData.organization : session.user.organization,
  })
  organization.users.push(user._id)
  await organization.save()

  revalidatePath("/users")

  return { success: true, user: JSON.parse(JSON.stringify({ ...user, password: undefined })) }
}

export async function updateUser(id: string, data: UserInput) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id || session.user.role !== "admin") {
    throw new Error("Unauthorized - Admin access required")
  }
  const superAdmin = session.user.superAdmin

  const validatedData = userSchema.parse(data)

  await dbConnect()

  const organization = await Organization.findById(validatedData.organization)

  const updateData: {name: string; email: string; role: "admin" | "manager" | "staff"; password?: string, organization: string | undefined} = {
    name: validatedData.name,
    email: validatedData.email,
    role: validatedData.role,
    organization: superAdmin ? validatedData.organization : session.user.organization,
  }

  // Only update password if provided
  if (validatedData.password && validatedData.password.length > 0) {
    updateData.password = await bcrypt.hash(validatedData.password, 12)
  }

  const user = await User.findByIdAndUpdate(id, updateData, { new: true })
  organization.users.push(user?._id)
  await organization.save()

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
