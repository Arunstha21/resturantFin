"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus, Edit } from "lucide-react"
import type { ExpenseRecord } from "@/types"
import { ExpenseRecordForm } from "./expense-record-form"

interface ExpenseDialogProps {
  record?: ExpenseRecord
  mode: "create" | "edit"
  onSuccess: () => Promise<void>
}

export function ExpenseDialog({ record, mode, onSuccess }: ExpenseDialogProps) {
  const [open, setOpen] = useState(false)

  const handleSuccess = async () => {
    console.log(`🎉 Expense dialog success - mode: ${mode}`)
    setOpen(false)

    // Add a small delay to ensure dialog closes before refresh
    await new Promise((resolve) => setTimeout(resolve, 100))

    await onSuccess()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {mode === "create" ? (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Expense
          </Button>
        ) : (
          <Button variant="outline" size="sm">
            <Edit className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Create New Expense" : "Edit Expense"}</DialogTitle>
        </DialogHeader>
        <ExpenseRecordForm record={record} onSuccess={handleSuccess} />
      </DialogContent>
    </Dialog>
  )
}
