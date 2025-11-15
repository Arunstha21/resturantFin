'use server'

import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/db";
import { organizationSchema } from "@/lib/validations";
import Organization from "@/models/Organization";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";

export async function createOrganization(data: { name: string; shortName: string; address?: string; phone?: string; email?: string; taxId?: string }) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id && !session?.user?.superAdmin) {
        throw new Error("Unauthorized")
    }
    const validatedData = organizationSchema.parse(data)

    await dbConnect()

    const existingOrg = await Organization.findOne({ name: validatedData.name })
    if (existingOrg) {
        throw new Error("Organization with this name already exists")
    }

    const organization = await Organization.create({
        ...validatedData,
        users: [],
    })
    revalidatePath("/dashboard/organization")

    return { success: true, organization: JSON.parse(JSON.stringify(organization)) }
}

export async function updateOrganization(id: string, data: { name: string; shortName?: string; address?: string; phone?: string; email?: string; taxId?: string; isActive?: boolean }) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id && !session?.user?.superAdmin) {
        throw new Error("Unauthorized")
    }
    const validatedData = organizationSchema.parse(data)

    await dbConnect()

    const organization = await Organization.findByIdAndUpdate(id, validatedData, { new: true })

    if (!organization) {
        throw new Error("Organization not found")
    }
    revalidatePath("/dashboard/organization")
    return { success: true, organization: JSON.parse(JSON.stringify(organization)) }
}

export async function deleteOrganization(id: string) {
  try {
    await dbConnect()

    const organization = await Organization.findByIdAndDelete(id)

    if (!organization) {
      throw new Error("Organization not found")
    }

    revalidatePath("/dashboard/organization")
    return { success: true }
  } catch (error) {
    console.error("Error deleting organization:", error)
    throw new Error("Failed to delete organization")
  }
}