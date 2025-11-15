"use client"

import { useState, useCallback, useMemo, useEffect } from "react"
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
import { Plus, Trash2, ChevronDown, Edit3, Check, X } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { incomeRecordSchema, type IncomeRecordInput } from "@/lib/validations"
import { OfflineAPI } from "@/lib/offline/offline-api"
import { formatCurrency } from "@/lib/utils"
import { useOffline } from "../../hooks/use-offline"
import type { IncomeRecord } from "@/types"

interface IncomeRecordFormProps {
  record?: IncomeRecord
  onSuccess?: () => void
}

// Simplified form state
interface FormState {
  showExtras: boolean
  showNotes: boolean
  isSplitPayment: boolean
}

export function IncomeRecordForm({ record, onSuccess }: IncomeRecordFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [formState, setFormState] = useState<FormState>({
    showExtras: Boolean(record?.discount || record?.tip),
    showNotes: Boolean(record?.notes),
    isSplitPayment: record?.paymentMethod === "split",
  })

  const [dueAccounts, setDueAccounts] = useState<any[]>([])
  const [selectedDueAccount, setSelectedDueAccount] = useState<string>("")
  const [editingItems, setEditingItems] = useState<Set<number>>(new Set()) // Track which items are being edited
  const [menuItems, setMenuItems] = useState<{
    category: string[]
    items: Record<string, { _id: string; name: string; price: number; category: string; actualCategory: string }[]>
  }>({ category: [], items: {} })

  const fetchMenuItems = async () => {
    try {
      const data = await OfflineAPI.getMenuItems()

      const categories = Array.from(new Set(data.map((item: any) => item.incomeCategory || item.category)))
      categories.sort((a, b) => {
        if (a === "Popular") return -1
        if (b === "Popular") return 1
        return 0
      })
      const itemMap: Record<string, { _id: string; name: string; price: number; category: string; actualCategory: string}[]> = {} 

      categories.forEach((category) => {
        itemMap[category] = data
          .filter((item: any) => (item.incomeCategory || item.category) === category)
          .sort((a: any, b: any) => (b.totalSold || 0) - (a.totalSold || 0)) // DESCENDING
          .map((item: any) => ({
            _id: item._id,
            name: item.name,
            price: Number(item.price) || 0,
            category: category,
            actualCategory: item.category,
          }))
      })
      setMenuItems({ category: categories, items: itemMap });
    } catch (error) {
      console.error("Error fetching menu items:", error)
      toast.error("Failed to fetch menu items")
    }
  }

  const { isOnline } = useOffline()

  // Memoized default values
  const defaultValues = useMemo(
    (): IncomeRecordInput => ({
      items: record?.items || [{ name: "", quantity: 1, price: 0, category: "", menuItemId: "" }],
      totalAmount: record?.totalAmount || 0,
      subtotal: record?.subtotal || 0,
      discount: record?.discount || 0,
      tip: record?.tip || 0,
      paymentMethod: (record?.paymentMethod as any) || "cash",
      paymentStatus: (record?.paymentStatus as any) || "pending",
      cashAmount: record?.cashAmount || 0,
      digitalAmount: record?.digitalAmount || 0,
      date: record?.date ? new Date(record.date) : new Date(),
      tableNumber: record?.tableNumber || "",
      customerName: record?.customerName || "",
      notes: record?.notes || "",
      isDueAccount: record?.isDueAccount || false,
      dueAccountId: record?.dueAccountId || "",
    }),
    [record],
  )

  const form = useForm<IncomeRecordInput>({
    resolver: zodResolver(incomeRecordSchema),
    defaultValues,
    mode: "onChange",
  })

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "items",
  })

  const watchedItems = form.watch("items")

  // Helper functions for editing state
  const toggleEditItem = useCallback((index: number) => {
    setEditingItems((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(index)) {
        newSet.delete(index)
      } else {
        newSet.add(index)
      }
      return newSet
    })
  }, [])

  const stopEditingItem = useCallback((index: number) => {
    setEditingItems((prev) => {
      const newSet = new Set(prev)
      newSet.delete(index)
      return newSet
    })
  }, [])

  const stopEditingAllItems = useCallback(() => {
    setEditingItems(new Set())
  }, [])

  // Replace the existing calculateTotals function with this one
  const calculateTotals = useCallback(() => {
    const items = form.getValues("items")
    const subtotal = items.reduce((sum, item) => sum + (Number(item?.quantity) || 0) * (Number(item?.price) || 0), 0)

    const discount = Number(form.getValues("discount")) || 0
    const tip = Number(form.getValues("tip")) || 0
    const total = subtotal - discount + tip

    // Use silent updates to prevent triggering watchers
    const currentSubtotal = form.getValues("subtotal")
    const currentTotal = form.getValues("totalAmount")

    if (Math.abs(currentSubtotal - subtotal) > 0.01) {
      form.setValue("subtotal", Number(subtotal.toFixed(2)), { shouldValidate: false, shouldDirty: false })
    }

    if (Math.abs(currentTotal - total) > 0.01) {
      form.setValue("totalAmount", Number(total.toFixed(2)), { shouldValidate: false, shouldDirty: false })
    }

    // Handle split payment
    if (formState.isSplitPayment) {
      if (form.getValues("paymentMethod") !== "split") {
        form.setValue("paymentMethod", "split", { shouldValidate: false, shouldDirty: false })
      }
      const cashAmount = Number(form.getValues("cashAmount")) || 0
      const digitalAmount = Number(form.getValues("digitalAmount")) || 0
      const newStatus = cashAmount + digitalAmount >= total ? "completed" : "pending"
      if (form.getValues("paymentStatus") !== newStatus) {
        form.setValue("paymentStatus", newStatus, { shouldValidate: false, shouldDirty: false })
      }
    }
  }, [form, formState.isSplitPayment])

  // Replace the existing useEffect with this improved version
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      // Trigger on any items array changes or specific field changes
      if (
        name &&
        !name.includes("subtotal") &&
        !name.includes("totalAmount") &&
        (name.startsWith("items") ||
          name === "discount" ||
          name === "tip" ||
          name === "cashAmount" ||
          name === "digitalAmount")
      ) {
        // Use setTimeout to prevent immediate recursion
        const timeoutId = setTimeout(() => {
          calculateTotals()
        }, 10)
        return () => clearTimeout(timeoutId)
      }
    })

    return () => subscription.unsubscribe()
  }, [form, calculateTotals])

  // Add a separate effect to watch for items array changes
  useEffect(() => {
    calculateTotals()
  }, [watchedItems.length, calculateTotals])

  // Fetch due accounts with error handling
  useEffect(() => {
    let isMounted = true
    const fetchDueAccounts = async () => {
      try {
        fetchMenuItems()
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
        setFormState((prev) => ({ ...prev, showExtras: true }))
      }
      if (record.notes && record.notes.trim() !== "") {
        setFormState((prev) => ({ ...prev, showNotes: true }))
      }
      if (record.paymentMethod === "split") {
        setFormState((prev) => ({ ...prev, isSplitPayment: true }))
      }
      if (record.isDueAccount && record.dueAccountId && dueAccounts.length > 0) {
        setSelectedDueAccount(record.dueAccountId)
      }
    }
  }, [record, dueAccounts])

  // Quick add menu item with better keyboard control
  const addMenuItem = useCallback(
    (menuItem: { name: string; price: number; actualCategory: string; _id: string }) => {
      // Prevent any input focus and keyboard popup
      const activeElement = document.activeElement as HTMLElement
      if (activeElement && (activeElement.tagName === "INPUT" || activeElement.tagName === "TEXTAREA")) {
        activeElement.blur()
      }

      const currentItems = form.getValues("items")
      const existingIndex = currentItems.findIndex((item) => item.name.toLowerCase() === menuItem.name.toLowerCase())

      if (existingIndex !== -1) {
        const existingItem = currentItems[existingIndex]
        update(existingIndex, {
          ...existingItem,
          quantity: (existingItem.quantity || 0) + 1,
        })
      } else {
        // Find first empty item or append new one
        const emptyIndex = currentItems.findIndex((item) => !item.name || item.name.trim() === "")

        if (emptyIndex !== -1) {
          // Replace the first empty item
          update(emptyIndex, { name: menuItem.name, quantity: 1, price: menuItem.price, category: menuItem.actualCategory, menuItemId: menuItem._id })
        } else {
          // No empty items, append new one
          append({ name: menuItem.name, quantity: 1, price: menuItem.price, category: menuItem.actualCategory, menuItemId: menuItem._id })
        }
      }

      // Force calculation and prevent focus
      setTimeout(() => {
        calculateTotals()
        // Ensure no input gets focus after state update
        if (document.activeElement && document.activeElement.tagName === "INPUT") {
          ;(document.activeElement as HTMLElement).blur()
        }
      }, 100)
    },
    [form, update, append, calculateTotals],
  )

  const onSubmit = async (data: IncomeRecordInput) => {
    setIsLoading(true)
    try {
      const formData = {
        ...data,
        totalAmount: Number(data.totalAmount) || 0,
        paymentMethod: formState.isSplitPayment ? "split" : data.paymentMethod,
        cashAmount: formState.isSplitPayment ? Number(data.cashAmount) || 0 : 0,
        digitalAmount: formState.isSplitPayment ? Number(data.digitalAmount) || 0 : 0,
      }
      
      const result = record
        ? await OfflineAPI.updateIncomeRecord(record._id, formData)
        : await OfflineAPI.createIncomeRecord(formData)

      const message = record ? "Order updated" : "Order created"
      toast.success(`${message} ${isOnline ? "successfully!" : "offline - will sync when online"}`)

      if (result?.success) {
        if (!record) {
          form.reset({
            ...defaultValues,
            items: [{ name: "", quantity: 1, price: 0 }], // Always keep one empty item
          })
          setSelectedDueAccount("")
          setFormState({ showExtras: false, showNotes: false, isSplitPayment: false })
          setEditingItems(new Set()) // Clear editing state
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

  const totalAmount = form.watch("totalAmount") || 0
  const subtotal = form.watch("subtotal") || 0
  const discount = form.watch("discount") || 0
  const tip = form.watch("tip") || 0

  return (
    <div className="w-full space-y-6">
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
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Info */}
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

          <Separator />

          {/* All Menu Items - Scrollable Container */}
          <div className="space-y-2">
            <Label>All Menu Items</Label>
            <div className="border rounded-lg p-3">
              <div className="max-h-48 overflow-y-auto space-y-4">
              {Object.entries(menuItems.items).map(([category, items]) => (
              <div key={category} className="space-y-2">
                <h4 className="font-semibold text-sm border-b border-gray-200 pb-1 sticky top-0 bg-neutral-950">
                {category}
                </h4>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {items.map((item) => {
                  const existingItem = watchedItems?.find(
                    (watchedItem) => watchedItem.name.toLowerCase() === item.name.toLowerCase(),
                  );
                  const currentQuantity = existingItem?.quantity || 0;

                  return (
                    <Button
                      key={item._id}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        addMenuItem(item);
                      }}
                      onTouchStart={(e) => e.preventDefault()}
                      className="justify-start text-left h-auto p-2 relative bg-white hover:bg-blue-50 border-gray-200 touch-manipulation"
                      tabIndex={-1}
                    >
                      <div className="w-full pointer-events-none">
                        <div className="font-medium text-xs truncate">{item.name}</div>
                        <div className="text-xs text-muted-foreground">{formatCurrency(item.price)}</div>
                        {currentQuantity > 0 && (
                          <Badge
                            variant="default"
                            className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs flex items-center justify-center bg-blue-600"
                          >
                            {currentQuantity}
                          </Badge>
                        )}
                      </div>
                    </Button>
                  );
                })}
                </div>
              </div>
              ))}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Popular items are shown first, followed by all other menu items by category.
            </p>
          </div>

          <Separator />

          {/* Order Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Order Items</Label>
              <div className="flex gap-2">
                {editingItems.size > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={stopEditingAllItems}
                    className="text-orange-600 border-orange-200 hover:bg-orange-50 bg-transparent"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Stop Editing All
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Blur any focused input before adding new item
                    if (document.activeElement && document.activeElement instanceof HTMLElement) {
                      document.activeElement.blur()
                    }
                    append({ name: "", quantity: 1, price: 0 })
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto">
              {fields.map((field, index) => {
                const isEmptyItem = !watchedItems[index]?.name || watchedItems[index]?.name === ""
                const isFromMenu = watchedItems[index]?.name && watchedItems[index]?.price > 0 && !isEmptyItem
                const isEditing = editingItems.has(index)
                const shouldShowReadonly = isFromMenu && !isEditing || isEmptyItem

                return (
                  <div
                    key={field.id}
                    className="border rounded-lg p-3 space-y-3"
                    data-menu-added={isFromMenu ? "true" : "false"}
                  >
                    {/* Row 1: Item Name, Qty, Price */}
                    <div className="grid grid-cols-12 gap-3 items-end">
                      {/* Item Name */}
                      <div className="col-span-6">
                        <FormField
                          control={form.control}
                          name={`items.${index}.name`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-medium">Item Name</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Item name"
                                  {...field}
                                  onFocus={(e) => {
                                    // Allow focus only for manual items or when editing
                                    if (shouldShowReadonly) {
                                      e.target.blur()
                                    }
                                  }}
                                  className={`text-sm h-9 ${shouldShowReadonly ? "bg-gray-50 cursor-default select-none" : ""}`}
                                  readOnly={shouldShowReadonly}
                                  tabIndex={shouldShowReadonly ? -1 : 0}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Quantity */}
                      <div className="col-span-3">
                        <FormField
                          control={form.control}
                          name={`items.${index}.quantity`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-medium">Quantity</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="1"
                                  {...field}
                                  onChange={(e) => field.onChange(Number(e.target.value))}
                                  inputMode="numeric"
                                  className="text-center text-sm h-9 font-medium"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Price */}
                      <div className="col-span-3">
                        <FormField
                          control={form.control}
                          name={`items.${index}.price`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-medium">Price</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  {...field}
                                  onChange={(e) => field.onChange(Number(e.target.value))}
                                  onFocus={(e) => {
                                    if (shouldShowReadonly) {
                                      e.target.blur()
                                    }
                                  }}
                                  readOnly={shouldShowReadonly}
                                  tabIndex={shouldShowReadonly ? -1 : 0}
                                  className={`text-sm h-9 ${shouldShowReadonly ? "bg-gray-50 cursor-default select-none" : ""}`}
                                  inputMode={shouldShowReadonly ? "none" : "decimal"}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    {/* Row 2: Total, Edit, Delete */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                      {/* Total */}
                      <div className="flex items-center gap-2">
                        <Label className="text-xs font-medium text-muted-foreground">Total:</Label>
                        <div className="text-lg font-bold text-green-600">
                          {formatCurrency((watchedItems[index]?.quantity || 0) * (watchedItems[index]?.price || 0))}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-2">
                        {/* Always show edit button for items with content, regardless of source */}
                        {!isEmptyItem && !isEditing && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => toggleEditItem(index)}
                            className="text-blue-600 border-blue-200 hover:bg-blue-50 h-8"
                            title="Edit this item"
                          >
                            <Edit3 className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                        )}

                        {isEditing && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => stopEditingItem(index)}
                            className="text-green-600 border-green-200 hover:bg-green-50 h-8"
                            title="Stop editing"
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Done
                          </Button>
                        )}

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault()
                            remove(index)
                            // Remove from editing set if it was being edited
                            setEditingItems((prev) => {
                              const newSet = new Set(prev)
                              newSet.delete(index)
                              return newSet
                            })
                          }}
                          disabled={fields.length === 1 && isEmptyItem}
                          className="text-red-600 border-red-200 hover:bg-red-50 h-8"
                          title="Remove item"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Discount & Tip Options */}
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="add-discount"
                  checked={discount > 0}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      form.setValue("discount", 1) // Set a default value when enabling
                    } else {
                      form.setValue("discount", 0)
                    }
                  }}
                />
                <Label htmlFor="add-discount">Add Discount</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="add-tip"
                  checked={tip > 0}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      form.setValue("tip", 1) // Set a default value when enabling
                    } else {
                      form.setValue("tip", 0)
                    }
                  }}
                />
                <Label htmlFor="add-tip">Add Tip</Label>
              </div>
            </div>

            {(discount > 0 || tip > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg">
                {discount > 0 && (
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
                )}
                {tip > 0 && (
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
                )}
              </div>
            )}
          </div>

          {/* Order Summary */}
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
            <Separator />
            <div className="flex justify-between font-bold text-lg">
              <span>Total:</span>
              <span>{formatCurrency(totalAmount)}</span>
            </div>
          </div>

          {/* Payment Status Display */}
          <div className="flex gap-2 items-center">
            <Badge
              variant={
                form.watch("paymentStatus") === "completed"
                  ? "default"
                  : form.watch("paymentStatus") === "pending"
                    ? "destructive"
                    : "secondary"
              }
            >
              {form.watch("paymentStatus") === "completed"
                ? "Payment Complete"
                : form.watch("paymentStatus") === "pending"
                  ? "Payment Pending"
                  : "Payment Failed"}
            </Badge>
            {!isOnline && (
              <Badge variant="outline" className="text-orange-600 border-orange-200">
                Offline
              </Badge>
            )}
          </div>

          {/* Payment Method */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="split-payment"
                checked={formState.isSplitPayment}
                onCheckedChange={(checked) => setFormState((prev) => ({ ...prev, isSplitPayment: checked as boolean }))}
              />
              <Label htmlFor="split-payment">Split Payment</Label>
            </div>

            {!formState.isSplitPayment ? (
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
                            <SelectValue placeholder="Select method" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="digital">Digital</SelectItem>
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
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
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
                <h4 className="font-medium text-blue-900">Split Payment Details</h4>
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

                {/* Split Payment Calculation Display */}
                <div className="p-3 rounded border space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Total Amount:</span>
                    <span className="font-medium">{formatCurrency(totalAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Cash Payment:</span>
                    <span className="font-medium text-green-600">{formatCurrency(form.watch("cashAmount") || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Digital Payment:</span>
                    <span className="font-medium text-blue-600">
                      {formatCurrency(form.watch("digitalAmount") || 0)}
                    </span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex justify-between text-sm font-medium">
                      <span>Total Paid:</span>
                      <span>
                        {formatCurrency((form.watch("cashAmount") || 0) + (form.watch("digitalAmount") || 0))}
                      </span>
                    </div>
                    {(() => {
                      const totalPaid = (form.watch("cashAmount") || 0) + (form.watch("digitalAmount") || 0)
                      const remaining = totalAmount - totalPaid
                      if (Math.abs(remaining) > 0.01) {
                        return (
                          <div
                            className={`flex justify-between text-sm font-medium ${remaining > 0 ? "text-red-600" : "text-green-600"}`}
                          >
                            <span>{remaining > 0 ? "Remaining:" : "Change:"}</span>
                            <span>{formatCurrency(Math.abs(remaining))}</span>
                          </div>
                        )
                      }
                      return (
                        <div className="flex justify-between text-sm font-medium text-green-600">
                          <span>Status:</span>
                          <span>✓ Exact Payment</span>
                        </div>
                      )
                    })()}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <Collapsible
            open={formState.showNotes}
            onOpenChange={(open) => setFormState((prev) => ({ ...prev, showNotes: open }))}
          >
            <CollapsibleTrigger asChild>
              <Button type="button" variant="outline" className="w-full justify-between bg-transparent">
                <span>Notes</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4">
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea placeholder="Additional notes..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CollapsibleContent>
          </Collapsible>

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? "Saving..." : record ? "Update Order" : "Create Order"}
          </Button>
        </form>
      </Form>
    </div>
  )
}
