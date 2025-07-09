import React from "react"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"

interface OrderSummaryProps {
  subtotal: number
  discount: number
  tip: number
  totalAmount: number
  showDiscount: boolean
  showTip: boolean
  paymentStatus: string
  isOnline: boolean
}

export const OrderSummary = React.memo<OrderSummaryProps>(
  ({ subtotal, discount, tip, totalAmount, showDiscount, showTip, paymentStatus, isOnline }) => {
    return (
      <div className="space-y-4">
        <div className="bg-muted p-4 rounded-lg space-y-2">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          {showDiscount && discount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Discount:</span>
              <span>-{formatCurrency(discount)}</span>
            </div>
          )}
          {showTip && tip > 0 && (
            <div className="flex justify-between text-blue-600">
              <span>Tip:</span>
              <span>+{formatCurrency(tip)}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between font-bold text-lg">
            <span>Total:</span>
            <span>{formatCurrency(totalAmount)}</span>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Badge variant={paymentStatus === "completed" ? "default" : "destructive"}>
            {paymentStatus === "completed" ? "Payment Complete" : "Payment Pending"}
          </Badge>
          {!isOnline && (
            <Badge variant="outline" className="text-orange-600 border-orange-200">
              Offline
            </Badge>
          )}
        </div>
      </div>
    )
  },
)

OrderSummary.displayName = "OrderSummary"
