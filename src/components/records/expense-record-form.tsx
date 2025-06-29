"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { showPromiseToast } from "@/lib/toast-utils"
import { expenseRecordSchema, type ExpenseRecordInput } from "@/lib/validations"
import { OfflineAPI } from "@/lib/offline/offline-api"
import type { ExpenseRecord } from "@/types"
import { useOffline } from "../hooks/use-offline"

interface ExpenseRecordFormProps {
  record?: ExpenseRecord
  onSuccess?: () => void
}

const expenseCategories = [
  "Food & Ingredients",
  "Staff Salaries",
  "Rent & Utilities",
  "Equipment & Maintenance",
  "Marketing & Advertising",
  "Supplies & Materials",
  "Insurance",
  "Professional Services",
  "Transportation",
  "Other",
]

export function ExpenseRecordForm({ record, onSuccess }: ExpenseRecordFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { isOnline } = useOffline()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<ExpenseRecordInput>({
    resolver: zodResolver(expenseRecordSchema),
    defaultValues: record
      ? {
          amount: record.amount,
          category: record.category,
          vendor: record.vendor || "",
          description: record.description,
          date: new Date(record.date),
          receiptNumber: record.receiptNumber || "",
          notes: record.notes || "",
        }
      : {
          amount: 0,
          category: "",
          vendor: "",
          description: "",
          date: new Date(),
          receiptNumber: "",
          notes: "",
        },
  })

  const onSubmit = async (data: ExpenseRecordInput) => {
    setIsLoading(true)

    try {
      let result
      if (record) {
        result = await OfflineAPI.updateExpenseRecord(record._id, data)
      } else {
        result = await OfflineAPI.createExpenseRecord(data)
      }

      const successMessage = record
        ? isOnline
          ? "Expense updated successfully!"
          : "Expense updated offline - will sync when online"
        : isOnline
          ? "Expense created successfully!"
          : "Expense created offline - will sync when online"

      await showPromiseToast(Promise.resolve(result), {
        loading: record ? "Updating expense..." : "Creating expense...",
        success: successMessage,
        error: "Something went wrong. Please try again.",
      })

      if (result?.success) {
        if (!record) {
          reset({
            amount: 0,
            category: "",
            vendor: "",
            description: "",
            date: new Date(),
            receiptNumber: "",
            notes: "",
          })
        }
        onSuccess?.()
      }
    } catch (error) {
      console.error("Form submission error:", error)
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
            Changes will be saved locally and synced when you're back online.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              {...register("amount", { valueAsNumber: true })}
            />
            {errors.amount && <p className="text-sm text-red-600">{errors.amount.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={watch("category")} onValueChange={(value) => setValue("category", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {expenseCategories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && <p className="text-sm text-red-600">{errors.category.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="vendor">Vendor/Supplier</Label>
            <Input id="vendor" placeholder="ABC Food Supply Co." {...register("vendor")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="receiptNumber">Receipt/Invoice Number</Label>
            <Input id="receiptNumber" placeholder="INV-12345" {...register("receiptNumber")} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Input id="description" placeholder="Fresh vegetables and meat supplies" {...register("description")} />
          {errors.description && <p className="text-sm text-red-600">{errors.description.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="date">Date</Label>
          <Input id="date" type="date" {...register("date", { valueAsDate: true })} />
          {errors.date && <p className="text-sm text-red-600">{errors.date.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notes (Optional)</Label>
          <Textarea id="notes" placeholder="Additional notes..." {...register("notes")} />
        </div>

        <div className="flex gap-2 pt-4">
          <Button type="submit" disabled={isLoading} className="flex-1">
            {isLoading ? "Saving..." : record ? "Update Expense" : "Create Expense"}
          </Button>
        </div>
      </form>
    </div>
  )
}
