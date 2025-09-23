"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { IndianRupee } from "lucide-react"
import type { DueAccount, PaymentResult } from "@/types"
import { DuePaymentForm } from "./due-payment-form"

interface DuePaymentDialogProps {
  account: DueAccount
  onSuccess?: (result: PaymentResult) => void
  trigger?: React.ReactNode
}

export function DuePaymentDialog({ account, onSuccess, trigger }: DuePaymentDialogProps) {
  const [open, setOpen] = useState(false)

  const handleSuccess = (result: PaymentResult) => {
    setOpen(false)
    onSuccess?.(result)
  }

  const defaultTrigger = (
    <Button variant="outline" size="sm">
      <IndianRupee className="h-4 w-4 mr-2" />
      Record Payment
    </Button>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>Process a payment for {account.customerName}&apos;s due account.</DialogDescription>
        </DialogHeader>
        <DuePaymentForm
          accountId={account._id}
          customerName={account.customerName}
          totalDue={account.totalDueAmount || 0}
          onSuccess={handleSuccess}
        />
      </DialogContent>
    </Dialog>
  )
}
