"use client"

import { useCallback } from "react"
import { useFieldArray } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Plus, Trash2, Calculator, ChevronUp, ChevronDown, FileText } from "lucide-react"
import type { IncomeRecord } from "@/types"
import { formatCurrency } from "@/lib/utils"
import { useOffline } from "../../hooks/use-offline"
import { useIncomeForm } from "./hooks/use-income-form"
import { MenuItemsGrid } from "./components/menu-items-grid"
import { OrderSummary } from "./components/order-summary"
import { PaymentSection } from "./components/payment-section"

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
  const { isOnline } = useOffline()

  const {
    form,
    state,
    updateState,
    toggleDiscount,
    toggleTip,
    setDiscount,
    setTip,
    setCashAmount,
    setDigitalAmount,
    toggleSplitPayment,
    handleDueAccountChange,
    onSubmit,
  } = useIncomeForm({ record, onSuccess })

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "items",
  })

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
    },
    [form, update, append],
  )

  const currentItems = form.watch("items") || []

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
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 w-full overflow-y-auto">
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

            <FormItem>
              <FormLabel>Due Account (Optional)</FormLabel>
              <Select value={state.selectedDueAccount} onValueChange={handleDueAccountChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select customer account" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No due account</SelectItem>
                  {state.dueAccounts.map((account) => (
                    <SelectItem key={account._id} value={account._id}>
                      {account.customerName} ({formatCurrency(account.totalDueAmount || 0)} due)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
          </div>

          {/* Quick Add Menu Items */}
          <MenuItemsGrid menuItems={menuItems} currentItems={currentItems} onAddItem={addMenuItem} />

          <Separator />

          {/* Order Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <FormLabel>Order Items</FormLabel>
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
                    <FormField
                      control={form.control}
                      name={`items.${index}.name`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Item Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Item name" {...field} />
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
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="col-span-6 md:col-span-1">
                    <FormLabel className="text-xs">Total</FormLabel>
                    <div className="text-sm font-medium py-2 px-2 bg-muted rounded mt-1">
                      {formatCurrency((currentItems[index]?.quantity || 0) * (currentItems[index]?.price || 0))}
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
          </div>

          <Separator />

          {/* Additional Charges - Collapsible */}
          <Collapsible
            open={state.showAdditionalCharges}
            onOpenChange={(open) => updateState({ showAdditionalCharges: open })}
          >
            <CollapsibleTrigger asChild>
              <Button type="button" variant="outline" className="w-full justify-between bg-transparent">
                <div className="flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  <span>Additional Charges</span>
                  {(state.showDiscount && state.discount > 0) || (state.showTip && state.tip > 0) ? (
                    <Badge variant="secondary" className="ml-2">
                      {[
                        state.showDiscount && state.discount > 0 ? "Discount" : null,
                        state.showTip && state.tip > 0 ? "Tip" : null,
                      ]
                        .filter(Boolean)
                        .join(" + ")}
                    </Badge>
                  ) : null}
                </div>
                <div className="flex items-center gap-1">
                  {state.showAdditionalCharges ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4">
              {/* Discount Section */}
              <div className="space-y-3 border rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <Checkbox id="enable-discount" checked={state.showDiscount} onCheckedChange={toggleDiscount} />
                  <FormLabel htmlFor="enable-discount" className="font-medium">
                    Apply Discount
                  </FormLabel>
                </div>
                {state.showDiscount && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-6">
                    <div className="space-y-2">
                      <FormLabel>Discount Amount</FormLabel>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={state.discount}
                        onChange={(e) => setDiscount(Number(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <FormLabel>Applied Discount</FormLabel>
                      <div className="text-sm font-medium py-2 px-3 bg-muted rounded">
                        {formatCurrency(state.discount)}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Tip Section */}
              <div className="space-y-3 border rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <Checkbox id="enable-tip" checked={state.showTip} onCheckedChange={toggleTip} />
                  <FormLabel htmlFor="enable-tip" className="font-medium">
                    Add Tip
                  </FormLabel>
                </div>
                {state.showTip && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-6">
                    <div className="space-y-2">
                      <FormLabel>Tip Amount</FormLabel>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={state.tip}
                        onChange={(e) => setTip(Number(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <FormLabel>Applied Tip</FormLabel>
                      <div className="text-sm font-medium py-2 px-3 bg-muted rounded">{formatCurrency(state.tip)}</div>
                    </div>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Order Summary */}
          <OrderSummary
            subtotal={state.subtotal}
            discount={state.discount}
            tip={state.tip}
            totalAmount={state.totalAmount}
            showDiscount={state.showDiscount}
            showTip={state.showTip}
            paymentStatus={form.watch("paymentStatus")}
            isOnline={isOnline}
          />

          {/* Payment Method Section */}
          <PaymentSection
            form={form}
            isSplitPayment={state.isSplitPayment}
            cashAmount={state.cashAmount}
            digitalAmount={state.digitalAmount}
            totalAmount={state.totalAmount}
            onToggleSplitPayment={toggleSplitPayment}
            onSetCashAmount={setCashAmount}
            onSetDigitalAmount={setDigitalAmount}
          />

          {/* Notes - Collapsible */}
          <Collapsible open={state.showNotes} onOpenChange={(open) => updateState({ showNotes: open })}>
            <CollapsibleTrigger asChild>
              <Button type="button" variant="outline" className="w-full justify-between bg-transparent">
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
                  {state.showNotes ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
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
            <Button type="submit" disabled={state.isLoading} className="flex-1">
              {state.isLoading ? "Saving..." : record ? "Update Order" : "Create Order"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
