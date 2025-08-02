"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { toast } from "sonner"
import { dueAccountSchema, type DueAccountInput } from "@/lib/validations"
import type { DueAccount } from "@/types"
import { createDueAccount, updateDueAccount } from "@/app/actions/due-accounts"

interface DueAccountFormProps {
  account?: DueAccount
  onSuccess?: () => void
}

export function DueAccountForm({ account, onSuccess }: DueAccountFormProps) {
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<DueAccountInput>({
    resolver: zodResolver(dueAccountSchema),
    defaultValues: account
      ? {
          customerName: account.customerName,
          customerPhone: account.customerPhone || "",
          customerEmail: account.customerEmail || "",
        }
      : {
          customerName: "",
          customerPhone: "",
          customerEmail: "",
        },
    mode: "onChange",
  })

  const onSubmit = async (data: DueAccountInput) => {
    setIsLoading(true)

    try {
      let result
      if (account) {
        result = await updateDueAccount(account._id, data)
        toast.success("Customer account updated successfully!")
      } else {
        result = await createDueAccount(data)
        toast.success("Customer account created successfully!")
      }

      if (result?.success) {
        if (!account) {
          form.reset({
            customerName: "",
            customerPhone: "",
            customerEmail: "",
          })
        }
        onSuccess?.()
      }
    } catch (error) {
      console.error("Form submission error:", error)
      toast.error("Something went wrong. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="customerName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Customer Name *</FormLabel>
                <FormControl>
                  <Input placeholder="John Doe" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="customerPhone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone Number</FormLabel>
                <FormControl>
                  <Input placeholder="+1 (555) 123-4567" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="customerEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email Address</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="john@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex gap-2 pt-4">
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1 touch-manipulation active:scale-95 transition-transform"
            >
              {isLoading ? "Saving..." : account ? "Update Account" : "Create Account"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
