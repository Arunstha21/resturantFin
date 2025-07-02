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
import { Plus, Edit } from "lucide-react"
import type { DueAccount } from "@/types"
import { DueAccountForm } from "./due-account-form"

interface DueAccountDialogProps {
  account?: DueAccount
  onSuccess?: () => void
  mode: "create" | "edit"
  trigger?: React.ReactNode
}

export function DueAccountDialog({ account, onSuccess, mode, trigger }: DueAccountDialogProps) {
  const [open, setOpen] = useState(false)

  const handleSuccess = () => {
    setOpen(false)
    onSuccess?.()
  }

  const defaultTrigger = (
    <Button>
      {mode === "create" ? (
        <>
          <Plus className="h-4 w-4 mr-2" />
          Add Customer
        </>
      ) : (
        <>
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </>
      )}
    </Button>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add New Customer" : "Edit Customer"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Create a new customer account to track due payments."
              : "Update customer account information."}
          </DialogDescription>
        </DialogHeader>
        <DueAccountForm account={account} onSuccess={handleSuccess} />
      </DialogContent>
    </Dialog>
  )
}