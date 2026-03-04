// Authentication configuration and utilities for NextAuth.js
import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import dbConnect from "./db"
import { DefaultSession, DefaultUser } from "next-auth"
import { getServerSession } from "next-auth"

// Role constants
export const ALLOWED_ROLES = {
  ADMIN: "admin",
  MANAGER: "manager",
  STAFF: "staff",
} as const

export const MANAGEMENT_ROLES = [ALLOWED_ROLES.ADMIN, ALLOWED_ROLES.MANAGER] as const

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role?: string
      organization: string
      organizationName: string
      superAdmin: boolean
    } & DefaultSession["user"]
  }
  interface User extends DefaultUser {
    role?: string
    id: string
    organization: string
    organizationName: string
    superAdmin: boolean
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await getUserData(credentials.email)

        if (!user) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password)
        if (!isPasswordValid) {
          return null
        }

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
          organization: user.organization?._id
            ? user.organization._id.toString()
            : user.organization?.toString() ?? "",
          organizationName:
            typeof user.organization === "object" && user.organization?.name
              ? user.organization.name
              : "",
          superAdmin: user.superAdmin || false,
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.organization = user.organization
        token.organizationName = user.organizationName
        token.superAdmin = user.superAdmin
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.organization = token.organization as string
        session.user.organizationName = token.organizationName as string
        session.user.superAdmin = token.superAdmin as boolean
      }
      return session
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
}

/**
 * Requires authentication and optionally validates role permissions
 * @param requiredRoles - Optional array of allowed roles
 * @returns The session object
 * @throws Error if unauthorized or insufficient permissions
 */
export async function requireAuth(requiredRoles?: readonly string[]) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

  if (requiredRoles && requiredRoles.length > 0) {
    const userRole = session.user.role?.toLowerCase()
    if (!userRole || !requiredRoles.includes(userRole)) {
      throw new Error("Insufficient permissions")
    }
  }

  return session
}

/** Checks if a role has management permissions (admin or manager) */
export function hasManagementRole(role?: string): boolean {
  if (!role) return false
  return MANAGEMENT_ROLES.includes(role.toLowerCase() as typeof MANAGEMENT_ROLES[number])
}

/** Fetches user data with organization (parallel queries for ~100ms savings) */
async function getUserData(email: string) {
  await dbConnect()

  const [Organization, user] = await Promise.all([
    import("@/models/Organization").then(m => m.default),
    (async () => {
      const UserModel = (await import("@/models/User")).default
      return await UserModel.findOne({ email })
    })(),
  ])

  if (user?.organization) {
    const organizationData = await Organization.findById(user.organization)
    if (organizationData) {
      user.organization = organizationData
    }
  }

  return user
}
