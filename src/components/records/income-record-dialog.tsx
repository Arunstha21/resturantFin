"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { IncomeRecordForm } from "./income-record-form"
import { Plus, Edit } from "lucide-react"
import type { IncomeRecord } from "@/types"

interface IncomeRecordDialogProps {
  record?: IncomeRecord
  onSuccess?: () => void
  trigger?: React.ReactNode
  mode?: "create" | "edit"
}

export function IncomeRecordDialog({ record, onSuccess, trigger, mode = "create" }: IncomeRecordDialogProps) {
  const [open, setOpen] = useState(false)

  const handleSuccess = () => {
    setOpen(false)
    onSuccess?.()
  }

  const defaultTrigger =
    mode === "create" ? (
      <Button>
        <Plus className="h-4 w-4 mr-2" />
        New Order
      </Button>
    ) : (
      <Button variant="outline" size="sm">
        <Edit className="h-4 w-4" />
      </Button>
    )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      <DialogContent className="overflow-y-auto max-w-2xl max-h-[95vh]" aria-describedby="dialog-description">
        <DialogHeader>
          <DialogTitle>
            <div className="flex items-center gap-2">
              <span>{record ? "Edit Order" : "Create New Order"}</span>
              <span className="text-sm text-muted-foreground">
                {record ? `Time : ${new Date(record.date).toLocaleString()}` : `Time : ${new Date().toLocaleString()}`}
              </span>
            </div>
          </DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          <IncomeRecordForm record={record} onSuccess={handleSuccess} />
        </div>
      </DialogContent>
    </Dialog>
  )
}
