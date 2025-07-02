"use client"

import { useState, useEffect, useCallback } from "react"
import { useForm, useFieldArray, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { incomeRecordSchema, type IncomeRecordInput } from "@/lib/validations"
import { OfflineAPI } from "@/lib/offline/offline-api"
import { Plus, Trash2, Calculator, ChevronUp, ChevronDown, FileText } from "lucide-react"
import type { IncomeRecord } from "@/types"
import { formatCurrency } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { useOffline } from "../../hooks/use-offline"

interface IncomeRecordFormProps {
  record?: IncomeRecord
  onSuccess?: () => void
}

const menuItems = [
  { name: "Milk Tea", price: 30 },
  { name: "Sikher Ice", price: 25 },
  { name: "Churot", price: 30 },
  { name: "Black Tea", price: 25 },
  { name: "Lemon Tea", price: 25 },
  { name: "Lassi Half", price: 50 },
  { name: "Alu Chop", price: 60 },
  { name: "Wai Wai Sadheako", price: 60 },
  { name: "Coke/Fanta/Sprite", price: 80 },
  { name: "Lassi Full", price: 100 },
  { name: "Sandwich", price: 60 },
  { name: "Milk Coffee", price: 100 },
  { name: "Black Coffee", price: 60 },
  { name: "Black Masala/Ginger Tea", price: 60 },
  { name: "Hot lemon (Honey & Ginger)", price: 80 },
  { name: "Sandwich with Fries", price: 100 },
  { name: "French Fries", price: 80 },
  { name: "Current", price: 90 },
  { name: "Current with omlet", price: 120 },
  { name: "cookie", price: 20 },
  { name: "Biscuit", price: 15 },
]

export function IncomeRecordForm({ record, onSuccess }: IncomeRecordFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showDiscount, setShowDiscount] = useState(false)
  const [showTip, setShowTip] = useState(false)
  const [showAdditionalCharges, setShowAdditionalCharges] = useState(false)
  const [showNotes, setShowNotes] = useState(false)
  const [isSplitPayment, setIsSplitPayment] = useState(false)

  const { isOnline } = useOffline()
  const [dueAccounts, setDueAccounts] = useState<any[]>([])
  const [selectedDueAccount, setSelectedDueAccount] = useState<string>("")

  const safeRecord: IncomeRecordInput = record
    ? {
        ...record,
        date: record.date instanceof Date ? record.date : new Date(record.date),
        discount: record.discount || 0,
        tip: record.tip || 0,
        paymentMethod: record.paymentMethod || "cash",
        paymentStatus: record.paymentStatus || "pending",
        cashAmount: record.cashAmount || 0,
        digitalAmount: record.digitalAmount || 0,
        tableNumber: record.tableNumber || "",
        customerName: record.customerName || "",
        notes: record.notes || "",
        isDueAccount: record.isDueAccount || false,
        dueAccountId: record.dueAccountId || "",
      }
    : {
        items: [{ name: "", quantity: 1, price: 0 }],
        totalAmount: 0,
        subtotal: 0,
        discount: 0,
        tip: 0,
        paymentMethod: "cash",
        paymentStatus: "pending",
        cashAmount: 0,
        digitalAmount: 0,
        date: new Date(),
        tableNumber: "",
        customerName: "",
        notes: "",
        isDueAccount: false,
        dueAccountId: "",
      }

  const defaultValues: IncomeRecordInput = {
    ...safeRecord,
    date: safeRecord.date instanceof Date ? safeRecord.date : new Date(safeRecord.date),
  }

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors },
    reset,
  } = useForm<IncomeRecordInput>({
    resolver: zodResolver(incomeRecordSchema),
    defaultValues,
  })

  const { fields, append, remove, update } = useFieldArray({
    control,
    name: "items",
  })

  const calculateTotals = useCallback(() => {
    const currentItems = watch("items")
    if (!currentItems || currentItems.length === 0) return

    // Calculate subtotal
    const subtotal = currentItems.reduce((sum, item) => {
      const quantity = Number(item?.quantity) || 0
      const price = Number(item?.price) || 0
      return sum + quantity * price
    }, 0)

    setValue("subtotal", Number(subtotal.toFixed(2)))

    // Get discount and tip values (fixed amounts only)
    const discountAmount = showDiscount ? Number(watch("discount")) || 0 : 0
    const tipAmount = showTip ? Number(watch("tip")) || 0 : 0

    // Calculate final total
    const total = subtotal - discountAmount + tipAmount
    setValue("totalAmount", Number(total.toFixed(2)))

    // Handle split payment calculations
    if (isSplitPayment) {
      const cashAmount = Number(watch("cashAmount")) || 0
      const digitalAmount = Number(watch("digitalAmount")) || 0
      const totalPaid = cashAmount + digitalAmount

      // Auto-set payment status based on total paid
      if (totalPaid >= total) {
        setValue("paymentStatus", "completed")
      } else {
        setValue("paymentStatus", "pending")
      }
    }
    // Note: When not split payment, payment status is manually controlled
  }, [watch, setValue, showDiscount, showTip, isSplitPayment])

  // Recalculate when items change
  useEffect(() => {
    calculateTotals()
  }, [calculateTotals])

  useEffect(() => {
    const fetchDueAccounts = async () => {
      try {
        const accounts = await OfflineAPI.getDueAccounts()
        setDueAccounts(accounts || [])
      } catch (error) {
        console.error("Failed to fetch due accounts:", error)
      }
    }

    fetchDueAccounts()
  }, [])

  useEffect(() => {
    if (record?.isDueAccount && record.dueAccountId && dueAccounts.length > 0) {
      const accountExists = dueAccounts.some((acc) => acc._id === record.dueAccountId)
      if (accountExists) {
        setSelectedDueAccount(record.dueAccountId)
        setValue("isDueAccount", true)
        setValue("dueAccountId", record.dueAccountId)

        const account = dueAccounts.find((acc) => acc._id === record.dueAccountId)
        if (account) {
          setValue("customerName", account.customerName)
        }
      }
    }
  }, [record, dueAccounts, setValue])

  // Watch for any form changes that should trigger recalculation
  useEffect(() => {
    const subscription = watch((value, { name, type }) => {
      if (
        (name?.startsWith("items.") &&
          (name.includes(".quantity") || name.includes(".price") || name.includes(".name"))) ||
        name === "discount" ||
        name === "tip" ||
        name === "cashAmount" ||
        name === "digitalAmount" ||
        type === "change"
      ) {
        setTimeout(() => {
          calculateTotals()
        }, 50)
      }
    })
    return () => subscription.unsubscribe()
  }, [watch, calculateTotals])

  // Additional effect to ensure calculation on field array changes
  useEffect(() => {
    calculateTotals()
  }, [fields.length, calculateTotals])

  // Handle split payment toggle
  useEffect(() => {
    if (isSplitPayment) {
      // When enabling split payment, set initial values
      setValue("cashAmount", record?.cashAmount || 0)
      setValue("digitalAmount", record?.digitalAmount || 0)
      setValue("paymentMethod", "split")
    } else {
      // When disabling split payment, only reset if this is NOT from record data
      if (!record) {
        setValue("paymentMethod", "cash")
        setValue("cashAmount", 0)
        setValue("digitalAmount", 0)
        setValue("paymentStatus", "pending")
      }
    }

    // Trigger recalculation after state change
    setTimeout(() => {
      calculateTotals()
    }, 100)
  }, [isSplitPayment, setValue, record])

  // Initialize split payment state based on existing data
  useEffect(() => {
    if (record) {
      const paymentMethod = record.paymentMethod
      if (paymentMethod === "split") {
        setIsSplitPayment(true)
      }
    }
  }, [record]) // Only depend on record, not watch

  // Initialize form values from record - NEW
  useEffect(() => {
    if (record) {
      // Set form values directly from record
      setValue("paymentMethod", record.paymentMethod || "cash")
      setValue("paymentStatus", record.paymentStatus || "pending")
      setValue("cashAmount", record.cashAmount || 0)
      setValue("digitalAmount", record.digitalAmount || 0)

      // Set split payment state
      if (record.paymentMethod === "split") {
        setIsSplitPayment(true)
      }
    }
  }, [record, setValue])

  const addMenuItem = (menuItem: (typeof menuItems)[0]) => {
    const currentItems = watch("items") || []
    // Check if this is the default empty item (first item with empty name)
    const hasDefaultEmptyItem =
      currentItems.length === 1 &&
      currentItems[0].name === "" &&
      currentItems[0].quantity === 1 &&
      currentItems[0].price === 0

    // If we have the default empty item, replace it
    if (hasDefaultEmptyItem) {
      update(0, {
        name: menuItem.name,
        quantity: 1,
        price: menuItem.price,
      })
    } else {
      // Check if the item already exists in the list
      const existingItemIndex = currentItems.findIndex(
        (item) => item.name.toLowerCase() === menuItem.name.toLowerCase(),
      )

      if (existingItemIndex !== -1) {
        // Item exists, increment quantity
        const existingItem = currentItems[existingItemIndex]
        update(existingItemIndex, {
          ...existingItem,
          quantity: (existingItem.quantity || 0) + 1,
        })
      } else {
        // Item doesn't exist, add new item
        append({
          name: menuItem.name,
          quantity: 1,
          price: menuItem.price,
        })
      }
    }

    // Trigger calculation after adding item
    setTimeout(() => {
      calculateTotals()
    }, 100)
  }

  const onSubmit = async (data: IncomeRecordInput) => {
    setIsLoading(true)

    try {
      // Ensure all calculations are up to date
      const formData = {
        ...data,
        totalAmount: Number(data.totalAmount) || 0,
      }

      let result
      if (record) {
        result = await OfflineAPI.updateIncomeRecord(record._id, formData)
        const successMessage = isOnline
          ? "Order updated successfully!"
          : "Order updated offline - will sync when online"
        toast.success(successMessage)
      } else {
        result = await OfflineAPI.createIncomeRecord(formData)
        const successMessage = isOnline
          ? "Order created successfully!"
          : "Order created offline - will sync when online"
        toast.success(successMessage)
      }

      if (result?.success) {
        if (!record) {
          reset({
            items: [{ name: "", quantity: 1, price: 0 }],
            totalAmount: 0,
            subtotal: 0,
            discount: 0,
            tip: 0,
            paymentMethod: "cash",
            paymentStatus: "pending",
            cashAmount: 0,
            digitalAmount: 0,
            date: new Date(),
            tableNumber: "",
            customerName: "",
            notes: "",
            isDueAccount: false,
            dueAccountId: "",
          })
          setSelectedDueAccount("")
          setShowDiscount(false)
          setShowTip(false)
          setShowAdditionalCharges(false)
          setShowNotes(false)
          setIsSplitPayment(false)
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
  useEffect(() => {
    if (record) {
      // Set additional charges visibility
      if (record.discount && record.discount > 0) {
        setShowAdditionalCharges(true)
        setShowDiscount(true)
      }
      if (record.tip && record.tip > 0) {
        setShowAdditionalCharges(true)
        setShowTip(true)
      }
      if ((record.discount && record.discount > 0) || (record.tip && record.tip > 0)) {
        setShowAdditionalCharges(true)
      }
      // Set notes visibility
      if (record.notes && record.notes.trim() !== "") {
        setShowNotes(true)
      }
      // Set split payment
      if (record.paymentMethod === "split") {
        setIsSplitPayment(true)
      }
    }
  }, [record])

  const watchedItems = watch("items")
  const totalAmount = watch("totalAmount") || 0
  const cashAmount = watch("cashAmount") || 0
  const digitalAmount = watch("digitalAmount") || 0
  const totalPaid = cashAmount + digitalAmount
  const remainingAmount = Math.max(0, totalAmount - totalPaid)

  return (
    <div className="w-full space-y-6">
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

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 w-full overflow-y-auto">
        {/* Order Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="tableNumber">Table Number</Label>
            <Input id="tableNumber" placeholder="Table 1" {...register("tableNumber")} />
            {errors.tableNumber && <p className="text-sm text-red-600">{errors.tableNumber.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="customerName">Customer Name</Label>
            <Input id="customerName" placeholder="John Doe" {...register("customerName")} />
            {errors.customerName && <p className="text-sm text-red-600">{errors.customerName.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="dueAccount">Due Account (Optional)</Label>
            <Select
              value={selectedDueAccount}
              onValueChange={(value) => {
                const newValue = value === "none" ? "" : value
                setSelectedDueAccount(newValue)

                if (newValue && newValue !== "") {
                  setValue("isDueAccount", true)
                  setValue("dueAccountId", newValue)
                  // Find the account and set customer name
                  const account = dueAccounts.find((acc) => acc._id === newValue)
                  if (account) {
                    setValue("customerName", account.customerName)
                  }
                } else {
                  setValue("isDueAccount", false)
                  setValue("dueAccountId", "")
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select customer account" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No due account</SelectItem>
                {dueAccounts.map((account) => (
                  <SelectItem key={account._id} value={account._id}>
                    {account.customerName} ({formatCurrency(account.totalDueAmount || 0)} due)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Quick Add Menu Items */}
        <div className="space-y-2">
          <Label>Quick Add Menu Items</Label>
          <p className="text-sm text-muted-foreground">
            Click to add items. If item already exists, quantity will be increased.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-32 overflow-y-auto border rounded-lg p-2">
            {menuItems.map((item) => {
              // Check if this item already exists and show quantity
              const existingItem = watchedItems?.find(
                (watchedItem) => watchedItem.name.toLowerCase() === item.name.toLowerCase(),
              )
              const currentQuantity = existingItem?.quantity || 0

              return (
                <Button
                  key={item.name}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addMenuItem(item)}
                  className="justify-start text-left h-auto p-2 relative"
                >
                  <div className="w-full">
                    <div className="font-medium text-xs">{item.name}</div>
                    <div className="text-xs text-muted-foreground">{formatCurrency(item.price)}</div>
                    {currentQuantity > 0 && (
                      <Badge
                        variant="secondary"
                        className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs flex items-center justify-center"
                      >
                        {currentQuantity}
                      </Badge>
                    )}
                  </div>
                </Button>
              )
            })}
          </div>
        </div>

        <Separator />

        {/* Order Items */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Order Items</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                append({ name: "", quantity: 1, price: 0 })
                setTimeout(() => {
                  calculateTotals()
                }, 100)
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Custom Item
            </Button>
          </div>

          <div className="space-y-3 max-h-60 overflow-y-auto">
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-10 gap-2 items-end p-3 border rounded-lg">
                <div className="col-span-12 md:col-span-4">
                  <Label className="text-xs">Item Name</Label>
                  <Input placeholder="Item name" {...register(`items.${index}.name`)} className="mt-1" />
                  {errors.items?.[index]?.name && (
                    <p className="text-xs text-red-600 mt-1">{errors.items[index]?.name?.message}</p>
                  )}
                </div>
                <div className="col-span-4 md:col-span-2">
                  <Label className="text-xs">Quantity</Label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="1"
                    {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                    className="mt-1"
                  />
                  {errors.items?.[index]?.quantity && (
                    <p className="text-xs text-red-600 mt-1">{errors.items[index]?.quantity?.message}</p>
                  )}
                </div>
                <div className="col-span-4 md:col-span-2">
                  <Label className="text-xs">Price</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    {...register(`items.${index}.price`, { valueAsNumber: true })}
                    className="mt-1"
                  />
                  {errors.items?.[index]?.price && (
                    <p className="text-xs text-red-600 mt-1">{errors.items[index]?.price?.message}</p>
                  )}
                </div>
                <div className="col-span-6 md:col-span-1">
                  <Label className="text-xs">Total</Label>
                  <div className="text-sm font-medium py-2 px-2 bg-muted rounded mt-1">
                    {formatCurrency((watchedItems[index]?.quantity || 0) * (watchedItems[index]?.price || 0))}
                  </div>
                </div>
                <div className="col-span-6 md:col-span-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => remove(index)}
                    disabled={fields.length === 1}
                    className="w-full mt-4 md:mt-6"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          {errors.items && <p className="text-sm text-red-600">{errors.items.message}</p>}
        </div>

        <Separator />

        {/* Additional Charges - Collapsible */}
        <Collapsible open={showAdditionalCharges} onOpenChange={setShowAdditionalCharges}>
          <CollapsibleTrigger asChild>
            <Button type="button" variant="outline" className="w-full justify-between bg-transparent">
              <div className="flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                <span>Additional Charges</span>
                {(showDiscount && (watch("discount") || 0) > 0) || (showTip && (watch("tip") || 0) > 0) ? (
                  <Badge variant="secondary" className="ml-2">
                    {[
                      showDiscount && (watch("discount") || 0) > 0 ? "Discount" : null,
                      showTip && (watch("tip") || 0) > 0 ? "Tip" : null,
                    ]
                      .filter(Boolean)
                      .join(" + ")}
                  </Badge>
                ) : null}
              </div>
              <div className="flex items-center gap-1">
                {showAdditionalCharges ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-4">
            {/* Discount Section */}
            <div className="space-y-3 border rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="enable-discount"
                  checked={showDiscount}
                  onCheckedChange={(checked) => {
                    setShowDiscount(checked as boolean)
                    if (!checked) {
                      setValue("discount", 0)
                    }
                  }}
                />
                <Label htmlFor="enable-discount" className="font-medium">
                  Apply Discount
                </Label>
              </div>
              {showDiscount && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-6">
                  <div className="space-y-2">
                    <Label>Discount Amount</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      {...register("discount", { valueAsNumber: true })}
                    />
                    {errors.discount && <p className="text-sm text-red-600">{errors.discount.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Applied Discount</Label>
                    <div className="text-sm font-medium py-2 px-3 bg-muted rounded">
                      {formatCurrency(watch("discount") || 0)}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Tip Section */}
            <div className="space-y-3 border rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="enable-tip"
                  checked={showTip}
                  onCheckedChange={(checked) => {
                    setShowTip(checked as boolean)
                    if (!checked) {
                      setValue("tip", 0)
                    }
                  }}
                />
                <Label htmlFor="enable-tip" className="font-medium">
                  Add Tip
                </Label>
              </div>
              {showTip && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-6">
                  <div className="space-y-2">
                    <Label>Tip Amount</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      {...register("tip", { valueAsNumber: true })}
                    />
                    {errors.tip && <p className="text-sm text-red-600">{errors.tip.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Applied Tip</Label>
                    <div className="text-sm font-medium py-2 px-3 bg-muted rounded">
                      {formatCurrency(watch("tip") || 0)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Order Summary - More Compact */}
        <div className="space-y-4">
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{formatCurrency(watch("subtotal") || 0)}</span>
            </div>
            {showDiscount && (watch("discount") || 0) > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount:</span>
                <span>-{formatCurrency(watch("discount") || 0)}</span>
              </div>
            )}
            {showTip && (watch("tip") || 0) > 0 && (
              <div className="flex justify-between text-blue-600">
                <span>Tip:</span>
                <span>+{formatCurrency(watch("tip") || 0)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-bold text-lg">
              <span>Total:</span>
              <span>{formatCurrency(watch("totalAmount") || 0)}</span>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Badge variant={watch("paymentStatus") === "completed" ? "default" : "destructive"}>
              {watch("paymentStatus") === "completed" ? "Payment Complete" : "Payment Pending"}
            </Badge>
            {!isOnline && (
              <Badge variant="outline" className="text-orange-600 border-orange-200">
                Offline
              </Badge>
            )}
          </div>
        </div>

        {/* Payment Method Section - FIXED */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="split-payment"
              checked={isSplitPayment}
              onCheckedChange={(checked) => setIsSplitPayment(checked as boolean)}
            />
            <Label htmlFor="split-payment" className="font-medium">
              Split Payment (Cash + Digital)
            </Label>
          </div>

          {!isSplitPayment ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Payment Method</Label>
                <Controller
                  name="paymentMethod"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="digital">Digital Payment</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.paymentMethod && <p className="text-sm text-red-600">{errors.paymentMethod.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentStatus">Payment Status</Label>
                <Controller
                  name="paymentStatus"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.paymentStatus && <p className="text-sm text-red-600">{errors.paymentStatus.message}</p>}
              </div>
            </div>
          ) : (
            <div className="space-y-4 border rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cash Amount</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    {...register("cashAmount", { valueAsNumber: true })}
                  />
                  {errors.cashAmount && <p className="text-sm text-red-600">{errors.cashAmount.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Digital Amount</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    {...register("digitalAmount", { valueAsNumber: true })}
                  />
                  {errors.digitalAmount && <p className="text-sm text-red-600">{errors.digitalAmount.message}</p>}
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

        {/* Notes - Collapsible */}
        <Collapsible open={showNotes} onOpenChange={setShowNotes}>
          <CollapsibleTrigger asChild>
            <Button type="button" variant="outline" className="w-full justify-between bg-transparent">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span>Notes</span>
                {watch("notes") && (
                  <Badge variant="secondary" className="ml-2">
                    Added
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1">
                {showNotes ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4">
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea id="notes" placeholder="Special instructions or notes..." {...register("notes")} />
              {errors.notes && <p className="text-sm text-red-600">{errors.notes.message}</p>}
            </div>
          </CollapsibleContent>
        </Collapsible>

        <div className="flex gap-2 pt-4">
          <Button type="submit" disabled={isLoading} className="flex-1">
            {isLoading ? "Saving..." : record ? "Update Order" : "Create Order"}
          </Button>
        </div>
      </form>
    </div>
  )
}
