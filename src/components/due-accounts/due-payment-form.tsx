"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { duePaymentSchema, type DuePaymentInput } from "@/lib/validations"
import { CreditCard, Banknote } from "lucide-react"
import { duePaymentTransaction } from "@/app/actions/due-accounts"
import { PaymentResult } from "@/types"
import { formatCurrency } from "@/lib/utils"

interface DuePaymentFormProps {
  accountId: string
  customerName: string
  totalDue: number
  onSuccess?: (result: PaymentResult) => void
}

export function DuePaymentForm({ accountId, customerName, totalDue, onSuccess }: DuePaymentFormProps) {
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<DuePaymentInput>({
    resolver: zodResolver(duePaymentSchema),
    defaultValues: {
      paymentAmount: 0,
      paymentMethod: "cash",
    },
    mode: "onChange",
  })

  const onSubmit = async (data: DuePaymentInput) => {
    setIsLoading(true)

    try {
      const result = await duePaymentTransaction(accountId, data.paymentAmount, data.paymentMethod)

      if (result?.success) {
        toast.success(
          `Payment of $${result.paidAmount.toFixed(2)} processed successfully!${
            result.remainingPayment > 0 ? ` Remaining credit: $${result.remainingPayment.toFixed(2)}` : ""
          }`,
        )
        form.reset()
        onSuccess?.(result)
      }
    } catch (error) {
      console.error("Payment submission error:", error)
      toast.error(error instanceof Error ? error.message : "Payment failed. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const paymentAmount = form.watch("paymentAmount")

  return (
    <div className="space-y-6">
      <div className="bg-muted/50 rounded-lg p-4">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">Customer:</span>
          <span className="text-sm">{customerName}</span>
        </div>
        <div className="flex justify-between items-center mt-2">
          <span className="text-sm font-medium">Total Due:</span>
          <span className="text-sm font-semibold text-destructive">{formatCurrency(totalDue)}</span>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="paymentAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Payment Amount *</FormLabel>
                <FormControl>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                    <Input
                      type="number"
                      step="1"
                      min="1"
                      max={totalDue}
                      placeholder="0.00"
                      className="pl-8"
                      {...field}
                      onChange={(e) => field.onChange(Number.parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </FormControl>
                <FormMessage />
                {paymentAmount > totalDue && (
                  <p className="text-xs text-orange-600">Amount exceeds total due. Excess will be credited.</p>
                )}
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="paymentMethod"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Payment Method *</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="grid grid-cols-2 gap-4"
                  >
                    <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-accent cursor-pointer">
                      <RadioGroupItem value="cash" id="cash" />
                      <Label htmlFor="cash" className="flex items-center gap-2 cursor-pointer flex-1">
                        <Banknote className="h-4 w-4" />
                        Cash
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-accent cursor-pointer">
                      <RadioGroupItem value="digital" id="digital" />
                      <Label htmlFor="digital" className="flex items-center gap-2 cursor-pointer flex-1">
                        <CreditCard className="h-4 w-4" />
                        Digital
                      </Label>
                    </div>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex gap-2 pt-4">
            <Button
              type="submit"
              disabled={isLoading || paymentAmount <= 0 || paymentAmount > totalDue}
              className="flex-1 touch-manipulation active:scale-95 transition-transform"
            >
              {isLoading ? "Processing..." : `Process Payment (${formatCurrency(paymentAmount)})`}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
