"use client"

import { useState, useCallback, useMemo, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { incomeRecordSchema, type IncomeRecordInput } from "@/lib/validations"
import { OfflineAPI } from "@/lib/offline/offline-api"
import type { IncomeRecord } from "@/types"

interface UseIncomeFormProps {
  record?: IncomeRecord
  onSuccess?: () => void
}

interface FormState {
  // UI State
  showDiscount: boolean
  showTip: boolean
  showAdditionalCharges: boolean
  showNotes: boolean
  isSplitPayment: boolean

  // Calculated State
  subtotal: number
  totalAmount: number
  discount: number
  tip: number
  cashAmount: number
  digitalAmount: number

  // Data State
  dueAccounts: any[]
  selectedDueAccount: string
  isLoading: boolean
}

const initialFormState: FormState = {
  showDiscount: false,
  showTip: false,
  showAdditionalCharges: false,
  showNotes: false,
  isSplitPayment: false,
  subtotal: 0,
  totalAmount: 0,
  discount: 0,
  tip: 0,
  cashAmount: 0,
  digitalAmount: 0,
  dueAccounts: [],
  selectedDueAccount: "",
  isLoading: false,
}

export function useIncomeForm({ record, onSuccess }: UseIncomeFormProps) {
  const [state, setState] = useState<FormState>(initialFormState)

  // Form setup
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
  })

  // Initialize state from record
  useEffect(() => {
    if (record) {
      setState((prev) => ({
        ...prev,
        discount: record.discount || 0,
        tip: record.tip || 0,
        cashAmount: record.cashAmount || 0,
        digitalAmount: record.digitalAmount || 0,
        isSplitPayment: record.paymentMethod === "split",
        showDiscount: (record.discount || 0) > 0,
        showTip: (record.tip || 0) > 0,
        showAdditionalCharges: (record.discount || 0) > 0 || (record.tip || 0) > 0,
        showNotes: Boolean(record.notes?.trim()),
        selectedDueAccount: record.dueAccountId || "",
      }))
    }
  }, [record])

  // Fetch due accounts
  useEffect(() => {
    const fetchDueAccounts = async () => {
      try {
        const accounts = await OfflineAPI.getDueAccounts()
        setState((prev) => ({ ...prev, dueAccounts: accounts || [] }))
      } catch (error) {
        console.error("Failed to fetch due accounts:", error)
      }
    }
    fetchDueAccounts()
  }, [])

  // Calculate totals
  const calculateTotals = useCallback(
    (items: any[]) => {
      const newSubtotal = items.reduce((sum, item) => {
        const quantity = Number(item?.quantity) || 0
        const price = Number(item?.price) || 0
        return sum + quantity * price
      }, 0)

      const discountAmount = state.showDiscount ? state.discount : 0
      const tipAmount = state.showTip ? state.tip : 0
      const newTotal = newSubtotal - discountAmount + tipAmount

      setState((prev) => ({
        ...prev,
        subtotal: newSubtotal,
        totalAmount: newTotal,
      }))
    },
    [state.discount, state.tip, state.showDiscount, state.showTip],
  )

  // Watch items changes
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name?.startsWith("items.") && (name.includes(".quantity") || name.includes(".price"))) {
        const items = form.getValues("items") || []
        calculateTotals(items)
      }
    })
    return () => subscription.unsubscribe()
  }, [form, calculateTotals])

  // Recalculate when discount/tip changes
  useEffect(() => {
    const items = form.getValues("items") || []
    calculateTotals(items)
  }, [form, calculateTotals, state.discount, state.tip, state.showDiscount, state.showTip])

  // Handle payment status for split payments
  useEffect(() => {
    if (state.isSplitPayment) {
      const totalPaid = state.cashAmount + state.digitalAmount
      const paymentStatus = totalPaid >= state.totalAmount ? "completed" : "pending"
      form.setValue("paymentStatus", paymentStatus)
      form.setValue("paymentMethod", "split")
    }
  }, [state.isSplitPayment, state.cashAmount, state.digitalAmount, state.totalAmount, form])

  // State update functions
  const updateState = useCallback((updates: Partial<FormState>) => {
    setState((prev) => ({ ...prev, ...updates }))
  }, [])

  const toggleDiscount = useCallback(
    (enabled: boolean) => {
      updateState({
        showDiscount: enabled,
        discount: enabled ? state.discount : 0,
      })
    },
    [state.discount, updateState],
  )

  const toggleTip = useCallback(
    (enabled: boolean) => {
      updateState({
        showTip: enabled,
        tip: enabled ? state.tip : 0,
      })
    },
    [state.tip, updateState],
  )

  const setDiscount = useCallback(
    (value: number) => {
      updateState({ discount: value })
    },
    [updateState],
  )

  const setTip = useCallback(
    (value: number) => {
      updateState({ tip: value })
    },
    [updateState],
  )

  const setCashAmount = useCallback(
    (value: number) => {
      updateState({ cashAmount: value })
    },
    [updateState],
  )

  const setDigitalAmount = useCallback(
    (value: number) => {
      updateState({ digitalAmount: value })
    },
    [updateState],
  )

  const toggleSplitPayment = useCallback(
    (enabled: boolean) => {
      updateState({ isSplitPayment: enabled })
      if (!enabled && !record) {
        form.setValue("paymentMethod", "cash")
        form.setValue("paymentStatus", "pending")
        updateState({ cashAmount: 0, digitalAmount: 0 })
      }
    },
    [updateState, form, record],
  )

  const handleDueAccountChange = useCallback(
    (value: string) => {
      const newValue = value === "none" ? "" : value
      updateState({ selectedDueAccount: newValue })

      if (newValue) {
        form.setValue("isDueAccount", true)
        form.setValue("dueAccountId", newValue)
        const account = state.dueAccounts.find((acc) => acc._id === newValue)
        if (account) {
          form.setValue("customerName", account.customerName)
        }
      } else {
        form.setValue("isDueAccount", false)
        form.setValue("dueAccountId", "")
      }
    },
    [updateState, form, state.dueAccounts],
  )

  // Submit handler
  const onSubmit = useCallback(
    async (data: IncomeRecordInput) => {
      updateState({ isLoading: true })

      try {
        const formData = {
          ...data,
          subtotal: state.subtotal,
          totalAmount: state.totalAmount,
          discount: state.showDiscount ? state.discount : 0,
          tip: state.showTip ? state.tip : 0,
          cashAmount: state.isSplitPayment ? state.cashAmount : 0,
          digitalAmount: state.isSplitPayment ? state.digitalAmount : 0,
        }

        let result
        if (record) {
          result = await OfflineAPI.updateIncomeRecord(record._id, formData)
          toast.success("Order updated successfully!")
        } else {
          result = await OfflineAPI.createIncomeRecord(formData)
          toast.success("Order created successfully!")
        }

        if (result?.success) {
          if (!record) {
            form.reset(defaultValues)
            setState(initialFormState)
          }
          onSuccess?.()
        }
      } catch (error) {
        console.error("Form submission error:", error)
        toast.error("Something went wrong. Please try again.")
      } finally {
        updateState({ isLoading: false })
      }
    },
    [state, record, form, defaultValues, onSuccess, updateState],
  )

  // Computed values
  const computedValues = useMemo(
    () => ({
      totalPaid: state.cashAmount + state.digitalAmount,
      remainingAmount: Math.max(0, state.totalAmount - (state.cashAmount + state.digitalAmount)),
      isPaymentComplete: state.isSplitPayment
        ? state.cashAmount + state.digitalAmount >= state.totalAmount
        : form.watch("paymentStatus") === "completed",
    }),
    [state.cashAmount, state.digitalAmount, state.totalAmount, state.isSplitPayment, form],
  )

  return {
    // Form
    form,

    // State
    state,

    // Computed values
    ...computedValues,

    // Actions
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
  }
}
