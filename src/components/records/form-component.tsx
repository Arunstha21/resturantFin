import { formatCurrency } from "@/lib/utils"

interface OfflineIndicatorProps {
  isOnline: boolean
}

export function OfflineIndicator({ isOnline }: OfflineIndicatorProps) {
  if (isOnline) return null

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
      <div className="flex items-center gap-2 text-orange-700">
        <span className="text-sm font-medium">Working Offline</span>
      </div>
      <p className="text-xs text-orange-600 mt-1">Changes will be saved locally and synced when you're back online.</p>
    </div>
  )
}

interface OrderSummaryProps {
  subtotal: number
  discount?: number
  tip?: number
  total: number
}

export function OrderSummary({ subtotal, discount = 0, tip = 0, total }: OrderSummaryProps) {
  return (
    <div className="bg-muted p-4 rounded-lg space-y-2">
      <div className="flex justify-between">
        <span>Subtotal:</span>
        <span>{formatCurrency(subtotal)}</span>
      </div>
      {discount > 0 && (
        <div className="flex justify-between text-green-600">
          <span>Discount:</span>
          <span>-{formatCurrency(discount)}</span>
        </div>
      )}
      {tip > 0 && (
        <div className="flex justify-between text-blue-600">
          <span>Tip:</span>
          <span>+{formatCurrency(tip)}</span>
        </div>
      )}
      <div className="border-t pt-2">
        <div className="flex justify-between font-bold text-lg">
          <span>Total:</span>
          <span>{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  )
}
