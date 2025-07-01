"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { dueAccountSchema, type DueAccountInput } from "@/lib/validations"
import { OfflineAPI } from "@/lib/offline/offline-api"
import type { DueAccount } from "@/types"
import { useOffline } from "@/hooks/use-offline"

interface DueAccountFormProps {
  account?: DueAccount
  onSuccess?: () => void
}

export function DueAccountForm({ account, onSuccess }: DueAccountFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { isOnline } = useOffline()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<DueAccountInput>({
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
  })

  const onSubmit = async (data: DueAccountInput) => {
    setIsLoading(true)

    try {
      let result
      if (account) {
        result = await OfflineAPI.updateDueAccount(account._id, data)
        const successMessage = isOnline
          ? "Customer account updated successfully!"
          : "Customer account updated offline - will sync when online"
        toast.success(successMessage)
      } else {
        result = await OfflineAPI.createDueAccount(data)
        const successMessage = isOnline
          ? "Customer account created successfully!"
          : "Customer account created offline - will sync when online"
        toast.success(successMessage)
      }

      if (result?.success) {
        if (!account) {
          reset({
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
      {/* Offline indicator */}
      {!isOnline && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
          <div className="flex items-center gap-2 text-orange-700">
            <span className="text-sm font-medium">Working Offline</span>
          </div>
          <p className="text-xs text-orange-600 mt-1">
            Changes will be saved locally and synced when you&apos;re back online.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="customerName">Customer Name *</Label>
          <Input
            id="customerName"
            placeholder="John Doe"
            {...register("customerName")}
          />
          {errors.customerName && (
            <p className="text-sm text-red-600">{errors.customerName.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="customerPhone">Phone Number</Label>
          <Input
            id="customerPhone"
            placeholder="+1 (555) 123-4567"
            {...register("customerPhone")}
          />
          {errors.customerPhone && (
            <p className="text-sm text-red-600">{errors.customerPhone.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="customerEmail">Email Address</Label>
          <Input
            id="customerEmail"
            type="email"
            placeholder="john@example.com"
            {...register("customerEmail")}
          />
          {errors.customerEmail && (
            <p className="text-sm text-red-600">{errors.customerEmail.message}</p>
          )}
        </div>

        <div className="flex gap-2 pt-4">
          <Button type="submit" disabled={isLoading} className="flex-1">
            {isLoading ? "Saving..." : account ? "Update Account" : "Create Account"}
          </Button>
        </div>
      </form>
    </div>
  )
}
