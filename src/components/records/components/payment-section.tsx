"use client"

import React from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { formatCurrency } from "@/lib/utils"
import type { UseFormReturn } from "react-hook-form"
import type { IncomeRecordInput } from "@/lib/validations"

interface PaymentSectionProps {
  form: UseFormReturn<IncomeRecordInput>
  isSplitPayment: boolean
  cashAmount: number
  digitalAmount: number
  totalAmount: number
  onToggleSplitPayment: (enabled: boolean) => void
  onSetCashAmount: (value: number) => void
  onSetDigitalAmount: (value: number) => void
}

export const PaymentSection = React.memo<PaymentSectionProps>(
  ({
    form,
    isSplitPayment,
    cashAmount,
    digitalAmount,
    totalAmount,
    onToggleSplitPayment,
    onSetCashAmount,
    onSetDigitalAmount,
  }) => {
    const totalPaid = cashAmount + digitalAmount
    const remainingAmount = Math.max(0, totalAmount - totalPaid)

    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox id="split-payment" checked={isSplitPayment} onCheckedChange={onToggleSplitPayment} />
          <FormLabel htmlFor="split-payment" className="font-medium">
            Split Payment (Cash + Digital)
          </FormLabel>
        </div>

        {!isSplitPayment ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Method</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="digital">Digital Payment</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="paymentStatus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        ) : (
          <div className="space-y-4 border rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <FormLabel>Cash Amount</FormLabel>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={cashAmount}
                  onChange={(e) => onSetCashAmount(Number(e.target.value))}
                />
              </div>

              <div className="space-y-2">
                <FormLabel>Digital Amount</FormLabel>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={digitalAmount}
                  onChange={(e) => onSetDigitalAmount(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="bg-muted p-3 rounded space-y-2">
              <div className="flex justify-between text-sm">
                <span>Total Amount:</span>
                <span className="font-medium">{formatCurrency(totalAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Total Paid:</span>
                <span className="font-medium">{formatCurrency(totalPaid)}</span>
              </div>
              {remainingAmount > 0 && (
                <div className="flex justify-between text-sm text-red-600">
                  <span>Remaining:</span>
                  <span className="font-medium">{formatCurrency(remainingAmount)}</span>
                </div>
              )}
              {totalPaid > totalAmount && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Overpaid:</span>
                  <span className="font-medium">{formatCurrency(totalPaid - totalAmount)}</span>
                </div>
              )}
            </div>

            {totalPaid !== totalAmount && (
              <div className="text-sm text-amber-600 bg-amber-50 p-2 rounded">
                ⚠️ Payment amounts don&apos;t match the total. Please adjust the amounts.
              </div>
            )}
          </div>
        )}
      </div>
    )
  },
)

PaymentSection.displayName = "PaymentSection"
