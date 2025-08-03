"use client"

import { useCallback, useEffect } from "react"
import type { UseFormReturn } from "react-hook-form"
import type { IncomeRecordInput } from "@/lib/validations"

interface UseIncomeFormCalculationsProps {
  form: UseFormReturn<IncomeRecordInput>
  showDiscount: boolean
  showTip: boolean
  isSplitPayment: boolean
}

export function useIncomeFormCalculations({
  form,
  showDiscount,
  showTip,
  isSplitPayment,
}: UseIncomeFormCalculationsProps) {
  const calculateTotals = useCallback(() => {
    const currentItems = form.getValues("items")
    if (!currentItems || currentItems.length === 0) return

    const subtotal = currentItems.reduce((sum, item) => {
      const quantity = Number(item?.quantity) || 0
      const price = Number(item?.price) || 0
      return sum + quantity * price
    }, 0)

    form.setValue("subtotal", Number(subtotal.toFixed(2)))

    const discountAmount = showDiscount ? Number(form.getValues("discount")) || 0 : 0
    const tipAmount = showTip ? Number(form.getValues("tip")) || 0 : 0
    const total = subtotal - discountAmount + tipAmount

    form.setValue("totalAmount", Number(total.toFixed(2)))

    // Handle split payment logic
    if (isSplitPayment) {
      form.setValue("paymentMethod", "split")
      const cashAmount = Number(form.getValues("cashAmount")) || 0
      const digitalAmount = Number(form.getValues("digitalAmount")) || 0
      const totalPaid = cashAmount + digitalAmount

      if (totalPaid >= total) {
        form.setValue("paymentStatus", "completed")
      } else if (totalPaid > 0) {
        form.setValue("paymentStatus", "pending")
      } else {
        form.setValue("paymentStatus", "pending")
      }
    } else {
      form.setValue("cashAmount", 0)
      form.setValue("digitalAmount", 0)
      const currentPaymentMethod = form.getValues("paymentMethod")
      if (currentPaymentMethod === "split") {
        form.setValue("paymentMethod", "cash")
      }
    }
  }, [form, showDiscount, showTip, isSplitPayment])

  // Watch for changes and recalculate - fix the watch logic
  useEffect(() => {
    const subscription = form.watch((value, { name, type }) => {
      if (
        (name?.startsWith("items.") &&
          (name.includes(".quantity") || name.includes(".price") || name.includes(".name"))) ||
        name === "discount" ||
        name === "tip" ||
        name === "cashAmount" ||
        name === "digitalAmount" ||
        type === "change"
      ) {
        // Use requestAnimationFrame for better performance
        requestAnimationFrame(() => {
          calculateTotals()
        })
      }
    })
    return () => subscription.unsubscribe()
  }, [form, calculateTotals])

  // Add immediate calculation trigger
  useEffect(() => {
    calculateTotals()
  }, [showDiscount, showTip, isSplitPayment, calculateTotals])

  return { calculateTotals }
}
