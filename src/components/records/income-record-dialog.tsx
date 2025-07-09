"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus, Edit } from "lucide-react"
import type { IncomeRecord } from "@/types"
import { IncomeRecordForm } from "./income-record-form"

interface IncomeDialogProps {
  record?: IncomeRecord
  mode: "create" | "edit"
  onSuccess: () => Promise<void>
}

export function IncomeDialog({ record, mode, onSuccess }: IncomeDialogProps) {
  const [open, setOpen] = useState(false)

  const handleSuccess = async () => {
    console.log(`🎉 Income dialog success - mode: ${mode}`)
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
            Add Order
          </Button>
        ) : (
          <Button variant="outline" size="sm">
            <Edit className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Create New Order" : "Edit Order"}</DialogTitle>
        </DialogHeader>
        <IncomeRecordForm record={record} onSuccess={handleSuccess} />
      </DialogContent>
    </Dialog>
  )
}
