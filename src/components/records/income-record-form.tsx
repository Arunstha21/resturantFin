"use client"

import { useState, useEffect } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { showPromiseToast } from "@/lib/toast-utils"
import { incomeRecordSchema, type IncomeRecordInput } from "@/lib/validations"
import { createIncomeRecord, updateIncomeRecord } from "@/app/actions/income-records"
import { Plus, Trash2, Calculator } from "lucide-react"
import type { IncomeRecord } from "@/types"
import { formatCurrency } from "@/lib/utils"

interface IncomeRecordFormProps {
  record?: IncomeRecord
  onSuccess?: () => void
}

const menuItems = [
  { name: "Milk Tea", price: 30 },
  { name: "Black Tea", price: 25 },
  { name: "Lemon Tea", price: 25 },
  { name: "Lassi Half", price: 50 },
  { name: "Lassi Full", price: 100 },
  { name: "Alu Chop", price: 60 },
  { name: "Wai Wai Sadheako", price: 60 },
  { name: "Coke/Fanta/Sprite", price: 80 },
  { name: "Sikher Ice", price: 25 },
  { name: "Churot", price: 30 },
  { name: "Sandwich", price: 60 },
  { name: "Milk Coffee", price: 100 },
  { name: "Black Coffee", price: 60 },
  { name: "Black Masala/Ginger Tea", price: 60 },
  { name: "Hot lemon (Honey & Ginger)", price: 80 },
  { name: "Sandwich with Fries", price: 100 },
  { name: "French Fries", price: 80 },
  { name: "Current", price: 90 },
  { name: "Current with omlet", price: 120 },
]

export function IncomeRecordForm({ record, onSuccess }: IncomeRecordFormProps) {
  const [isLoading, setIsLoading] = useState(false)

  const safeRecord: IncomeRecordInput = record
    ? record
    : {
        items: [{ name: "", quantity: 1, price: 0 }],
        totalAmount: 0,
        paymentMethod: "cash",
        paymentStatus: "pending",
        date: new Date(),
        tableNumber: "",
        customerName: "",
        notes: "",
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

  const watchedItems = watch("items")

  // Calculate totals automatically (without tax)
  const calculateTotals = () => {
    if (!watchedItems || watchedItems.length === 0) return

    const total = watchedItems.reduce((sum, item) => {
      const quantity = Number(item?.quantity) || 0
      const price = Number(item?.price) || 0
      return sum + quantity * price
    }, 0)

    setValue("totalAmount", Number(total.toFixed(2)))
  }

  // Recalculate when items or tip change
  useEffect(() => {
    calculateTotals()
  }, [watchedItems, setValue])

  const addMenuItem = (menuItem: (typeof menuItems)[0]) => {
    const currentItems = watchedItems || []

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
      return
    }

    // Check if the item already exists in the list
    const existingItemIndex = currentItems.findIndex((item) => item.name.toLowerCase() === menuItem.name.toLowerCase())

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

  const onSubmit = async (data: IncomeRecordInput) => {
    setIsLoading(true)
    let result
    try {
      // Ensure all calculations are up to date and tip is a number
      const formData = {
        ...data,
        totalAmount: Number(data.totalAmount) || 0,
      }

      const promise = record ? updateIncomeRecord(record._id, formData) : createIncomeRecord(formData)
      result = await promise
      await showPromiseToast(Promise.resolve(result), {
        loading: record ? "Updating order..." : "Creating order...",
        success: record ? "Order updated successfully!" : "Order created successfully!",
        error: "Something went wrong. Please try again.",
      })
      
      if (result?.success) {
        if (!record) reset({
        items: [{ name: "", quantity: 1, price: 0 }],
        totalAmount: 0,
        paymentMethod: "cash",
        paymentStatus: "pending",
        date: new Date(),
        tableNumber: "",
        customerName: "",
        notes: "",
      })
        onSuccess?.()
      }
        } catch (error) {
          console.error("Form submission error:", error)
        } finally {
          setIsLoading(false)
        }
      }

  return (
    <div className="w-full space-y-6">
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
              onClick={() => append({ name: "", quantity: 1, price: 0 })}
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

        {/* Totals */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            <Label>Order Summary</Label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status Overview</Label>
              <div className="flex gap-2 pt-2">
                <Badge variant={watch("paymentStatus") === "completed" ? "default" : "destructive"}>
                  {watch("paymentStatus") === "completed" ? "Payment Complete" : "Payment Pending"}
                </Badge>
              </div>
            </div>
          </div>

          <div className="bg-muted p-4 rounded-lg space-y-2">
            <div className="flex justify-between font-bold text-lg">
              <span>Total:</span>
              <span>{formatCurrency(watch("totalAmount") || 0)}</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notes (Optional)</Label>
          <Textarea id="notes" placeholder="Special instructions or notes..." {...register("notes")} />
          {errors.notes && <p className="text-sm text-red-600">{errors.notes.message}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="paymentMethod">Payment Method</Label>
            <Select
              value={watch("paymentMethod")}
              onValueChange={(value) => setValue("paymentMethod", value as "cash" | "digital")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="digital">Digital Payment</SelectItem>
              </SelectContent>
            </Select>
            {errors.paymentMethod && <p className="text-sm text-red-600">{errors.paymentMethod.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentStatus">Payment Status</Label>
            <Select
              value={watch("paymentStatus")}
              onValueChange={(value) => setValue("paymentStatus", value as "pending" | "completed")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select payment status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            {errors.paymentStatus && <p className="text-sm text-red-600">{errors.paymentStatus.message}</p>}
          </div>
        </div>

        <div className="flex gap-2 pt-4">
          <Button type="submit" disabled={isLoading} className="flex-1">
            {isLoading ? "Saving..." : record ? "Update Order" : "Create Order"}
          </Button>
        </div>
      </form>
    </div>
  )
}
