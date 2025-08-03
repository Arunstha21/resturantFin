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
import { IncomeRecordDialog } from "@/components/records/income-record-dialog"
import { formatCurrency } from "@/lib/utils"
import { Trash2, ArrowUpDown, ChevronDown, ChevronRightIcon, Users, Banknote, Smartphone, WifiOff } from "lucide-react"
import type { ColumnDef } from "@tanstack/react-table"
import { GroupedIncomeRecord } from "./use-grouped-income-records"

interface UseIncomeColumnsProps {
  expandedGroups: Set<string>
  toggleGroupExpansion: (dueAccountId: string) => void
  onFormSuccess: () => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export function useIncomeColumns({
  expandedGroups,
  toggleGroupExpansion,
  onFormSuccess,
  onDelete,
}: UseIncomeColumnsProps): ColumnDef<GroupedIncomeRecord>[] {
  return useMemo(
    () => [
      {
        id: "customer",
        accessorFn: (row) => row.customerName || `Table ${row.tableNumber}` || "Walk-in",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-auto p-0 font-semibold"
          >
            Customer/Table
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ getValue, row }) => {
          const value = getValue() as string
          const record = row.original
          const isChild = record._id.startsWith("child_")
          return (
            <div
              className={`flex items-center gap-2 ${isChild ? "pl-8" : ""} ${record.isGroup ? "cursor-pointer" : ""}`}
            >
              {record.isGroup && (
                <div className="flex items-center">
                  {expandedGroups.has(record.dueAccountId!) ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRightIcon className="h-4 w-4" />
                  )}
                  <Users className="h-4 w-4 ml-1" />
                </div>
              )}
              <span className={`font-medium`}>
                {value}
                {record.isGroup && ` (${record.orderCount} orders)`}
              </span>
              {record.isDueAccount && !record.isGroup && (
                <Badge variant="outline" className="text-blue-600 border-blue-200">
                  Due Account
                </Badge>
              )}
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
        accessorKey: "paymentMethod",
        header: "Payment Method",
        cell: ({ getValue, row }) => {
          const method = getValue() as string
          const record = row.original
          if (record.isGroup) {
            const methods = record.groupedOrders?.map((order) => order.paymentMethod) || []
            const uniqueMethods = Array.from(new Set(methods))
            if (uniqueMethods.length === 1) {
              return (
                <div className="flex items-center gap-1">
                  {uniqueMethods[0] === "cash" ? <Banknote className="h-3 w-3" /> : <Smartphone className="h-3 w-3" />}
                  <span className="text-xs capitalize">{uniqueMethods[0]}</span>
                </div>
              )
            } else {
              return (
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">Mixed</span>
                </div>
              )
            }
          }
          if (method === "split") {
            return (
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1">
                  <Banknote className="h-3 w-3" />
                  <span className="text-xs">Cash: {formatCurrency(record.cashAmount || 0)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Smartphone className="h-3 w-3" />
                  <span className="text-xs">Digital: {formatCurrency(record.digitalAmount || 0)}</span>
                </div>
              </div>
            )
          }
          return (
            <div className="flex items-center gap-1">
              {method === "cash" ? <Banknote className="h-3 w-3" /> : <Smartphone className="h-3 w-3" />}
              <span className="text-xs capitalize">{method}</span>
            </div>
          )
        },
      },
      {
        accessorKey: "paymentStatus",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-auto p-0 font-semibold"
          >
            Payment
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ getValue, row }) => {
          const status = getValue() as string
          const record = row.original
          if (record.isGroup) {
            const pendingCount = record.groupedOrders?.filter((order) => order.paymentStatus === "pending").length || 0
            const completedCount =
              record.groupedOrders?.filter((order) => order.paymentStatus === "completed").length || 0
            if (pendingCount > 0 && completedCount > 0) {
              return (
                <div className="flex flex-col gap-1">
                  <Badge variant="destructive" className="text-xs">
                    {pendingCount} Pending
                  </Badge>
                  <Badge variant="default" className="text-xs">
                    {completedCount} Completed
                  </Badge>
                </div>
              )
            }
          }
          return <Badge variant={status === "completed" ? "default" : "destructive"}>{status}</Badge>
        },
      },
      {
        accessorKey: "items",
        header: "Items",
        cell: ({ getValue, row }) => {
          const items = getValue() as any[]
          const record = row.original
          if (record.isGroup) {
            const totalItems = record.groupedOrders?.reduce((sum, order) => sum + order.items.length, 0) || 0
            return `${totalItems} items (${record.orderCount} orders)`
          }
          return `${items.length} items`
        },
        enableSorting: false,
      },
      {
        accessorKey: "totalAmount",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-auto p-0 font-semibold"
          >
            Total
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ getValue, row }) => {
          let currentAmount
          const amount = getValue() as number
          if (row.original.paymentMethod === "split") {
            const cashAmount = row.original.cashAmount || 0
            const digitalAmount = row.original.digitalAmount || 0
            if (cashAmount > 0 || digitalAmount > 0) {
              currentAmount = amount - (cashAmount + digitalAmount)
            }
            currentAmount = currentAmount || amount
          } else {
            currentAmount = amount
          }
          const record = row.original
          return (
            <div className={`font-medium ${record.isGroup ? "text-red-800 font-semibold" : "text-green-600"}`}>
              {formatCurrency(currentAmount)}
            </div>
          )
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
        cell: ({ getValue, row }) => {
          const date = getValue() as string
          const record = row.original
          if (record.isGroup) {
            const dates = record.groupedOrders?.map((order) => new Date(order.date)) || []
            const minDate = new Date(Math.min(...dates.map((d) => d.getTime())))
            const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())))
            if (minDate.toDateString() === maxDate.toDateString()) {
              return minDate.toLocaleDateString()
            } else {
              return `${minDate.toLocaleDateString()} - ${maxDate.toLocaleDateString()}`
            }
          }
          return new Date(date).toLocaleDateString()
        },
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const record = row.original
          const isChild = record._id.startsWith("child_")
          return (
            <>
              {!record.isGroup && (
                <div className="flex space-x-2" onClick={(e) => e.stopPropagation()}>
                  <IncomeRecordDialog
                    record={isChild ? { ...record, _id: record._id.replace("child_", "") } : record}
                    onSuccess={onFormSuccess}
                    mode="edit"
                  />
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
                          {record.isGroup
                            ? `This will delete all ${record.orderCount} orders in this group. This action cannot be undone.`
                            : "This action cannot be undone. Are you sure you want to delete this order?"}
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
              )}
            </>
          )
        },
        enableSorting: false,
      },
    ],
    [toggleGroupExpansion, expandedGroups, onFormSuccess, onDelete],
  )
}
