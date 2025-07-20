"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
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
  { name: "Alu Chop", price: 80 },
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
  { name: "Cloud Hukka", price: 480 },
  { name: "Ice Coffee", price: 60 },
  { name: "Normal Hukka", price: 220 },
]

export function IncomeRecordForm({ record, onSuccess }: IncomeRecordFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showDiscount, setShowDiscount] = useState(false)
  const [showTip, setShowTip] = useState(false)
  const [showAdditionalCharges, setShowAdditionalCharges] = useState(false)
  const [showNotes, setShowNotes] = useState(false)
  const [isSplitPayment, setIsSplitPayment] = useState(false)
  const [dueAccounts, setDueAccounts] = useState<any[]>([])
  const [selectedDueAccount, setSelectedDueAccount] = useState<string>("")

  const { isOnline } = useOffline()

  // Memoize default values to prevent unnecessary re-renders
  const defaultValues = useMemo((): IncomeRecordInput => {
    if (record) {
      return {
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
    }
    return {
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
  }, [record])

  const form = useForm<IncomeRecordInput>({
    resolver: zodResolver(incomeRecordSchema),
    defaultValues,
    mode: "onChange", // Optimize validation
  })

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "items",
  })

  // Debounced calculation to prevent excessive re-renders
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

    if (isSplitPayment) {
      const cashAmount = Number(form.getValues("cashAmount")) || 0
      const digitalAmount = Number(form.getValues("digitalAmount")) || 0
      const totalPaid = cashAmount + digitalAmount

      form.setValue("paymentStatus", totalPaid >= total ? "completed" : "pending")
    }
  }, [form, showDiscount, showTip, isSplitPayment])

  // Optimized effect with proper dependencies
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
        // Debounce calculations
        const timeoutId = setTimeout(calculateTotals, 100)
        return () => clearTimeout(timeoutId)
      }
    })
    return () => subscription.unsubscribe()
  }, [form, calculateTotals])

  // Fetch due accounts with error handling
  useEffect(() => {
    let isMounted = true
    const fetchDueAccounts = async () => {
      try {
        const accounts = await OfflineAPI.getDueAccounts()
        if (isMounted) {
          setDueAccounts(accounts || [])
        }
      } catch (error) {
        console.error("Failed to fetch due accounts:", error)
      }
    }
    fetchDueAccounts()
    return () => {
      isMounted = false
    }
  }, [])

  // Initialize form state from record
  useEffect(() => {
    if (record) {
      if (record.discount && record.discount > 0) {
        setShowAdditionalCharges(true)
        setShowDiscount(true)
      }
      if (record.tip && record.tip > 0) {
        setShowAdditionalCharges(true)
        setShowTip(true)
      }
      if (record.notes && record.notes.trim() !== "") {
        setShowNotes(true)
      }
      if (record.paymentMethod === "split") {
        setIsSplitPayment(true)
      }
      if (record.isDueAccount && record.dueAccountId && dueAccounts.length > 0) {
        setSelectedDueAccount(record.dueAccountId)
      }
    }
  }, [record, dueAccounts])

  // Optimized menu item addition with touch feedback
  const addMenuItem = useCallback(
    (menuItem: (typeof menuItems)[0]) => {
      const currentItems = form.getValues("items") || []
      const hasDefaultEmptyItem =
        currentItems.length === 1 &&
        currentItems[0].name === "" &&
        currentItems[0].quantity === 1 &&
        currentItems[0].price === 0

      if (hasDefaultEmptyItem) {
        update(0, {
          name: menuItem.name,
          quantity: 1,
          price: menuItem.price,
        })
      } else {
        const existingItemIndex = currentItems.findIndex(
          (item) => item.name.toLowerCase() === menuItem.name.toLowerCase(),
        )

        if (existingItemIndex !== -1) {
          const existingItem = currentItems[existingItemIndex]
          update(existingItemIndex, {
            ...existingItem,
            quantity: (existingItem.quantity || 0) + 1,
          })
        } else {
          append({
            name: menuItem.name,
            quantity: 1,
            price: menuItem.price,
          })
        }
      }

      // Prevent keyboard from opening by blurring any active input
      if (document.activeElement && document.activeElement instanceof HTMLElement) {
        document.activeElement.blur()
      }

      // Provide haptic feedback on mobile
      if ("vibrate" in navigator) {
        navigator.vibrate(50)
      }

      setTimeout(calculateTotals, 50)
    },
    [form, update, append, calculateTotals],
  )

  const onSubmit = async (data: IncomeRecordInput) => {
    setIsLoading(true)

    try {
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
          form.reset(defaultValues)
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

  const watchedItems = form.watch("items")
  const totalAmount = form.watch("totalAmount") || 0
  const cashAmount = form.watch("cashAmount") || 0
  const digitalAmount = form.watch("digitalAmount") || 0
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

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 w-full">
          {/* Order Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="tableNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Table Number</FormLabel>
                  <FormControl>
                    <Input placeholder="Table 1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="customerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Due Account Selection */}
          <FormField
            control={form.control}
            name="dueAccountId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Due Account (Optional)</FormLabel>
                <Select
                  value={selectedDueAccount}
                  onValueChange={(value) => {
                    const newValue = value === "none" ? "" : value
                    setSelectedDueAccount(newValue)
                    field.onChange(newValue)

                    if (newValue && newValue !== "") {
                      form.setValue("isDueAccount", true)
                      const account = dueAccounts.find((acc) => acc._id === newValue)
                      if (account) {
                        form.setValue("customerName", account.customerName)
                      }
                    } else {
                      form.setValue("isDueAccount", false)
                    }
                  }}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer account" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">No due account</SelectItem>
                    {dueAccounts.map((account) => (
                      <SelectItem key={account._id} value={account._id}>
                        {account.customerName} ({formatCurrency(account.totalDueAmount || 0)} due)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Quick Add Menu Items - Optimized for mobile */}
          <div className="space-y-2">
            <Label>Quick Add Menu Items</Label>
            <p className="text-sm text-muted-foreground">
              Tap to add items. If item already exists, quantity will be increased.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-32 overflow-y-auto border rounded-lg p-2">
              {menuItems.map((item) => {
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
                    onMouseDown={(e) => e.preventDefault()} // Prevent focus on mouse down
                    className="justify-start text-left h-auto p-2 relative touch-manipulation active:scale-95 transition-transform"
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
                  setTimeout(calculateTotals, 100)
                }}
                className="touch-manipulation"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Custom Item
              </Button>
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto">
              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-10 gap-2 items-end p-3 border rounded-lg">
                  <div className="col-span-12 md:col-span-4">
                    <FormField
                      control={form.control}
                      name={`items.${index}.name`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Item Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Item name" {...field} className="mt-1" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="col-span-4 md:col-span-2">
                    <FormField
                      control={form.control}
                      name={`items.${index}.quantity`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Quantity</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              placeholder="1"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                              className="mt-1"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="col-span-4 md:col-span-2">
                    <FormField
                      control={form.control}
                      name={`items.${index}.price`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Price</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                              className="mt-1"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
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
                      className="w-full mt-4 md:mt-6 touch-manipulation"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Additional Charges - Collapsible */}
          <Collapsible open={showAdditionalCharges} onOpenChange={setShowAdditionalCharges}>
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-between bg-transparent touch-manipulation"
              >
                <div className="flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  <span>Additional Charges</span>
                  {(showDiscount && (form.watch("discount") || 0) > 0) || (showTip && (form.watch("tip") || 0) > 0) ? (
                    <Badge variant="secondary" className="ml-2">
                      {[
                        showDiscount && (form.watch("discount") || 0) > 0 ? "Discount" : null,
                        showTip && (form.watch("tip") || 0) > 0 ? "Tip" : null,
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
                        form.setValue("discount", 0)
                      }
                    }}
                  />
                  <Label htmlFor="enable-discount" className="font-medium">
                    Apply Discount
                  </Label>
                </div>
                {showDiscount && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-6">
                    <FormField
                      control={form.control}
                      name="discount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Discount Amount</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="space-y-2">
                      <Label>Applied Discount</Label>
                      <div className="text-sm font-medium py-2 px-3 bg-muted rounded">
                        {formatCurrency(form.watch("discount") || 0)}
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
                        form.setValue("tip", 0)
                      }
                    }}
                  />
                  <Label htmlFor="enable-tip" className="font-medium">
                    Add Tip
                  </Label>
                </div>
                {showTip && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-6">
                    <FormField
                      control={form.control}
                      name="tip"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tip Amount</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="space-y-2">
                      <Label>Applied Tip</Label>
                      <div className="text-sm font-medium py-2 px-3 bg-muted rounded">
                        {formatCurrency(form.watch("tip") || 0)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Order Summary */}
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatCurrency(form.watch("subtotal") || 0)}</span>
              </div>
              {showDiscount && (form.watch("discount") || 0) > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount:</span>
                  <span>-{formatCurrency(form.watch("discount") || 0)}</span>
                </div>
              )}
              {showTip && (form.watch("tip") || 0) > 0 && (
                <div className="flex justify-between text-blue-600">
                  <span>Tip:</span>
                  <span>+{formatCurrency(form.watch("tip") || 0)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total:</span>
                <span>{formatCurrency(form.watch("totalAmount") || 0)}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Badge variant={form.watch("paymentStatus") === "completed" ? "default" : "destructive"}>
                {form.watch("paymentStatus") === "completed" ? "Payment Complete" : "Payment Pending"}
              </Badge>
              {!isOnline && (
                <Badge variant="outline" className="text-orange-600 border-orange-200">
                  Offline
                </Badge>
              )}
            </div>
          </div>

          {/* Payment Method Section */}
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
                <FormField
                  control={form.control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Method</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                  <FormField
                    control={form.control}
                    name="cashAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cash Amount</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
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
                    name="digitalAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Digital Amount</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
              <Button
                type="button"
                variant="outline"
                className="w-full justify-between bg-transparent touch-manipulation"
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span>Notes</span>
                  {form.watch("notes") && (
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
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Special instructions or notes..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CollapsibleContent>
          </Collapsible>

          <div className="flex gap-2 pt-4">
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1 touch-manipulation active:scale-95 transition-transform"
            >
              {isLoading ? "Saving..." : record ? "Update Order" : "Create Order"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
