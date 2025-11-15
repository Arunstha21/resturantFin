"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { toast } from "sonner"
import { userSchema, type UserInput } from "@/lib/validations"
import { createUser, updateUser } from "@/app/actions/users"
import type { User } from "@/types"

interface UserFormProps {
  user?: User
  superAdmin?: boolean
  organizations?: { _id: string; name: string }[]
  onSuccess?: () => void
}

export function UserForm({ user, onSuccess, superAdmin, organizations }: UserFormProps) {
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<UserInput>({
    resolver: zodResolver(userSchema),
    defaultValues: user
      ? {
          name: user.name,
          email: user.email,
          role: user.role,
          organization: organizations && organizations[0]?._id ? organizations[0]._id : "",
          password: "",
        }
      : {
          name: "",
          email: "",
          role: "manager",
          organization: organizations && organizations[0]?._id ? organizations[0]._id : "",
          password: "",
        },
    mode: "onChange",
  })

  const onSubmit = async (data: UserInput) => {
    setIsLoading(true)

    try {
      if (user) {
        await updateUser(user._id, data)
        toast.success("User updated successfully!")
      } else {
        await createUser(data)
        toast.success("User created successfully!")
      }

      if (!user) {
        form.reset()
      }
      onSuccess?.()
    } catch (error) {
      console.error("Error submitting user form:", error)
      toast.error("Something went wrong. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{user ? "Edit User" : "Add New User"}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email *</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="john@restaurant.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password {user && "(leave blank to keep current)"}</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            { superAdmin && organizations && (
              <FormField
                control={form.control}
                name="organization"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organization *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select organization" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {organizations.map((org) => (
                          <SelectItem key={org._id} value={org._id}>
                            {org.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) }

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full touch-manipulation active:scale-95 transition-transform"
            >
              {isLoading ? "Saving..." : user ? "Update User" : "Create User"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
