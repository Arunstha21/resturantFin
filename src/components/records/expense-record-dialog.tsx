"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ExpenseRecordForm } from "./expense-record-form"
import { Plus, Edit } from "lucide-react"
import type { ExpenseRecord } from "@/types"

interface ExpenseRecordDialogProps {
  record?: ExpenseRecord
  onSuccess?: () => void
  trigger?: React.ReactNode
  mode?: "create" | "edit"
}

export function ExpenseRecordDialog({ record, onSuccess, trigger, mode = "create" }: ExpenseRecordDialogProps) {
  const [open, setOpen] = useState(false)

  const handleSuccess = () => {
    setOpen(false)
    onSuccess?.()
  }

  const defaultTrigger =
    mode === "create" ? (
      <Button>
        <Plus className="h-4 w-4 mr-2" />
        New Expense
      </Button>
    ) : (
      <Button variant="outline" size="sm">
        <Edit className="h-4 w-4" />
      </Button>
    )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{record ? "Edit Expense" : "Create New Expense"}</DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          <ExpenseRecordForm record={record} onSuccess={handleSuccess} />
        </div>
      </DialogContent>
    </Dialog>
  )
}
