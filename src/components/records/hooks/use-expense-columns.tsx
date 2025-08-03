"use client"

import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTrigger,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog"
import { ExpenseRecordDialog } from "@/components/records/expense-record-dialog"
import { formatCurrency } from "@/lib/utils"
import { Trash2, ArrowUpDown, WifiOff } from "lucide-react"
import type { ColumnDef } from "@tanstack/react-table"
import type { ExpenseRecord } from "@/types"

interface UseExpenseColumnsProps {
  onFormSuccess: () => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export function useExpenseColumns({ onFormSuccess, onDelete }: UseExpenseColumnsProps): ColumnDef<ExpenseRecord>[] {
  return useMemo(
    () => [
      {
        accessorKey: "description",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-auto p-0 font-semibold"
          >
            Description
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ getValue, row }) => {
          const value = getValue() as string
          const record = row.original
          return (
            <div className="flex items-center gap-2">
              <span className="font-medium">{value}</span>
              {record._offline && (
                <Badge variant="outline" className="text-orange-600 border-orange-200">
                  <WifiOff className="h-3 w-3 mr-1" />
                  Offline
                </Badge>
              )}
            </div>
          )
        },
      },
      {
        accessorKey: "category",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-auto p-0 font-semibold"
          >
            Category
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ getValue }) => <Badge variant="secondary">{getValue() as string}</Badge>,
      },
      {
        accessorKey: "vendor",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-auto p-0 font-semibold"
          >
            Vendor
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ getValue }) => (getValue() as string) || "-",
      },
      {
        accessorKey: "amount",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-auto p-0 font-semibold"
          >
            Amount
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ getValue }) => {
          const amount = getValue() as number
          return <div className="text-red-600 font-medium">{formatCurrency(amount)}</div>
        },
      },
      {
        accessorKey: "date",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-auto p-0 font-semibold"
          >
            Date
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ getValue }) => {
          const date = getValue() as string
          return new Date(date).toLocaleDateString()
        },
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex space-x-2">
            <ExpenseRecordDialog record={row.original} onSuccess={onFormSuccess} mode="edit" />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. Are you sure you want to delete this expense?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDelete(row.original._id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Continue
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ),
        enableSorting: false,
      },
    ],
    [onFormSuccess, onDelete],
  )
}
