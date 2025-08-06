"use client"

import { useState, useCallback } from "react"
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  type SortingState,
  type ColumnFiltersState,
} from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { IncomeRecordDialog } from "@/components/records/income-record-dialog"
import { OfflineAPI } from "@/lib/offline/offline-api"
import {
  Search,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Users,
  Banknote,
  Smartphone,
  WifiOff,
  Trash2,
  Edit,
} from "lucide-react"
import { toast } from "sonner"
import type { IncomeRecord } from "@/types"
import { useGroupedIncomeRecords } from "../hooks/use-grouped-income-records"
import { useIncomeColumns } from "../hooks/use-income-columns"
import { TablePagination } from "./table-pagination"
import { formatCurrency } from "@/lib/utils"
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

interface IncomeRecordsTableProps {
  records: IncomeRecord[]
  isLoading: boolean
  onRefresh: () => Promise<void>
  onFormSuccess: () => Promise<void>
  isOnline: boolean
}

export function IncomeRecordsTable({
  records,
  isLoading,
  onRefresh,
  onFormSuccess,
  isOnline,
}: IncomeRecordsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState("")
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  const toggleGroupExpansion = useCallback((dueAccountId: string) => {
    setExpandedGroups((prev) => {
      const newExpanded = new Set(prev)
      if (newExpanded.has(dueAccountId)) {
        newExpanded.delete(dueAccountId)
      } else {
        newExpanded.add(dueAccountId)
      }
      return newExpanded
    })
  }, [])

  const handleDeleteIncome = async (id: string) => {
    try {
      // Handle group deletion
      if (id.startsWith("group_")) {
        const dueAccountId = id.replace("group_", "")
        const groupOrders = records.filter((record) => record.isDueAccount && record.dueAccountId === dueAccountId)

        // Delete all orders in the group
        await Promise.all(groupOrders.map((order) => OfflineAPI.deleteIncomeRecord(order._id)))

        const message = isOnline
          ? `${groupOrders.length} orders deleted successfully`
          : `${groupOrders.length} orders deleted offline - will sync when online`
        toast.success(message)
        await onRefresh()
        return
      }

      // Handle individual order deletion
      const actualId = id.startsWith("child_") ? id.replace("child_", "") : id
      await OfflineAPI.deleteIncomeRecord(actualId)

      const message = isOnline ? "Order deleted successfully" : "Order deleted offline - will sync when online"
      toast.success(message)
      await onRefresh()
    } catch (error) {
      toast.error("Failed to delete order")
      console.error("Error deleting order:", error)
    }
  }

  const groupedRecords = useGroupedIncomeRecords(records, expandedGroups)
  const columns = useIncomeColumns({
    expandedGroups,
    toggleGroupExpansion,
    onFormSuccess,
    onDelete: handleDeleteIncome,
  })

  const table = useReactTable({
    data: groupedRecords,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  })

  const renderMobileCard = (record: any) => {
    const isChild = record._id.startsWith("child_")
    const isGroup = record.isGroup

    return (
      <Card
        key={record._id}
        className={`mb-2 ${isChild ? "ml-3 border-l-2 border-l-blue-300" : ""} ${
          isGroup ? "border-l-2 border-l-orange-400" : ""
        }`}
        onClick={() => isGroup && toggleGroupExpansion(record.dueAccountId!)}
      >
        <CardContent>
          {/* Main Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {isGroup && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-0 h-6 w-6 shrink-0"
                >
                  {expandedGroups.has(record.dueAccountId!) ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                </Button>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 mb-1">
                  {isGroup && <Users className="h-3 w-3 text-orange-600 shrink-0" />}
                  <h3 className="font-medium text-sm truncate">
                    {record.customerName || `Table ${record.tableNumber}` || "Walk-in"}
                    {isGroup && ` (${record.orderCount})`}
                  </h3>
                </div>

                <div className="flex items-center gap-1">
                  <Badge
                    variant={record.paymentStatus === "completed" ? "default" : "destructive"}
                    className="text-xs h-4 px-1"
                  >
                    {record.paymentStatus === "completed" ? "Completed" : "Pending"}
                  </Badge>

                  {record.paymentMethod === "cash" ? (
                    <Banknote className="h-3 w-3 text-gray-500" />
                  ) : record.paymentMethod === "digital" ? (
                    <Smartphone className="h-3 w-3 text-gray-500" />
                  ) : (
                    <span className="text-xs text-gray-500">Split</span>
                  )}

                  <span className="text-xs text-gray-500">
                    {new Date(record.date).toLocaleDateString("en-US")}
                  </span>

                  {record._offline && <WifiOff className="h-3 w-3 text-orange-500" />}
                </div>
              </div>
            </div>

            {/* Amount and Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <div className={`font-bold text-sm ${isGroup ? "text-red-600" : "text-green-600"}`}>
                {
                  (() => {
                    let currentAmount
                    const amount = record.totalAmount as number
                    if (record.paymentMethod === "split") {
                      const cashAmount = record.cashAmount || 0
                      const digitalAmount = record.digitalAmount || 0
                      if (cashAmount > 0 || digitalAmount > 0) {
                        currentAmount = amount - (cashAmount + digitalAmount)
                      }
                      currentAmount = currentAmount || amount
                    } else {
                      currentAmount = amount
                    }
                    return formatCurrency(currentAmount)
                  })()
                }
              </div>

              {!isGroup && (
                <div className="flex gap-1">
                  <IncomeRecordDialog
                    record={isChild ? { ...record, _id: record._id.replace("child_", "") } : record}
                    onSuccess={onFormSuccess}
                    mode="edit"
                    trigger={
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <Edit className="h-3 w-3" />
                      </Button>
                    }
                  />

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-600 hover:text-red-700">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Order?</AlertDialogTitle>
                        <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteIncome(record._id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 sm:gap-2 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 gap-2">
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search orders..."
              value={globalFilter ?? ""}
              onChange={(event) => setGlobalFilter(String(event.target.value))}
              className="pl-8 w-full sm:w-[300px]"
            />
          </div>
          <Button
            variant="outline"
            onClick={onRefresh}
            disabled={isLoading}
            className="w-full sm:w-auto bg-transparent"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
        <div className="w-full sm:w-auto">
          <IncomeRecordDialog onSuccess={onFormSuccess} mode="create" />
        </div>
      </div>

      {/* Mobile View (hidden on md and up) */}
      <div className="block md:hidden">
        <div className="mb-3">
          <h2 className="text-lg font-semibold">Orders ({table.getFilteredRowModel().rows.length})</h2>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            Loading...
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => renderMobileCard(row.original))
              ) : (
                <Card>
                  <CardContent className="p-6 text-center">
                    <p className="text-gray-500 text-sm">No results found.</p>
                  </CardContent>
                </Card>
              )}
            </div>
            <div className="mt-3">
              <TablePagination table={table} />
            </div>
          </>
        )}
      </div>

      {/* Desktop View (hidden on mobile) */}
      <div className="hidden md:block">
        <Card>
          <CardHeader>
            <CardTitle>Orders & Income Records</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                Loading records...
              </div>
            ) : (
              <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id}>
                          {headerGroup.headers.map((header) => (
                            <TableHead key={header.id}>
                              {header.isPlaceholder
                                ? null
                                : flexRender(header.column.columnDef.header, header.getContext())}
                            </TableHead>
                          ))}
                        </TableRow>
                      ))}
                    </TableHeader>
                    <TableBody>
                      {table.getRowModel().rows?.length ? (
                        table.getRowModel().rows.map((row) => {
                          const isChild = row.original._id.startsWith("child_")
                          const isGroup = row.original.isGroup
                          return (
                            <TableRow
                              key={row.id}
                              data-state={row.getIsSelected() && "selected"}
                              onClick={isGroup ? () => toggleGroupExpansion(row.original.dueAccountId!) : undefined}
                              className={`${isChild ? "bg-gray-900/50 border-l-2 border-l-gray-300" : ""} ${
                                isGroup ? "bg-gray-800/50 hover:bg-gray-600 border-l-2 border-l-gray-500" : ""
                              }${!isChild && !isGroup ? "hover:bg-gray-800" : ""}`}
                            >
                              {row.getVisibleCells().map((cell) => (
                                <TableCell key={cell.id}>
                                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </TableCell>
                              ))}
                            </TableRow>
                          )
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={columns.length} className="h-24 text-center">
                            No results.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                <TablePagination table={table} />
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
