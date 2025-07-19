"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { toast } from "sonner"
import { expenseRecordSchema, type ExpenseRecordInput } from "@/lib/validations"
import { OfflineAPI } from "@/lib/offline/offline-api"
import type { ExpenseRecord } from "@/types"
import { useOffline } from "../../hooks/use-offline"

interface ExpenseRecordFormProps {
  record?: ExpenseRecord
  onSuccess?: () => void
}

const expenseCategories = [
  "Food & Ingredients",
  "Staff Salaries",
  "Rent & Utilities",
  "Equipment & Maintenance",
  "Supplies & Materials",
  "Transportation",
  "Other",
]

export function ExpenseRecordForm({ record, onSuccess }: ExpenseRecordFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { isOnline } = useOffline()

  const form = useForm<ExpenseRecordInput>({
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
    mode: "onChange",
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

      toast.success(successMessage)

      if (result?.success) {
        if (!record) {
          form.reset({
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

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {expenseCategories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="vendor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vendor/Supplier</FormLabel>
                  <FormControl>
                    <Input placeholder="ABC Food Supply Co." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="receiptNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Receipt/Invoice Number</FormLabel>
                  <FormControl>
                    <Input placeholder="INV-12345" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description *</FormLabel>
                <FormControl>
                  <Input placeholder="Fresh vegetables and meat supplies" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date *</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    {...field}
                    value={field.value instanceof Date ? field.value.toISOString().split("T")[0] : field.value}
                    onChange={(e) => field.onChange(new Date(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes (Optional)</FormLabel>
                <FormControl>
                  <Textarea placeholder="Additional notes..." {...field} />
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
              {isLoading ? "Saving..." : record ? "Update Expense" : "Create Expense"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
