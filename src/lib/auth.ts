import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import dbConnect from "./db"
import { DefaultSession, DefaultUser } from "next-auth"

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


async function getUserData(email: string) {
  await dbConnect()
  const User = (await import("@/models/User")).default;
  const user = await User.findOne({ email })

  const Organization = (await import("@/models/Organization")).default;
  const organizationData = await Organization.findById(user?.organization)

  if (user && organizationData) {
    user.organization = organizationData
  }

  return user
}